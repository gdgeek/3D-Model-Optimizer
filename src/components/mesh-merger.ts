/**
 * Mesh Merger Component
 *
 * Merges meshes with the same material to reduce draw calls using gltf-transform join() function.
 * This optimization improves rendering performance by reducing the number of draw calls.
 *
 * @module components/mesh-merger
 * @see Requirements 6.1, 6.2, 6.3
 */

import { Document } from '@gltf-transform/core';
import { join } from '@gltf-transform/functions';
import { MergeStats } from '../models/result';

/**
 * Mesh Merger interface for combining meshes with the same material.
 */
export interface MeshMerger {
  /**
   * Merge meshes with the same material in a gltf-transform Document.
   *
   * @param document - The gltf-transform Document to process
   * @returns Statistics about the merge operation
   */
  merge(document: Document): Promise<MergeStats>;
}

/**
 * Count the number of meshes in a document.
 *
 * @param document - The gltf-transform Document
 * @returns Number of meshes
 */
function countMeshes(document: Document): number {
  return document.getRoot().listMeshes().length;
}

/**
 * Merge meshes with the same material in a GLB document.
 *
 * Uses gltf-transform's join() function to merge meshes that share the same material.
 * This reduces the number of draw calls needed to render the model, improving performance.
 *
 * @param document - The gltf-transform Document to process
 * @returns Statistics about the merge operation including:
 *   - originalMeshCount: Number of meshes before merging
 *   - mergedMeshCount: Number of meshes after merging
 *   - meshesReduced: Number of meshes that were eliminated
 *
 * @example
 * ```typescript
 * import { Document } from '@gltf-transform/core';
 * import { merge } from './mesh-merger';
 *
 * const document = new Document();
 * // ... load or create document ...
 *
 * const stats = await merge(document);
 *
 * console.log(`Original meshes: ${stats.originalMeshCount}`);
 * console.log(`Merged meshes: ${stats.mergedMeshCount}`);
 * console.log(`Meshes reduced: ${stats.meshesReduced}`);
 * ```
 *
 * @see Requirements 6.1 - Merge meshes with the same material
 * @see Requirements 6.2 - Return mesh count statistics
 * @see Requirements 6.3 - Return appropriate message if no meshes can be merged
 */
export async function merge(document: Document): Promise<MergeStats> {
  // Count meshes before merging
  const originalMeshCount = countMeshes(document);

  // If there are 0 or 1 meshes, nothing to merge
  if (originalMeshCount <= 1) {
    return {
      originalMeshCount,
      mergedMeshCount: originalMeshCount,
      meshesReduced: 0,
    };
  }

  // Apply the join transform to merge meshes with the same material
  await document.transform(join());

  // Count meshes after merging
  const mergedMeshCount = countMeshes(document);

  // Calculate statistics
  const stats: MergeStats = {
    originalMeshCount,
    mergedMeshCount,
    meshesReduced: originalMeshCount - mergedMeshCount,
  };

  return stats;
}

/**
 * Create a MeshMerger instance.
 *
 * @returns A MeshMerger instance
 */
export function createMeshMerger(): MeshMerger {
  return {
    merge,
  };
}

/**
 * Default export for convenience.
 */
export default {
  merge,
  createMeshMerger,
};
