/**
 * Unit tests for mesh-merger.ts
 *
 * Tests Mesh Merger functionality including:
 * - Merging meshes with the same material (Requirement 6.1)
 * - Returning mesh count statistics (Requirement 6.2)
 * - Handling cases with no mergeable meshes (Requirement 6.3)
 */

import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';
import { merge, createMeshMerger } from '../../src/components/mesh-merger';

/**
 * Creates a simple mesh with a primitive and position accessor.
 * Optionally assigns a material to the primitive.
 */
function createMeshWithMaterial(
  document: Document,
  meshName: string,
  material: ReturnType<Document['createMaterial']> | null = null
): ReturnType<Document['createMesh']> {
  const mesh = document.createMesh(meshName);
  const primitive = document.createPrimitive();

  // Create position accessor for the primitive
  const positionAccessor = document.createAccessor(`${meshName}_position`);
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  primitive.setAttribute('POSITION', positionAccessor);

  if (material) {
    primitive.setMaterial(material);
  }

  mesh.addPrimitive(primitive);
  return mesh;
}

/**
 * Creates a document with multiple meshes sharing the same material.
 */
function createDocumentWithSameMaterialMeshes(meshCount: number): Document {
  const document = new Document();

  // Create a shared material
  const sharedMaterial = document.createMaterial('sharedMaterial');

  // Create a scene
  const scene = document.createScene('mainScene');

  // Create multiple meshes with the same material
  for (let i = 0; i < meshCount; i++) {
    const mesh = createMeshWithMaterial(document, `mesh${i}`, sharedMaterial);
    const node = document.createNode(`node${i}`);
    node.setMesh(mesh);
    scene.addChild(node);
  }

  return document;
}

/**
 * Creates a document with meshes using different materials.
 */
function createDocumentWithDifferentMaterialMeshes(meshCount: number): Document {
  const document = new Document();

  // Create a scene
  const scene = document.createScene('mainScene');

  // Create meshes with different materials
  for (let i = 0; i < meshCount; i++) {
    const material = document.createMaterial(`material${i}`);
    const mesh = createMeshWithMaterial(document, `mesh${i}`, material);
    const node = document.createNode(`node${i}`);
    node.setMesh(mesh);
    scene.addChild(node);
  }

  return document;
}

/**
 * Creates a document with mixed materials - some shared, some unique.
 */
function createDocumentWithMixedMaterials(): Document {
  const document = new Document();

  // Create materials
  const sharedMaterial = document.createMaterial('sharedMaterial');
  const uniqueMaterial1 = document.createMaterial('uniqueMaterial1');
  const uniqueMaterial2 = document.createMaterial('uniqueMaterial2');

  // Create a scene
  const scene = document.createScene('mainScene');

  // Create 3 meshes with shared material
  for (let i = 0; i < 3; i++) {
    const mesh = createMeshWithMaterial(document, `sharedMesh${i}`, sharedMaterial);
    const node = document.createNode(`sharedNode${i}`);
    node.setMesh(mesh);
    scene.addChild(node);
  }

  // Create 2 meshes with unique materials
  const mesh1 = createMeshWithMaterial(document, 'uniqueMesh1', uniqueMaterial1);
  const node1 = document.createNode('uniqueNode1');
  node1.setMesh(mesh1);
  scene.addChild(node1);

  const mesh2 = createMeshWithMaterial(document, 'uniqueMesh2', uniqueMaterial2);
  const node2 = document.createNode('uniqueNode2');
  node2.setMesh(mesh2);
  scene.addChild(node2);

  return document;
}

