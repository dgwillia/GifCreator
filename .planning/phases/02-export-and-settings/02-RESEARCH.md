# Phase 2: Export and Settings - Research

**Researched:** 2026-03-02
**Domain:** GIF encoding (Web Worker + OffscreenCanvas), export settings UI, file size estimation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRAN-01 | User can select cut (instant) transition between frames | Cut is the default behavior of renderTick (no-op transition, progress = 1.0). Needs a transitionType field added to GifSettings and a UI selector — no encoder changes needed for cut. |
| TIME-01 | User can set a global frame duration that applies to all frames | GifSettings.frameDurationMs already exists in store. Needs a numeric input UI in ExportPanel. The gifenc `writeFrame` `delay` option accepts ms — pass frameDurationMs directly. |
| TIME-02 | User can toggle whether the exported GIF loops forever or plays once | GifSettings.loop already exists in store and wired to PreviewPlayer. Needs to be passed to gifenc `repeat` option: 0 = loop forever, -1 = play once. |
| EXPO-01 | User can select output resolution from presets (1200x900, 800x600, 1:1, 16:9) | Add outputWidth/outputHeight to GifSettings. Resolution preset selector UI in ExportPanel. OffscreenCanvas sized to the selected output dimensions. |
| EXPO-02 | User can export a high-quality GIF using per-frame color palette quantization and Floyd-Steinberg dithering | gifenc handles per-frame quantize() + applyPalette(). Floyd-Steinberg dithering must be implemented as a pure function applied AFTER quantize() but BEFORE applyPalette(). gifenc has no built-in dithering — see Architecture Patterns for implementation. |
| EXPO-03 | User can see export encoding progress while the GIF is being generated | Worker posts progress messages: { type: 'progress', frame: N, total: M }. Main thread updates React state to render a progress bar during encoding. |
| EXPO-04 | User can see estimated file size before triggering export | Formula: (width * height * numFrames * 1 byte/pixel * 0.5 compression factor). Display in ExportPanel before export button. See Code Examples for formula. |
</phase_requirements>

---

## Summary

Phase 2 delivers the GIF export pipeline: settings UI, a Web Worker encoder, and a triggered browser download. The architecture was designed in Phase 1 — `renderTick()` already accepts `OffscreenCanvasRenderingContext2D`, and `GifSettings` already has `frameDurationMs` and `loop`. Phase 2 completes this by adding `outputWidth`, `outputHeight`, and `transitionType` to `GifSettings`, wiring a settings UI panel, and building the Web Worker that drives the actual GIF encoding.

The most critical implementation detail is **dithering**. `gifenc` (the chosen encoder) has no built-in Floyd-Steinberg dithering — it is explicitly listed as a future feature in the README. EXPO-02 requires per-frame palette quantization WITH Floyd-Steinberg dithering. The solution is a compact hand-written dithering pass applied to the raw RGBA `Uint8ClampedArray` after `quantize()` builds the palette and before `applyPalette()` maps pixels to indices. This is approximately 25 lines of straightforward error-diffusion code and is a well-understood algorithm. Do NOT switch to gif.js (unmaintained since 2017) or modern-gif (59 stars, unproven quality) — stick with gifenc and implement dithering inline.

The Worker architecture uses Vite's `?worker` import suffix. The main thread renders each frame to an `OffscreenCanvas`, extracts `ImageData`, and posts it to a single worker. The worker runs `quantize()` → `floydSteinberg()` (custom) → `applyPalette()` → `encoder.writeFrame()` for each frame, posting progress events back. On completion it posts the full encoded bytes, which the main thread converts to a Blob and triggers a download.

Safari 17+ supports OffscreenCanvas 2D contexts fully; Safari 16.x supports it partially (2D only, which is all we need). Coverage is ~95% globally as of early 2026. A main-thread fallback is noted as a concern in STATE.md but is LOW priority given coverage numbers — flag it as out of scope for Phase 2 and add a comment in the worker initialization code.

