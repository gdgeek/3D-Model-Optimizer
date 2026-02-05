import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';
import {
  compressTextures,
  createTextureCompressor,
  OptimizationError,
} from '../../src/components/texture-compressor';
import { TextureOptions, TEXTURE_MODES } from '../../src/models/options';
import { ERROR_CODES } from '../../src/models/error';

/**
 * Helper function to create a simple 2x2 PNG image buffer.
 * This creates a minimal valid PNG for testing purposes.
 */
function createSimplePngBuffer(): Uint8Array {
  // Minimal 2x2 red PNG image
  // PNG signature + IHDR + IDAT + IEND chunks
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR length
    0x49, 0x48, 0x44, 0x52, // IHDR type
    0x00, 0x00, 0x00, 0x02, // width: 2
    0x00, 0x00, 0x00, 0x02, // height: 2
    0x08, 0x02, // bit depth: 8, color type: RGB
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x90, 0x77, 0x53, 0xde, // CRC
    0x00, 0x00, 0x00, 0x14, // IDAT length
    0x49, 0x44, 0x41, 0x54, // IDAT type
    0x78, 0x9c, 0x62, 0xf8, 0xcf, 0xc0, 0xc0, 0xc0, // compressed data
    0xc0, 0xc0, 0xc0, 0xc0, 0xc0, 0x00, 0x00, 0x00,
    0x19, 0x00, 0x05,
    0x5b, 0x9c, 0x4a, 0x9d, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4e, 0x44, // IEND type
    0xae, 0x42, 0x60, 0x82, // CRC
  ]);
}

/**
 * Helper function to create a document with a texture.
 */
function createDocumentWithTexture(textureName: string = 'testTexture'): Document {
  const document = new Document();
  const texture = document.createTexture(textureName);
  texture.setImage(createSimplePngBuffer());
  texture.setMimeType('image/png');

  // Create a material that uses the texture
  const material = document.createMaterial('testMaterial');
  material.setBaseColorTexture(texture);

  // Create a basic mesh with the material
  const mesh = document.createMesh('testMesh');
  const primitive = document.createPrimitive();
  primitive.setMaterial(material);

  // Create position data
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]);
  const positionAccessor = document.createAccessor('position');
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(positions);
  primitive.setAttribute('POSITION', positionAccessor);

  // Create UV data
  const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
  const uvAccessor = document.createAccessor('uv');
  uvAccessor.setType('VEC2');
  uvAccessor.setArray(uvs);
  primitive.setAttribute('TEXCOORD_0', uvAccessor);

  mesh.addPrimitive(primitive);

  // Add to scene
  const node = document.createNode('testNode');
  node.setMesh(mesh);
  const scene = document.createScene('mainScene');
  scene.addChild(node);

  return document;
}

/**
 * Helper function to create a document with multiple textures.
 */
function createDocumentWithMultipleTextures(count: number): Document {
  const document = new Document();

  for (let i = 0; i < count; i++) {
    const texture = document.createTexture(`texture_${i}`);
    texture.setImage(createSimplePngBuffer());
    texture.setMimeType('image/png');

    const material = document.createMaterial(`material_${i}`);
    material.setBaseColorTexture(texture);
  }

  return document;
}