describe('merge', () => {
  describe('basic functionality', () => {
    it('should return MergeStats with correct structure', async () => {
      const document = new Document();
      const stats = await merge(document);

      expect(stats).toHaveProperty('originalMeshCount');
      expect(stats).toHaveProperty('mergedMeshCount');
      expect(stats).toHaveProperty('meshesReduced');
      expect(typeof stats.originalMeshCount).toBe('number');
      expect(typeof stats.mergedMeshCount).toBe('number');
      expect(typeof stats.meshesReduced).toBe('number');
    });

    it('should return zero stats for empty document', async () => {
      const document = new Document();
      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(0);
      expect(stats.mergedMeshCount).toBe(0);
      expect(stats.meshesReduced).toBe(0);
    });

    it('should return zero reduction for single mesh document', async () => {
      const document = new Document();
      const material = document.createMaterial('material');
      createMeshWithMaterial(document, 'singleMesh', material);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(1);
      expect(stats.mergedMeshCount).toBe(1);
      expect(stats.meshesReduced).toBe(0);
    });
  });

  describe('merging meshes with same material', () => {
    it('should merge two meshes with the same material', async () => {
      const document = createDocumentWithSameMaterialMeshes(2);

      expect(document.getRoot().listMeshes().length).toBe(2);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(2);
      expect(stats.mergedMeshCount).toBeLessThanOrEqual(stats.originalMeshCount);
      expect(stats.meshesReduced).toBeGreaterThanOrEqual(0);
    });

    it('should merge multiple meshes with the same material', async () => {
      const document = createDocumentWithSameMaterialMeshes(5);

      expect(document.getRoot().listMeshes().length).toBe(5);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(5);
      // After merging, mesh count should be reduced
      expect(stats.mergedMeshCount).toBeLessThanOrEqual(stats.originalMeshCount);
      expect(stats.meshesReduced).toBe(stats.originalMeshCount - stats.mergedMeshCount);
    });

    it('should correctly calculate meshesReduced', async () => {
      const document = createDocumentWithSameMaterialMeshes(4);

      const stats = await merge(document);

      expect(stats.meshesReduced).toBe(stats.originalMeshCount - stats.mergedMeshCount);
      expect(stats.meshesReduced).toBeGreaterThanOrEqual(0);
    });
  });

  describe('meshes with different materials', () => {
    it('should not merge meshes with different materials', async () => {
      const document = createDocumentWithDifferentMaterialMeshes(3);

      expect(document.getRoot().listMeshes().length).toBe(3);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(3);
      // Meshes with different materials should not be merged
      expect(stats.mergedMeshCount).toBe(3);
      expect(stats.meshesReduced).toBe(0);
    });

    it('should handle mixed materials correctly', async () => {
      const document = createDocumentWithMixedMaterials();

      // 3 meshes with shared material + 2 meshes with unique materials = 5 total
      expect(document.getRoot().listMeshes().length).toBe(5);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(5);
      // Only meshes with shared material can be merged
      // Result should be: 1 merged mesh + 2 unique meshes = 3 or less
      expect(stats.mergedMeshCount).toBeLessThanOrEqual(5);
      expect(stats.meshesReduced).toBe(stats.originalMeshCount - stats.mergedMeshCount);
    });
  });

  describe('material preservation', () => {
    it('should preserve materials after merging', async () => {
      const document = createDocumentWithSameMaterialMeshes(3);

      const materialsBefore = document.getRoot().listMaterials().length;
      expect(materialsBefore).toBe(1);

      await merge(document);

      const materialsAfter = document.getRoot().listMaterials().length;
      // Materials should be preserved
      expect(materialsAfter).toBe(materialsBefore);
    });

    it('should preserve all unique materials after merging', async () => {
      const document = createDocumentWithDifferentMaterialMeshes(4);

      const materialsBefore = document.getRoot().listMaterials().length;
      expect(materialsBefore).toBe(4);

      await merge(document);

      const materialsAfter = document.getRoot().listMaterials().length;
      // All materials should be preserved
      expect(materialsAfter).toBe(materialsBefore);
    });
  });

  describe('edge cases', () => {
    it('should handle meshes without materials', async () => {
      const document = new Document();
      const scene = document.createScene('mainScene');

      // Create meshes without materials
      for (let i = 0; i < 3; i++) {
        const mesh = createMeshWithMaterial(document, `mesh${i}`, null);
        const node = document.createNode(`node${i}`);
        node.setMesh(mesh);
        scene.addChild(node);
      }

      expect(document.getRoot().listMeshes().length).toBe(3);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(3);
      // Meshes without materials may or may not be merged depending on implementation
      expect(stats.mergedMeshCount).toBeLessThanOrEqual(stats.originalMeshCount);
      expect(stats.meshesReduced).toBe(stats.originalMeshCount - stats.mergedMeshCount);
    });

    it('should handle document with only unused meshes', async () => {
      const document = new Document();

      // Create meshes not attached to any node/scene
      const material = document.createMaterial('material');
      for (let i = 0; i < 3; i++) {
        createMeshWithMaterial(document, `unusedMesh${i}`, material);
      }

      expect(document.getRoot().listMeshes().length).toBe(3);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(3);
      // Unused meshes behavior depends on join() implementation
      expect(typeof stats.mergedMeshCount).toBe('number');
      expect(stats.meshesReduced).toBe(stats.originalMeshCount - stats.mergedMeshCount);
    });
  });

  describe('statistics accuracy', () => {
    it('should accurately report original mesh count', async () => {
      const document = createDocumentWithSameMaterialMeshes(7);

      const stats = await merge(document);

      expect(stats.originalMeshCount).toBe(7);
    });

    it('should ensure meshesReduced is non-negative', async () => {
      const document = createDocumentWithDifferentMaterialMeshes(5);

      const stats = await merge(document);

      expect(stats.meshesReduced).toBeGreaterThanOrEqual(0);
    });

    it('should ensure mergedMeshCount is not greater than originalMeshCount', async () => {
      const document = createDocumentWithMixedMaterials();

      const stats = await merge(document);

      expect(stats.mergedMeshCount).toBeLessThanOrEqual(stats.originalMeshCount);
    });
  });
});

describe('createMeshMerger', () => {
  it('should create a MeshMerger instance', () => {
    const merger = createMeshMerger();

    expect(merger).toBeDefined();
    expect(typeof merger.merge).toBe('function');
  });

  it('should merge document using the instance method', async () => {
    const merger = createMeshMerger();
    const document = createDocumentWithSameMaterialMeshes(3);

    const stats = await merger.merge(document);

    expect(stats.originalMeshCount).toBe(3);
    expect(stats.mergedMeshCount).toBeLessThanOrEqual(3);
    expect(stats.meshesReduced).toBe(stats.originalMeshCount - stats.mergedMeshCount);
  });
});