**Primary recommendation:** Single-worker architecture (not a worker pool). Pool architectures require chunk reassembly and out-of-order frame handling — unnecessary complexity for a tool encoding 5–30 frames sequentially. Single worker + sequential frames + progress messages is simpler, reliable, and fast enough for typical session sizes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gifenc | 1.0.3 | GIF binary encoding (LZW + palette) | Fastest pure-JS GIF encoder; small (9KB); works in Web Workers; per-frame palette support via `writeFrame({ palette })` |
| Web Worker (native) | — | Offload encoding to background thread | Keeps UI responsive during multi-second encode; supported in all target browsers |
| OffscreenCanvas (native) | — | Draw frames off-thread at export resolution | Already in renderTick signature; Baseline Widely Available since March 2023 |
| Vite `?worker` import | Vite 7 | Bundle worker as separate chunk | Standard Vite pattern; worker file handled automatically |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 | Icons for export button, progress, settings | Already installed; use `Download`, `Settings`, `Loader2` icons |
| Zustand | 5.0.11 | Settings state (outputWidth, outputHeight, transitionType) | Extend existing store — add `updateSettings` action |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gifenc | gif.js | gif.js unmaintained since ~2017; has built-in dithering but 5KB larger and no active maintenance |
| gifenc | modern-gif | 59 stars, minimal production usage, unclear quality benchmarks — not established enough |
| gifenc | gif-encoder-2 | Node-first; browser support unclear; less documentation |
| Single worker | Worker pool (4 workers) | Pool requires chunk reassembly, out-of-order handling — overkill for <30 frame sessions |
| Inline dithering | floyd-steinberg npm pkg | That npm package targets black-and-white only; color dithering must operate on RGB(A), 25 lines to write correctly |

**Installation:**
```bash
npm install gifenc
```

---

## Architecture Patterns

### Recommended Project Structure Additions

```
src/
├── store/
│   └── useFrameStore.ts      # Add outputWidth, outputHeight, transitionType to GifSettings
├── components/
│   ├── ExportPanel.tsx        # NEW: Settings controls + export button + progress
│   └── ResolutionSelect.tsx   # NEW: Preset resolution dropdown (optional sub-component)
├── workers/
│   └── gifWorker.ts           # NEW: Web Worker — encodes one GIF, posts progress + result
├── renderer/
│   └── renderTick.ts          # Extend: add TextFrame branch (TRAN-01 cut is a no-op)
└── utils/
    └── dither.ts              # NEW: floydSteinberg(rgba, width, height, palette) pure fn
```

### Pattern 1: GifSettings Extension

**What:** Add three fields to the existing `GifSettings` type.

**Why critical:** All encoding parameters flow from this type into the worker.

```typescript
// src/types/frames.ts — EXTEND existing interface
export interface GifSettings {
  frameDurationMs: number;    // already exists
  loop: boolean;              // already exists
  outputWidth: number;        // Phase 2: default 800
  outputHeight: number;       // Phase 2: default 600
  transitionType: 'cut';      // Phase 2: only 'cut' — Phase 3 adds 'crossfade' | 'slide-left' | 'slide-right'
}

// Resolution presets (used in ExportPanel selector):
export const RESOLUTION_PRESETS = [
  { label: '1200 × 900',   width: 1200, height: 900  },
  { label: '800 × 600',    width: 800,  height: 600  },
  { label: '1:1 (1080)',   width: 1080, height: 1080 },
  { label: '16:9 (720p)',  width: 1280, height: 720  },
] as const;
```

### Pattern 2: Zustand Store Extension

**What:** Add `updateSettings` action and new default values.

```typescript
// src/store/useFrameStore.ts — extend the store

interface FrameStore {
  // ... existing fields ...
  settings: GifSettings;
  updateSettings: (patch: Partial<GifSettings>) => void;
  // also add export state:
  exportProgress: number | null;  // null = idle, 0-100 = encoding
  setExportProgress: (v: number | null) => void;
}

// In create():
settings: {
  frameDurationMs: 800,
  loop: true,
  outputWidth: 800,     // Phase 2 default
  outputHeight: 600,    // Phase 2 default
  transitionType: 'cut',
},
exportProgress: null,

updateSettings: (patch) =>
  set((state) => ({ settings: { ...state.settings, ...patch } })),

setExportProgress: (v) => set({ exportProgress: v }),
```

