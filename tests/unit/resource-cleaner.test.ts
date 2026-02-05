/**
 * Unit tests for resource-cleaner.ts
 *
 * Tests Resource Cleaner functionality including:
 * - Removing unused nodes (Requirement 7.1)
 * - Removing unused materials (Requirement 7.2)
 * - Returning cleanup statistics (Requirement 7.3)
 */

import { describe, it, expect } from 'vitest';
import { Document, Material, Texture, Node, Mesh, Primitive } from '@gltf-transform/core';
import { clean, createResourceCleaner } from '../../src/components/resource-cleaner';
import { CleanOptions } from '../../src/models/options';

/**
 * Creates a simple document with a mesh that uses a material and texture.
 * All resources are used.
 */
function createDocumentWithUsedResources(): Document {
  const document = new Document();
  const root = document.getRoot();

  // Create a texture
  const texture = document.createTexture('usedTexture');
  texture.setMimeType('image/png');
  texture.setImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47])); // PNG header

  // Create a material that uses the texture
  const material = document.createMaterial('usedMaterial');
  material.setBaseColorTexture(texture);

  // Create a simple mesh with the material
  const mesh = document.createMesh('testMesh');
  const primitive = document.createPrimitive();
  primitive.setMaterial(material);
  
  // Create position accessor for the primitive
  const positionAccessor = document.createAccessor('position');
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
  primitive.setAttribute('POSITION', positionAccessor);
  
  mesh.addPrimitive(primitive);

  // Create a node that uses the mesh
  const node = document.createNode('meshNode');
  node.setMesh(mesh);

  // Create a scene and add the node
  const scene = document.createScene('mainScene');
  scene.addChild(node);

  return document;
}

/**
 * Creates a document with unused resources.
 */
function createDocumentWithUnusedResources(): Document {
  const document = createDocumentWithUsedResources();

  // Add unused texture
  const unusedTexture = document.createTexture('unusedTexture');
  unusedTexture.setMimeType('image/png');
  unusedTexture.setImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));

  // Add unused material
  document.createMaterial('unusedMaterial');

  // Add unused node (empty leaf node)
  document.createNode('unusedNode');

  return document;
}

/**
 * Creates a document with only unused resources (no scene).
 */
function createDocumentWithOnlyUnusedResources(): Document {
  const document = new Document();

  // Create unused textures
  const texture1 = document.createTexture('unusedTexture1');
  texture1.setMimeType('image/png');
  texture1.setImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));

  const texture2 = document.createTexture('unusedTexture2');
  texture2.setMimeType('image/jpeg');
  texture2.setImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]));

  // Create unused materials
  document.createMaterial('unusedMaterial1');
  document.createMaterial('unusedMaterial2');
  document.createMaterial('unusedMaterial3');

  // Create unused nodes
  document.createNode('unusedNode1');
  document.createNode('unusedNode2');

  return document;
}

