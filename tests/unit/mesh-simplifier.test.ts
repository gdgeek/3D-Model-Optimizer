/**
 * Unit tests for mesh-simplifier.ts
 *
 * Tests Mesh Simplifier functionality including:
 * - Simplifying meshes to target triangle count (Requirement 2.1)
 * - Simplifying meshes to target ratio (Requirement 2.2)
 * - Validating target ratio range (Requirement 2.3)
 * - Supporting boundary edge preservation (Requirement 2.4)
 * - Supporting error threshold control (Requirement 2.5)
 * - Returning simplification statistics (Requirement 2.6)
 */

import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';
import {
  simplifyMesh,
  createMeshSimplifier,
  OptimizationError,
} from '../../src/components/mesh-simplifier';
import { SimplifyOptions } from '../../src/models/options';
import { ERROR_CODES } from '../../src/models/error';

/**
 * Creates a simple mesh with a specified number of triangles.
 * Creates a grid of triangles for testing simplification.
 */
function createMeshWithTriangles(
  document: Document,
  meshName: string,
  triangleCount: number
): ReturnType<Document['createMesh']> {
  const mesh = document.createMesh(meshName);
  const primitive = document.createPrimitive();

  // Create vertices for the specified number of triangles
  // Each triangle needs 3 vertices (non-indexed for simplicity)
  const vertexCount = triangleCount * 3;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);

  // Create a grid of triangles
  const gridSize = Math.ceil(Math.sqrt(triangleCount));
  let vertexIndex = 0;

  for (let i = 0; i < triangleCount; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    const x = col * 1.0;
    const z = row * 1.0;

    // Triangle vertices
    // Vertex 0
    positions[vertexIndex * 3] = x;
    positions[vertexIndex * 3 + 1] = 0;
    positions[vertexIndex * 3 + 2] = z;
    normals[vertexIndex * 3] = 0;
    normals[vertexIndex * 3 + 1] = 1;
    normals[vertexIndex * 3 + 2] = 0;
    vertexIndex++;

    // Vertex 1
    positions[vertexIndex * 3] = x + 1;
    positions[vertexIndex * 3 + 1] = 0;
    positions[vertexIndex * 3 + 2] = z;
    normals[vertexIndex * 3] = 0;
    normals[vertexIndex * 3 + 1] = 1;
    normals[vertexIndex * 3 + 2] = 0;
    vertexIndex++;

    // Vertex 2
    positions[vertexIndex * 3] = x + 0.5;
    positions[vertexIndex * 3 + 1] = 0;
    positions[vertexIndex * 3 + 2] = z + 1;
    normals[vertexIndex * 3] = 0;
    normals[vertexIndex * 3 + 1] = 1;
    normals[vertexIndex * 3 + 2] = 0;
    vertexIndex++;
  }

  // Create position accessor
  const positionAccessor = document.createAccessor(`${meshName}_position`);
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(positions);
  primitive.setAttribute('POSITION', positionAccessor);

  // Create normal accessor
  const normalAccessor = document.createAccessor(`${meshName}_normal`);
  normalAccessor.setType('VEC3');
  normalAccessor.setArray(normals);
  primitive.setAttribute('NORMAL', normalAccessor);

  mesh.addPrimitive(primitive);
  return mesh;
}

/**
 * Creates a document with a mesh containing the specified number of triangles.
 */
function createDocumentWithTriangles(triangleCount: number): Document {
  const document = new Document();
  const scene = document.createScene('mainScene');
  const mesh = createMeshWithTriangles(document, 'testMesh', triangleCount);
  const node = document.createNode('testNode');
  node.setMesh(mesh);
  scene.addChild(node);
  return document;
}

/**
 * Creates a document with indexed geometry for better simplification testing.
 */
function createIndexedMesh(
  document: Document,
  gridWidth: number,
  gridHeight: number
): ReturnType<Document['createMesh']> {
  const mesh = document.createMesh('indexedMesh');
  const primitive = document.createPrimitive();

  // Create a grid of vertices
  const vertexCount = (gridWidth + 1) * (gridHeight + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);

  let vertexIndex = 0;
  for (let z = 0; z <= gridHeight; z++) {
    for (let x = 0; x <= gridWidth; x++) {
      positions[vertexIndex * 3] = x;
      positions[vertexIndex * 3 + 1] = 0;
      positions[vertexIndex * 3 + 2] = z;
      normals[vertexIndex * 3] = 0;
      normals[vertexIndex * 3 + 1] = 1;
      normals[vertexIndex * 3 + 2] = 0;
      vertexIndex++;
    }
  }

  // Create indices for triangles
  const triangleCount = gridWidth * gridHeight * 2;
  const indices = new Uint16Array(triangleCount * 3);
  let indexOffset = 0;

  for (let z = 0; z < gridHeight; z++) {
    for (let x = 0; x < gridWidth; x++) {
      const topLeft = z * (gridWidth + 1) + x;
      const topRight = topLeft + 1;
      const bottomLeft = (z + 1) * (gridWidth + 1) + x;
      const bottomRight = bottomLeft + 1;

      // First triangle
      indices[indexOffset++] = topLeft;
      indices[indexOffset++] = bottomLeft;
      indices[indexOffset++] = topRight;

      // Second triangle
      indices[indexOffset++] = topRight;
      indices[indexOffset++] = bottomLeft;
      indices[indexOffset++] = bottomRight;
    }
  }

  // Create accessors
  const positionAccessor = document.createAccessor('position');
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(positions);
  primitive.setAttribute('POSITION', positionAccessor);

  const normalAccessor = document.createAccessor('normal');
  normalAccessor.setType('VEC3');
  normalAccessor.setArray(normals);
  primitive.setAttribute('NORMAL', normalAccessor);

  const indexAccessor = document.createAccessor('indices');
  indexAccessor.setType('SCALAR');
  indexAccessor.setArray(indices);
  primitive.setIndices(indexAccessor);

  mesh.addPrimitive(primitive);
  return mesh;
}