### Pattern 3: Web Worker with Vite

**What:** Worker file imported via `?worker` suffix. Main thread creates worker, sends encode request, receives progress and result.

**When to use:** ExportPanel triggers export button click.

```typescript
// src/components/ExportPanel.tsx — worker creation
import GifWorker from '../workers/gifWorker.ts?worker';

async function handleExport() {
  const worker = new GifWorker();

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    if (e.data.type === 'progress') {
      setExportProgress((e.data.frame / e.data.total) * 100);
    } else if (e.data.type === 'done') {
      // Trigger download
      const blob = new Blob([e.data.bytes], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation.gif';
      a.click();
      URL.revokeObjectURL(url);      // Free immediately after click
      worker.terminate();
      setExportProgress(null);
    } else if (e.data.type === 'error') {
      console.error('Encode failed:', e.data.message);
      worker.terminate();
      setExportProgress(null);
    }
  };

  // Render frames to ImageData at output resolution, then post to worker
  const { frames, settings } = useFrameStore.getState();
  const { outputWidth, outputHeight, frameDurationMs, loop } = settings;

  // Each ImageBitmap from the store can be drawn to an OffscreenCanvas here
  // OR pass ImageBitmaps directly to the worker (transferable objects)
  // Recommended: pass ImageBitmap[] as transferable to avoid re-rendering on main thread
  // However: renderTick must run in the worker to use OffscreenCanvas correctly

  const bitmaps = frames.map(f => f.type === 'image' ? f.bitmap : null);

  worker.postMessage({
    type: 'encode',
    frames: frames,       // NOTE: ImageBitmap is transferable — see Pattern 4
    settings,
  });
}
```

### Pattern 4: Worker Implementation

**What:** Worker receives frame data, draws each frame to OffscreenCanvas using `renderTick`, extracts `ImageData`, runs dithering + quantization, encodes GIF chunk.

**Critical note:** `ImageBitmap` objects ARE transferable (zero-copy transfer). However, once transferred, the main thread CANNOT use them. Since Phase 1 preview still needs the bitmaps after export, do NOT transfer — instead use `structuredClone` behavior (postMessage copies Bitmaps if not in transfer list) or draw to OffscreenCanvas on the main thread and transfer the canvas. Simplest approach: render to `ImageData` on the main thread using a scratch canvas, then transfer the `ArrayBuffer`.

```typescript
// src/workers/gifWorker.ts
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { renderTick } from '../renderer/renderTick';
import { floydSteinberg } from '../utils/dither';
import type { Frame, GifSettings } from '../types/frames';

interface EncodeRequest {
  type: 'encode';
  frameData: ArrayBuffer[];   // RGBA pixel data for each frame, pre-rendered at output resolution
  width: number;
  height: number;
  settings: GifSettings;
}

// Source: https://github.com/mattdesl/gifenc
self.onmessage = async (e: MessageEvent<EncodeRequest>) => {
  const { frameData, width, height, settings } = e.data;
  const { frameDurationMs, loop } = settings;

  const encoder = GIFEncoder();
  const total = frameData.length;

  for (let i = 0; i < total; i++) {
    const rgba = new Uint8ClampedArray(frameData[i]);

    // 1. Quantize to 256-color palette (per-frame)
    const palette = quantize(rgba, 256);

    // 2. Apply Floyd-Steinberg dithering BEFORE palette mapping
    const dithered = floydSteinberg(rgba, width, height, palette);

    // 3. Map dithered pixels to palette indices
    const index = applyPalette(dithered, palette);

    // 4. Write frame to GIF stream
    encoder.writeFrame(index, width, height, {
      palette,
      delay: frameDurationMs,
      repeat: loop ? 0 : -1,  // 0 = loop forever, -1 = play once
    });

    // Post progress after each frame
    self.postMessage({ type: 'progress', frame: i + 1, total });
  }

  encoder.finish();
  const bytes = encoder.bytes();

  // Transfer the buffer (zero-copy back to main thread)
  self.postMessage({ type: 'done', bytes }, [bytes.buffer]);
};
```

