/**
 * Resource Cleaner Component
 *
 * Removes unused resources from GLB models using gltf-transform prune() function.
 * This includes unused nodes, materials, textures, accessors, and other resources.
 *
 * @module components/resource-cleaner
 * @see Requirements 7.1, 7.2, 7.3
 */

import { Document } from '@gltf-transform/core';
import { prune } from '@gltf-transform/functions';
import { CleanOptions, DEFAULT_CLEAN_OPTIONS } from '../models/options';
import { CleanStats } from '../models/result';

/**
 * Resource Cleaner interface for removing unused resources from GLB models.
 */
export interface ResourceCleaner {
  /**
   * Remove unused resources from a gltf-transform Document.
   *
   * @param document - The gltf-transform Document to clean
   * @param options - Cleanup options specifying what to remove
   * @returns Statistics about removed resources
   */
  clean(document: Document, options?: CleanOptions): Promise<CleanStats>;
}

/**
 * Count the number of nodes in a document.
 *
 * @param document - The gltf-transform Document
 * @returns Number of nodes
 */
function countNodes(document: Document): number {
  return document.getRoot().listNodes().length;
}

/**
 * Count the number of materials in a document.
 *
 * @param document - The gltf-transform Document
 * @returns Number of materials
 */
function countMaterials(document: Document): number {
  return document.getRoot().listMaterials().length;
}

/**
 * Count the number of textures in a document.
 *
 * @param document - The gltf-transform Document
 * @returns Number of textures
 */
function countTextures(document: Document): number {
  return document.getRoot().listTextures().length;
}

/**
 * Clean unused resources from a GLB document.
 *
 * Uses gltf-transform's prune() function to remove:
 * - Unused nodes (empty leaf nodes)
 * - Unused materials (not referenced by any mesh)
 * - Unused textures (not referenced by any material)
 * - Unused accessors, buffers, and other resources
 *
 * @param document - The gltf-transform Document to clean
 * @param options - Cleanup options (optional, defaults to removing all unused resources)
 * @returns Statistics about removed resources
 *
 * @example
 * ```typescript
 * import { Document } from '@gltf-transform/core';
 * import { clean } from './resource-cleaner';
 *
 * const document = new Document();
 * // ... load or create document ...
 *
 * const stats = await clean(document, {
 *   enabled: true,
 *   removeUnusedNodes: true,
 *   removeUnusedMaterials: true,
 *   removeUnusedTextures: true,
 * });
 *
 * console.log(`Removed ${stats.nodesRemoved} nodes`);
 * console.log(`Removed ${stats.materialsRemoved} materials`);
 * console.log(`Removed ${stats.texturesRemoved} textures`);
 * ```
 *
 * @see Requirements 7.1 - Remove unused nodes
 * @see Requirements 7.2 - Remove unused materials
 * @see Requirements 7.3 - Return cleanup statistics
 */
export async function clean(
  document: Document,
  options?: CleanOptions
): Promise<CleanStats> {
  // Merge with default options
  const mergedOptions: CleanOptions = {
    enabled: true,
    ...DEFAULT_CLEAN_OPTIONS,
    ...options,
  };

  // If cleanup is disabled, return zero stats
  if (!mergedOptions.enabled) {
    return {
      nodesRemoved: 0,
      materialsRemoved: 0,
      texturesRemoved: 0,
    };
  }

  // Count resources before cleanup
  const nodesBefore = countNodes(document);
  const materialsBefore = countMaterials(document);
  const texturesBefore = countTextures(document);

  // Build prune options based on CleanOptions
  // The prune() function removes all unused resources by default
  // We can control what gets pruned by setting keepAttributes, keepIndices, etc.
  // However, the main control is through what we want to keep vs remove
  const pruneOptions: Parameters<typeof prune>[0] = {
    // Keep leaf nodes if we don't want to remove unused nodes
    keepLeaves: !mergedOptions.removeUnusedNodes,
    // Keep solid textures (1x1 textures used as placeholders)
    keepSolidTextures: false,
  };

  // Apply the prune transform
  await document.transform(prune(pruneOptions));

  // Count resources after cleanup
  const nodesAfter = countNodes(document);
  const materialsAfter = countMaterials(document);
  const texturesAfter = countTextures(document);

  // Calculate removed counts
  const stats: CleanStats = {
    nodesRemoved: nodesBefore - nodesAfter,
    materialsRemoved: materialsBefore - materialsAfter,
    texturesRemoved: texturesBefore - texturesAfter,
  };

  return stats;
}

/**
 * Create a ResourceCleaner instance.
 *
 * @returns A ResourceCleaner instance
 */
export function createResourceCleaner(): ResourceCleaner {
  return {
    clean,
  };
}

/**
 * Default export for convenience.
 */
export default {
  clean,
  createResourceCleaner,
};
