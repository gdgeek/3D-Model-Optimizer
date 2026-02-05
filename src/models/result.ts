/**
 * Optimization Result and Statistics Interfaces
 *
 * This module defines all result and statistics interfaces for GLB model optimization.
 * Each interface corresponds to the output of a specific optimization operation:
 * - OptimizationResult: Complete result of the optimization pipeline
 * - OptimizationStepResult: Result of a single optimization step
 * - SimplifyStats: Statistics from mesh simplification
 * - DracoStats: Statistics from Draco compression
 * - TextureStats: Statistics from texture compression
 * - QuantizeStats: Statistics from vertex quantization
 * - MergeStats: Statistics from mesh merging
 * - CleanStats: Statistics from resource cleanup
 *
 * @module models/result
 */

/**
 * Complete result of the optimization pipeline.
 * Contains overall statistics and individual step results.
 *
 * @see Requirements 8.4
 */
export interface OptimizationResult {
  /**
   * Unique identifier for the optimization task.
   * Used to retrieve the optimized file via download endpoint.
   */
  taskId: string;

  /**
   * Whether the optimization completed successfully.
   */
  success: boolean;

  /**
   * URL to download the optimized GLB file.
   * Format: /api/download/:taskId
   */
  downloadUrl: string;

  /**
   * Total processing time in milliseconds.
   *
   * @see Requirements 9.6
   */
  processingTime: number;

  /**
   * Original file size in bytes before optimization.
   */
  originalSize: number;

  /**
   * Optimized file size in bytes after optimization.
   */
  optimizedSize: number;

  /**
   * Compression ratio (optimizedSize / originalSize).
   * Value < 1 indicates size reduction.
   *
   * @example 0.5 // File reduced to 50% of original size
   */
  compressionRatio: number;

  /**
   * Results from each optimization step that was executed.
   * Steps are ordered according to pipeline execution order.
   */
  steps: OptimizationStepResult[];
}

/**
 * Result of a single optimization step in the pipeline.
 *
 * @see Requirements 8.3, 8.4
 */
export interface OptimizationStepResult {
  /**
   * Name of the optimization step.
   * One of: 'clean', 'merge', 'simplify', 'quantize', 'draco', 'texture'
   */
  step: string;

  /**
   * Whether this step completed successfully.
   */
  success: boolean;

  /**
   * Duration of this step in milliseconds.
   */
  duration: number;

  /**
   * Step-specific statistics.
   * Type depends on the step:
   * - clean: CleanStats
   * - merge: MergeStats
   * - simplify: SimplifyStats
   * - quantize: QuantizeStats
   * - draco: DracoStats
   * - texture: TextureStats
   */
  stats: Record<string, unknown>;

  /**
   * Error message if the step failed.
   * Only present when success is false.
   */
  error?: string;
}

/**
 * Statistics from mesh simplification using meshoptimizer.
 *
 * @see Requirements 2.6
 */
export interface SimplifyStats {
  /**
   * Total number of triangles before simplification.
   */
  originalTriangles: number;

  /**
   * Total number of triangles after simplification.
   */
  simplifiedTriangles: number;

  /**
   * Reduction ratio (simplifiedTriangles / originalTriangles).
   * Value < 1 indicates triangle count reduction.
   *
   * @example 0.5 // Triangles reduced to 50% of original
   */
  reductionRatio: number;

  /**
   * Number of meshes that were processed during simplification.
   */
  meshesProcessed: number;
}

/**
 * Statistics from Draco geometry compression.
 *
 * @see Requirements 3.5
 */
export interface DracoStats {
  /**
   * Number of meshes that were compressed with Draco.
   */
  meshesCompressed: number;

  /**
   * Original geometry data size in bytes before compression.
   */
  originalSize: number;

  /**
   * Compressed geometry data size in bytes after compression.
   */
  compressedSize: number;

  /**
   * Compression ratio (compressedSize / originalSize).
   * Value < 1 indicates size reduction.
   *
   * @example 0.3 // Geometry compressed to 30% of original size
   */
  compressionRatio: number;
}

/**
 * Statistics from texture compression using Basis Universal.
 *
 * @see Requirements 4.6
 */
export interface TextureStats {
  /**
   * Number of textures that were processed.
   */
  texturesProcessed: number;

  /**
   * Total original size of all textures in bytes.
   */
  originalSize: number;

  /**
   * Total compressed size of all textures in bytes.
   */
  compressedSize: number;

  /**
   * Overall compression ratio (compressedSize / originalSize).
   * Value < 1 indicates size reduction.
   */
  compressionRatio: number;

