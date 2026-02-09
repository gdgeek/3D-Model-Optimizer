/**
 * Geometry Fixer Component
 *
 * Two-phase geometry repair for GLB models:
 * - repairInput: runs before optimization to fix source data issues
 * - repairOutput: runs after optimization to ensure output quality
 *
 * @module components/geometry-fixer
 */

import { Document, Accessor, Primitive } from '@gltf-transform/core';

export interface GeometryFixResult {
  invalidVerticesFixed: number;
  normalsRegenerated: number;
  tangentsRemoved: number;
  emptyAccessorsRemoved: number;
  totalPrimitivesProcessed: number;
}

// ─── Helpers ───

function hasNonFinite(arr: ArrayLike<number>): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (!isFinite(arr[i])) return true;
  }
  return false;
}

function fixNonFinite(arr: Float32Array): number {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (!isFinite(arr[i])) { arr[i] = 0; count++; }
  }
  return count;
}

function isTangentValid(acc: Accessor): boolean {
  if (acc.getType() !== 'VEC4') return false;
  const a = acc.getArray();
  if (!a || a.length === 0) return false;
  if (hasNonFinite(a as Float32Array)) return false;
  // spot-check w component (should be ±1)
  const step = Math.max(4, Math.floor(a.length / 40) * 4);
  for (let i = 3; i < a.length; i += step) {
    if (Math.abs(Math.abs(a[i]) - 1) > 0.1) return false;
  }
  return true;
}

function isNormalValid(acc: Accessor): boolean {
  if (acc.getType() !== 'VEC3') return false;
  const a = acc.getArray();
  if (!a || a.length === 0) return false;
  const step = Math.max(3, Math.floor(a.length / 30) * 3);
  for (let i = 0; i < a.length; i += step) {
    const x = a[i], y = a[i + 1], z = a[i + 2];
    if (!isFinite(x) || !isFinite(y) || !isFinite(z)) return false;
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 0.5 || len > 1.5) return false;
  }
  return true;
}

/**
 * Compute smooth normals from position + index data.
 */
function computeNormals(prim: Primitive, doc: Document): Accessor | null {
  const posAcc = prim.getAttribute('POSITION');
  if (!posAcc) return null;
  const pos = posAcc.getArray() as Float32Array;
  if (!pos) return null;

  const vCount = posAcc.getCount();
  const normals = new Float32Array(vCount * 3);
  const idxAcc = prim.getIndices();

  if (idxAcc) {
    const idx = idxAcc.getArray()!;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const ex = pos[b] - pos[a], ey = pos[b + 1] - pos[a + 1], ez = pos[b + 2] - pos[a + 2];
      const fx = pos[c] - pos[a], fy = pos[c + 1] - pos[a + 1], fz = pos[c + 2] - pos[a + 2];
      const nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
      for (const vi of [idx[i], idx[i + 1], idx[i + 2]]) {
        const o = vi * 3;
        normals[o] += nx; normals[o + 1] += ny; normals[o + 2] += nz;
      }
    }
  } else {
    for (let i = 0; i < vCount * 3; i += 9) {
      const ex = pos[i + 3] - pos[i], ey = pos[i + 4] - pos[i + 1], ez = pos[i + 5] - pos[i + 2];
      const fx = pos[i + 6] - pos[i], fy = pos[i + 7] - pos[i + 1], fz = pos[i + 8] - pos[i + 2];
      const nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
      for (let j = 0; j < 3; j++) {
        normals[i + j * 3] = nx; normals[i + j * 3 + 1] = ny; normals[i + j * 3 + 2] = nz;
      }
    }
  }

  // normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2);
    if (len > 1e-6) { normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len; }
    else { normals[i] = 0; normals[i + 1] = 1; normals[i + 2] = 0; }
  }

  const buf = doc.getRoot().listBuffers()[0] || doc.createBuffer();
  return doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buf);
}

// ─── Phase 1: Input Repair ───

/**
 * Fix source data issues before optimization.
 * - Replace NaN/Infinity in positions, normals, UVs
 * - Remove completely empty accessors
 */
