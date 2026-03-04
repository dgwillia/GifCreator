// src/workers/gifWorker.types.ts
// Message types for the GIF encoder Web Worker.
// Imported by both the worker (incoming) and ExportPanel (outgoing/incoming).

import type { GifSettings } from '../types/frames';

export type WorkerIncoming = {
  type: 'encode';
  frameData: ArrayBuffer[];  // Pre-rendered RGBA pixel data at output resolution
  width: number;
  height: number;
  settings: GifSettings;
  frameDelays?: number[];    // Per-frame delay in ms. Falls back to settings.frameDurationMs if absent.
};

export type WorkerOutgoing =
  | { type: 'progress'; frame: number; total: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; message: string };
