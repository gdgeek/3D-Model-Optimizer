/**
 * Draco Singleton
 *
 * Reuses Draco encoder/decoder modules across pipeline invocations
 * to avoid expensive re-initialization on every request.
 */

import * as draco3d from 'draco3d';

let decoderModule: Awaited<ReturnType<typeof draco3d.createDecoderModule>> | null = null;
let encoderModule: Awaited<ReturnType<typeof draco3d.createEncoderModule>> | null = null;
let initPromise: Promise<void> | null = null;

async function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      [decoderModule, encoderModule] = await Promise.all([
        draco3d.createDecoderModule(),
        draco3d.createEncoderModule(),
      ]);
    })();
  }
  return initPromise;
}

export async function getDracoModules() {
  await init();
  return {
    'draco3d.decoder': decoderModule!,
    'draco3d.encoder': encoderModule!,
  };
}
