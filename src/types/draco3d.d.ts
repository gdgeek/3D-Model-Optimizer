/**
 * Type declarations for draco3d module.
 *
 * The draco3d package doesn't include TypeScript types,
 * so we declare the module to allow importing it.
 */
declare module 'draco3d' {
  export function createDecoderModule(): Promise<unknown>;
  export function createEncoderModule(): Promise<unknown>;
}
