# Project Research Summary

**Project:** GIF Creator
**Domain:** Browser-based GIF compositor for designer portfolio use
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

This is a pure client-side GIF compositor — a tool that takes static screenshots, arranges them as ordered frames, adds portfolio-polish features (title card text frames, crossfade transitions, preset resolutions), and exports a high-quality GIF directly in the browser. No existing tool serves this workflow cleanly: general-purpose GIF utilities are ad-laden and produce poor quality for UI screenshots; screen recorders require live capture; design tool plugins require existing subscriptions and multi-step workflows. The gap is clear and the scope is well-defined.

The recommended approach is React 19 + TypeScript + Vite (pure SPA, no backend) with `gifenc` as the GIF encoder (per-frame palette quantization + Floyd-Steinberg dithering — the same algorithm Photoshop uses). GIF encoding runs in a Web Worker using OffscreenCanvas to keep the UI responsive. A discriminated union frame model (`ImageFrame | TextFrame`) allows image uploads and title card text frames to participate in the same ordered sequence. The shared `renderTick()` function drives both the animated preview and the GIF export pipeline, guaranteeing visual identity between what the user sees and what gets encoded.

The primary risks are all well-documented and mitigatable: GIF color banding from poor palette defaults (solved by per-frame quantization and dithering on by default), UI freeze during encoding (solved by Web Worker), and memory exhaustion from Retina screenshots (solved by `ImageBitmap.close()` after each frame is encoded). The critical path is Upload → Reorder → Preview → Export. Title cards, crossfade transitions, and the Web Worker encoding pipeline layer on top of this spine. Scope discipline is essential — this tool must not drift into video input, image filters, cloud storage, or mobile support.

---

## Key Findings

### Recommended Stack

The stack is deliberately minimal for a single-developer, client-side-only tool. React 19's concurrent features help keep the UI responsive alongside async encoding operations. Vite 6 is preferred over Next.js because there are no server-side concerns. Zustand handles app state with minimal boilerplate — no provider wrappers, no reducers. `@dnd-kit/sortable` is the current standard for drag-and-drop frame reordering (`react-beautiful-dnd` is archived).

The most consequential stack decision is the GIF encoder. `gifenc` is the clear choice: pure JavaScript (no WASM), ~15KB gzipped, per-frame 256-color palette quantization, Floyd-Steinberg dithering built in, works in all browsers without special HTTP headers. `ffmpeg.wasm` is explicitly ruled out (30MB+ bundle, requires `SharedArrayBuffer` with COOP/COEP headers). `gif.js` is unmaintained since 2017.

**Core technologies:**
- React 19: UI framework — concurrent features for non-blocking encode feedback
- TypeScript 5: Type safety — discriminated union frame model prevents class of runtime errors
- Vite 6: Build tool — fast HMR, no SSR overhead needed
- `gifenc`: GIF encoding — per-frame palette + Floyd-Steinberg; pure JS; no deployment friction
- Canvas 2D + OffscreenCanvas: Frame rendering — shared renderer for preview and export
- Web Worker: Encoding thread — prevents UI freeze on multi-frame export
- Zustand: State management — frame array CRUD + settings; no provider required
- `react-dropzone`: File upload — multi-file, MIME validation, drag states
- `@dnd-kit/sortable`: Frame reordering — active standard (replaces archived `react-beautiful-dnd`)
- Tailwind CSS v4 + Radix UI: Styling and accessible primitives
- `react-colorful`: Color picker for title card backgrounds (~2KB, no dependencies)
- `file-saver`: Cross-browser GIF download trigger

**Action required before Phase 1:** Verify `modern-gif` on npm — if it is actively maintained with better quality benchmarks, evaluate adopting it over `gifenc`.

### Expected Features

There is a clear product gap: a compositor for static screenshots with portfolio-quality output. The differentiators that define the product's positioning are title card text frames (no generic GIF tool offers this), crossfade transitions (Ezgif has cut-only), and opinionated quality defaults (Floyd-Steinberg dithering on by default will visually beat Ezgif's defaults without users knowing why).

**Must have (table stakes):**
- Multi-image upload (drag-and-drop, PNG/JPG/WebP) — every GIF tool starts here
- Frame reordering (drag-and-drop strip) — fixed order is a blocker
- Frame deletion — users always upload wrong images
- Animated preview (play/pause) — users need to see before export
- Global frame duration slider — uniform timing is the baseline control
- Output resolution presets (1200x900, 800x600, 1:1, 16:9) — designers care about resolution
- GIF export and download — the entire point of the tool
- Loop control — portfolio GIFs loop by default

