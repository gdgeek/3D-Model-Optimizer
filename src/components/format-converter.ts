/**
 * Format Converter Component
 *
 * Converts various 3D model formats to GLB format.
 * Supported formats: OBJ, STL, FBX, GLTF, USDZ
 *
 * @module components/format-converter
 */

import { Document, NodeIO } from '@gltf-transform/core';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import obj2gltf from 'obj2gltf';

const execAsync = promisify(exec);

/**
 * Supported input formats for conversion.
 */
export const SUPPORTED_FORMATS = ['.glb', '.gltf', '.obj', '.stl', '.fbx', '.usdz', '.dae', '.step', '.stp'] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

/**
 * Check if a file extension is supported.
 */
export function isSupportedFormat(ext: string): ext is SupportedFormat {
  return SUPPORTED_FORMATS.includes(ext.toLowerCase() as SupportedFormat);
}

/**
 * Get file extension from filename.
 */
export function getFileExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return ext;
}

/**
 * Conversion result interface.
 */
export interface ConversionResult {
  success: boolean;
  outputPath: string;
  originalFormat: string;
  conversionTime: number;
  error?: string;
}

/**
 * Parse binary STL file.
 */
function parseBinarySTL(buffer: Buffer): { positions: number[]; normals: number[] } {
  const positions: number[] = [];
  const normals: number[] = [];

  // Skip 80-byte header
  let offset = 80;

  // Read triangle count (uint32)
  const triangleCount = buffer.readUInt32LE(offset);
  offset += 4;

  for (let i = 0; i < triangleCount; i++) {
    // Read normal (3 floats)
    const nx = buffer.readFloatLE(offset);
    const ny = buffer.readFloatLE(offset + 4);
    const nz = buffer.readFloatLE(offset + 8);
    offset += 12;

    // Read 3 vertices (9 floats)
    for (let v = 0; v < 3; v++) {
      const x = buffer.readFloatLE(offset);
      const y = buffer.readFloatLE(offset + 4);
      const z = buffer.readFloatLE(offset + 8);
      offset += 12;

      positions.push(x, y, z);
      normals.push(nx, ny, nz);
    }

    // Skip attribute byte count (uint16)
    offset += 2;
  }

  return { positions, normals };
}

/**
 * Parse ASCII STL file.
 */
function parseAsciiSTL(content: string): { positions: number[]; normals: number[] } {
  const positions: number[] = [];
  const normals: number[] = [];

  const lines = content.split('\n');
  let currentNormal = [0, 0, 0];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('facet normal')) {
      const parts = trimmed.split(/\s+/);
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])];
    } else if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/);
      positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
      normals.push(...currentNormal);
    }
  }

  return { positions, normals };
}

/**
 * Check if STL is binary format.
 */
function isBinarySTL(buffer: Buffer): boolean {
  // Check if starts with "solid" (ASCII STL)
  const header = buffer.slice(0, 5).toString('ascii');
  if (header === 'solid') {
    // Could still be binary if "solid" appears in header
    // Check if file size matches expected binary size
    const triangleCount = buffer.readUInt32LE(80);
    const expectedSize = 80 + 4 + triangleCount * 50;
    return buffer.length === expectedSize;
  }
  return true;
}

/**
 * Convert STL to GLB.
 */
async function convertSTLtoGLB(inputPath: string, outputPath: string): Promise<void> {
  const buffer = fs.readFileSync(inputPath);

  let positions: number[];
  let normals: number[];

  if (isBinarySTL(buffer)) {
    const parsed = parseBinarySTL(buffer);
    positions = parsed.positions;
    normals = parsed.normals;
  } else {
    const content = buffer.toString('utf-8');
    const parsed = parseAsciiSTL(content);
    positions = parsed.positions;
    normals = parsed.normals;
  }

  // Create glTF document
  const document = new Document();
  const buffer_ = document.createBuffer();

  // Create accessors
  const positionAccessor = document
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(positions))
    .setBuffer(buffer_);

  const normalAccessor = document
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(normals))
    .setBuffer(buffer_);

  // Create primitive
  const primitive = document
    .createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setAttribute('NORMAL', normalAccessor);

  // Create mesh and node
  const mesh = document.createMesh().addPrimitive(primitive);
  const node = document.createNode().setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);

  // Write GLB
  const io = new NodeIO();
  await io.write(outputPath, document);
}

