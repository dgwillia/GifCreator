# Architecture Research: Browser-Based GIF Creator

**Domain:** Browser-based GIF creator for designer portfolio use
**Researched:** 2026-02-26
**Confidence:** HIGH — browser canvas/GIF tool architecture is well-established

---

## System Overview

The tool is a pure client-side single-page application. All processing happens in the browser — no backend, no accounts, no network calls after initial page load.

```
User → Browser SPA → Canvas Renderer → GIF Encoder → File Download
             ↑
         Frame Store (Zustand)
```

---

## Core Components

### 1. Frame Store (State Layer)

The single source of truth. Manages the ordered list of frames and all settings.

**Frame data model — discriminated union:**

```typescript
type Frame = ImageFrame | TextFrame;

interface ImageFrame {
  type: 'image';
  id: string;
  file: File;         // original File object
  bitmap: ImageBitmap; // decoded, ready for canvas draw
  name: string;
}

interface TextFrame {
  type: 'text';
  id: string;
  text: string;
  backgroundColor: string; // hex
  textColor: string;       // hex
  fontSize: number;
}

interface GifSettings {
  outputWidth: number;
  outputHeight: number;
  frameDurationMs: number;     // global (e.g. 800ms)
  transitionDurationMs: number; // e.g. 400ms
  transitionType: 'cut' | 'crossfade' | 'slide-left' | 'slide-right';
  loop: boolean;
}
```

**Why a union type:** Image frames and text frames are fundamentally different data but participate in the same sequence. A discriminated union lets TypeScript enforce correct property access per frame type without runtime errors.

### 2. Frame Input Layer

Two entry points for creating frames:

- **Image Uploader:** `react-dropzone` → `createImageBitmap()` → stores `ImageFrame` in store
- **Text Card Editor:** Form with color picker + text input → stores `TextFrame` in store

Both feed into the same frame array — the sequence system is frame-type-agnostic.

### 3. Frame Strip (Sequence Editor)

Visual representation of the frame array. Responsibilities:

- Render frame thumbnails (100×70px canvas previews for image frames; color swatch for text frames)
- Drag-and-drop reordering via `@dnd-kit/sortable`
- Delete individual frames
- Select a frame (shows edit panel on right)

**Key:** The frame strip operates entirely on the Zustand store. No local state.

### 4. Canvas Renderer

The architectural linchpin. Used for TWO purposes with the same rendering logic:

1. **Preview rendering:** Draws frames to a `<canvas>` element on screen at real-time speed
2. **Export rendering:** Drives the GIF encoder by calling the same `renderTick()` function per-frame

```
renderTick(progress: number, fromFrame: Frame, toFrame: Frame | null) → void
  ├── If transitionType === 'cut': draw fromFrame at full opacity
  ├── If transitionType === 'crossfade': draw fromFrame then toFrame with alpha blend
  └── Text frames: ctx.fillRect(backgroundColor) + ctx.fillText(text)
```

**Progress** (0.0–1.0) represents position within a frame's display + transition duration:
- 0.0 → frame just appeared
- 0.7 → approaching transition start
- 1.0 → transition complete, next frame now visible

**Why single `renderTick()`:** Preview and export must be visually identical. A shared function is the only reliable way to guarantee this.

### 5. Preview Player

Controls: Play / Pause / Seek (optional).

- Uses `requestAnimationFrame` loop
- Calls `renderTick()` on each frame with current `progress`
- Reads frame timing from GifSettings

**Important:** Preview player draws to a separate `<canvas>` element from the export canvas. They share the rendering logic but not the canvas context.

### 6. GIF Encoder Pipeline

Runs in a **Web Worker** to avoid UI freeze. Uses `OffscreenCanvas` if available (Chrome/Firefox/Edge/Safari 16.4+), falls back to main-thread Canvas with a progress indicator.

```
GIF Export triggered
  → Spin up Web Worker
  → For each tick in timeline:
      → Call renderTick() on OffscreenCanvas
      → getImageData() from canvas context
      → Pass pixel data to gifenc encoder
      → Add frame to GIF (with computed delay in 10ms units)
  → Encoder.finish() → Uint8Array
  → postMessage(blob) back to main thread
  → file-saver triggers .gif download
```