**Should have (competitive differentiators, all target v1):**
- Title card frames (text + background color) — defines portfolio-focused positioning
- Crossfade transition — dramatic quality improvement over cut-only
- Opinionated quality defaults — Floyd-Steinberg on by default, 12-15fps, per-frame palette
- Portfolio resolution presets — signal intentionality for Behance/case study sizes

**Defer (v2+):**
- Per-frame duration control — hold on key UI states
- Export file size estimate before download
- Reverse playback
- Keyboard shortcuts
- Slide/wipe transitions
- Undo/redo history

**Anti-features (never build):**
- Video input or screen recording
- Text/sticker overlays on image frames (title cards cover this professionally)
- Image filters or color effects
- Account system or cloud storage
- Mobile support (desktop screenshot workflow only)
- Video export (MP4/WebM)
- Freeform custom canvas dimensions

### Architecture Approach

The system is a pure client-side SPA with no backend. The frame data model is a TypeScript discriminated union (`ImageFrame | TextFrame`) stored in Zustand as the single source of truth. The architectural linchpin is a shared `renderTick(progress, fromFrame, toFrame)` function that drives both the animated preview (via `requestAnimationFrame`) and the GIF encoder (via a Web Worker loop) — guaranteeing that preview and export are visually identical. Images are decoded once to `ImageBitmap` objects and must be `.close()`-ed after encoding to free GPU memory.

**Major components:**
1. Frame Store (Zustand) — single source of truth for ordered frame array and GIF settings
2. Frame Input Layer — image uploader (`react-dropzone`) and text card form feeding the same frame array
3. Frame Strip — drag-and-drop sequence editor using `@dnd-kit/sortable`; operates entirely from store
4. Canvas Renderer (`renderTick`) — shared rendering function for preview and export; handles crossfade alpha blending and text frame drawing
5. Preview Player — `requestAnimationFrame` loop calling `renderTick`; separate canvas element from export
6. GIF Encoder Pipeline — Web Worker + OffscreenCanvas; per-tick render → `gifenc.addFrame()` → blob → `file-saver`
7. Export Settings Panel — resolution presets, timing sliders, transition controls, export trigger

**Established build order (from architecture research):**
1. Frame data types + Zustand store
2. Image upload pipeline
3. Frame strip with reordering
4. Canvas renderer (image frames)
5. Preview player
6. Text frame support
7. GIF encoder (main thread, cut-only)
8. Export settings panel
9. Crossfade transitions
10. Web Worker encoder + OffscreenCanvas
11. Polish (progress bar, error states, memory cleanup)

### Critical Pitfalls

1. **GIF color banding on UI screenshots** — Use per-frame palette quantization with Floyd-Steinberg dithering from day one. Never use a global palette. Set this as the default — users should not have to configure quality. (Phase 1)

2. **Main thread freeze during encoding** — Move encoding to a Web Worker using OffscreenCanvas. Add a progress bar (`postMessage` from worker). Fallback to main-thread encoding with progress indicator for Safari 15 and earlier (OffscreenCanvas unavailable). (Phase 2)

3. **Memory exhaustion with Retina screenshots** — Call `imageBitmap.close()` immediately after each frame is rendered to the encoder. Render thumbnails to small canvas (100×70px) and keep only the thumbnail, not the full-resolution bitmap. (Phase 1)

4. **Aspect ratio distortion at export** — Letterbox by default when source and output aspect ratios differ. Never stretch. Offer center crop as an option. Establish this in the canvas renderer early. (Phase 1)

5. **Frame reordering state desync** — Zustand store is the single source of truth. Derive `@dnd-kit` item list entirely from the store. On drag end, call `store.reorderFrames()` synchronously and let DnD re-render from store. Do not maintain separate DnD state. (Phase 1)

Additional pitfalls to address in order: blob URL memory leaks (Phase 1), GIF frame delay floor minimum 20ms (Phase 2), output file size shock — show size estimate (Phase 2), Safari OffscreenCanvas feature detection (Phase 2), crossfade color artifacts — covered by per-tick quantization (Phase 3), text rendering inconsistency across browsers — use web font via FontFace API (Phase 1).

---

## Implications for Roadmap

