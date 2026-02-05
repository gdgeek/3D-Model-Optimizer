/**
 * Optimization Components
 * 
 * This module exports all optimization components for the GLB Optimizer Server.
 * Components include:
 * - MeshSimplifier - Mesh simplification using meshoptimizer
 * - DracoCompressor - Draco geometry compression
 * - TextureCompressor - Texture compression (KTX2/Basis Universal)
 * - VertexQuantizer - Vertex quantization
 * - MeshMerger - Mesh merging for same materials
 * - ResourceCleaner - Remove unused resources
 * - OptimizationPipeline - Coordinate optimization steps
 */

// Resource Cleaner - Remove unused resources
export {
  ResourceCleaner,
  clean,
  createResourceCleaner,
} from './resource-cleaner';

// Mesh Merger - Merge meshes with same material
export {
  MeshMerger,
  merge,
  createMeshMerger,
} from './mesh-merger';

// Mesh Simplifier - Reduce polygon count using meshoptimizer
export {
  MeshSimplifier,
  simplifyMesh,
  createMeshSimplifier,
} from './mesh-simplifier';

// Vertex Quantizer - Reduce vertex data precision
export {
  VertexQuantizer,
  quantizeVertices,
  createVertexQuantizer,
} from './vertex-quantizer';

// Draco Compressor - Compress geometry data using google/draco
export {
  DracoCompressor,
  compressDraco,
  createDracoCompressor,
} from './draco-compressor';

// Texture Compressor - Compress textures using Basis Universal (KTX2)
export {
  TextureCompressor,
  compressTextures,
  createTextureCompressor,
} from './texture-compressor';

// Optimization Pipeline - Coordinate all optimization steps
export {
  OptimizationPipeline,
  executePipeline,
  createOptimizationPipeline,
  OPTIMIZATION_ORDER,
  PipelineError,
} from './optimization-pipeline';
