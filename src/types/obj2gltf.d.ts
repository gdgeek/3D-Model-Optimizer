declare module 'obj2gltf' {
  interface Options {
    binary?: boolean;
    separate?: boolean;
    separateTextures?: boolean;
    checkTransparency?: boolean;
    secure?: boolean;
    packOcclusion?: boolean;
    metallicRoughness?: boolean;
    specularGlossiness?: boolean;
    unlit?: boolean;
  }

  function obj2gltf(objPath: string, options?: Options): Promise<Buffer>;
  export = obj2gltf;
}