Based on the dependency chain from FEATURES.md and the build order from ARCHITECTURE.md, four phases emerge naturally.

### Phase 1: Core Upload and Preview Loop

**Rationale:** This is the critical path. Everything else depends on frames existing, being ordered, and being previewable. Architecture research explicitly identifies this as the spine the entire product hangs off. Pitfall research identifies four high-severity pitfalls (color banding defaults, memory exhaustion, aspect ratio distortion, state desync) that must be addressed here before technical debt accumulates.

**Delivers:** A working tool where users can upload images, reorder them as frames, preview the animation, and see what their GIF will look like. No export yet — but the core loop is validated.

**Addresses (from FEATURES.md):** Multi-image upload, frame reordering, frame deletion, animated preview.

**Avoids (from PITFALLS.md):**
- Memory exhaustion: `ImageBitmap.close()` pattern established at the image loading layer
- Aspect ratio distortion: Letterbox rule established in `renderTick()` from the start
- State desync: Zustand-only source of truth for frame order
- Blob URL leaks: Cleanup pattern established in `useEffect`
- CORS taint: File-from-disk design avoids the problem entirely

**Stack used:** React + TypeScript + Vite scaffold, Zustand, `react-dropzone`, `@dnd-kit/sortable`, Canvas 2D

**Needs research during planning:** No — well-established patterns throughout.

---

### Phase 2: GIF Export and Settings

**Rationale:** Export is the entire point of the tool. This phase delivers the first usable artifact. It must come before title cards and transitions so quality defaults are established in isolation — easier to validate that encoding is correct without transition complexity. The GIF frame delay floor and file size shock pitfalls must be addressed here.

**Delivers:** Exportable GIF from uploaded images. No transitions yet — cut-only. Portfolio-quality defaults (per-frame palette, Floyd-Steinberg dithering) baked in. Export settings panel with resolution presets, duration slider, loop control.

**Addresses (from FEATURES.md):** GIF export/download, output resolution presets, global frame duration, loop control, quality defaults.

**Avoids (from PITFALLS.md):**
- Color banding: per-frame `gifenc` quantization + Floyd-Steinberg on by default
- Main thread freeze: Web Worker encoder with OffscreenCanvas (feature-detect for Safari fallback)
- GIF frame delay floor: minimum 20ms enforced in encoder
- File size shock: show estimated file size in export panel
- Safari OffscreenCanvas: feature detect + main-thread fallback

**Stack used:** `gifenc`, OffscreenCanvas, Web Worker, `file-saver`, `react-colorful` (for export panel)

**Needs research during planning:** MEDIUM — Web Worker + OffscreenCanvas integration has some complexity; worth a quick implementation spike or referencing `gifenc` examples before writing phase tasks.

---

### Phase 3: Title Cards and Crossfade Transitions

**Rationale:** These are the primary differentiators that define the product's portfolio-focused positioning. They must come after export is working so they can be validated against actual GIF output. Animated preview must be working before transitions are added — you cannot validate transitions without preview. Both features share the same `renderTick()` extension path.

**Delivers:** Title card text frames (background color + text, composited as regular frames in sequence), crossfade transition rendering in both preview and export, full v1 feature set.

**Addresses (from FEATURES.md):** Title card frames, crossfade transition, slide transition (optional in this phase).

**Avoids (from PITFALLS.md):**
- Crossfade color artifacts: per-tick quantization (covered by per-frame palette approach from Phase 2)
- Text rendering inconsistency: web font loaded via FontFace API before canvas text rendering

**Stack used:** Canvas 2D (alpha compositing for crossfade), FontFace API, `react-colorful` (title card background picker)

**Needs research during planning:** LOW — crossfade via canvas alpha blending is well-documented. Text rendering with FontFace API is standard.

---

### Phase 4: Polish and Quality

**Rationale:** The product is feature-complete after Phase 3. This phase makes it feel finished: progress indicators, error states, memory cleanup discipline, upscaling warnings, and the secondary differentiators that designers notice (export file size display, keyboard shortcuts groundwork).

**Delivers:** Production-ready UX. Progress bar during encoding, error handling for failed uploads or encoding, memory cleanup verification, upscaling warnings, file size estimate surfaced prominently, loading states throughout.

**Addresses (from FEATURES.md):** Export file size estimate (moved from v2 to polish if low-effort), opinionated quality UX.