### Pattern 5: Main Thread Frame Rendering (pre-worker)

**What:** Before posting to the worker, the main thread renders each frame to a scratch OffscreenCanvas at output resolution and extracts `ImageData`. The `ArrayBuffer` is then transferred (zero-copy) to the worker.

```typescript
// In ExportPanel.tsx or a useExport() hook — runs before worker.postMessage()
async function renderFramesToImageData(
  frames: Frame[],
  width: number,
  height: number
): Promise<ArrayBuffer[]> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const buffers: ArrayBuffer[] = [];

  for (const frame of frames) {
    renderTick(ctx, frame, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    // Copy buffer (worker needs its own copy — bitmaps stay on main thread for preview)
    buffers.push(imageData.data.buffer.slice(0));
  }

  return buffers;
}
```

### Pattern 6: Floyd-Steinberg Dithering Implementation

**What:** Pure function. Input: RGBA `Uint8ClampedArray`, palette from `gifenc.quantize()`, output dimensions. Output: new `Uint8ClampedArray` with colors error-diffused to the palette. Must be called AFTER `quantize()` but BEFORE `applyPalette()`.

**Critical:** The standard Floyd-Steinberg algorithm diffuses error in the FULL color space. For GIF encoding, diffuse error per channel (R, G, B) independently. Alpha channel: ignore (GIFs use 1-bit transparency only).

```typescript
// src/utils/dither.ts
// Floyd-Steinberg error diffusion dithering for indexed-color GIF output
// Source algorithm: https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering

function nearestPaletteColor(r: number, g: number, b: number, palette: Uint8Array): [number, number, number] {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i += 3) {
    const dr = r - palette[i];
    const dg = g - palette[i + 1];
    const db = b - palette[i + 2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return [palette[best], palette[best + 1], palette[best + 2]];
}

export function floydSteinberg(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  palette: Uint8Array
): Uint8ClampedArray {
  // Work on a copy to avoid mutating the original
  const data = new Uint8ClampedArray(rgba);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const oldR = data[i], oldG = data[i + 1], oldB = data[i + 2];
      const [newR, newG, newB] = nearestPaletteColor(oldR, oldG, oldB, palette);

      data[i]     = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;

      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      // Distribute error to right neighbor (7/16)
      if (x + 1 < width) {
        const j = i + 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + (errR * 7) >> 4));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + (errG * 7) >> 4));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + (errB * 7) >> 4));
      }
      // Bottom-left (3/16)
      if (y + 1 < height && x - 1 >= 0) {
        const j = ((y + 1) * width + (x - 1)) * 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + (errR * 3) >> 4));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + (errG * 3) >> 4));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + (errB * 3) >> 4));
      }
      // Bottom (5/16)
      if (y + 1 < height) {
        const j = ((y + 1) * width + x) * 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + (errR * 5) >> 4));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + (errG * 5) >> 4));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + (errB * 5) >> 4));
      }
      // Bottom-right (1/16)
      if (y + 1 < height && x + 1 < width) {
        const j = ((y + 1) * width + (x + 1)) * 4;
        data[j]     = Math.max(0, Math.min(255, data[j]     + (errR * 1) >> 4));
        data[j + 1] = Math.max(0, Math.min(255, data[j + 1] + (errG * 1) >> 4));
        data[j + 2] = Math.max(0, Math.min(255, data[j + 2] + (errB * 1) >> 4));
      }
    }
  }

  return data;
}
```

### Pattern 7: File Size Estimation

