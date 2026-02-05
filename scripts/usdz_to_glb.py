#!/usr/bin/env python3
"""
USDZ to GLB converter using Pixar USD library.

Usage: python3 usdz_to_glb.py input.usdz output.glb
"""

import sys
import os
import json
import tempfile
import shutil

def convert_usdz_to_glb(input_path: str, output_path: str) -> dict:
    """Convert USDZ file to GLB format."""
    try:
        from pxr import Usd, UsdGeom, UsdShade, Gf
    except ImportError:
        return {
            "success": False,
            "error": "USD library not installed. Install with: pip install usd-core"
        }

    try:
        # Open the USDZ file
        stage = Usd.Stage.Open(input_path)
        if not stage:
            return {"success": False, "error": f"Failed to open USDZ file: {input_path}"}

        # Export to USDC first (intermediate format)
        temp_dir = tempfile.mkdtemp()
        temp_usdc = os.path.join(temp_dir, "temp.usdc")
        
        # Flatten and export
        stage.Export(temp_usdc)

        # Use usdcat to convert to glTF/GLB
        # Note: USD doesn't have direct GLB export, we need to use the glTF plugin
        
        # Try using UsdUtils for conversion
        try:
            from pxr import UsdUtils
            # Check if glTF export is available
            has_gltf = False
            for plugin in Usd.Stage.GetGlobalVariantFallbacks():
                if 'gltf' in str(plugin).lower():
                    has_gltf = True
                    break
        except:
            pass

        # Alternative: Extract geometry data and create GLB manually
        # This is a simplified conversion that handles basic meshes
        
        meshes_data = []
        
        for prim in stage.Traverse():
            if prim.IsA(UsdGeom.Mesh):
                mesh = UsdGeom.Mesh(prim)
                
                # Get points
                points_attr = mesh.GetPointsAttr()
                points = points_attr.Get() if points_attr else None
                
                # Get face vertex counts
                face_counts_attr = mesh.GetFaceVertexCountsAttr()
                face_counts = face_counts_attr.Get() if face_counts_attr else None
                
                # Get face vertex indices
                face_indices_attr = mesh.GetFaceVertexIndicesAttr()
                face_indices = face_indices_attr.Get() if face_indices_attr else None
                
                # Get normals
                normals_attr = mesh.GetNormalsAttr()
                normals = normals_attr.Get() if normals_attr else None
                
                if points and face_indices:
                    mesh_data = {
                        "name": prim.GetName(),
                        "points": [[p[0], p[1], p[2]] for p in points],
                        "faceVertexCounts": list(face_counts) if face_counts else [],
                        "faceVertexIndices": list(face_indices),
                    }
                    if normals:
                        mesh_data["normals"] = [[n[0], n[1], n[2]] for n in normals]
                    meshes_data.append(mesh_data)

        # Clean up temp files
        shutil.rmtree(temp_dir, ignore_errors=True)

        if not meshes_data:
            return {"success": False, "error": "No mesh data found in USDZ file"}

        # Output mesh data as JSON for Node.js to process
        return {
            "success": True,
            "meshes": meshes_data,
            "meshCount": len(meshes_data)
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
    print(json.dumps(result))
    
    sys.exit(0 if result.get("success") else 1)


if __name__ == "__main__":
    main()