**Avoids (from PITFALLS.md):** All remaining memory cleanup concerns, any remaining edge cases from earlier phases.

**Needs research during planning:** No — standard polish patterns.

---

### Phase Ordering Rationale

- Phases 1-2 follow the feature dependency chain exactly: frames must exist before export can work.
- Phase 3 follows Phase 2 because transitions are validated against actual GIF output — you need the encoder working to know if crossfade produces artifacts.
- Title cards and transitions are grouped in Phase 3 because they share the `renderTick()` extension path — implementing both together avoids touching the renderer twice.
- The Web Worker encoder is in Phase 2 rather than Phase 4 because main-thread encoding would make testing Phase 2 painful for any moderately sized GIF — it is a development quality-of-life concern, not just a polish item.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (GIF Export):** Web Worker + OffscreenCanvas + `gifenc` integration is the most complex wiring in the project. Worth reviewing `gifenc` source examples and OffscreenCanvas transfer semantics (specifically transferring ImageBitmap to worker via `postMessage`) before writing detailed task list.
- **Phase 1 (image loading):** Verify `modern-gif` on npm as an alternative to `gifenc` — if it is better maintained with quality benchmarks, the encoder decision changes Phase 2's implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (everything except encoder decision):** `react-dropzone`, `@dnd-kit/sortable`, Zustand, Canvas 2D — all have excellent documentation and established usage patterns.
- **Phase 3 (crossfade and text frames):** Canvas alpha compositing and FontFace API are well-documented browser APIs.
- **Phase 4 (polish):** Standard loading states and error handling patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | React/Vite/Zustand ecosystem choices are stable and well-documented. `gifenc` is the clear winner among GIF libraries — only uncertainty is whether `modern-gif` (2024/2025) supersedes it. |
| Features | HIGH (table stakes), MEDIUM (differentiators) | Table stakes are unambiguous. Title cards and crossfade are the right differentiators — confident. Per-frame duration and reverse playback are correctly deferred. |
| Architecture | HIGH | Browser canvas + GIF encoding architecture is well-established. Discriminated union frame model and shared `renderTick()` are the right patterns — no ambiguity. |
| Pitfalls | HIGH | All pitfalls are well-documented in browser canvas/GIF encoding literature. Per-frame quantization, OffscreenCanvas, and `ImageBitmap.close()` are confirmed mitigations. |

**Overall confidence:** HIGH

### Gaps to Address

- **`modern-gif` library evaluation:** STACK.md flags this as a pre-Phase-1 action item. Check npm for `modern-gif` before committing to `gifenc`. If `modern-gif` is actively maintained with demonstrably better quality, adopt it. This changes the encoder implementation in Phase 2 but not the architecture.
- **Safari OffscreenCanvas testing:** Feature detection + fallback is architecturally planned, but behavior must be tested in Safari 16.x before Phase 2 ships. The main-thread fallback must show a progress indicator so users do not think the browser is frozen.
- **File size estimation accuracy:** The "show estimated file size" feature (Phase 2 / Phase 4) requires a heuristic formula. The accuracy of frame count × resolution × compression estimate needs validation against real GIF outputs during Phase 2.
- **Portfolio site file size limits:** Behance and Dribbble limits were referenced (2-8 MB tolerable, 15 MB problematic) but not verified against current platform documentation. Verify before writing export panel copy.

---

## Sources

### Primary (HIGH confidence)
- `gifenc` npm package and documentation — GIF encoder evaluation and per-frame palette approach
- MDN Web Docs (OffscreenCanvas, Canvas 2D API, ImageBitmap, FontFace API, Web Workers) — architecture constraints and pitfall mitigations
- `@dnd-kit` documentation — frame reordering (replaces deprecated `react-beautiful-dnd`)
- GIF89a specification — frame delay centisecond units, 256-color palette limit

### Secondary (MEDIUM confidence)
- Competitive analysis of Ezgif, ScreenToGif, GIPHY Maker, Figma plugins — feature gap identification
- Community reports on `gif.js` abandonment and `ffmpeg.wasm` deployment friction
- OffscreenCanvas browser compatibility data (Safari 16.4+)

### Tertiary (LOW confidence, needs validation)
- Portfolio site file size tolerances (2-8 MB guideline) — verify against Behance/Dribbble docs
- `modern-gif` library status — verify on npm before Phase 1

---

*Research completed: 2026-02-26*
*Ready for roadmap: yes*