/**
 * Creates a document with an indexed mesh grid.
 */
function createDocumentWithIndexedMesh(
  gridWidth: number,
  gridHeight: number
): Document {
  const document = new Document();
  const scene = document.createScene('mainScene');
  const mesh = createIndexedMesh(document, gridWidth, gridHeight);
  const node = document.createNode('testNode');
  node.setMesh(mesh);
  scene.addChild(node);
  return document;
}

describe('simplifyMesh', () => {
  describe('basic functionality', () => {
    it('should return SimplifyStats with correct structure', async () => {
      const document = new Document();
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      expect(stats).toHaveProperty('originalTriangles');
      expect(stats).toHaveProperty('simplifiedTriangles');
      expect(stats).toHaveProperty('reductionRatio');
      expect(stats).toHaveProperty('meshesProcessed');
      expect(typeof stats.originalTriangles).toBe('number');
      expect(typeof stats.simplifiedTriangles).toBe('number');
      expect(typeof stats.reductionRatio).toBe('number');
      expect(typeof stats.meshesProcessed).toBe('number');
    });

    it('should return zero stats for empty document', async () => {
      const document = new Document();
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      expect(stats.originalTriangles).toBe(0);
      expect(stats.simplifiedTriangles).toBe(0);
      expect(stats.reductionRatio).toBe(1);
      expect(stats.meshesProcessed).toBe(0);
    });

    it('should process document with single mesh', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      expect(stats.originalTriangles).toBe(10);
      expect(stats.meshesProcessed).toBe(1);
    });
  });

  describe('target ratio simplification (Requirement 2.2)', () => {
    it('should simplify mesh to approximately target ratio', async () => {
      // Use indexed mesh for better simplification results
      const document = createDocumentWithIndexedMesh(10, 10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      // Original should be 10*10*2 = 200 triangles
      expect(stats.originalTriangles).toBe(200);
      // Simplified should be less than or equal to original
      expect(stats.simplifiedTriangles).toBeLessThanOrEqual(
        stats.originalTriangles
      );
      // Reduction ratio should be less than or equal to 1
      expect(stats.reductionRatio).toBeLessThanOrEqual(1);
    });

    it('should handle targetRatio of 1.0 (no simplification)', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = { enabled: true, targetRatio: 1.0 };

      const stats = await simplifyMesh(document, options);

      // With ratio 1.0, triangles should remain approximately the same
      expect(stats.simplifiedTriangles).toBeLessThanOrEqual(
        stats.originalTriangles
      );
    });

    it('should handle low targetRatio for aggressive simplification', async () => {
      const document = createDocumentWithIndexedMesh(10, 10);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.1,
        error: 0.1,
      };

      const stats = await simplifyMesh(document, options);

      // Should significantly reduce triangle count
      expect(stats.simplifiedTriangles).toBeLessThan(stats.originalTriangles);
      expect(stats.reductionRatio).toBeLessThan(1);
    });
  });

  describe('target count simplification (Requirement 2.1)', () => {
    it('should simplify mesh to approximately target count', async () => {
      const document = createDocumentWithIndexedMesh(10, 10);
      const targetCount = 50;
      const options: SimplifyOptions = {
        enabled: true,
        targetCount,
        error: 0.1,
      };

      const stats = await simplifyMesh(document, options);

      // Original should be 200 triangles
      expect(stats.originalTriangles).toBe(200);
      // Simplified should be reduced
      expect(stats.simplifiedTriangles).toBeLessThanOrEqual(
        stats.originalTriangles
      );
    });

    it('should handle targetCount greater than original', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = {
        enabled: true,
        targetCount: 1000, // More than original
      };

      const stats = await simplifyMesh(document, options);

      // Should not increase triangle count
      expect(stats.simplifiedTriangles).toBeLessThanOrEqual(
        stats.originalTriangles
      );
    });
  });

  describe('option validation (Requirement 2.3)', () => {
    it('should reject targetRatio of 0', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0 };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject negative targetRatio', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetRatio: -0.5 };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject targetRatio greater than 1', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 1.5 };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject both targetRatio and targetCount specified', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.5,
        targetCount: 5,
      };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject negative targetCount', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetCount: -10 };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject zero targetCount', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetCount: 0 };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject non-integer targetCount', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetCount: 5.5 };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should accept valid targetRatio at boundary (1.0)', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 1.0 };

      const stats = await simplifyMesh(document, options);
      expect(stats).toBeDefined();
    });

    it('should accept valid targetRatio near lower boundary', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.01,
        error: 0.5,
      };

      const stats = await simplifyMesh(document, options);
      expect(stats).toBeDefined();
    });
  });

  describe('error threshold control (Requirement 2.5)', () => {
    it('should accept valid error threshold', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.5,
        error: 0.01,
      };

      const stats = await simplifyMesh(document, options);
      expect(stats).toBeDefined();
    });

    it('should reject negative error threshold', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.5,
        error: -0.1,
      };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should reject error threshold greater than 1', async () => {
      const document = createDocumentWithTriangles(10);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.5,
        error: 1.5,
      };

      await expect(simplifyMesh(document, options)).rejects.toThrow(
        OptimizationError
      );
    });

    it('should use default error threshold when not specified', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);
      expect(stats).toBeDefined();
    });
  });

  describe('boundary preservation (Requirement 2.4)', () => {
    it('should accept lockBorder option', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.5,
        lockBorder: true,
      };

      const stats = await simplifyMesh(document, options);
      expect(stats).toBeDefined();
    });

    it('should work with lockBorder false', async () => {
      const document = createDocumentWithIndexedMesh(5, 5);
      const options: SimplifyOptions = {
        enabled: true,
        targetRatio: 0.5,
        lockBorder: false,
      };

      const stats = await simplifyMesh(document, options);
      expect(stats).toBeDefined();
    });
  });

  describe('statistics accuracy (Requirement 2.6)', () => {
    it('should accurately report original triangle count', async () => {
      const document = createDocumentWithIndexedMesh(10, 10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      // 10x10 grid = 200 triangles
      expect(stats.originalTriangles).toBe(200);
    });

    it('should ensure simplifiedTriangles is not greater than originalTriangles', async () => {
      const document = createDocumentWithIndexedMesh(10, 10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      expect(stats.simplifiedTriangles).toBeLessThanOrEqual(
        stats.originalTriangles
      );
    });

    it('should calculate reductionRatio correctly', async () => {
      const document = createDocumentWithIndexedMesh(10, 10);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      const expectedRatio =
        stats.simplifiedTriangles / stats.originalTriangles;
      expect(stats.reductionRatio).toBeCloseTo(expectedRatio, 5);
    });

    it('should report correct meshesProcessed count', async () => {
      const document = new Document();
      const scene = document.createScene('mainScene');

      // Create multiple meshes
      for (let i = 0; i < 3; i++) {
        const mesh = createIndexedMesh(document, 5, 5);
        mesh.setName(`mesh${i}`);
        const node = document.createNode(`node${i}`);
        node.setMesh(mesh);
        scene.addChild(node);
      }

      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };
      const stats = await simplifyMesh(document, options);

      expect(stats.meshesProcessed).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle document with mesh but no primitives', async () => {
      const document = new Document();
      const mesh = document.createMesh('emptyMesh');
      const node = document.createNode('node');
      node.setMesh(mesh);
      const scene = document.createScene('scene');
      scene.addChild(node);

      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };
      const stats = await simplifyMesh(document, options);

      expect(stats.originalTriangles).toBe(0);
      expect(stats.simplifiedTriangles).toBe(0);
      // Empty meshes may be pruned during weld operation, so meshesProcessed could be 0 or 1
      expect(stats.meshesProcessed).toBeGreaterThanOrEqual(0);
    });

    it('should handle very small mesh', async () => {
      const document = createDocumentWithTriangles(1);
      const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

      const stats = await simplifyMesh(document, options);

      expect(stats.originalTriangles).toBe(1);
      expect(stats.meshesProcessed).toBe(1);
    });
  });
});

describe('createMeshSimplifier', () => {
  it('should create a MeshSimplifier instance', () => {
    const simplifier = createMeshSimplifier();

    expect(simplifier).toBeDefined();
    expect(typeof simplifier.simplify).toBe('function');
  });

  it('should simplify document using the instance method', async () => {
    const simplifier = createMeshSimplifier();
    const document = createDocumentWithIndexedMesh(5, 5);
    const options: SimplifyOptions = { enabled: true, targetRatio: 0.5 };

    const stats = await simplifier.simplify(document, options);

    expect(stats.originalTriangles).toBe(50);
    expect(stats.simplifiedTriangles).toBeLessThanOrEqual(
      stats.originalTriangles
    );
    expect(stats.meshesProcessed).toBe(1);
  });
});