**What:** Display estimated file size in ExportPanel BEFORE the user clicks export. Update live as settings change.

```typescript
// src/components/ExportPanel.tsx
function estimateFileSizeKb(
  width: number,
  height: number,
  numFrames: number
): number {
  // GIF file size approximation:
  // - 1 byte per pixel (8-bit indexed)
  // - LZW compression ratio for screenshots: ~0.5 (high-entropy content compresses less)
  // - Per-frame palette overhead: 256 * 3 bytes = 768 bytes per frame
  const rawBytes = width * height * numFrames;
  const paletteBytes = numFrames * 768;
  const compressedBytes = rawBytes * 0.5 + paletteBytes + 800; // 800 = GIF header overhead
  return Math.round(compressedBytes / 1024);
}

// Usage in component:
const estimatedKb = estimateFileSizeKb(settings.outputWidth, settings.outputHeight, frames.length);
const displaySize = estimatedKb >= 1024
  ? `~${(estimatedKb / 1024).toFixed(1)} MB`
  : `~${estimatedKb} KB`;
```

### Pattern 8: Blob Download Trigger

**What:** Standard browser download trigger. Always revoke blob URL immediately to avoid memory leak.

```typescript
// In ExportPanel.tsx — after receiving worker 'done' message
function triggerDownload(bytes: Uint8Array, filename = 'animation.gif') {
  const blob = new Blob([bytes], { type: 'image/gif' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // Critical: revoke after click
}
```

### Anti-Patterns to Avoid

- **Transferring ImageBitmaps to the worker:** Once transferred, the main thread loses access — the preview will break. Copy pixel data instead (render to OffscreenCanvas, extract ImageData, slice the ArrayBuffer).
- **Running encode on the main thread:** Encoding a 10-frame 1200×900 GIF takes 2–5 seconds. This blocks the UI. Always use a worker.
- **Global palette quantization (quantize all frames together):** Per-frame quantization (`quantize(frameRgba, 256)` per frame) produces significantly better quality. gifenc's README shows both approaches — use the per-frame version.
- **Not revoking blob URLs:** `URL.createObjectURL` leaks memory until the page is unloaded if not explicitly revoked.
- **Building a worker pool for this app:** 5–30 frame sessions don't benefit. Sequential single-worker is simpler and eliminates chunk reassembly complexity.
- **Using `repeat: 0` for loop=false in gifenc:** The gifenc `repeat` option uses -1 for play-once, 0 for loop forever. This is the opposite of the boolean intuition.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LZW compression | Custom LZW encoder | gifenc `GIFEncoder` | LZW has edge cases (variable code width, clear codes, end-of-stream marker) — gifenc handles all of them correctly |
| Color quantization | k-means or median cut | gifenc `quantize()` | gifenc uses PNN (Pairwise Nearest Neighbor) which is faster and produces comparable quality to k-means for GIF palettes |
| GIF binary format | Manual byte writing | gifenc `GIFEncoder` | GIF89a spec has header, logical screen descriptor, image descriptors, extension blocks — all handled by gifenc |
| Worker bundling | Manual worker script concatenation | Vite `?worker` import | Vite handles TypeScript transpilation, import resolution, and separate chunk output automatically |
| Palette-to-color mapping | Euclidean search loop | gifenc `applyPalette()` | gifenc's `applyPalette` is optimized for speed with the format produced by `quantize()` |

**Key insight:** The GIF binary format has 20+ years of specification quirks. gifenc encapsulates all of them correctly in 9KB. Floyd-Steinberg dithering is the one missing piece — it is a simple 25-line algorithm with no hidden complexity.

---

## Common Pitfalls

### Pitfall 1: gifenc Has No Built-in Dithering

**What goes wrong:** EXPO-02 requires Floyd-Steinberg dithering. Using gifenc's `applyPalette()` directly without dithering produces visible banding on screenshot content (gradients, shadows, subtle color transitions).

**Why it happens:** gifenc README explicitly states "Currently no dithering support" and describes itself as "best suited for simple flat-style vector graphics."