describe('compressTextures', () => {
  describe('basic functionality', () => {
    it('should return TextureStats with correct structure', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats).toHaveProperty('texturesProcessed');
      expect(stats).toHaveProperty('originalSize');
      expect(stats).toHaveProperty('compressedSize');
      expect(stats).toHaveProperty('compressionRatio');
      expect(stats).toHaveProperty('details');
    });

    it('should return zero stats for document without textures (Requirement 4.7)', async () => {
      const document = new Document();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.texturesProcessed).toBe(0);
      expect(stats.originalSize).toBe(0);
      expect(stats.compressedSize).toBe(0);
      expect(stats.compressionRatio).toBe(1);
      expect(stats.details).toEqual([]);
    });

    it('should count textures correctly', async () => {
      const document = createDocumentWithMultipleTextures(3);
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.texturesProcessed).toBe(3);
      expect(stats.details.length).toBe(3);
    });

    it('should calculate original size correctly', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      // Original size should be > 0 for a document with textures
      expect(stats.originalSize).toBeGreaterThan(0);
    });
  });

  describe('mode validation', () => {
    it('should accept ETC1S mode (Requirement 4.2)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S' };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept UASTC mode (Requirement 4.3)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'UASTC' };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should default to ETC1S mode when not specified (Requirement 4.4)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };

      // Should not throw and should complete successfully
      const stats = await compressTextures(document, options);
      expect(stats).toBeDefined();
    });

    it('should reject invalid mode', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'INVALID' as 'ETC1S' };

      await expect(compressTextures(document, options)).rejects.toThrow(OptimizationError);

      try {
        await compressTextures(document, options);
      } catch (error) {
        expect(error).toBeInstanceOf(OptimizationError);
        expect((error as OptimizationError).code).toBe(ERROR_CODES.INVALID_OPTIONS);
        expect((error as OptimizationError).details?.field).toBe('mode');
      }
    });
  });

  describe('quality validation (Requirement 4.5)', () => {
    it('should accept valid ETC1S quality (1-255)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S', quality: 128 };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept minimum ETC1S quality (1)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S', quality: 1 };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept maximum ETC1S quality (255)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S', quality: 255 };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should reject ETC1S quality below 1', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S', quality: 0 };

      await expect(compressTextures(document, options)).rejects.toThrow(OptimizationError);

      try {
        await compressTextures(document, options);
      } catch (error) {
        expect(error).toBeInstanceOf(OptimizationError);
        expect((error as OptimizationError).code).toBe(ERROR_CODES.INVALID_OPTIONS);
        expect((error as OptimizationError).details?.field).toBe('quality');
      }
    });

    it('should reject ETC1S quality above 255', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S', quality: 256 };

      await expect(compressTextures(document, options)).rejects.toThrow(OptimizationError);
    });

    it('should accept valid UASTC quality (0-4)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'UASTC', quality: 2 };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept minimum UASTC quality (0)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'UASTC', quality: 0 };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept maximum UASTC quality (4)', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'UASTC', quality: 4 };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should reject UASTC quality above 4', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'UASTC', quality: 5 };

      await expect(compressTextures(document, options)).rejects.toThrow(OptimizationError);
    });

    it('should reject non-integer quality values', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true, mode: 'ETC1S', quality: 128.5 };

      await expect(compressTextures(document, options)).rejects.toThrow(OptimizationError);
    });
  });

  describe('slots option', () => {
    it('should accept valid slots array', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = {
        enabled: true,
        slots: ['baseColorTexture'],
      };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept empty slots array', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = {
        enabled: true,
        slots: [],
      };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });

    it('should accept multiple slots', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = {
        enabled: true,
        slots: ['baseColorTexture', 'normalTexture', 'metallicRoughnessTexture'],
      };

      await expect(compressTextures(document, options)).resolves.toBeDefined();
    });
  });

  describe('compression statistics (Requirement 4.6)', () => {
    it('should return details for each texture', async () => {
      const document = createDocumentWithMultipleTextures(2);
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.details.length).toBe(2);
      for (const detail of stats.details) {
        expect(detail).toHaveProperty('name');
        expect(detail).toHaveProperty('originalFormat');
        expect(detail).toHaveProperty('originalSize');
        expect(detail).toHaveProperty('compressedSize');
      }
    });

    it('should include texture name in details', async () => {
      const document = createDocumentWithTexture('myTexture');
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.details.length).toBe(1);
      expect(stats.details[0].name).toBe('myTexture');
    });

    it('should include original format in details', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.details.length).toBe(1);
      expect(stats.details[0].originalFormat).toBe('image/png');
    });

    it('should return positive original size for textures', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.originalSize).toBeGreaterThan(0);
      expect(stats.details[0].originalSize).toBeGreaterThan(0);
    });

    it('should return non-negative compressed size', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      expect(stats.compressedSize).toBeGreaterThanOrEqual(0);
      expect(stats.details[0].compressedSize).toBeGreaterThanOrEqual(0);
    });

    it('should return compression ratio <= 1 or >= 1 depending on compression', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };
      const stats = await compressTextures(document, options);

      // Compression ratio should be a valid number
      expect(typeof stats.compressionRatio).toBe('number');
      expect(stats.compressionRatio).toBeGreaterThan(0);
    });
  });

  describe('default options', () => {
    it('should use default mode ETC1S when not specified', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };

      // Should not throw and should complete successfully
      const stats = await compressTextures(document, options);
      expect(stats).toBeDefined();
    });

    it('should use default quality when not specified', async () => {
      const document = createDocumentWithTexture();
      const options: TextureOptions = { enabled: true };

      // Should not throw and should complete successfully
      const stats = await compressTextures(document, options);
      expect(stats).toBeDefined();
    });
  });
});

describe('createTextureCompressor', () => {
  it('should create a TextureCompressor instance', () => {
    const compressor = createTextureCompressor();
    expect(compressor).toBeDefined();
    expect(typeof compressor.compress).toBe('function');
  });

  it('should have a working compress method', async () => {
    const compressor = createTextureCompressor();
    const document = createDocumentWithTexture();
    const options: TextureOptions = { enabled: true };

    const stats = await compressor.compress(document, options);
    expect(stats).toBeDefined();
    expect(stats.texturesProcessed).toBe(1);
  });

  it('should handle empty document', async () => {
    const compressor = createTextureCompressor();
    const document = new Document();
    const options: TextureOptions = { enabled: true };

    const stats = await compressor.compress(document, options);
    expect(stats.texturesProcessed).toBe(0);
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