**Tick generation:** GIF format uses 10ms centisecond delay units. Transitions need intermediate frames. A 400ms crossfade at 12fps = ~5 transition frames. The encoder generates these ticks, not the preview player.

**Frame delay calculation:**

```
frameTicks = frameDurationMs / 10  (in centiseconds, GIF format)
transitionTicks = transitionDurationMs / 10
```

For a crossfade: generate `transitionTicks` intermediate frames where alpha blends from 0→1.

### 7. Export Settings Panel

Simple form:
- Resolution preset selector (1200×900, 800×600, 1:1, 16:9)
- Frame duration slider (200ms–3000ms)
- Transition duration slider (0ms–800ms)
- Transition type selector (cut, crossfade)
- Loop toggle
- "Export GIF" button → triggers encoder pipeline

---

## Data Flow

```
File Drop (images)
  → createImageBitmap() (async)
  → ImageFrame added to store

Text Card Form submit
  → TextFrame added to store

Frame Strip (DnD reorder)
  → store.reorderFrames(fromIdx, toIdx)

Preview Player (rAF loop)
  → store.frames + store.settings
  → renderTick(progress, from, to)
  → <canvas> element on screen

Export Button
  → store.frames + store.settings
  → Web Worker receives frames (ImageBitmap transferred, TextFrame data copied)
  → Worker: for each tick → renderTick() → gifenc.addFrame()
  → Worker: encoder.finish() → blob
  → Main thread: file-saver.saveAs(blob, 'portfolio.gif')
```

---

## Build Order (Dependency Chain)

1. **Frame data model** — TypeScript types for `Frame`, `GifSettings`
2. **Zustand store** — frame array CRUD + settings
3. **Image upload** — `react-dropzone` → `createImageBitmap()` → store
4. **Frame strip** — render thumbnails + `@dnd-kit` reordering + delete
5. **Canvas renderer** — `renderTick()` for image frames only (no text yet)
6. **Preview player** — `rAF` loop using canvas renderer
7. **Text frame support** — TextFrame type + creation form + renderer branch
8. **GIF encoder (basic)** — cut transitions only, main thread (no worker yet)
9. **Export settings panel** — resolution presets, duration, loop
10. **Transition rendering** — crossfade in `renderTick()`
11. **Web Worker encoder** — move encoding off main thread; OffscreenCanvas
12. **Polish** — loading states, progress bar, error handling, file size estimate

**Why this order:** Steps 1-6 deliver the core loop (upload → preview). Step 8 delivers the first exportable GIF. Steps 10-11 add the quality differentiators. Each step is independently valuable and testable.

---

## Key Architectural Decisions

### Client-side only
- No backend means no CORS issues, no deployment complexity, no operating costs
- All data stays on user's machine — relevant for designers with confidential client work
- Tradeoff: encoding large GIFs ties up browser resources; mitigated by Web Worker

### Shared `renderTick()` for preview and export
- Prevents preview/export divergence
- Tradeoff: slightly more complex than separate preview and export renderers; worth it

### `ImageBitmap` for decoded images
- Decoded once, drawn many times without re-decoding
- Must be `.close()`-ed after encoding to free GPU memory

### OffscreenCanvas in Web Worker
- Prevents GIF encoding (CPU intensive) from freezing the UI
- Fallback to main thread required for older Safari

---

## Component Map

```
App
├── FrameStrip
│   ├── FrameThumbnail (×N)
│   └── AddTextCardButton
├── EditPanel (shows when frame selected)
│   ├── ImageFrameEditor (shows source filename)
│   └── TextFrameEditor (text, colors)
├── PreviewCanvas
│   └── PlaybackControls
├── ExportPanel
│   ├── ResolutionPresets
│   ├── TimingControls
│   ├── TransitionControls
│   └── ExportButton → GIF Encoder (Worker)
└── UploadZone (full-screen drop target)
```
