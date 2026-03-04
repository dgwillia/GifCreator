// src/components/PreviewPlayer.tsx
// Canvas animated preview player.
//
// IMPORTANT: renderTick() from src/renderer/renderTick.ts MUST be used here —
// do not inline canvas drawing logic. The Phase 2 GIF encoder uses the same
// renderTick function. Both paths must stay identical.
//
// Frame data is read from Zustand inside the tick ref via a stable getter to avoid
// stale closures without restarting the rAF loop on every frame array change.
//
// Transitions: When settings.transitionType !== 'cut', an expanded sequence of render
// functions is built that includes intermediate transition frames between each consecutive
// content frame pair. The tick callback runs each function in sequence.

import { useRef, useCallback, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import { renderTick } from '../renderer/renderTick';
import { renderTransitionTick } from '../renderer/renderTransitionTick';
import { useAnimationLoop } from '../hooks/useAnimationLoop';
import type { Frame } from '../types/frames';

const PREVIEW_WIDTH = 640;
const PREVIEW_HEIGHT = 480;

// A single render call in the expanded playback sequence.
type ExpandedTick = (ctx: CanvasRenderingContext2D) => void;

export function PreviewPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIndexRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Use refs for frames/settings inside the tick to avoid stale closures
  // without restarting the rAF loop on every store change
  const framesRef = useRef<Frame[]>([]);
  const frameDurationRef = useRef(800);
  const loopRef = useRef(true);
  const transitionTypeRef = useRef<'cut' | 'crossfade' | 'slide-left' | 'slide-right'>('cut');

  // Expanded sequence: one entry per content frame + N entries per transition pair
  const expandedSequenceRef = useRef<ExpandedTick[]>([]);

  const { frames, settings, toggleLoop } = useFrameStore();

  // Keep refs current on each render
  useEffect(() => {
    framesRef.current = frames;
  });
  useEffect(() => {
    frameDurationRef.current = settings.frameDurationMs;
    loopRef.current = settings.loop;
    transitionTypeRef.current = settings.transitionType;
  });

  // Rebuild expanded sequence whenever frames or transitionType changes
  useEffect(() => {
    const TRANSITION_FRAMES = 4;
    const ticks: ExpandedTick[] = [];
    const transitionType = settings.transitionType;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const nextFrame = frames[i + 1];
      ticks.push((ctx) => renderTick(ctx, frame, PREVIEW_WIDTH, PREVIEW_HEIGHT));
      if (nextFrame && transitionType !== 'cut') {
        for (let t = 1; t <= TRANSITION_FRAMES; t++) {
          const progress = t / (TRANSITION_FRAMES + 1);
          ticks.push((ctx) =>
            renderTransitionTick(ctx, frame, nextFrame, PREVIEW_WIDTH, PREVIEW_HEIGHT, transitionType, progress)
          );
        }
      }
    }
    expandedSequenceRef.current = ticks;
    // Clamp frameIndex to new sequence length
    frameIndexRef.current = Math.min(frameIndexRef.current, Math.max(0, ticks.length - 1));
  }, [frames, settings.transitionType]);

  const tick = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const currentFrames = framesRef.current;
    if (currentFrames.length === 0) return;

    const elapsed = timestamp - lastFrameTimeRef.current;
    if (elapsed < frameDurationRef.current) return;

    lastFrameTimeRef.current = timestamp;

    const sequence = expandedSequenceRef.current;
    if (sequence.length === 0) return;
    sequence[frameIndexRef.current](ctx);

    const nextIndex = frameIndexRef.current + 1;
    if (nextIndex >= sequence.length) {
      if (loopRef.current) {
        frameIndexRef.current = 0;
      } else {
        stop();
        setIsPlaying(false);
        return;
      }
    } else {
      frameIndexRef.current = nextIndex;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally stable

  const { start, stop } = useAnimationLoop(tick);

  const handlePlay = useCallback(() => {
    if (frames.length === 0) return;
    lastFrameTimeRef.current = performance.now() - frameDurationRef.current; // render first frame immediately
    setIsPlaying(true);
    start();
  }, [frames.length, start]);

  const handlePause = useCallback(() => {
    stop();
    setIsPlaying(false);
  }, [stop]);

  const handleReset = useCallback(() => {
    stop();
    setIsPlaying(false);
    frameIndexRef.current = 0;
    // Draw first frame immediately after reset
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && framesRef.current.length > 0) {
      renderTick(ctx, framesRef.current[0], PREVIEW_WIDTH, PREVIEW_HEIGHT);
    }
  }, [stop]);

  // Draw first frame when frames array changes (e.g. new uploads or reorder)
  useEffect(() => {
    if (frames.length === 0) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      }
      return;
    }
    if (!isPlaying) {
      // Clamp index in case frames were deleted
      const safeIndex = Math.min(frameIndexRef.current, frames.length - 1);
      frameIndexRef.current = safeIndex;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        renderTick(ctx, frames[safeIndex], PREVIEW_WIDTH, PREVIEW_HEIGHT);
      }
    }
  }, [frames, isPlaying]);

  const hasFrames = frames.length > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={PREVIEW_WIDTH}
          height={PREVIEW_HEIGHT}
          className="rounded-xl bg-gray-900 border border-gray-800 block"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {!hasFrames && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-500 text-sm">Upload images to preview</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={!hasFrames}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500
            disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed
            text-white text-sm font-medium transition-colors cursor-pointer"
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          onClick={handleReset}
          disabled={!hasFrames}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800
            disabled:text-gray-700 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Reset to first frame"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={toggleLoop}
          disabled={!hasFrames}
          className={[
            'px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
            settings.loop
              ? 'bg-blue-950/50 text-blue-300 hover:bg-blue-950/80 border border-blue-800'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700',
            !hasFrames ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
          ].join(' ')}
        >
          {settings.loop ? 'Loop: On' : 'Loop: Off'}
        </button>

        {hasFrames && (
          <span className="text-gray-500 text-xs">
            {frames.length} {frames.length === 1 ? 'frame' : 'frames'}
          </span>
        )}
      </div>
    </div>
  );
}
