import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';
import { compressDraco, createDracoCompressor, OptimizationError } from '../../src/components/draco-compressor';
import { DracoOptions, DRACO_COMPRESSION_LEVEL_RANGE } from '../../src/models/options';
import { ERROR_CODES } from '../../src/models/error';

/**
 * Helper function to create a basic mesh with position and normal attributes.
 */
function createBasicMesh(document: Document, meshName: string): void {
  const mesh = document.createMesh(meshName);
  const primitive = document.createPrimitive();
  
  // Create position data (3 vertices forming a triangle)
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0.5, 1, 0,
  ]);
  
  // Create normal data
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  
  // Create UV data
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0.5, 1,
  ]);
  
  // Create indices
  const indices = new Uint16Array([0, 1, 2]);

  // Create accessors
  const positionAccessor = document.createAccessor(meshName + '_position');
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(positions);
  primitive.setAttribute('POSITION', positionAccessor);

  const normalAccessor = document.createAccessor(meshName + '_normal');
  normalAccessor.setType('VEC3');
  normalAccessor.setArray(normals);
  primitive.setAttribute('NORMAL', normalAccessor);

  const uvAccessor = document.createAccessor(meshName + '_uv');
  uvAccessor.setType('VEC2');
  uvAccessor.setArray(uvs);
  primitive.setAttribute('TEXCOORD_0', uvAccessor);

  const indexAccessor = document.createAccessor(meshName + '_indices');
  indexAccessor.setType('SCALAR');
  indexAccessor.setArray(indices);
  primitive.setIndices(indexAccessor);

  mesh.addPrimitive(primitive);
  
  // Add mesh to scene
  const node = document.createNode(meshName + '_node');
  node.setMesh(mesh);
  const scene = document.getRoot().listScenes()[0] || document.createScene('scene');
  scene.addChild(node);
}

/**
 * Helper function to create a document with a basic mesh.
 */
function createDocumentWithBasicMesh(): Document {
  const document = new Document();
  document.createScene('mainScene');
  createBasicMesh(document, 'testMesh');
  return document;
}

/**
 * Helper function to create a document with multiple meshes.
 */
function createDocumentWithMultipleMeshes(count: number): Document {
  const document = new Document();
  document.createScene('mainScene');
  for (let i = 0; i < count; i++) {
    createBasicMesh(document, `mesh_${i}`);
  }
  return document;
}