export async function repairInput(doc: Document): Promise<GeometryFixResult> {
  const result: GeometryFixResult = {
    invalidVerticesFixed: 0, normalsRegenerated: 0,
    tangentsRemoved: 0, emptyAccessorsRemoved: 0, totalPrimitivesProcessed: 0,
  };

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      result.totalPrimitivesProcessed++;

      // Fix positions
      const posAcc = prim.getAttribute('POSITION');
      if (posAcc) {
        const arr = posAcc.getArray();
        if (arr && arr instanceof Float32Array && hasNonFinite(arr)) {
          result.invalidVerticesFixed += fixNonFinite(arr);
        }
      }

      // Fix normals — replace NaN or regenerate if invalid
      const normAcc = prim.getAttribute('NORMAL');
      if (normAcc) {
        const arr = normAcc.getArray();
        if (arr && arr instanceof Float32Array && hasNonFinite(arr)) {
          fixNonFinite(arr);
        }
        if (!isNormalValid(normAcc)) {
          const newNorm = computeNormals(prim, doc);
          if (newNorm) { prim.setAttribute('NORMAL', newNorm); result.normalsRegenerated++; }
        }
      }

      // Fix UVs
      for (const sem of ['TEXCOORD_0', 'TEXCOORD_1']) {
        const uvAcc = prim.getAttribute(sem);
        if (uvAcc) {
          const arr = uvAcc.getArray();
          if (arr && arr instanceof Float32Array && hasNonFinite(arr)) {
            result.invalidVerticesFixed += fixNonFinite(arr);
          }
        }
      }

      // Remove invalid tangents early (they'll cause issues in simplify/draco)
      const tanAcc = prim.getAttribute('TANGENT');
      if (tanAcc && !isTangentValid(tanAcc)) {
        prim.setAttribute('TANGENT', null);
        result.tangentsRemoved++;
      }
    }
  }

  // Remove empty accessors
  for (const acc of doc.getRoot().listAccessors()) {
    const arr = acc.getArray();
    if (!arr || arr.length === 0) {
      if (acc.listParents().length <= 1) { // only root reference
        acc.dispose();
        result.emptyAccessorsRemoved++;
      }
    }
  }

  return result;
}

// ─── Phase 2: Output Repair ───

/**
 * Ensure output quality after optimization.
 * - Regenerate normals if missing or broken after simplify/quantize
 * - Remove tangents invalidated by optimization steps
 * - Final NaN sweep
 */
export async function repairOutput(doc: Document): Promise<GeometryFixResult> {
  const result: GeometryFixResult = {
    invalidVerticesFixed: 0, normalsRegenerated: 0,
    tangentsRemoved: 0, emptyAccessorsRemoved: 0, totalPrimitivesProcessed: 0,
  };

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      result.totalPrimitivesProcessed++;

      // Final NaN sweep on positions
      const posAcc = prim.getAttribute('POSITION');
      if (posAcc) {
        const arr = posAcc.getArray();
        if (arr && arr instanceof Float32Array && hasNonFinite(arr)) {
          result.invalidVerticesFixed += fixNonFinite(arr);
        }
      }

      // Validate/regenerate normals
      const normAcc = prim.getAttribute('NORMAL');
      if (!normAcc) {
        // Normals missing — generate them
        const newNorm = computeNormals(prim, doc);
        if (newNorm) { prim.setAttribute('NORMAL', newNorm); result.normalsRegenerated++; }
      } else if (!isNormalValid(normAcc)) {
        const newNorm = computeNormals(prim, doc);
        if (newNorm) { prim.setAttribute('NORMAL', newNorm); result.normalsRegenerated++; }
      }

      // Validate tangents — remove if broken
      const tanAcc = prim.getAttribute('TANGENT');
      if (tanAcc && !isTangentValid(tanAcc)) {
        prim.setAttribute('TANGENT', null);
        result.tangentsRemoved++;
      }

      // Sweep UVs
      for (const sem of ['TEXCOORD_0', 'TEXCOORD_1']) {
        const uvAcc = prim.getAttribute(sem);
        if (uvAcc) {
          const arr = uvAcc.getArray();
          if (arr && arr instanceof Float32Array && hasNonFinite(arr)) {
            result.invalidVerticesFixed += fixNonFinite(arr);
          }
        }
      }
    }
  }

  // Clean up orphaned accessors
  for (const acc of doc.getRoot().listAccessors()) {
    const arr = acc.getArray();
    if (!arr || arr.length === 0) {
      if (acc.listParents().length <= 1) {
        acc.dispose();
        result.emptyAccessorsRemoved++;
      }
    }
  }

  return result;
}