**How to avoid:** Implement `floydSteinberg()` in `src/utils/dither.ts` (see Pattern 6 above). Call it AFTER `quantize()` builds the palette and BEFORE `applyPalette()` maps pixels to indices.

**Warning signs:** Exported GIF has visible color banding on gradients; screenshots look "posterized."

### Pitfall 2: gifenc `repeat` Parameter Semantics

**What goes wrong:** GIF loops when user selected "play once", or vice versa.

**Why it happens:** gifenc's `repeat` option uses -1 for play-once and 0 for loop forever. Boolean `loop: true` maps to `repeat: 0`, NOT `repeat: 1`. The intuition is inverted.

**How to avoid:**
```typescript
// In gifWorker.ts:
encoder.writeFrame(index, width, height, {
  delay: frameDurationMs,
  repeat: settings.loop ? 0 : -1,  // 0 = loop forever, -1 = play once
  palette,
});
```

**Warning signs:** Export does the opposite of what the loop toggle shows.

### Pitfall 3: ImageBitmap Transfer Kills Preview

**What goes wrong:** Main thread posts `frames` to worker with ImageBitmaps in the transfer list. After the transfer, `frame.bitmap` on the main thread is detached — the preview player crashes with "Cannot use detached ArrayBuffer."

**Why it happens:** `ImageBitmap` is a transferable object. Listing it in the transfer array is a zero-copy optimization that detaches the original.

**How to avoid:** NEVER put ImageBitmaps in the transfer list. Either omit the transfer array entirely (bitmap is copied, not transferred — slower but safe) OR — the recommended approach — render frames to `ImageData` on the main thread using a scratch `OffscreenCanvas`, then transfer the `ArrayBuffer` from `imageData.data.buffer`.

**Warning signs:** Preview canvas goes blank or crashes immediately after export is triggered.

### Pitfall 4: OffscreenCanvas Not Available in Older Safari

**What goes wrong:** Export silently fails on Safari versions < 16.2.

**Why it happens:** OffscreenCanvas was not supported in Safari until 16.2 (partial, 2D only) and 17.0 (full).

**How to avoid:** Current OffscreenCanvas coverage is ~95% globally (Baseline Widely Available since March 2023). Safari 17+ (released Sept 2023) has full support. For this desktop-first tool targeting designers, this is acceptable. Add a feature detection check and show a friendly error if unsupported:
```typescript
if (typeof OffscreenCanvas === 'undefined') {
  alert('Export requires a modern browser. Please update Safari to version 17 or use Chrome/Firefox.');
  return;
}
```

**Warning signs:** Export button does nothing on older Safari; no error shown to user.

### Pitfall 5: blob URL Not Revoked After Download

**What goes wrong:** Memory usage grows across multiple exports in the same session.

**Why it happens:** `URL.createObjectURL()` holds a reference to the Blob in memory until either `URL.revokeObjectURL()` is called or the page is unloaded.

**How to avoid:** Revoke immediately after `a.click()` — the browser has already started the download at this point:
```typescript
a.click();
URL.revokeObjectURL(url); // Safe to revoke immediately after click
```

**Warning signs:** Chrome Memory tab shows growing blob allocations after repeated exports.

### Pitfall 6: Worker TypeScript Import Path Resolution

**What goes wrong:** `renderTick` or `dither` imported in the worker file fails to resolve at runtime.

**Why it happens:** Vite resolves worker imports differently than main thread imports. The `?worker` suffix triggers a separate bundle. Imports within the worker file are bundled separately — they work, but the paths must be correct relative to the worker file location.

**How to avoid:** Use absolute paths from `src/` via TypeScript path aliases or keep paths relative and correct. Test the worker bundle explicitly in development.

**Warning signs:** Worker posts an 'error' message immediately on first encode attempt; DevTools shows module resolution error in worker script.

### Pitfall 7: gifenc `delay` Uses Milliseconds Directly

