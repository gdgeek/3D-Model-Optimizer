import { describe, it, expect } from 'vitest';

describe('Dependencies', () => {
  it('should import @gltf-transform/core', async () => {
    const core = await import('@gltf-transform/core');
    expect(core.Document).toBeDefined();
    expect(core.NodeIO).toBeDefined();
  });

  it('should import @gltf-transform/extensions', async () => {
    const extensions = await import('@gltf-transform/extensions');
    expect(extensions.KHRDracoMeshCompression).toBeDefined();
    expect(extensions.KHRTextureBasisu).toBeDefined();
  });

  it('should import @gltf-transform/functions', async () => {
    const functions = await import('@gltf-transform/functions');
    expect(functions.prune).toBeDefined();
    expect(functions.quantize).toBeDefined();
  });

  it('should import express', async () => {
    const express = await import('express');
    expect(express.default).toBeDefined();
  });
});