  /**
   * Detailed information for each processed texture.
   */
  details: TextureDetail[];
}

/**
 * Detailed information for a single compressed texture.
 *
 * @see Requirements 4.6
 */
export interface TextureDetail {
  /**
   * Name or identifier of the texture.
   */
  name: string;

  /**
   * Original format of the texture (e.g., 'image/png', 'image/jpeg').
   */
  originalFormat: string;

  /**
   * Original size of the texture in bytes.
   */
  originalSize: number;

  /**
   * Compressed size of the texture in bytes.
   */
  compressedSize: number;
}

/**
 * Statistics from vertex attribute quantization.
 *
 * @see Requirements 5.7
 */
export interface QuantizeStats {
  /**
   * List of attribute types that were quantized.
   * Possible values: 'POSITION', 'NORMAL', 'TEXCOORD', 'COLOR', 'TANGENT'
   */
  attributesQuantized: string[];

  /**
   * Original accessor data size in bytes before quantization.
   */
  originalSize: number;

  /**
   * Quantized accessor data size in bytes after quantization.
   */
  quantizedSize: number;

  /**
   * Reduction ratio (quantizedSize / originalSize).
   * Value < 1 indicates size reduction.
   */
  reductionRatio: number;
}

/**
 * Statistics from mesh merging operation.
 *
 * @see Requirements 6.2
 */
export interface MergeStats {
  /**
   * Number of meshes before merging.
   */
  originalMeshCount: number;

  /**
   * Number of meshes after merging.
   */
  mergedMeshCount: number;

  /**
   * Number of meshes that were reduced (originalMeshCount - mergedMeshCount).
   */
  meshesReduced: number;
}

/**
 * Statistics from resource cleanup operation.
 *
 * @see Requirements 7.3
 */
export interface CleanStats {
  /**
   * Number of unused nodes removed from the scene graph.
   */
  nodesRemoved: number;

  /**
   * Number of unused materials removed.
   */
  materialsRemoved: number;

  /**
   * Number of unused textures removed.
   */
  texturesRemoved: number;
}

/**
 * Union type for all step-specific statistics.
 * Useful for type-safe handling of step results.
 */
export type StepStats =
  | SimplifyStats
  | DracoStats
  | TextureStats
  | QuantizeStats
  | MergeStats
  | CleanStats;

/**
 * Mapping of step names to their statistics types.
 */
export interface StepStatsMap {
  clean: CleanStats;
  merge: MergeStats;
  simplify: SimplifyStats;
  quantize: QuantizeStats;
  draco: DracoStats;
  texture: TextureStats;
}

/**
 * Valid step names in the optimization pipeline.
 */
export const OPTIMIZATION_STEPS = [
  'clean',
  'merge',
  'simplify',
  'quantize',
  'draco',
  'texture',
] as const;

export type OptimizationStep = (typeof OPTIMIZATION_STEPS)[number];

/**
 * Helper function to create a successful step result.
 *
 * @param step - Name of the optimization step
 * @param duration - Duration in milliseconds
 * @param stats - Step-specific statistics
 * @returns A successful OptimizationStepResult
 */
export function createSuccessStepResult(
  step: string,
  duration: number,
  stats: Record<string, unknown>
): OptimizationStepResult {
  return {
    step,
    success: true,
    duration,
    stats,
  };
}

/**
 * Helper function to create a failed step result.
 *
 * @param step - Name of the optimization step
 * @param duration - Duration in milliseconds
 * @param error - Error message describing the failure
 * @returns A failed OptimizationStepResult
 */
export function createFailedStepResult(
  step: string,
  duration: number,
  error: string
): OptimizationStepResult {
  return {
    step,
    success: false,
    duration,
    stats: {},
    error,
  };
}

/**
 * Helper function to create an OptimizationResult.
 *
 * @param params - Parameters for creating the result
 * @returns A complete OptimizationResult
 */
export function createOptimizationResult(params: {
  taskId: string;
  success: boolean;
  processingTime: number;
  originalSize: number;
  optimizedSize: number;
  steps: OptimizationStepResult[];
}): OptimizationResult {
  const { taskId, success, processingTime, originalSize, optimizedSize, steps } = params;

  return {
    taskId,
    success,
    downloadUrl: `/api/download/${taskId}`,
    processingTime,
    originalSize,
    optimizedSize,
    compressionRatio: originalSize > 0 ? optimizedSize / originalSize : 1,
    steps,
  };
}