describe('clean', () => {
  describe('basic functionality', () => {
    it('should return CleanStats with correct structure', async () => {
      const document = new Document();
      const stats = await clean(document);

      expect(stats).toHaveProperty('nodesRemoved');
      expect(stats).toHaveProperty('materialsRemoved');
      expect(stats).toHaveProperty('texturesRemoved');
      expect(typeof stats.nodesRemoved).toBe('number');
      expect(typeof stats.materialsRemoved).toBe('number');
      expect(typeof stats.texturesRemoved).toBe('number');
    });

    it('should return zero stats for empty document', async () => {
      const document = new Document();
      const stats = await clean(document);

      expect(stats.nodesRemoved).toBe(0);
      expect(stats.materialsRemoved).toBe(0);
      expect(stats.texturesRemoved).toBe(0);
    });

    it('should not remove used resources', async () => {
      const document = createDocumentWithUsedResources();
      
      const nodesBefore = document.getRoot().listNodes().length;
      const materialsBefore = document.getRoot().listMaterials().length;
      const texturesBefore = document.getRoot().listTextures().length;

      const stats = await clean(document);

      const nodesAfter = document.getRoot().listNodes().length;
      const materialsAfter = document.getRoot().listMaterials().length;
      const texturesAfter = document.getRoot().listTextures().length;

      // Used resources should remain
      expect(nodesAfter).toBe(nodesBefore);
      expect(materialsAfter).toBe(materialsBefore);
      expect(texturesAfter).toBe(texturesBefore);

      // Stats should show nothing removed
      expect(stats.nodesRemoved).toBe(0);
      expect(stats.materialsRemoved).toBe(0);
      expect(stats.texturesRemoved).toBe(0);
    });
  });

  describe('removing unused resources', () => {
    it('should remove unused materials', async () => {
      const document = createDocumentWithUnusedResources();
      
      const materialsBefore = document.getRoot().listMaterials().length;
      expect(materialsBefore).toBe(2); // 1 used + 1 unused

      const stats = await clean(document);

      const materialsAfter = document.getRoot().listMaterials().length;
      expect(materialsAfter).toBe(1); // Only used material remains
      expect(stats.materialsRemoved).toBe(1);
    });

    it('should remove unused textures', async () => {
      const document = createDocumentWithUnusedResources();
      
      const texturesBefore = document.getRoot().listTextures().length;
      expect(texturesBefore).toBe(2); // 1 used + 1 unused

      const stats = await clean(document);

      const texturesAfter = document.getRoot().listTextures().length;
      expect(texturesAfter).toBe(1); // Only used texture remains
      expect(stats.texturesRemoved).toBe(1);
    });

    it('should remove unused nodes when removeUnusedNodes is true', async () => {
      const document = createDocumentWithUnusedResources();
      
      const nodesBefore = document.getRoot().listNodes().length;
      expect(nodesBefore).toBe(2); // 1 used + 1 unused

      const stats = await clean(document, {
        enabled: true,
        removeUnusedNodes: true,
      });

      const nodesAfter = document.getRoot().listNodes().length;
      expect(nodesAfter).toBe(1); // Only used node remains
      expect(stats.nodesRemoved).toBe(1);
    });

    it('should remove all unused resources at once', async () => {
      const document = createDocumentWithOnlyUnusedResources();
      
      const nodesBefore = document.getRoot().listNodes().length;
      const materialsBefore = document.getRoot().listMaterials().length;
      const texturesBefore = document.getRoot().listTextures().length;

      expect(nodesBefore).toBe(2);
      expect(materialsBefore).toBe(3);
      expect(texturesBefore).toBe(2);

      const stats = await clean(document, {
        enabled: true,
        removeUnusedNodes: true,
        removeUnusedMaterials: true,
        removeUnusedTextures: true,
      });

      const nodesAfter = document.getRoot().listNodes().length;
      const materialsAfter = document.getRoot().listMaterials().length;
      const texturesAfter = document.getRoot().listTextures().length;

      expect(nodesAfter).toBe(0);
      expect(materialsAfter).toBe(0);
      expect(texturesAfter).toBe(0);

      expect(stats.nodesRemoved).toBe(2);
      expect(stats.materialsRemoved).toBe(3);
      expect(stats.texturesRemoved).toBe(2);
    });
  });

  describe('options handling', () => {
    it('should return zero stats when enabled is false', async () => {
      const document = createDocumentWithUnusedResources();
      
      const nodesBefore = document.getRoot().listNodes().length;
      const materialsBefore = document.getRoot().listMaterials().length;
      const texturesBefore = document.getRoot().listTextures().length;

      const stats = await clean(document, { enabled: false });

      // Resources should not be removed
      expect(document.getRoot().listNodes().length).toBe(nodesBefore);
      expect(document.getRoot().listMaterials().length).toBe(materialsBefore);
      expect(document.getRoot().listTextures().length).toBe(texturesBefore);

      // Stats should be zero
      expect(stats.nodesRemoved).toBe(0);
      expect(stats.materialsRemoved).toBe(0);
      expect(stats.texturesRemoved).toBe(0);
    });

    it('should use default options when not specified', async () => {
      const document = createDocumentWithUnusedResources();
      
      // Default should remove unused materials and textures
      const stats = await clean(document);

      expect(stats.materialsRemoved).toBe(1);
      expect(stats.texturesRemoved).toBe(1);
    });

    it('should keep leaf nodes in scene graph when removeUnusedNodes is false', async () => {
      // Create a document with a leaf node that IS part of the scene graph
      const document = new Document();
      
      // Create a scene with a parent node and an empty leaf child node
      const scene = document.createScene('mainScene');
      const parentNode = document.createNode('parentNode');
      const leafNode = document.createNode('leafNode'); // Empty leaf node in scene
      
      parentNode.addChild(leafNode);
      scene.addChild(parentNode);

      const nodesBefore = document.getRoot().listNodes().length;
      expect(nodesBefore).toBe(2);

      const stats = await clean(document, {
        enabled: true,
        removeUnusedNodes: false,
      });

      // Leaf nodes in scene graph should be kept when removeUnusedNodes is false
      expect(document.getRoot().listNodes().length).toBe(nodesBefore);
      expect(stats.nodesRemoved).toBe(0);
    });
  });

  describe('statistics accuracy', () => {
    it('should accurately count removed nodes', async () => {
      const document = new Document();
      
      // Create 5 unused nodes
      for (let i = 0; i < 5; i++) {
        document.createNode(`unusedNode${i}`);
      }

      const stats = await clean(document, {
        enabled: true,
        removeUnusedNodes: true,
      });

      expect(stats.nodesRemoved).toBe(5);
    });

    it('should accurately count removed materials', async () => {
      const document = new Document();
      
      // Create 3 unused materials
      for (let i = 0; i < 3; i++) {
        document.createMaterial(`unusedMaterial${i}`);
      }

      const stats = await clean(document, {
        enabled: true,
        removeUnusedMaterials: true,
      });

      expect(stats.materialsRemoved).toBe(3);
    });

    it('should accurately count removed textures', async () => {
      const document = new Document();
      
      // Create 4 unused textures
      for (let i = 0; i < 4; i++) {
        const texture = document.createTexture(`unusedTexture${i}`);
        texture.setMimeType('image/png');
        texture.setImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
      }

      const stats = await clean(document, {
        enabled: true,
        removeUnusedTextures: true,
      });

      expect(stats.texturesRemoved).toBe(4);
    });
  });
});

describe('createResourceCleaner', () => {
  it('should create a ResourceCleaner instance', () => {
    const cleaner = createResourceCleaner();

    expect(cleaner).toBeDefined();
    expect(typeof cleaner.clean).toBe('function');
  });

  it('should clean document using the instance method', async () => {
    const cleaner = createResourceCleaner();
    const document = createDocumentWithUnusedResources();

    const stats = await cleaner.clean(document, {
      enabled: true,
      removeUnusedNodes: true,
    });

    expect(stats.nodesRemoved).toBe(1);
    expect(stats.materialsRemoved).toBe(1);
    expect(stats.texturesRemoved).toBe(1);
  });
});
