// src/components/ExportPanel.tsx
// Export settings panel — resolution, frame duration, loop, transition, file size estimate, export button.
// Plan 03: handleExport renders frames to OffscreenCanvas, posts RGBA buffers to GIF worker, triggers download.

import { useFrameStore } from '../store/useFrameStore';
import { RESOLUTION_PRESETS } from '../types/frames';
import type { GifSettings } from '../types/frames';
import { Download, Loader2 } from 'lucide-react';
import GifWorker from '../workers/gifWorker.ts?worker';
import type { WorkerOutgoing } from '../workers/gifWorker.types';
import { renderTick } from '../renderer/renderTick';

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

    const { outputWidth, outputHeight } = settings;

    // Render all frames to RGBA ImageData at output resolution on the main thread.
    // We use a scratch OffscreenCanvas here — NOT the preview canvas.
    // CRITICAL: Do NOT transfer bitmaps to the worker. Render to ImageData and
    // transfer the ArrayBuffer instead. Transferring bitmaps detaches them from
    // the main thread and breaks the preview player.
    const canvas = new OffscreenCanvas(outputWidth, outputHeight);
    const ctx = canvas.getContext('2d')!;
    const frameData: ArrayBuffer[] = [];

    for (const frame of frames) {
      renderTick(ctx, frame, outputWidth, outputHeight);
      const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
      // slice(0) copies the buffer — preview bitmaps stay on main thread
      frameData.push(imageData.data.buffer.slice(0));
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

  // Estimated file size calculation (from RESEARCH.md Pattern 7)
  const estimatedKb = Math.round(
    (settings.outputWidth * settings.outputHeight * frames.length * 0.5
      + frames.length * 768 + 800) / 1024
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
