// src/renderer/renderTick.ts
// SHARED rendering function — called by PreviewPlayer (Phase 1) AND GIF encoder Web Worker (Phase 2).
// NEVER diverge these two paths. The signature must never change between phases.
// Phase 2 will add TextFrame branch and transition logic without altering the function signature.

import type { Frame } from '../types/frames';

/**
 * Draw a single frame to a canvas context.
 *
 * @param ctx   - 2D context from <canvas> (preview) or OffscreenCanvas (Phase 2 encoder)
 * @param frame - Current frame to render
 * @param width - Canvas output width in pixels
 * @param height - Canvas output height in pixels
 * @param progress - Reserved for Phase 2 transitions (0.0–1.0, default 1.0 = no transition)
 */
export function renderTick(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  frame: Frame,
  width: number,
  height: number,
  progress = 1.0,
): void {
  ctx.clearRect(0, 0, width, height);

  if (frame.type === 'image') {
    const { width: bw, height: bh } = frame.bitmap;
    // Letterbox: preserve aspect ratio, center in canvas, fill background with black
    const scale = Math.min(width / bw, height / bh);
    const dx = Math.round((width - bw * scale) / 2);
    const dy = Math.round((height - bh * scale) / 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      frame.bitmap,
      dx,
      dy,
      Math.round(bw * scale),
      Math.round(bh * scale),
    );
  }

  // Phase 2: add TextFrame branch
  // Phase 2: add crossfade alpha blend using `progress` parameter
  // Phase 2: add slide left/right using `progress` parameter

  // Suppress unused variable warning for progress until Phase 2
  void progress;
}
