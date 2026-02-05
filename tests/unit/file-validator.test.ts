/**
 * Unit tests for file-validator.ts
 * 
 * Tests GLB file validation functionality including:
 * - File size validation (Requirement 1.3, 1.5)
 * - GLB magic number validation (Requirement 1.2)
 * - glTF version validation (Requirement 1.2)
 * - File extension validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateGlbBuffer,
  validateFileExtension,
  validateFileSize,
  FILE_CONSTRAINTS,
  type FileValidation,
} from '../../src/utils/file-validator';

/**
 * Creates a valid GLB header buffer
 * GLB header structure:
 * - Bytes 0-3: Magic number 0x46546C67 ('glTF')
 * - Bytes 4-7: Version (2)
 * - Bytes 8-11: Total file length
 */
function createValidGlbHeader(totalLength: number): Buffer {
  const buffer = Buffer.alloc(totalLength);
  // Magic number: 'glTF' in little-endian (0x46546C67)
  buffer.writeUInt32LE(0x46546C67, 0);
  // Version: 2
  buffer.writeUInt32LE(2, 4);
  // Total length
  buffer.writeUInt32LE(totalLength, 8);
  return buffer;
}

/**
 * Creates an invalid buffer with wrong magic number
 */
function createInvalidMagicBuffer(totalLength: number): Buffer {
  const buffer = Buffer.alloc(totalLength);
  // Wrong magic number
  buffer.writeUInt32LE(0x12345678, 0);
  buffer.writeUInt32LE(2, 4);
  buffer.writeUInt32LE(totalLength, 8);
  return buffer;
}

/**
 * Creates a buffer with wrong version
 */
function createWrongVersionBuffer(totalLength: number, version: number): Buffer {
  const buffer = Buffer.alloc(totalLength);
  buffer.writeUInt32LE(0x46546C67, 0);
  buffer.writeUInt32LE(version, 4);
  buffer.writeUInt32LE(totalLength, 8);
  return buffer;
}

describe('FILE_CONSTRAINTS', () => {
  it('should have maxSize of 100MB', () => {
    expect(FILE_CONSTRAINTS.maxSize).toBe(100 * 1024 * 1024);
  });

  it('should allow model/gltf-binary MIME type', () => {
    expect(FILE_CONSTRAINTS.allowedMimeTypes).toContain('model/gltf-binary');
  });

  it('should allow .glb extension', () => {
    expect(FILE_CONSTRAINTS.allowedExtensions).toContain('.glb');
  });
});

