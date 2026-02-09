#!/usr/bin/env python3
"""
USDZ to GLB converter using Pixar USD library.
Writes GLB directly to disk instead of passing data through stdout.

Usage: python3 usdz_to_glb.py input.usdz output.glb
"""

import sys
import os
import json
import struct
import tempfile
import shutil
import numpy as np


def triangulate_mesh(points, face_counts, face_indices, normals=None):
    """Convert polygon mesh to triangles."""
    tri_indices = []
    tri_normals = [] if normals is not None else None
    
    offset = 0
    for count in face_counts:
        if count == 3:
            tri_indices.append([face_indices[offset], face_indices[offset+1], face_indices[offset+2]])
            if normals is not None:
                tri_normals.extend([normals[offset], normals[offset+1], normals[offset+2]])
        elif count > 3:
            # Fan triangulation
            for i in range(1, count - 1):
                tri_indices.append([face_indices[offset], face_indices[offset+i], face_indices[offset+i+1]])
                if normals is not None:
                    tri_normals.extend([normals[offset], normals[offset+i], normals[offset+i+1]])
        offset += count
    
    return tri_indices, tri_normals


def build_glb(meshes_data):
    """Build a minimal GLB binary from mesh data."""
    # Collect all buffer data
    accessors = []
    buffer_views = []
    mesh_primitives = []
    nodes = []
    all_bin = bytearray()
    
    for mesh_info in meshes_data:
        points = np.array(mesh_info["points"], dtype=np.float32)
        face_counts = mesh_info.get("faceVertexCounts", [])
        face_indices = mesh_info.get("faceVertexIndices", [])
        normals_raw = mesh_info.get("normals")
        
        # Triangulate
        if face_counts:
            tri_indices, tri_normals = triangulate_mesh(
                points, face_counts, face_indices,
                normals_raw if normals_raw else None
            )
            indices = np.array(tri_indices, dtype=np.uint32).flatten()
        else:
            indices = np.array(face_indices, dtype=np.uint32)
            tri_normals = normals_raw
        
        # Position accessor
        pos_offset = len(all_bin)
        pos_data = points.tobytes()
        all_bin.extend(pos_data)
        # Pad to 4 bytes
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        
        pos_bv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": pos_offset,
            "byteLength": len(pos_data),
            "target": 34962  # ARRAY_BUFFER
        })
        
        pos_min = points.min(axis=0).tolist()
        pos_max = points.max(axis=0).tolist()
        pos_acc_idx = len(accessors)
        accessors.append({
            "bufferView": pos_bv_idx,
            "componentType": 5126,  # FLOAT
            "count": len(points),
            "type": "VEC3",
            "min": pos_min,
            "max": pos_max
        })

        # Index accessor
        idx_offset = len(all_bin)
        idx_data = indices.astype(np.uint32).tobytes()
        all_bin.extend(idx_data)
        while len(all_bin) % 4 != 0:
            all_bin.append(0)
        
        idx_bv_idx = len(buffer_views)
        buffer_views.append({
            "buffer": 0,
            "byteOffset": idx_offset,
            "byteLength": len(idx_data),
            "target": 34963  # ELEMENT_ARRAY_BUFFER
        })
        
        idx_acc_idx = len(accessors)
        accessors.append({
            "bufferView": idx_bv_idx,
            "componentType": 5125,  # UNSIGNED_INT
            "count": len(indices),
            "type": "SCALAR"
        })
        
        primitive = {
            "attributes": {"POSITION": pos_acc_idx},
            "indices": idx_acc_idx
        }
        
        # Normal accessor (optional)
        if tri_normals and len(tri_normals) > 0:
            norm_arr = np.array(tri_normals, dtype=np.float32)
            if len(norm_arr.shape) == 1:
                norm_arr = norm_arr.reshape(-1, 3)
            # Per-face normals: expand to per-vertex if needed
            if len(norm_arr) != len(points):
                pass  # Skip normals if count mismatch
            else:
                norm_offset = len(all_bin)
                norm_data = norm_arr.tobytes()
                all_bin.extend(norm_data)
                while len(all_bin) % 4 != 0:
                    all_bin.append(0)
                
                norm_bv_idx = len(buffer_views)
                buffer_views.append({
                    "buffer": 0,
                    "byteOffset": norm_offset,
                    "byteLength": len(norm_data),
                    "target": 34962
                })
                norm_acc_idx = len(accessors)
                accessors.append({
                    "bufferView": norm_bv_idx,
                    "componentType": 5126,
                    "count": len(norm_arr),
                    "type": "VEC3"
                })
                primitive["attributes"]["NORMAL"] = norm_acc_idx
        
        mesh_idx = len(mesh_primitives)
        mesh_primitives.append({
            "name": mesh_info.get("name", f"mesh_{mesh_idx}"),
            "primitives": [primitive]
        })
        nodes.append({
            "name": mesh_info.get("name", f"node_{mesh_idx}"),
            "mesh": mesh_idx
        })
    
    # Build glTF JSON
    gltf = {
        "asset": {"version": "2.0", "generator": "usdz_to_glb.py"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": mesh_primitives,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(all_bin)}]
    }
    
    # Encode JSON
    json_str = json.dumps(gltf, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    # Pad JSON to 4-byte alignment
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '
    
    # Build GLB
    # Header: magic(4) + version(4) + length(4)
    # Chunk 0 (JSON): length(4) + type(4) + data
    # Chunk 1 (BIN): length(4) + type(4) + data
    bin_bytes = bytes(all_bin)
    while len(bin_bytes) % 4 != 0:
        bin_bytes += b'\x00'
    
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    
    glb = bytearray()
    glb.extend(struct.pack('<I', 0x46546C67))  # magic: glTF
    glb.extend(struct.pack('<I', 2))            # version
    glb.extend(struct.pack('<I', total_length))
    # JSON chunk
    glb.extend(struct.pack('<I', len(json_bytes)))
    glb.extend(struct.pack('<I', 0x4E4F534A))  # JSON
    glb.extend(json_bytes)
    # BIN chunk
    glb.extend(struct.pack('<I', len(bin_bytes)))
    glb.extend(struct.pack('<I', 0x004E4942))  # BIN
    glb.extend(bin_bytes)
    
    return bytes(glb)


def convert_usdz_to_glb(input_path: str, output_path: str) -> dict:
    """Convert USDZ file to GLB format, writing directly to disk."""
    try:
        from pxr import Usd, UsdGeom
    except ImportError:
        return {"success": False, "error": "USD library not installed. Install with: pip install usd-core"}

    try:
        stage = Usd.Stage.Open(input_path)
        if not stage:
            return {"success": False, "error": f"Failed to open USDZ file: {input_path}"}

        meshes_data = []
        for prim in stage.Traverse():
            if prim.IsA(UsdGeom.Mesh):
                mesh = UsdGeom.Mesh(prim)
                points_attr = mesh.GetPointsAttr()
                points = points_attr.Get() if points_attr else None
                face_counts_attr = mesh.GetFaceVertexCountsAttr()
                face_counts = face_counts_attr.Get() if face_counts_attr else None
                face_indices_attr = mesh.GetFaceVertexIndicesAttr()
                face_indices = face_indices_attr.Get() if face_indices_attr else None
                normals_attr = mesh.GetNormalsAttr()
                normals = normals_attr.Get() if normals_attr else None

                if points and face_indices:
                    mesh_data = {
                        "name": prim.GetName(),
                        "points": [[float(p[0]), float(p[1]), float(p[2])] for p in points],
                        "faceVertexCounts": [int(c) for c in face_counts] if face_counts else [],
                        "faceVertexIndices": [int(i) for i in face_indices],
                    }
                    if normals:
                        mesh_data["normals"] = [[float(n[0]), float(n[1]), float(n[2])] for n in normals]
                    meshes_data.append(mesh_data)

        if not meshes_data:
            return {"success": False, "error": "No mesh data found in USDZ file"}

        # Build GLB and write directly to disk
        glb_data = build_glb(meshes_data)
        with open(output_path, 'wb') as f:
            f.write(glb_data)

        total_verts = sum(len(m["points"]) for m in meshes_data)
        total_faces = sum(len(m.get("faceVertexCounts", [])) for m in meshes_data)

        return {
            "success": True,
            "outputPath": output_path,
            "meshCount": len(meshes_data),
            "totalVertices": total_verts,
            "totalFaces": total_faces
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: usdz_to_glb.py input.usdz output.glb"}))
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(json.dumps({"success": False, "error": f"Input file not found: {input_path}"}))
        sys.exit(1)

    result = convert_usdz_to_glb(input_path, output_path)
    # Only output small status JSON, not mesh data
    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
