// src/renderer/renderTransitionTick.ts
// Two-frame compositing for crossfade and slide transitions.
// renderTick handles single-frame rendering; this handles the transition between two frames.
//
// CRITICAL: Always reset ctx.globalAlpha = 1.0 after crossfade. Failure corrupts subsequent frames.
// CRITICAL: Use the shared scratchCanvas to avoid GC pressure from repeated OffscreenCanvas allocation.

import type { Frame } from '../types/frames';
import { renderTick } from './renderTick';

// Module-level scratch canvas — created once, reused for all transition frames.
// Width/height are reassigned each call if dimensions differ from previous call.
let scratchCanvas: OffscreenCanvas | null = null;
let scratchCtx: OffscreenCanvasRenderingContext2D | null = null;

function getScratch(width: number, height: number): OffscreenCanvasRenderingContext2D {
  if (!scratchCanvas || scratchCanvas.width !== width || scratchCanvas.height !== height) {
    scratchCanvas = new OffscreenCanvas(width, height);
    scratchCtx = scratchCanvas.getContext('2d')!;
  }
  return scratchCtx!;
}

export function renderTransitionTick(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fromFrame: Frame,
  toFrame: Frame,
  width: number,
  height: number,
  transitionType: 'crossfade' | 'slide-left' | 'slide-right',
  progress: number, // 0.0 = fromFrame fully visible, 1.0 = toFrame fully visible
): void {
  const offCtx = getScratch(width, height);

  if (transitionType === 'crossfade') {
    // Render fromFrame as base
    renderTick(ctx, fromFrame, width, height);

    // Render toFrame to scratch canvas, then composite at progress opacity
    renderTick(offCtx, toFrame, width, height);
    ctx.globalAlpha = progress;
    ctx.drawImage(scratchCanvas!, 0, 0);
    ctx.globalAlpha = 1.0; // Always reset — failure corrupts subsequent frames

  } else if (transitionType === 'slide-left') {
    // toFrame slides in from the right; fromFrame exits to the left
    const offset = Math.round(width * (1 - progress));
    renderTick(ctx, fromFrame, width, height);
    renderTick(offCtx, toFrame, width, height);
    ctx.drawImage(scratchCanvas!, offset, 0);

  } else if (transitionType === 'slide-right') {
    // toFrame slides in from the left; fromFrame exits to the right
    const offset = Math.round(width * (1 - progress));
    renderTick(ctx, fromFrame, width, height);
    renderTick(offCtx, toFrame, width, height);
    ctx.drawImage(scratchCanvas!, -offset, 0);
  }
}