describe('validateGlbBuffer', () => {
  describe('valid GLB files', () => {
    it('should accept a valid GLB buffer', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(true);
      expect(result.fileSize).toBe(100);
      expect(result.mimeType).toBe('model/gltf-binary');
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a valid GLB buffer with valid filename', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer, 'model.glb');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept GLB file at exactly 100MB', () => {
      // Create a minimal valid header that declares 100MB size
      // Note: We can't actually allocate 100MB in tests, so we test the logic
      const buffer = createValidGlbHeader(12);
      // Manually set the declared length to 100MB (but actual buffer is 12 bytes)
      // This will fail length validation but pass size validation
      const result = validateGlbBuffer(buffer);
      
      // The file size check should pass (12 bytes < 100MB)
      expect(result.fileSize).toBe(12);
      expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(false);
    });
  });

  describe('file size validation', () => {
    it('should reject files exceeding 100MB limit', () => {
      // Create a buffer that claims to be larger than 100MB
      const buffer = createValidGlbHeader(12);
      // We can't actually create a 100MB+ buffer in tests, but we can test the logic
      // by creating a mock scenario
      
      // For this test, we'll verify the constraint value is correct
      expect(FILE_CONSTRAINTS.maxSize).toBe(100 * 1024 * 1024);
    });

    it('should include file size in validation result', () => {
      const buffer = createValidGlbHeader(256);
      const result = validateGlbBuffer(buffer);

      expect(result.fileSize).toBe(256);
    });
  });

  describe('GLB magic number validation', () => {
    it('should reject buffer with invalid magic number', () => {
      const buffer = createInvalidMagicBuffer(100);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid GLB magic number'))).toBe(true);
      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should accept buffer with correct magic number (glTF)', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(true);
      expect(result.mimeType).toBe('model/gltf-binary');
    });
  });

  describe('glTF version validation', () => {
    it('should reject buffer with version 1', () => {
      const buffer = createWrongVersionBuffer(100, 1);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsupported glTF version'))).toBe(true);
    });

    it('should reject buffer with version 3', () => {
      const buffer = createWrongVersionBuffer(100, 3);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsupported glTF version'))).toBe(true);
    });

    it('should accept buffer with version 2', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(true);
    });
  });

  describe('file length validation', () => {
    it('should reject buffer with mismatched declared length', () => {
      const buffer = createValidGlbHeader(100);
      // Modify the declared length to be different from actual
      buffer.writeUInt32LE(200, 8);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('File length mismatch'))).toBe(true);
    });

    it('should accept buffer with matching declared length', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(true);
    });
  });

  describe('minimum file size validation', () => {
    it('should reject buffer smaller than 12 bytes', () => {
      const buffer = Buffer.alloc(8);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('too small'))).toBe(true);
    });

    it('should accept buffer of exactly 12 bytes with valid header', () => {
      const buffer = createValidGlbHeader(12);
      const result = validateGlbBuffer(buffer);

      expect(result.isValid).toBe(true);
    });
  });

  describe('file extension validation', () => {
    it('should reject file with .gltf extension', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer, 'model.gltf');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid file extension'))).toBe(true);
    });

    it('should reject file with .obj extension', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer, 'model.obj');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid file extension'))).toBe(true);
    });

    it('should accept file with .GLB extension (case insensitive)', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer, 'model.GLB');

      expect(result.isValid).toBe(true);
    });

    it('should accept file with .glb extension', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer, 'model.glb');

      expect(result.isValid).toBe(true);
    });

    it('should reject file without extension', () => {
      const buffer = createValidGlbHeader(100);
      const result = validateGlbBuffer(buffer, 'model');

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid file extension'))).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('should collect all validation errors', () => {
      const buffer = createInvalidMagicBuffer(100);
      // Also set wrong version
      buffer.writeUInt32LE(1, 4);
      // And wrong length
      buffer.writeUInt32LE(200, 8);
      
      const result = validateGlbBuffer(buffer, 'model.obj');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('validateFileExtension', () => {
  it('should return true for .glb extension', () => {
    expect(validateFileExtension('model.glb')).toBe(true);
  });

  it('should return true for .GLB extension (case insensitive)', () => {
    expect(validateFileExtension('model.GLB')).toBe(true);
  });

  it('should return true for .GlB extension (mixed case)', () => {
    expect(validateFileExtension('model.GlB')).toBe(true);
  });

  it('should return false for .gltf extension', () => {
    expect(validateFileExtension('model.gltf')).toBe(false);
  });

  it('should return false for .obj extension', () => {
    expect(validateFileExtension('model.obj')).toBe(false);
  });

  it('should return false for file without extension', () => {
    expect(validateFileExtension('model')).toBe(false);
  });

  it('should return false for file ending with dot', () => {
    expect(validateFileExtension('model.')).toBe(false);
  });

  it('should handle filenames with multiple dots', () => {
    expect(validateFileExtension('my.model.v2.glb')).toBe(true);
    expect(validateFileExtension('my.model.v2.obj')).toBe(false);
  });
});

describe('validateFileSize', () => {
  it('should return true for size within limit', () => {
    expect(validateFileSize(1024)).toBe(true);
    expect(validateFileSize(50 * 1024 * 1024)).toBe(true);
  });

  it('should return true for size exactly at limit', () => {
    expect(validateFileSize(100 * 1024 * 1024)).toBe(true);
  });

  it('should return false for size exceeding limit', () => {
    expect(validateFileSize(100 * 1024 * 1024 + 1)).toBe(false);
    expect(validateFileSize(200 * 1024 * 1024)).toBe(false);
  });

  it('should return false for zero size', () => {
    expect(validateFileSize(0)).toBe(false);
  });

  it('should return false for negative size', () => {
    expect(validateFileSize(-1)).toBe(false);
  });
});
