# Stack Research: Browser-Based GIF Creator

**Domain:** Browser-based GIF creator for designer portfolio use
**Researched:** 2026-02-26
**Confidence:** HIGH for framework choices (React ecosystem is stable), MEDIUM-HIGH for GIF encoding (rapidly evolving library landscape as of 2025)

---

## Critical Decision: GIF Encoding

This is the most consequential stack choice. GIF encoding in the browser has three viable approaches:

### Option A: `gifenc` (Recommended)
- **Package:** `gifenc` — pure JavaScript, no WASM, no web workers required
- **Quality:** Per-frame 256-color palette quantization + Floyd-Steinberg dithering
- **Bundle size:** ~15KB gzipped
- **Confidence:** HIGH — well-maintained, designed exactly for this use case
- **Rationale:** Same dithering algorithm Photoshop uses; no special HTTP headers required; works in all browsers

### Option B: `modern-gif` (~2024)
- **Status:** Appeared in 2024/2025, may offer improvements over `gifenc`
- **Confidence:** MEDIUM — verify on npm before committing
- **Action:** Check npm for `modern-gif` during Phase 1 setup; adopt if actively maintained with better quality benchmarks

### What NOT to Use

| Library | Why Not |
|---------|---------|
| `gif.js` | Unmaintained since ~2017; uses Web Workers in a brittle way |
| `ffmpeg.wasm` | 30MB+ bundle; requires `SharedArrayBuffer` (needs COOP/COEP headers); major deployment friction |
| `gifshot` | Designed for webcam/video input, not image sequences; largely abandoned |
| `gif-encoder-2` | Global palette only — poor quality for UI screenshots with varied colors per frame |

---

## Full Stack Recommendation

### Framework & Build

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| UI Framework | React | 19 | Concurrent features for non-blocking GIF encode; large ecosystem |
| Language | TypeScript | 5.x | Type safety for complex frame model (ImageFrame \| TextFrame union) |
| Build tool | Vite | 6.x | Fast HMR; excellent static asset handling for image previews |
| Package manager | npm or pnpm | latest | No special requirements |

### GIF Encoding & Canvas

| Layer | Choice | Rationale |
|-------|--------|-----------|
| GIF encoder | `gifenc` | Per-frame palette + Floyd-Steinberg; pure JS; no WASM deployment issues |
| Frame rendering | Canvas 2D API (native) | Built-in; OffscreenCanvas for off-main-thread encode |
| Worker thread | `OffscreenCanvas` + Web Worker | Prevents UI freeze during GIF encoding; keeps preview responsive |

### UI & Interaction

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Drag-and-drop upload | `react-dropzone` | Best-in-class; supports multi-file, MIME type validation, drag states |
| Frame reordering | `@dnd-kit/sortable` | `react-beautiful-dnd` is deprecated/archived; dnd-kit is the current standard |
| UI components | Radix UI primitives | Accessible; unstyled — pairs with Tailwind |
| Styling | Tailwind CSS | v4 in 2025; utility-first; fast iteration for a single-developer project |
| Color picker | `react-colorful` | Lightweight (~2KB); no dependencies; good for title card background selection |
| Icons | Lucide React | Actively maintained; tree-shakeable |

### State Management

| Layer | Choice | Rationale |
|-------|--------|-----------|
| App state | Zustand | Minimal boilerplate; perfect for frame list + settings state; no provider wrapping |
| Async operations | React Query or plain async/await | Plain async sufficient; GIF encoding is a one-shot operation |

### File Handling

| Layer | Choice | Rationale |
|-------|--------|-----------|
| File download | `file-saver` | Cross-browser `.gif` download trigger; handles blob URLs correctly |
| Image loading | Native `createImageBitmap()` | Browser API; async; supports PNG/JPG/WebP; no library needed |

---

## Architecture Constraints from Stack

1. **OffscreenCanvas availability:** Supported in Chrome, Firefox, Edge. Safari added support in 16.4+ — verify before relying on it for the Web Worker encoding path. Fallback: main-thread Canvas with a progress indicator.
2. **`SharedArrayBuffer` — avoid:** If encoding is done in a Web Worker via `gifenc`, standard `postMessage()` with `Transferable` objects (ArrayBuffer) is sufficient. No need for `SharedArrayBuffer` and the COOP/COEP header requirements it triggers.
3. **CORS on images:** `createImageBitmap()` from a `<input type="file">` blob URL bypasses CORS. Images loaded from external URLs will hit canvas taint restrictions. This tool's upload-from-disk workflow is safe by design.
4. **Memory:** High-res screenshots (e.g. 2560×1600 Retina) loaded into `ImageBitmap` objects can consume 50–200MB+ for a 10-frame sequence. Implement `imageBitmap.close()` after rendering each frame to encoding.

---

## Not in Stack (Intentionally Excluded)

| Excluded | Reason |
|----------|--------|
| Next.js / SSR | No server-side concerns; pure client-side tool; Vite is lighter |
| Redux / MobX | Overkill for frame list + settings state |
| Backend / API | Client-side only; no accounts, no storage, no upload endpoint |
| WebGL / Three.js | Canvas 2D is sufficient for crossfade/slide transitions |
| Web Animation API | Canvas rendering is needed for GIF export anyway; WAAPI is preview-only |

---

## Decision Summary

```
React 19 + TypeScript 5 + Vite 6
  └── gifenc (GIF encoding, per-frame palette)
  └── Canvas 2D + OffscreenCanvas + Web Worker (rendering pipeline)
  └── react-dropzone (file upload)
  └── @dnd-kit/sortable (frame reordering)
  └── Zustand (state)
  └── Tailwind CSS v4 + Radix UI (UI)
  └── react-colorful (color picker)
  └── file-saver (download)
```

---

## Action Items Before Phase 1

- [ ] Verify `modern-gif` on npm — if maintained with quality benchmarks, adopt over `gifenc`
- [ ] Test `OffscreenCanvas` + Web Worker GIF encoding in Safari 16.4+
- [ ] Benchmark `gifenc` per-frame palette quality vs global palette on a real UI screenshot