/**
 * Check if COLLADA2GLTF is available.
 */
async function isCollada2gltfAvailable(): Promise<boolean> {
  try {
    await execAsync('COLLADA2GLTF --help');
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert DAE (Collada) to GLB using COLLADA2GLTF.
 */
async function convertDAEtoGLB(inputPath: string, outputPath: string): Promise<void> {
  const colladaAvailable = await isCollada2gltfAvailable();
  
  if (!colladaAvailable) {
    throw new Error(
      'DAE conversion requires COLLADA2GLTF binary. ' +
      'Run in Docker or download from: https://github.com/KhronosGroup/COLLADA2GLTF/releases'
    );
  }

  // COLLADA2GLTF outputs to the same directory with .glb extension
  const outputDir = path.dirname(outputPath);
  const outputName = path.basename(outputPath, '.glb');
  const tempOutput = path.join(outputDir, `${outputName}.gltf`);
  
  await execAsync(
    `COLLADA2GLTF -i "${inputPath}" -o "${tempOutput}"`,
    { timeout: 120000 }
  );

  // Convert GLTF to GLB
  const io = new NodeIO();
  const document = await io.read(tempOutput);
  await io.write(outputPath, document);

  // Clean up temp gltf file
  if (fs.existsSync(tempOutput)) {
    fs.unlinkSync(tempOutput);
  }
  // Also clean up .bin file if exists
  const binFile = tempOutput.replace('.gltf', '.bin');
  if (fs.existsSync(binFile)) {
    fs.unlinkSync(binFile);
  }
}

/**
 * Check if STEP conversion tools are available.
 */
async function isStepConverterAvailable(): Promise<boolean> {
  try {
    await execAsync('python3 -c "import trimesh; print(\'ok\')"');
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert STEP to GLB using Python trimesh/cadquery.
 */
async function convertSTEPtoGLB(inputPath: string, outputPath: string): Promise<void> {
  const stepAvailable = await isStepConverterAvailable();
  
  if (!stepAvailable) {
    throw new Error(
      'STEP conversion requires Python trimesh package. ' +
      'Run in Docker or install with: pip install trimesh cadquery'
    );
  }

  // Python script to convert STEP to GLB
  const pythonScript = `
import sys
import json
import trimesh

try:
    # Load STEP file using trimesh (uses OpenCASCADE via cadquery if available)
    mesh = trimesh.load("${inputPath.replace(/\\/g, '\\\\')}")
    
    # Export to GLB
    mesh.export("${outputPath.replace(/\\/g, '\\\\')}", file_type='glb')
    
    print(json.dumps({"success": True}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
    sys.exit(1)
`;

  const result = await execAsync(`python3 -c '${pythonScript}'`, { timeout: 300000 });
  
  let parseResult;
  try {
    parseResult = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Failed to parse STEP conversion result: ${result.stdout}`);
  }

  if (!parseResult.success) {
    throw new Error(parseResult.error || 'STEP conversion failed');
  }
}

/**
 * Check if FBX2glTF is available.
 */
async function isFbx2gltfAvailable(): Promise<boolean> {
  try {
    await execAsync('FBX2glTF --help');
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert FBX to GLB using FBX2glTF.
 */
async function convertFBXtoGLB(inputPath: string, outputPath: string): Promise<void> {
  const fbxAvailable = await isFbx2gltfAvailable();
  
  if (!fbxAvailable) {
    throw new Error(
      'FBX conversion requires FBX2glTF binary. ' +
      'Run in Docker or download from: https://github.com/facebookincubator/FBX2glTF/releases'
    );
  }

  // FBX2glTF outputs to a file with the same name but .glb extension
  // We need to specify the output path
  const outputDir = path.dirname(outputPath);
  const outputName = path.basename(outputPath, '.glb');
  
  await execAsync(
    `FBX2glTF -i "${inputPath}" -o "${path.join(outputDir, outputName)}" --binary`,
    { timeout: 120000 }
  );

  // FBX2glTF adds _out suffix, rename if needed
  const expectedOutput = path.join(outputDir, `${outputName}_out.glb`);
  if (fs.existsSync(expectedOutput) && expectedOutput !== outputPath) {
    fs.renameSync(expectedOutput, outputPath);
  }
}

/**
 * Check if USD Python tools are available.
 */
async function isUsdAvailable(): Promise<boolean> {
  try {
    await execAsync('python3 -c "from pxr import Usd; print(\'ok\')"');
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert USDZ to GLB using Python USD library.
 */
async function convertUSDZtoGLB(inputPath: string, outputPath: string): Promise<void> {
  // Check if USD is available
  const usdAvailable = await isUsdAvailable();
  
  if (!usdAvailable) {
    throw new Error(
      'USDZ conversion requires usd-core Python package. ' +
      'Run in Docker or install with: pip install usd-core'
    );
  }

  // Get the script path
  const scriptPath = path.join(__dirname, '../../scripts/usdz_to_glb.py');
  
  // Check if script exists, if not use inline Python
  let result: { stdout: string; stderr: string };
  
  if (fs.existsSync(scriptPath)) {
    result = await execAsync(`python3 "${scriptPath}" "${inputPath}" "${outputPath}"`, {
      timeout: 120000,
    });
  } else {
    // Inline Python script for USDZ extraction
    const pythonScript = `
import sys
import json
import os

try:
    from pxr import Usd, UsdGeom
except ImportError:
    print(json.dumps({"success": False, "error": "USD library not installed"}))
    sys.exit(1)

input_path = "${inputPath.replace(/\\/g, '\\\\')}"
stage = Usd.Stage.Open(input_path)

if not stage:
    print(json.dumps({"success": False, "error": "Failed to open USDZ"}))
    sys.exit(1)

meshes = []
for prim in stage.Traverse():
    if prim.IsA(UsdGeom.Mesh):
        mesh = UsdGeom.Mesh(prim)
        points = mesh.GetPointsAttr().Get()
        indices = mesh.GetFaceVertexIndicesAttr().Get()
        counts = mesh.GetFaceVertexCountsAttr().Get()
        normals = mesh.GetNormalsAttr().Get()
        
        if points and indices:
            mesh_data = {
                "name": prim.GetName(),
                "points": [[float(p[0]), float(p[1]), float(p[2])] for p in points],
                "indices": [int(i) for i in indices],
                "counts": [int(c) for c in counts] if counts else [],
            }
            if normals:
                mesh_data["normals"] = [[float(n[0]), float(n[1]), float(n[2])] for n in normals]
            meshes.append(mesh_data)

print(json.dumps({"success": True, "meshes": meshes}))
`;
    result = await execAsync(`python3 -c '${pythonScript}'`, { timeout: 120000 });
  }

  // Parse the result
  let parseResult;
  try {
    parseResult = JSON.parse(result.stdout.trim());
  } catch {
    throw new Error(`Failed to parse USDZ conversion result: ${result.stdout}`);
  }

  if (!parseResult.success) {
    throw new Error(parseResult.error || 'USDZ conversion failed');
  }

  // Create GLB from mesh data
  const document = new Document();
  const buffer = document.createBuffer();

  for (const meshData of parseResult.meshes) {
    // Triangulate if needed (USD uses arbitrary polygons)
    const positions: number[] = [];
    const normals: number[] = [];
    
    const points = meshData.points;
    const indices = meshData.indices;
    const counts = meshData.counts || [];
    const meshNormals = meshData.normals;

    // Convert polygon faces to triangles
    let indexOffset = 0;
    for (const count of counts) {
      if (count === 3) {
        // Already a triangle
        for (let i = 0; i < 3; i++) {
          const idx = indices[indexOffset + i];
          positions.push(...points[idx]);
          if (meshNormals && meshNormals[indexOffset + i]) {
            normals.push(...meshNormals[indexOffset + i]);
          }
        }
      } else if (count > 3) {
        // Fan triangulation for polygons
        for (let i = 1; i < count - 1; i++) {
          const i0 = indices[indexOffset];
          const i1 = indices[indexOffset + i];
          const i2 = indices[indexOffset + i + 1];
          
          positions.push(...points[i0], ...points[i1], ...points[i2]);
          
          if (meshNormals) {
            const n0 = meshNormals[indexOffset] || [0, 1, 0];
            const n1 = meshNormals[indexOffset + i] || [0, 1, 0];
            const n2 = meshNormals[indexOffset + i + 1] || [0, 1, 0];
            normals.push(...n0, ...n1, ...n2);
          }
        }
      }
      indexOffset += count;
    }

    // If no counts provided, assume triangles
    if (counts.length === 0) {
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        positions.push(...points[idx]);
        if (meshNormals && meshNormals[i]) {
          normals.push(...meshNormals[i]);
        }
      }
    }

    // Create accessors
    const positionAccessor = document
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array(positions))
      .setBuffer(buffer);

    const primitive = document
      .createPrimitive()
      .setAttribute('POSITION', positionAccessor);

    if (normals.length > 0) {
      const normalAccessor = document
        .createAccessor()
        .setType('VEC3')
        .setArray(new Float32Array(normals))
        .setBuffer(buffer);
      primitive.setAttribute('NORMAL', normalAccessor);
    }

    const mesh = document.createMesh(meshData.name).addPrimitive(primitive);
    const node = document.createNode(meshData.name).setMesh(mesh);
    
    let scene = document.getRoot().getDefaultScene();
    if (!scene) {
      scene = document.createScene();
      document.getRoot().setDefaultScene(scene);
    }
    scene.addChild(node);
  }

  // Write GLB
  const io = new NodeIO();
  await io.write(outputPath, document);
}

/**
 * Convert OBJ to GLB using obj2gltf.
 */
async function convertOBJtoGLB(inputPath: string, outputPath: string): Promise<void> {
  const glb = await obj2gltf(inputPath, {
    binary: true,
  });
  fs.writeFileSync(outputPath, glb);
}

/**
 * Convert GLTF to GLB.
 */
async function convertGLTFtoGLB(inputPath: string, outputPath: string): Promise<void> {
  const io = new NodeIO();
  const document = await io.read(inputPath);
  await io.write(outputPath, document);
}

/**
 * Convert a 3D model file to GLB format.
 *
 * @param inputPath - Path to the input file
 * @param outputPath - Path for the output GLB file
 * @param originalFilename - Original filename to determine format
 * @returns Conversion result
 */
export async function convertToGLB(
  inputPath: string,
  outputPath: string,
  originalFilename: string
): Promise<ConversionResult> {
  const startTime = Date.now();
  const ext = getFileExtension(originalFilename);

  try {
    // If already GLB, just copy
    if (ext === '.glb') {
      fs.copyFileSync(inputPath, outputPath);
      return {
        success: true,
        outputPath,
        originalFormat: 'GLB',
        conversionTime: Date.now() - startTime,
      };
    }

    // Convert based on format
    switch (ext) {
      case '.gltf':
        await convertGLTFtoGLB(inputPath, outputPath);
        break;

      case '.obj':
        await convertOBJtoGLB(inputPath, outputPath);
        break;

      case '.stl':
        await convertSTLtoGLB(inputPath, outputPath);
        break;

      case '.fbx':
        await convertFBXtoGLB(inputPath, outputPath);
        break;

      case '.usdz':
        await convertUSDZtoGLB(inputPath, outputPath);
        break;

      case '.dae':
        await convertDAEtoGLB(inputPath, outputPath);
        break;

      case '.step':
      case '.stp':
        await convertSTEPtoGLB(inputPath, outputPath);
        break;

      default:
        throw new Error(`Unsupported format: ${ext}`);
    }

    return {
      success: true,
      outputPath,
      originalFormat: ext.toUpperCase().slice(1),
      conversionTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      outputPath,
      originalFormat: ext.toUpperCase().slice(1),
      conversionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a file needs conversion (not already GLB).
 */
export function needsConversion(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext !== '.glb' && isSupportedFormat(ext);
}

export default {
  convertToGLB,
  needsConversion,
  isSupportedFormat,
  getFileExtension,
  SUPPORTED_FORMATS,
};