**What goes wrong:** GIF plays at wrong speed — frames advance too fast or too slow.

**Why it happens:** Some GIF encoders use centiseconds (1/100s) for delay. gifenc's `delay` option accepts **milliseconds** directly (it converts internally). Passing centiseconds gives a 10x speed error.

**How to avoid:** Pass `frameDurationMs` directly from `GifSettings`. If a frame duration of 800ms is desired, pass `delay: 800`.

**Warning signs:** Exported GIF plays ~10x faster than the preview.

---

## Code Examples

Verified patterns from official sources:

### gifenc Full Encoding Flow

```typescript
// Source: https://github.com/mattdesl/gifenc/blob/master/README.md
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

// Per-frame palette encoding (best quality)
const encoder = GIFEncoder();

for (const frameRgba of framesRgba) {
  // 1. Build palette from this frame's pixels
  const palette = quantize(frameRgba, 256);

  // 2. Apply Floyd-Steinberg dithering (custom — gifenc has none)
  const dithered = floydSteinberg(frameRgba, width, height, palette);

  // 3. Map dithered pixels to palette indices
  const index = applyPalette(dithered, palette);

  // 4. Write frame
  encoder.writeFrame(index, width, height, {
    palette,
    delay: 800,    // milliseconds
    repeat: 0,     // 0 = loop forever, -1 = play once
  });
}

encoder.finish();
const bytes = encoder.bytes(); // Uint8Array — the complete GIF binary
```

### Vite Worker Import

```typescript
// Source: https://vite.dev/guide/features#web-workers
// In ExportPanel.tsx (or useExport hook):
import GifWorker from '../workers/gifWorker.ts?worker';

const worker = new GifWorker();
// worker is typed as Worker — postMessage/onmessage work normally
```

### Worker Message Types (TypeScript)

```typescript
// src/workers/gifWorker.types.ts — share between main thread and worker
export type WorkerIncoming =
  | { type: 'encode'; frameData: ArrayBuffer[]; width: number; height: number; settings: GifSettings }

export type WorkerOutgoing =
  | { type: 'progress'; frame: number; total: number }
  | { type: 'done'; bytes: Uint8Array }
  | { type: 'error'; message: string }
```

### OffscreenCanvas Frame Render

