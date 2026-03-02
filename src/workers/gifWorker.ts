// src/workers/gifWorker.ts
// GIF encoder Web Worker. Runs off the main thread.
// Import via: import GifWorker from './gifWorker.ts?worker';
//
// Receives: { type: 'encode', frameData, width, height, settings }
// Posts back: { type: 'progress', frame, total } per frame
// Posts back: { type: 'done', bytes } on completion (bytes transferred zero-copy)
// Posts back: { type: 'error', message } on failure

import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { floydSteinberg } from '../utils/dither';
import type { WorkerIncoming, WorkerOutgoing } from './gifWorker.types';

self.onmessage = (e: MessageEvent<WorkerIncoming>) => {
  if (e.data.type !== 'encode') return;

  const { frameData, width, height, settings } = e.data;
  const { frameDurationMs, loop } = settings;

  try {
    const encoder = GIFEncoder();
    const total = frameData.length;

    for (let i = 0; i < total; i++) {
      const rgba = new Uint8ClampedArray(frameData[i]);

      // 1. Build per-frame 256-color palette (better quality than global palette)
      const palette = quantize(rgba, 256);

      // 2. Apply Floyd-Steinberg dithering BEFORE palette mapping
      //    This eliminates visible banding on screenshots with gradients/shadows.
      const dithered = floydSteinberg(rgba, width, height, palette);

      // 3. Map dithered pixels to palette indices
      const index = applyPalette(dithered, palette);

      // 4. Write frame
      encoder.writeFrame(index, width, height, {
        palette,
        delay: frameDurationMs,  // gifenc accepts milliseconds directly
        repeat: loop ? 0 : -1,   // 0 = loop forever, -1 = play once (NOT boolean)
      });

      // Report progress after each frame
      const msg: WorkerOutgoing = { type: 'progress', frame: i + 1, total };
      self.postMessage(msg);
    }

    encoder.finish();
    const bytes = encoder.bytes();

    // Transfer the buffer zero-copy back to main thread (encoder bytes are done — no further use)
    const doneMsg: WorkerOutgoing = { type: 'done', bytes };
    // Use options form for transfer list — compatible with both Window and DedicatedWorkerGlobalScope types
    self.postMessage(doneMsg, { transfer: [bytes.buffer] });

  } catch (err) {
    const errorMsg: WorkerOutgoing = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
};