describe('compressDraco', () => {
  describe('basic functionality', () => {
    it('should return DracoStats with correct structure', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      expect(stats).toHaveProperty('meshesCompressed');
      expect(stats).toHaveProperty('originalSize');
      expect(stats).toHaveProperty('compressedSize');
      expect(stats).toHaveProperty('compressionRatio');
    });

    it('should return zero stats for empty document', async () => {
      const document = new Document();
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      expect(stats.meshesCompressed).toBe(0);
      expect(stats.originalSize).toBe(0);
      expect(stats.compressedSize).toBe(0);
      expect(stats.compressionRatio).toBe(1);
    });

    it('should count meshes correctly', async () => {
      const document = createDocumentWithMultipleMeshes(3);
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      expect(stats.meshesCompressed).toBe(3);
    });

    it('should calculate original size correctly', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      // Original size should be > 0 for a document with geometry
      expect(stats.originalSize).toBeGreaterThan(0);
    });
  });

  describe('compression level validation', () => {
    it('should accept compression level 0 (minimum)', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, compressionLevel: 0 };
      
      await expect(compressDraco(document, options)).resolves.toBeDefined();
    });

    it('should accept compression level 10 (maximum)', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, compressionLevel: 10 };
      
      await expect(compressDraco(document, options)).resolves.toBeDefined();
    });

    it('should accept default compression level 7', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, compressionLevel: 7 };
      
      await expect(compressDraco(document, options)).resolves.toBeDefined();
    });

    it('should reject compression level below 0', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, compressionLevel: -1 };
      
      await expect(compressDraco(document, options)).rejects.toThrow(OptimizationError);
      
      try {
        await compressDraco(document, options);
      } catch (error) {
        expect(error).toBeInstanceOf(OptimizationError);
        expect((error as OptimizationError).code).toBe(ERROR_CODES.INVALID_OPTIONS);
        expect((error as OptimizationError).details?.field).toBe('compressionLevel');
      }
    });

    it('should reject compression level above 10', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, compressionLevel: 11 };
      
      await expect(compressDraco(document, options)).rejects.toThrow(OptimizationError);
      
      try {
        await compressDraco(document, options);
      } catch (error) {
        expect(error).toBeInstanceOf(OptimizationError);
        expect((error as OptimizationError).code).toBe(ERROR_CODES.INVALID_OPTIONS);
      }
    });
  });

  describe('quantization options validation', () => {
    it('should accept valid quantizePosition value', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, quantizePosition: 14 };
      
      await expect(compressDraco(document, options)).resolves.toBeDefined();
    });

    it('should accept valid quantizeNormal value', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, quantizeNormal: 10 };
      
      await expect(compressDraco(document, options)).resolves.toBeDefined();
    });

    it('should accept valid quantizeTexcoord value', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, quantizeTexcoord: 12 };
      
      await expect(compressDraco(document, options)).resolves.toBeDefined();
    });

    it('should reject quantizePosition below 1', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, quantizePosition: 0 };
      
      await expect(compressDraco(document, options)).rejects.toThrow(OptimizationError);
    });

    it('should reject quantizePosition above 30', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, quantizePosition: 31 };
      
      await expect(compressDraco(document, options)).rejects.toThrow(OptimizationError);
    });

    it('should reject non-integer quantization values', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true, quantizePosition: 14.5 };
      
      await expect(compressDraco(document, options)).rejects.toThrow(OptimizationError);
    });
  });

  describe('default options', () => {
    it('should use default compression level 7 when not specified', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      
      // Should not throw and should complete successfully
      const stats = await compressDraco(document, options);
      expect(stats).toBeDefined();
    });

    it('should use default quantization values when not specified', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      
      // Should not throw and should complete successfully
      const stats = await compressDraco(document, options);
      expect(stats).toBeDefined();
    });
  });

  describe('compression statistics', () => {
    it('should return compression ratio <= 1', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      // Compression ratio should be <= 1 (compressed size <= original size)
      expect(stats.compressionRatio).toBeLessThanOrEqual(1);
    });

    it('should return positive original size for document with geometry', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      expect(stats.originalSize).toBeGreaterThan(0);
    });

    it('should return non-negative compressed size', async () => {
      const document = createDocumentWithBasicMesh();
      const options: DracoOptions = { enabled: true };
      const stats = await compressDraco(document, options);

      expect(stats.compressedSize).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('createDracoCompressor', () => {
  it('should create a DracoCompressor instance', () => {
    const compressor = createDracoCompressor();
    expect(compressor).toBeDefined();
    expect(typeof compressor.compress).toBe('function');
  });

  it('should have a working compress method', async () => {
    const compressor = createDracoCompressor();
    const document = createDocumentWithBasicMesh();
    const options: DracoOptions = { enabled: true };
    
    const stats = await compressor.compress(document, options);
    expect(stats).toBeDefined();
    expect(stats.meshesCompressed).toBe(1);
  });
});

describe('OptimizationError', () => {
  it('should have correct properties', () => {
    const error = new OptimizationError(
      ERROR_CODES.INVALID_OPTIONS,
      'Test error message',
      { field: 'testField' }
    );

    expect(error.name).toBe('OptimizationError');
    expect(error.code).toBe(ERROR_CODES.INVALID_OPTIONS);
    expect(error.message).toBe('Test error message');
    expect(error.details).toEqual({ field: 'testField' });
  });

  it('should be an instance of Error', () => {
    const error = new OptimizationError(ERROR_CODES.INVALID_OPTIONS, 'Test');
    expect(error).toBeInstanceOf(Error);
  });
});
