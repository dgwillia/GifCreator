// src/renderer/renderTick.ts
// SHARED rendering function — called by PreviewPlayer (Phase 1) AND GIF encoder Web Worker (Phase 2).
// NEVER diverge these two paths. The signature must never change between phases.
// Phase 3 added TextFrame branch; transition compositing is handled by renderTransitionTick.

import type { Frame } from '../types/frames';

/**
 * Draw a single frame to a canvas context.
 * Supports ImageFrame (letterboxed bitmap) and TextFrame (solid background + centered text).
 *
 * @param ctx   - 2D context from <canvas> (preview) or OffscreenCanvas (encoder worker)
 * @param frame - Current frame to render (ImageFrame or TextFrame)
 * @param width - Canvas output width in pixels
 * @param height - Canvas output height in pixels
 * @param progress - Used by renderTransitionTick callers for compositing (0.0–1.0, default 1.0)
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

  if (frame.type === 'text') {
    // Fill background
    ctx.fillStyle = frame.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw centered text scaled to output resolution
    // fontSize is defined at 800px canvas width — scale proportionally
    const scaledFontSize = Math.round(frame.fontSize * (width / 800));
    ctx.fillStyle = frame.textColor;
    ctx.font = `bold ${scaledFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Support multi-line text via newlines
    const lines = frame.text.split('\n');
    const lineHeight = scaledFontSize * 1.3;
    const totalHeight = lines.length * lineHeight;
    const startY = (height - totalHeight) / 2 + lineHeight / 2;

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });
  }

  // progress parameter is used by renderTransitionTick callers for compositing
  void progress;
}
