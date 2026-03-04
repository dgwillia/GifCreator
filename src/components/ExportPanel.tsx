// src/components/ExportPanel.tsx
// Export settings panel — resolution, frame duration, loop, transition, file size estimate, export button.
// Plan 03: handleExport renders frames to OffscreenCanvas, posts RGBA buffers to GIF worker, triggers download.
// Plan 03-03: Transition frame expansion — 4 intermediate frames generated between each consecutive pair
//             when transitionType is not 'cut'. File size estimate accounts for expanded frame count.

import { useFrameStore } from '../store/useFrameStore';
import { RESOLUTION_PRESETS } from '../types/frames';
import type { GifSettings } from '../types/frames';
import { Download, Loader2 } from 'lucide-react';
import GifWorker from '../workers/gifWorker.ts?worker';
import type { WorkerOutgoing } from '../workers/gifWorker.types';
import { renderTick } from '../renderer/renderTick';
import { renderTransitionTick } from '../renderer/renderTransitionTick';

// Number of intermediate frames generated per transition pair (crossfade, slide-left, slide-right).
const TRANSITION_FRAMES = 4;

export function ExportPanel() {
  const { frames, settings, updateSettings, exportProgress } = useFrameStore();
  const isExporting = exportProgress !== null;
  const hasFrames = frames.length > 0;

  // Build a string key from current resolution to match against presets
  const currentResolutionKey = `${settings.outputWidth}x${settings.outputHeight}`;

  function handleResolutionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const [w, h] = e.target.value.split('x').map(Number);
    updateSettings({ outputWidth: w, outputHeight: h });
  }

  function handleFrameDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    if (!isNaN(value) && value >= 50 && value <= 5000) {
      updateSettings({ frameDurationMs: value });
    }
  }

  function handleLoopToggle() {
    updateSettings({ loop: !settings.loop });
  }

  function handleTransitionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateSettings({ transitionType: e.target.value as GifSettings['transitionType'] });
  }

  async function handleExport() {
    // Feature detection: OffscreenCanvas required for export
    if (typeof OffscreenCanvas === 'undefined') {
      alert('Export requires a modern browser. Please update Safari to version 17 or use Chrome/Firefox.');
      return;
    }

    const { frames, settings, setExportProgress } = useFrameStore.getState();
    if (frames.length === 0) return;

    const { outputWidth, outputHeight, transitionType } = settings;

    // Render all frames (+ transition intermediate frames) to RGBA ImageData at output resolution.
    // We use a scratch OffscreenCanvas here — NOT the preview canvas.
    // CRITICAL: Do NOT transfer bitmaps to the worker. Render to ImageData and
    // transfer the ArrayBuffer instead. Transferring bitmaps detaches them from
    // the main thread and breaks the preview player.
    const canvas = new OffscreenCanvas(outputWidth, outputHeight);
    const ctx = canvas.getContext('2d')!;
    const frameData: ArrayBuffer[] = [];

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const nextFrame = frames[i + 1];

      // Render the content frame
      renderTick(ctx, frame, outputWidth, outputHeight);
      frameData.push(ctx.getImageData(0, 0, outputWidth, outputHeight).data.buffer.slice(0));

      // Insert transition intermediate frames between consecutive pairs
      if (nextFrame && transitionType !== 'cut') {
        for (let t = 1; t <= TRANSITION_FRAMES; t++) {
          const progress = t / (TRANSITION_FRAMES + 1);
          renderTransitionTick(ctx, frame, nextFrame, outputWidth, outputHeight, transitionType, progress);
          frameData.push(ctx.getImageData(0, 0, outputWidth, outputHeight).data.buffer.slice(0));
        }
      }
    }

    // Set initial progress state (0%)
    setExportProgress(0);

    const worker = new GifWorker();

    worker.onmessage = (e: MessageEvent<WorkerOutgoing>) => {
      if (e.data.type === 'progress') {
        const pct = Math.round((e.data.frame / e.data.total) * 100);
        setExportProgress(pct);
      } else if (e.data.type === 'done') {
        // Trigger browser download
        // Cast via ArrayBuffer to satisfy Blob constructor's BlobPart type constraint
        const blob = new Blob([e.data.bytes.buffer as ArrayBuffer], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation.gif';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Revoke immediately — browser has started download

        worker.terminate();
        setExportProgress(null); // Return to idle
      } else if (e.data.type === 'error') {
        console.error('GIF encode failed:', e.data.message);
        worker.terminate();
        setExportProgress(null);
        alert(`Export failed: ${e.data.message}`);
      }
    };

    // Post the pre-rendered RGBA buffers + settings to the worker.
    // Transfer the frameData ArrayBuffers (zero-copy) — these are copies, not originals.
    worker.postMessage(
      { type: 'encode', frameData, width: outputWidth, height: outputHeight, settings },
      frameData, // Transfer list — zero-copy transfer of the copied buffers
    );
  }

  // Estimated file size calculation — accounts for transition intermediate frames.
  // encodedFrameCount = content frames + (transition frames per pair * number of pairs)
  const encodedFrameCount = !hasFrames
    ? 0
    : settings.transitionType === 'cut'
    ? frames.length
    : frames.length + Math.max(0, frames.length - 1) * TRANSITION_FRAMES;

  const estimatedKb = Math.round(
    (settings.outputWidth * settings.outputHeight * encodedFrameCount * 0.5
      + encodedFrameCount * 768 + 800) / 1024
  );
  const displaySize = !hasFrames
    ? '—'
    : estimatedKb >= 1024
    ? `~${(estimatedKb / 1024).toFixed(1)} MB`
    : `~${estimatedKb} KB`;

  return (
    <div className="flex flex-col gap-4 w-64">
      {/* Section header */}
      <h2 className="text-sm font-semibold text-gray-300">Export Settings</h2>

      {/* 1. Resolution selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Resolution</label>
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={currentResolutionKey}
          onChange={handleResolutionChange}
        >
          {RESOLUTION_PRESETS.map((preset) => {
            const key = `${preset.width}x${preset.height}`;
            return (
              <option key={key} value={key}>
                {preset.label}
              </option>
            );
          })}
        </select>
      </div>

      {/* 2. Frame duration input */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">
          Frame duration (ms)
        </label>
        <input
          type="number"
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          min={50}
          max={5000}
          step={50}
          value={settings.frameDurationMs}
          onChange={handleFrameDurationChange}
        />
        <span className="text-xs text-gray-500">{settings.frameDurationMs} ms</span>
      </div>

      {/* 3. Loop toggle */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Loop</label>
        <button
          onClick={handleLoopToggle}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
            settings.loop
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 border border-gray-700 text-gray-400'
          }`}
        >
          Loop: {settings.loop ? 'On' : 'Off'}
        </button>
      </div>

      {/* 4. Transition type selector */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 uppercase tracking-wide">Transition</label>
        <select
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={settings.transitionType}
          onChange={handleTransitionChange}
        >
          <option value="cut">Cut (instant)</option>
          <option value="crossfade">Crossfade</option>
          <option value="slide-left">Slide Left</option>
          <option value="slide-right">Slide Right</option>
        </select>
      </div>

      {/* 5. Estimated file size */}
      <p className="text-xs text-gray-500">
        Estimated size: {displaySize}
      </p>

      {/* 6. Export button */}
      <button
        onClick={handleExport}
        disabled={!hasFrames || isExporting}
        className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export GIF
          </>
        )}
      </button>

      {/* 7. Progress bar (shown during export) */}
      {isExporting && (
        <div className="flex flex-col gap-1">
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            Encoding... {exportProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