```typescript
// Render frames to RGBA buffers before posting to worker
// Source: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
const canvas = new OffscreenCanvas(outputWidth, outputHeight);
const ctx = canvas.getContext('2d')!;

for (const frame of frames) {
  renderTick(ctx, frame, outputWidth, outputHeight); // existing shared function
  const imageData = ctx.getImageData(0, 0, outputWidth, outputHeight);
  frameData.push(imageData.data.buffer.slice(0)); // copy buffer — do NOT transfer
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gif.js (NeuQuant quantizer, Web Worker pool) | gifenc (PNN quantizer) + custom dithering | ~2020 | gifenc is 2x faster; gif.js unmaintained since 2017 |
| Main-thread GIF encoding | Web Worker encoding | Established pattern | Keeps UI responsive during multi-second encode |
| Global GIF palette (all frames share one palette) | Per-frame local palette | GIF89a spec supports both | Per-frame palette is better quality for varied content |
| No dithering in browser GIF tools | Floyd-Steinberg error diffusion | Long-established | Eliminates banding on photos and gradients |

**Deprecated/outdated:**
- `gif.js`: Unmaintained since ~2017. Phase 1 research correctly flagged this. Do not use.
- Global palette GIF encoding: Lower quality. Always use per-frame palette for screenshot content.
- gifenc version 1.0.3 is the latest and last published (5 years ago). The library is stable — no breaking changes expected. Its core dependencies (LZW algorithm) don't change.

---

## Open Questions

1. **Worker receives ImageBitmaps or pre-rendered RGBA buffers?**
   - What we know: ImageBitmap is transferable (zero-copy) but transfer detaches from main thread. renderTick can draw to OffscreenCanvas in the worker if the bitmap is cloned (not transferred).
   - What's unclear: Whether to render frames in the worker (draw → getImageData) or on the main thread (draw → transfer ArrayBuffer). Both work.
   - Recommendation: Render on the main thread using a scratch OffscreenCanvas, transfer the ArrayBuffer. This keeps the worker focused on encoding only (not rendering), and avoids the transferred-bitmap problem entirely. It also means Phase 3 transitions (crossfade, slide) can be rendered on the main thread where preview-quality is guaranteed.

2. **Safari < 17 fallback scope**
   - What we know: OffscreenCanvas coverage is ~95% globally. Safari 17+ (Sept 2023) has full support. The project targets desktop designers.
   - What's unclear: Whether to build a main-thread fallback or just show an error.
   - Recommendation: Feature-detect and show a clear "please update your browser" message. A main-thread fallback adds significant complexity for ~5% coverage. Mark the fallback as a post-v1 concern.

3. **gifenc `delay` units: verified as milliseconds?**
   - What we know: The README says "delay in ms." The test/encode_web_workers.html uses delay values consistent with milliseconds.
   - What's unclear: Some GIF encoder libraries use centiseconds despite docs saying ms. Integration test needed.
   - Recommendation: Add a specific verification task in the plan: encode a 2-frame GIF with delay: 1000, open it in a browser, confirm 1-second frame rate. This catches the centisecond vs millisecond issue immediately.

---

## Sources

### Primary (HIGH confidence)
- `https://github.com/mattdesl/gifenc/blob/master/README.md` — gifenc API: `quantize()`, `applyPalette()`, `GIFEncoder()`, `writeFrame()` options (delay, repeat, palette), dithering status, web worker example
- `https://vite.dev/guide/features#web-workers` — Vite `?worker` import syntax, `new URL()` pattern
- `https://github.com/mattdesl/gifenc/blob/master/test/encode_web_workers.html` — Worker architecture: message protocol, frame distribution, chunk reassembly
- `https://caniuse.com/offscreencanvas` — OffscreenCanvas browser support: Safari 16.2+ (2D), Safari 17+ (full), ~95% global coverage as of early 2026
- `https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas` — OffscreenCanvas API: `getContext('2d')`, `getImageData()`, Baseline Widely Available March 2023
- `https://en.wikipedia.org/wiki/Floyd%E2%80%93Steinberg_dithering` — Algorithm coefficients: 7/16, 3/16, 5/16, 1/16

### Secondary (MEDIUM confidence)
- `https://blog.ivank.net/floyd-steinberg-dithering-in-javascript.html` — Floyd-Steinberg JavaScript implementation reference (verified algorithm steps match Wikipedia)
- WebSearch: gifenc version 1.0.3 last published ~5 years ago — confirmed via npm search results; stable, not abandoned, just complete
- WebSearch: gif.js last significant commit 2017, unmaintained — confirmed by multiple sources; consistent with Phase 1 research finding

### Tertiary (LOW confidence — needs validation)
- WebSearch: gifenc `delay` accepts milliseconds — documented in README as "ms" but needs integration test to confirm (see Open Questions #3)
- WebSearch: GIF file size estimation formula (0.5 compression factor for screenshots) — rough heuristic from multiple informal sources; real compression varies significantly by content

---

## Metadata

**Confidence breakdown:**
- Standard stack (gifenc): HIGH — library sourced from Phase 1 research, API verified from official GitHub README
- Architecture (Worker + OffscreenCanvas): HIGH — official Vite docs + MDN confirm patterns; OffscreenCanvas coverage confirmed from caniuse
- Floyd-Steinberg dithering: HIGH — well-documented algorithm with confirmed JavaScript implementation; the "no gifenc dithering" finding is explicitly stated in gifenc's own README
- Pitfalls: HIGH — most pitfalls derived from explicit API documentation (repeat semantics, transfer semantics) or official browser compat tables
- File size estimation: LOW — heuristic formula only; real output varies by content entropy

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days — gifenc is stable; OffscreenCanvas support only grows)
