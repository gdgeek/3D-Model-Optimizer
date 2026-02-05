import { describe, it, expect } from 'vitest';
import { Document } from '@gltf-transform/core';
import { quantizeVertices, createVertexQuantizer } from '../../src/components/vertex-quantizer';
import { QuantizeOptions } from '../../src/models/options';

function createBasicMesh(document: Document, meshName: string): void {
  const mesh = document.createMesh(meshName);
  const primitive = document.createPrimitive();
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0.5, 1, 0]);
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);

  const positionAccessor = document.createAccessor(meshName + '_position');
  positionAccessor.setType('VEC3');
  positionAccessor.setArray(positions);
  primitive.setAttribute('POSITION', positionAccessor);

  const normalAccessor = document.createAccessor(meshName + '_normal');
  normalAccessor.setType('VEC3');
  normalAccessor.setArray(normals);
  primitive.setAttribute('NORMAL', normalAccessor);

  mesh.addPrimitive(primitive);
  const node = document.createNode(meshName + '_node');
  node.setMesh(mesh);
  const scene = document.getRoot().listScenes()[0] || document.createScene('scene');
  scene.addChild(node);
}

function createDocumentWithBasicMesh(): Document {
  const document = new Document();
  document.createScene('mainScene');
  createBasicMesh(document, 'testMesh');
  return document;
}

describe('quantizeVertices', () => {
  describe('basic functionality', () => {
    it('should return QuantizeStats with correct structure', async () => {
      const document = createDocumentWithBasicMesh();
      const options: QuantizeOptions = { enabled: true };
      const stats = await quantizeVertices(document, options);

      expect(stats).toHaveProperty('attributesQuantized');
      expect(stats).toHaveProperty('originalSize');
      expect(stats).toHaveProperty('quantizedSize');
      expect(stats).toHaveProperty('reductionRatio');
    });

    it('should return zero stats for empty document', async () => {
      const document = new Document();
      const options: QuantizeOptions = { enabled: true };
      const stats = await quantizeVertices(document, options);

      expect(stats.attributesQuantized).toEqual([]);
      expect(stats.originalSize).toBe(0);
      expect(stats.quantizedSize).toBe(0);
      expect(stats.reductionRatio).toBe(1);
    });

    it('should return zero stats when disabled', async () => {
      const document = createDocumentWithBasicMesh();
      const options: QuantizeOptions = { enabled: false };
      const stats = await quantizeVertices(document, options);

      expect(stats.attributesQuantized).toEqual([]);
      expect(stats.reductionRatio).toBe(1);
    });
  });
});

describe('createVertexQuantizer', () => {
  it('should create a VertexQuantizer instance', () => {
    const quantizer = createVertexQuantizer();
    expect(quantizer).toBeDefined();
    expect(typeof quantizer.quantize).toBe('function');
  });
});
