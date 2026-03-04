# Phase 3: Title Cards and Transitions - Research

**Researched:** 2026-03-04
**Domain:** Canvas 2D rendering (text layout, alpha compositing, pixel-level transitions), React state management extension, GIF frame generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-02 | User can add title card frames with a custom solid background color and text | TextFrame type already defined in `src/types/frames.ts`. Needs: (1) "Add Title Card" button in DropZone or left sidebar, (2) `addTextFrame` store action, (3) `TextFrameThumbnail` component rendering via CSS (not canvas), (4) `renderTick` TextFrame branch drawing background fill + centered text to canvas. |
| TRAN-02 | User can select crossfade (alpha blend) transition between frames | GifSettings.transitionType must be widened from `'cut'` to `'cut' \| 'crossfade' \| 'slide-left' \| 'slide-right'`. ExportPanel transition selector must offer new options. `renderTick` must support a `progress` parameter (0.0–1.0) for alpha-blending between two consecutive frames. The export pipeline in `ExportPanel.tsx` must generate N interpolated frames between each content frame pair. The preview player must animate these interpolated frames. |
| TRAN-03 | User can select slide left or slide right transition between frames | Same infrastructure as TRAN-02. `renderTick` compositing approach: draw `nextFrame` offset by `(1 - progress) * width` pixels right (slide-left) or left (slide-right), then draw `currentFrame` at `progress * width` pixel offset in the opposite direction. Two-frame rendering required. |
</phase_requirements>

---

## Summary

Phase 3 is entirely additive to the existing codebase. No existing file requires redesign — only targeted extensions. The architecture was deliberately built in Phase 1/2 to accommodate exactly this phase: `TextFrame` is already defined in the type system, `renderTick` already accepts a `progress` parameter (currently void-suppressed), and `GifSettings.transitionType` is already typed as `'cut'` with explicit comments noting Phase 3 will widen the union.

The two primary technical challenges are: (1) **transition frame generation** — transitions must be expanded into discrete intermediate frames during both preview animation and GIF export, since GIF has no native transition concept; and (2) **two-frame compositing** — crossfade and slide transitions require reading the NEXT frame while rendering the CURRENT frame, which means `renderTick` (or a new `renderTransitionTick`) needs access to both the current and next frame simultaneously. The `progress` parameter already in the signature covers the timing dimension.

The implementation strategy is: extend `renderTick` to handle `TextFrame` (straightforward Canvas 2D text drawing), then add a separate `renderTransitionTick(ctx, fromFrame, toFrame, width, height, transitionType, progress)` function for transition blending. The export pipeline in `ExportPanel.tsx` generates `transitionFrames` intermediate frames between each consecutive content frame pair and interleaves them with the content frames before posting to the GIF worker. The PreviewPlayer animates using a similar frame-expansion strategy.

**Primary recommendation:** Keep `renderTick` for single-frame rendering (TextFrame + ImageFrame), and add a `renderTransitionTick` for the two-frame compositing needed by crossfade and slide. Do not try to make `renderTick` handle both cases — the two-frame compositing signature is incompatible with the single-frame contract.

---

## Standard Stack

### Core

No new dependencies are needed for Phase 3. All required capabilities exist in the current stack:

| Capability | Provided By | Version | Notes |
|-----------|-------------|---------|-------|
| Text rendering to canvas | Canvas 2D API (native) | — | `ctx.fillText()`, `ctx.measureText()`, `ctx.font` — already used via OffscreenCanvas |
| Alpha compositing | Canvas 2D API (native) | — | `ctx.globalAlpha` for crossfade; `ctx.drawImage` with dx offset for slide |
| Pixel buffer generation | OffscreenCanvas (native) | — | Already used in ExportPanel for frame rendering |
| State management | Zustand 5.0.11 | ^5.0.11 | Extend store with `addTextFrame` action; widen transitionType union |
| Frame ordering | @dnd-kit/sortable 10.0.0 | ^10.0.0 | Already handles mixed Frame types if FrameGrid is updated to use full `frames` array |
| GIF encoding | gifenc 1.0.3 | ^1.0.3 | No change — receives pre-rendered RGBA buffers; transition frames are rendered before posting |

**Installation:**
```bash
# No new packages needed — Phase 3 uses only existing dependencies
```

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 | Icon for "Add Title Card" button | Use `Type` or `FileText` icon from the already-installed library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Canvas 2D text | HTML element overlay with `foreignObject` / `html2canvas` | Canvas 2D is simpler, works in OffscreenCanvas (worker context), no extra deps. HTML overlay only works in browser main thread, complicates export path. Use Canvas 2D. |
| Discrete intermediate frames for transitions | gifenc transparency/disposal frames | GIF disposal/transparency is for simple frame replace, not smooth alpha blends. Discrete intermediate frames is the only correct approach for smooth crossfade/slide in GIF. |
| Per-frame color picker (native `<input type="color">`) | Custom color picker library | `<input type="color">` is sufficient for background color selection and requires zero new dependencies. Use it. |

---

## Architecture Patterns

### Recommended Project Structure Additions

```
src/
├── types/
│   └── frames.ts             # EXTEND: widen transitionType union; TextFrame already defined
├── store/
│   └── useFrameStore.ts      # EXTEND: add addTextFrame action; update updateTextFrame action
├── renderer/
│   ├── renderTick.ts         # EXTEND: add TextFrame branch (currently TODO comment)
│   └── renderTransitionTick.ts  # NEW: two-frame compositing for crossfade and slide
├── components/
│   ├── FrameGrid.tsx          # EXTEND: handle all Frame types (currently filters to ImageFrame only)
│   ├── FrameThumbnail.tsx     # No change — ImageFrame only
│   ├── TextFrameThumbnail.tsx # NEW: shows background color + text preview (CSS div, not canvas)
│   ├── EditPanel.tsx          # EXTEND: text/color controls when selectedFrame.type === 'text'
│   └── ExportPanel.tsx        # EXTEND: widen transition selector, expand transition frames on export
└── hooks/
    └── useAnimationLoop.ts   # No change — loop logic unchanged
```

### Pattern 1: GifSettings Type Widening

**What:** Widen the `transitionType` literal from `'cut'` to the full union. This is the only type change needed.

**When to use:** First task of Phase 3 — all downstream changes depend on this.

```typescript
// src/types/frames.ts — EXTEND (already has this comment "Phase 3 adds...")
export interface GifSettings {
  frameDurationMs: number;
  loop: boolean;
  outputWidth: number;
  outputHeight: number;
  transitionType: 'cut' | 'crossfade' | 'slide-left' | 'slide-right'; // was: 'cut'
}
```

The Zustand store and `handleTransitionChange` in ExportPanel currently use `as 'cut'` type assertions — these must be updated to `as GifSettings['transitionType']`.

### Pattern 2: Zustand Store Extension for Text Frames

**What:** Add `addTextFrame` action. The `removeFrame` action already handles cleanup generically (checks `.type === 'image'` before calling `bitmap.close()`). No changes needed to `removeFrame` or `reorderFrames`.

```typescript
// src/store/useFrameStore.ts — add to interface and implementation

interface FrameStore {
  // ... existing ...
  addTextFrame: (text: string, backgroundColor: string, textColor: string, fontSize: number) => void;
  updateTextFrame: (id: string, patch: Partial<Pick<TextFrame, 'text' | 'backgroundColor' | 'textColor' | 'fontSize'>>) => void;
}

// In create():
addTextFrame: (text, backgroundColor, textColor, fontSize) =>
  set((state) => ({
    frames: [
      ...state.frames,
      {
        type: 'text' as const,
        id: crypto.randomUUID(),
        text,
        backgroundColor,
        textColor,
        fontSize,
      },
    ],
  })),

updateTextFrame: (id, patch) =>
  set((state) => ({
    frames: state.frames.map((f) =>
      f.id === id && f.type === 'text' ? { ...f, ...patch } : f
    ),
  })),
```

### Pattern 3: TextFrame Rendering in renderTick

**What:** The existing `renderTick` function has a Phase 2/3 TODO comment. Add the TextFrame branch. Text is centered both horizontally and vertically. Font size uses the TextFrame's `fontSize` field.

**Critical:** This MUST work in both CanvasRenderingContext2D (preview) and OffscreenCanvasRenderingContext2D (export). Both contexts share the same Canvas 2D API — this is already guaranteed by the existing function signature.

```typescript
// src/renderer/renderTick.ts — ADD TextFrame branch (replace the void progress suppression)

if (frame.type === 'text') {
  // Fill background
  ctx.fillStyle = frame.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw centered text
  const fontSize = Math.round(frame.fontSize * (width / 800)); // scale with output resolution
  ctx.fillStyle = frame.textColor;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word-wrap for long text: split on newlines, stack lines
  const lines = frame.text.split('\n');
  const lineHeight = fontSize * 1.3;
  const totalHeight = lines.length * lineHeight;
  const startY = (height - totalHeight) / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });
}

// Remove the `void progress;` suppression — progress is now used by renderTransitionTick
```

**Note on font scale:** `frame.fontSize` (e.g., 48) is defined at 800px canvas width. Scale proportionally to the actual output width so text appears visually consistent across resolution presets.

### Pattern 4: renderTransitionTick — Two-Frame Compositing

**What:** New function that composites two frames (current + next) with a `progress` value from 0.0 to 1.0. This is the core of crossfade and slide transitions.

**When to use:** Called during export frame expansion and during preview animation — wherever a transition is in progress.

```typescript
// src/renderer/renderTransitionTick.ts — NEW FILE

import type { Frame } from '../types/frames';
import { renderTick } from './renderTick';

export function renderTransitionTick(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fromFrame: Frame,
  toFrame: Frame,
  width: number,
  height: number,
  transitionType: 'crossfade' | 'slide-left' | 'slide-right',
  progress: number, // 0.0 = fromFrame fully visible, 1.0 = toFrame fully visible
): void {
  if (transitionType === 'crossfade') {
    // Render fromFrame at full opacity
    renderTick(ctx, fromFrame, width, height);

    // Render toFrame at progress opacity over it
    // Use a second OffscreenCanvas to composite
    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d')!;
    renderTick(offCtx, toFrame, width, height);

    ctx.globalAlpha = progress;
    ctx.drawImage(offscreen, 0, 0);
    ctx.globalAlpha = 1.0; // Always reset globalAlpha

  } else if (transitionType === 'slide-left') {
    // toFrame slides in from the right; fromFrame slides out to the left
    const offset = Math.round(width * (1 - progress));

    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d')!;
    renderTick(offCtx, toFrame, width, height);

    renderTick(ctx, fromFrame, width, height);
    ctx.drawImage(offscreen, offset, 0);

  } else if (transitionType === 'slide-right') {
    // toFrame slides in from the left; fromFrame slides out to the right
    const offset = Math.round(width * (1 - progress));

    const offscreen = new OffscreenCanvas(width, height);
    const offCtx = offscreen.getContext('2d')!;
    renderTick(offCtx, toFrame, width, height);

    renderTick(ctx, fromFrame, width, height);
    ctx.drawImage(offscreen, -offset, 0);
  }
}
```

**CRITICAL — OffscreenCanvas in OffscreenCanvas context:** `new OffscreenCanvas()` is available in both browser main thread and Web Worker scope. The export pipeline runs in the main thread (frame rendering happens in ExportPanel before posting to the worker), so this is safe.

**CRITICAL — globalAlpha reset:** Always reset `ctx.globalAlpha = 1.0` after crossfade compositing. Failure to reset corrupts all subsequent frames.

### Pattern 5: Transition Frame Expansion in Export Pipeline

**What:** When `transitionType !== 'cut'`, the export pipeline must generate intermediate frames between each consecutive content frame pair. The transition duration is governed by the frame duration setting (no separate transition duration in v1 — see REQUIREMENTS.md v2 section TIME-V2-02).

**Decision needed:** How many intermediate frames per transition? Recommendation: **4 intermediate frames** per transition. This gives smooth visual motion at most GIF frame rates without inflating file size excessively. Each intermediate frame is rendered at `progress = i / (N + 1)` for `i` from 1 to N.

```typescript
// src/components/ExportPanel.tsx — UPDATE handleExport()

const TRANSITION_FRAMES = 4; // intermediate frames per transition

async function handleExport() {
  const { frames, settings } = useFrameStore.getState();
  const { outputWidth: w, outputHeight: h, transitionType } = settings;

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  const frameData: ArrayBuffer[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const nextFrame = frames[i + 1];

    // Render the content frame itself
    renderTick(ctx, frame, w, h);
    frameData.push(ctx.getImageData(0, 0, w, h).data.buffer.slice(0));

    // If there's a next frame AND a non-cut transition, generate intermediate frames
    if (nextFrame && transitionType !== 'cut') {
      for (let t = 1; t <= TRANSITION_FRAMES; t++) {
        const progress = t / (TRANSITION_FRAMES + 1);
        renderTransitionTick(ctx, frame, nextFrame, w, h, transitionType, progress);
        frameData.push(ctx.getImageData(0, 0, w, h).data.buffer.slice(0));
      }
    }
  }

  // Post to worker as before — worker doesn't know about transitions
  // (it receives pre-rendered RGBA buffers; transitions are already baked in)
  setExportProgress(0);
  const worker = new GifWorker();
  // ... rest of worker setup unchanged ...
  worker.postMessage(
    { type: 'encode', frameData, width: w, height: h, settings },
    frameData
  );
}
```

**File size implication:** 4 intermediate frames per transition means a 5-frame GIF with crossfade between every pair becomes 5 + 4×4 = 21 frames. Estimated size formula in ExportPanel needs updating to account for transition frames.

### Pattern 6: FrameGrid Update for Mixed Frame Types

**What:** Currently `FrameGrid.tsx` filters to `ImageFrame` only (`frames.filter(f => f.type === 'image')`). Phase 3 must render all frame types in the strip.

**The change:** Remove the filter, use all frames. Pass frame to either `FrameThumbnail` (for ImageFrame) or `TextFrameThumbnail` (for TextFrame). Both must be sortable via dnd-kit.

```typescript
// src/components/FrameGrid.tsx — EXTEND

// Remove: const imageFrames = frames.filter((f): f is ImageFrame => f.type === 'image');
// Remove: const frameIds = imageFrames.map((f) => f.id);
// Add:
const frameIds = frames.map((f) => f.id);

// In the SortableContext children:
{frames.map((frame) =>
  frame.type === 'image'
    ? <FrameThumbnail key={frame.id} frame={frame} />
    : <TextFrameThumbnail key={frame.id} frame={frame} />
)}
```

### Pattern 7: TextFrameThumbnail Component

**What:** A CSS-based thumbnail for title card frames. Unlike `FrameThumbnail` (canvas), this uses a styled div to show the background color and text preview. No canvas needed — the thumbnail is decorative only.

**Why CSS not canvas:** TextFrame thumbnails don't need pixel-accurate preview. A styled div is simpler, lighter, and easier to maintain. The actual rendered output comes from `renderTick` which IS pixel-accurate.

```typescript
// src/components/TextFrameThumbnail.tsx — NEW FILE

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import type { TextFrame } from '../types/frames';

interface Props {
  frame: TextFrame;
}

export function TextFrameThumbnail({ frame }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: frame.id });

  const { removeFrame, setSelectedId, selectedId } = useFrameStore();
  const isSelected = selectedId === frame.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedId(isSelected ? null : frame.id)}
      className={[
        'relative group cursor-grab active:cursor-grabbing rounded-md overflow-hidden border-2 transition-colors',
        isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-600',
      ].join(' ')}
    >
      {/* Preview area: fixed size matching FrameThumbnail canvas (160×110) */}
      <div
        className="w-40 h-[110px] flex items-center justify-center text-center p-2"
        style={{ backgroundColor: frame.backgroundColor, color: frame.textColor }}
      >
        <span className="text-sm font-bold leading-tight line-clamp-3 break-words">
          {frame.text || 'Title Card'}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); removeFrame(frame.id); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer"
        aria-label="Delete title card"
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

### Pattern 8: EditPanel Text Frame Controls

**What:** When the selected frame is a TextFrame, EditPanel shows text/color editing controls. When it's an ImageFrame, it shows the existing controls. Add a type guard branch.

```typescript
// src/components/EditPanel.tsx — EXTEND the selectedFrame rendering section

{selectedFrame.type === 'text' && (
  <div className="flex flex-col gap-3">
    {/* Text content */}
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide">Text</label>
      <textarea
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100
          focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        rows={3}
        value={selectedFrame.text}
        onChange={(e) => updateTextFrame(selectedId!, { text: e.target.value })}
        placeholder="Title text..."
      />
    </div>

    {/* Background color */}
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide">Background</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={selectedFrame.backgroundColor}
          onChange={(e) => updateTextFrame(selectedId!, { backgroundColor: e.target.value })}
          className="w-10 h-8 rounded cursor-pointer border border-gray-700 bg-transparent p-0.5"
        />
        <span className="text-xs text-gray-400">{selectedFrame.backgroundColor}</span>
      </div>
    </div>

    {/* Text color */}
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide">Text Color</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={selectedFrame.textColor}
          onChange={(e) => updateTextFrame(selectedId!, { textColor: e.target.value })}
          className="w-10 h-8 rounded cursor-pointer border border-gray-700 bg-transparent p-0.5"
        />
        <span className="text-xs text-gray-400">{selectedFrame.textColor}</span>
      </div>
    </div>

    {/* Font size */}
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide">Font Size</label>
      <input
        type="number"
        min={12}
        max={120}
        step={4}
        value={selectedFrame.fontSize}
        onChange={(e) => updateTextFrame(selectedId!, { fontSize: Number(e.target.value) })}
        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100
          focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  </div>
)}
```

### Pattern 9: "Add Title Card" Button

**What:** A button in the left sidebar (near DropZone) that creates a new TextFrame with default values. Clicking it immediately selects the new frame so the user can edit it in EditPanel.

**Default values:** Background `#1a1a2e` (dark blue — visually distinct from black GIF background), text `''` (empty — forces user to type), textColor `#ffffff`, fontSize `48`.

```typescript
// In DropZone.tsx or directly in App.tsx left column — add below DropZone:

<button
  onClick={() => {
    const { addTextFrame, setSelectedId, frames } = useFrameStore.getState();
    addTextFrame('', '#1a1a2e', '#ffffff', 48);
    // Select the newly added frame (it will be the last one)
    // We can't get its ID synchronously from addTextFrame — use store subscription or
    // read immediately after: useFrameStore.getState().frames[frames.length].id
    const newId = useFrameStore.getState().frames[frames.length].id;
    setSelectedId(newId);
  }}
  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
    bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white
    text-sm font-medium transition-colors cursor-pointer border border-gray-700"
>
  <Type size={14} />
  Add Title Card
</button>
```

**Note:** Reading the new ID immediately after `addTextFrame` works because Zustand state updates are synchronous when called via `useFrameStore.getState()` outside React render. The `frames.length` at call time is the index of the newly added frame.

### Pattern 10: Preview Player Transition Animation

**What:** When `transitionType !== 'cut'`, the PreviewPlayer must animate transition frames between content frames, not just snap. This requires the tick function to know about `fromFrame`, `toFrame`, and transition progress.

**Approach:** The animation loop tracks a `subProgress` (0.0–1.0) between frames during the transition period. During a transition, sub-ticks (spaced at `frameDurationMs / TRANSITION_FRAMES` apart) render intermediate states using `renderTransitionTick`.

**Simpler alternative (recommended for v1):** Pre-expand the animation sequence in the preview player the same way export does — generate an expanded frame list (content frames + transition intermediate "phantom" frames represented as render functions). This reuses the same expansion logic, keeps the `tick` function simple, and guarantees preview ↔ export visual identity.

```typescript
// In PreviewPlayer.tsx — update tick logic when transitionType !== 'cut'
// The expanded sequence ref holds a list of render functions, not Frame objects.
// Each entry is: () => void (draws one step to the canvas).

// On frames or settings change, rebuild the expanded sequence:
type ExpandedTick = (ctx: CanvasRenderingContext2D) => void;

function buildExpandedSequence(
  frames: Frame[],
  transitionType: GifSettings['transitionType'],
  width: number,
  height: number,
  TRANSITION_FRAMES: number
): ExpandedTick[] {
  const ticks: ExpandedTick[] = [];
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const nextFrame = frames[i + 1];
    ticks.push((ctx) => renderTick(ctx, frame, width, height));
    if (nextFrame && transitionType !== 'cut') {
      for (let t = 1; t <= TRANSITION_FRAMES; t++) {
        const progress = t / (TRANSITION_FRAMES + 1);
        ticks.push((ctx) =>
          renderTransitionTick(ctx, frame, nextFrame, width, height, transitionType, progress)
        );
      }
    }
  }
  return ticks;
}
```

The `useEffect` that responds to `frames` or `settings.transitionType` changes rebuilds this sequence and stores it in a ref. The `tick` callback then indexes into `expandedSequenceRef.current` exactly as it currently indexes into `framesRef.current`.

### Anti-Patterns to Avoid

- **Extending renderTick signature to accept two frames:** The current `renderTick(ctx, frame, width, height)` contract is used across ExportPanel, PreviewPlayer, and TextFrameThumbnail. A second `nextFrame?: Frame` parameter creates an optional that will silently be ignored by callers — use a separate `renderTransitionTick` function.
- **Doing transition rendering inside the GIF worker:** The worker receives pre-rendered RGBA buffers and doesn't know about transitions. Keep transitions baked into the frame expansion step on the main thread. This keeps the worker stateless and simple.
- **Using CSS transitions/animations for the preview player:** The preview runs on a `<canvas>` element via `rAF`. CSS transitions don't apply to canvas drawing — all animation must happen through explicit `renderTick`/`renderTransitionTick` calls.
- **Generating transition frames during preview via setTimeout/setInterval:** The existing `useAnimationLoop` hook manages all timing via `requestAnimationFrame`. Adding `setTimeout` for sub-frame timing creates a second timing source that drifts. Use the expanded-sequence approach (Pattern 10) instead.
- **Setting `ctx.globalAlpha` and not resetting it:** Any canvas operation that changes context state (globalAlpha, transform, clip) must reset after use. Failure causes corrupted subsequent frames.
- **Font string format:** Canvas 2D `ctx.font` must be set as `"bold 48px sans-serif"` — the CSS font shorthand format. Omitting the font family or using invalid format silently falls back to browser default, producing inconsistent sizes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GIF transition support | Custom GIF extension block for transitions | Discrete intermediate frames rendered via Canvas 2D | GIF89a has no native transition format. All "transition" effects in GIFs are achieved by pre-rendering intermediate frames. |
| Text measurement for word wrap | Custom pixel-width calculation | `ctx.measureText(word).width` with manual wrap logic | Canvas 2D `measureText` is the correct API for measuring text at a given font size/family. |
| Color picker UI | Custom color wheel or slider | `<input type="color">` (native HTML) | The native color picker is sufficient, zero dependencies, and works everywhere. The only limitation (no opacity control) is irrelevant here — title card colors are solid. |
| Sortable mixed frame types | Custom drag-and-drop implementation | Extend existing `@dnd-kit/sortable` FrameGrid | dnd-kit already handles mixed content — just include TextFrame IDs in the SortableContext `items` array. |
| Transition timing curve | Custom easing function | Linear `progress = t / (N + 1)` | For GIF output, linear easing is standard. Ease-in-out curves require more intermediate frames to be perceptible and add complexity with no visible benefit at 15fps effective playback. |

**Key insight:** GIF is a format from 1987. Every "modern" visual effect in GIFs (transitions, fades, slides) is achieved by pre-rendering what you want the viewer to see into each frame. The format provides no composition primitives beyond per-frame palette and disposal methods. Embrace this by baking all effects into RGBA pixel buffers before encoding.

---

## Common Pitfalls

### Pitfall 1: OffscreenCanvas Inside OffscreenCanvas (Crossfade Pattern)

**What goes wrong:** `renderTransitionTick` creates `new OffscreenCanvas(width, height)` as a scratch buffer for each intermediate frame. If `width * height * 4 * TRANSITION_FRAMES * NUM_FRAME_PAIRS` is large, this creates significant GC pressure.

**Why it happens:** Each call creates and discards a scratch canvas. For a 10-frame GIF with crossfade at 1280×720, that's 9 pairs × 4 intermediate frames = 36 scratch canvases created and discarded at 1280×720×4 = 3.7MB each → ~133MB of allocations.

**How to avoid:** Create ONE shared scratch `OffscreenCanvas` at the start of export (or in `renderTransitionTick` as a module-level singleton) and reuse it. Pass it as a parameter to `renderTransitionTick`.

**Warning signs:** Export hangs or takes much longer than expected; Chrome Task Manager shows spiking memory during export.

### Pitfall 2: globalAlpha Not Reset After Crossfade

**What goes wrong:** Crossfade sets `ctx.globalAlpha = progress`. If not reset to 1.0 afterward, all subsequent `renderTick` calls (content frames) render at the same reduced alpha.

**Why it happens:** Canvas 2D context state is persistent. Setting `globalAlpha` affects all future draw calls on that context.

**How to avoid:** Always reset: `ctx.globalAlpha = 1.0;` as the last line of the crossfade branch in `renderTransitionTick`.

**Warning signs:** Content frames after a transition appear semi-transparent in both preview and exported GIF.

### Pitfall 3: FrameGrid Still Filters to ImageFrame Only

**What goes wrong:** After adding a title card via `addTextFrame`, it appears in the Zustand store but not in the frame strip. User cannot see or reorder title cards.

**Why it happens:** `FrameGrid.tsx` currently has: `const imageFrames = frames.filter((f): f is ImageFrame => f.type === 'image');` — TextFrames are silently excluded.

**How to avoid:** Remove the filter. Use `frames.map(f.id)` for `SortableContext items`. Render `TextFrameThumbnail` for `type === 'text'` frames.

**Warning signs:** User clicks "Add Title Card" button, frame count in header increments, but nothing appears in the left strip.

### Pitfall 4: transitionType Type Assertion Cascade

**What goes wrong:** After widening the `transitionType` union in `frames.ts`, the TypeScript compiler reports errors in `ExportPanel.tsx` where `e.target.value as 'cut'` was used, and in the store where `'cut' as const` was initialized.

**Why it happens:** Phase 2 locked the type as `'cut'` with explicit comments. Phase 3 widens it, which invalidates those assertions.

**How to avoid:** In ExportPanel: change `as 'cut'` to `as GifSettings['transitionType']`. In store: the default value `transitionType: 'cut'` is still valid (it's an assignable member of the union) — no change needed there. Check for `as 'cut'` assertions in ExportPanel's `handleTransitionChange`.

**Warning signs:** TypeScript errors immediately after widening the `transitionType` type definition.

### Pitfall 5: Canvas Font String Invalid Format

**What goes wrong:** Text doesn't appear, or appears in the wrong size/weight.

**Why it happens:** Canvas 2D `ctx.font` requires the CSS font shorthand syntax: `"bold 48px sans-serif"`. If you write just `"48px"` (no family) or `"bold sans-serif"` (no size), the browser may silently ignore the setting and use the default font.

**How to avoid:** Always include size and family: `ctx.font = \`bold ${fontSize}px sans-serif\`;` Verify by checking `ctx.font` after setting — it reflects the parsed value.

**Warning signs:** All title card frames render with tiny default browser text, regardless of the `fontSize` setting.

### Pitfall 6: Transition Frame Count Affects File Size Estimate

**What goes wrong:** The file size estimate in ExportPanel is calculated as `width * height * frames.length * 0.5`. With transitions enabled, the actual encoded frame count is higher (content frames + intermediate frames). The estimate becomes significantly wrong.

**Why it happens:** The estimation formula uses `frames.length` (content frames only), but the actual GIF contains `frames.length + (frames.length - 1) * TRANSITION_FRAMES` frames when transitions are enabled.

**How to avoid:** Update the estimation formula to compute actual encoded frame count:

```typescript
const TRANSITION_FRAMES = 4;
const encodedFrameCount = settings.transitionType === 'cut'
  ? frames.length
  : frames.length + Math.max(0, frames.length - 1) * TRANSITION_FRAMES;
const estimatedKb = Math.round(
  (settings.outputWidth * settings.outputHeight * encodedFrameCount * 0.5
    + encodedFrameCount * 768 + 800) / 1024
);
```

**Warning signs:** File size estimate reads ~200KB but exported GIF is 800KB+ when transitions are active.

### Pitfall 7: Preview Player Not Updated for Transition Rendering

**What goes wrong:** User selects "crossfade" in the transition selector. Export produces a GIF with smooth crossfade. But the preview player still shows instant cuts — user sees mismatch between preview and export.

**Why it happens:** The preview player's tick function only calls `renderTick(ctx, frames[frameIndex])` — it doesn't expand transition frames or call `renderTransitionTick`.

**How to avoid:** Implement Pattern 10 (expanded sequence). The preview and export must use the same frame expansion logic.

**Warning signs:** "Success criteria 4" from the phase description fails: "A GIF exported with title cards and transitions looks visually identical to what the user saw in the preview."

### Pitfall 8: addTextFrame Selects Wrong Frame ID

**What goes wrong:** After clicking "Add Title Card", the wrong frame is selected, or no frame is selected.

**Why it happens:** `addTextFrame` generates the frame ID internally (`crypto.randomUUID()`). The caller doesn't know the new ID without reading back from store state.

**How to avoid:** Read the new frame ID immediately after `addTextFrame` via `useFrameStore.getState().frames[frames.length].id` (where `frames.length` is captured before the call). This works because Zustand state updates from `getState()` calls are synchronous. Alternatively, change `addTextFrame` to return the new frame ID or accept an ID parameter.

**Warning signs:** After clicking "Add Title Card", EditPanel shows "Select a frame to edit" instead of the text editing controls.

---

## Code Examples

Verified patterns from official and existing project sources:

### Canvas 2D Text Rendering (Centered)

```typescript
// Source: MDN Web Docs — CanvasRenderingContext2D.fillText()
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText
ctx.font = 'bold 48px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = '#ffffff';
ctx.fillText('Hello World', width / 2, height / 2);
```

### Canvas 2D globalAlpha for Crossfade

```typescript
// Source: MDN Web Docs — CanvasRenderingContext2D.globalAlpha
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha
// Draw base frame first, then overlay toFrame at reduced alpha
ctx.globalAlpha = 0.5; // 50% blend
ctx.drawImage(toCanvas, 0, 0);
ctx.globalAlpha = 1.0; // ALWAYS reset
```

### Canvas 2D drawImage with Offset (Slide)

```typescript
// Source: MDN Web Docs — CanvasRenderingContext2D.drawImage()
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
// Slide left: toFrame enters from right at (offset, 0), fromFrame exits left
const offset = Math.round(width * (1 - progress)); // progress: 0→1
ctx.drawImage(toCanvas, offset, 0); // starts at right edge, slides to (0,0)
```

### Zustand addTextFrame (Outside React Component)

```typescript
// Source: Zustand 5 docs — reading/writing outside components
// https://github.com/pmndrs/zustand#reading-state-and-writing-state
const { addTextFrame, frames } = useFrameStore.getState();
addTextFrame('My Title', '#1a1a2e', '#ffffff', 48);
// Immediately read back the new frame's ID:
const newFrame = useFrameStore.getState().frames[frames.length];
setSelectedId(newFrame.id);
```

### Widening transitionType Union (TypeScript)

```typescript
// src/types/frames.ts — Phase 3 change
export interface GifSettings {
  transitionType: 'cut' | 'crossfade' | 'slide-left' | 'slide-right';
  // was: transitionType: 'cut';
}

// src/components/ExportPanel.tsx — update type assertion
function handleTransitionChange(e: React.ChangeEvent<HTMLSelectElement>) {
  updateSettings({ transitionType: e.target.value as GifSettings['transitionType'] });
}
```

### ExportPanel Transition Selector (New Options)

```typescript
// src/components/ExportPanel.tsx — extend existing selector
<select value={settings.transitionType} onChange={handleTransitionChange}>
  <option value="cut">Cut (instant)</option>
  <option value="crossfade">Crossfade (alpha blend)</option>
  <option value="slide-left">Slide Left</option>
  <option value="slide-right">Slide Right</option>
</select>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| GIF transparency/disposal for "transitions" | Discrete intermediate frames via Canvas 2D compositing | Established practice | Correct approach — GIF89a disposal only handles simple frame replacement, not smooth blends |
| `renderTick` handles all cases | `renderTick` (single frame) + `renderTransitionTick` (two-frame compositing) | Phase 3 | Clean separation of concerns; avoids polluting the single-frame contract |
| FrameGrid shows only ImageFrames | FrameGrid shows all Frame types (ImageFrame + TextFrame) | Phase 3 | Required for COMP-02; `TextFrame` type was defined in Phase 1 precisely for this |
| `transitionType: 'cut'` (literal) | `transitionType: 'cut' \| 'crossfade' \| 'slide-left' \| 'slide-right'` (union) | Phase 3 | Type widening — existing `'cut'` default remains valid; no migration needed |

**Deprecated/outdated in this phase:**
- `void progress;` suppression in `renderTick.ts`: Remove this — `progress` parameter will actually be used (in `renderTransitionTick`, not in `renderTick` itself, but the suppression comment should be cleaned up).
- `// image frames only in Phase 1` comment in `FrameGrid.tsx`: Remove this — Phase 3 handles all frame types.
- `// Phase 2: add TextFrame branch` comment in `renderTick.ts`: Remove and replace with actual implementation.

---

## Open Questions

1. **How many intermediate transition frames (TRANSITION_FRAMES constant)?**
   - What we know: More frames = smoother animation + larger GIF file. GIF playback caps at ~50fps effective; most displays run at 60fps.
   - What's unclear: The sweet spot between smooth animation and file size isn't mandated by the requirements.
   - Recommendation: Default to **4 intermediate frames** per transition. This gives noticeable smooth motion without inflating frame count by an extreme factor. Make it a named constant `TRANSITION_FRAMES = 4` in a shared location so it's easy to tune.

2. **Should addTextFrame return the new frame ID?**
   - What we know: The current Zustand pattern doesn't return values from `set()` calls. Reading back immediately via `getState()` is a valid pattern.
   - What's unclear: Whether it's cleaner to change the action signature or use the read-back pattern.
   - Recommendation: Keep current Zustand action pattern (no return values). Use `useFrameStore.getState().frames.at(-1)!.id` immediately after `addTextFrame()` to get the new ID. This is idiomatic Zustand and avoids changing the store interface pattern.

3. **Where should the "Add Title Card" button live?**
   - What we know: The left sidebar currently has DropZone (file upload) above FrameGrid. The right sidebar has EditPanel + ExportPanel.
   - What's unclear: Whether to place "Add Title Card" inside the DropZone component, below it in the left column, or as a separate button elsewhere.
   - Recommendation: Place it as a separate button below the DropZone in the left sidebar's `div` in `App.tsx`. This keeps DropZone focused on file upload and makes title card addition visually peer to dropping images.

4. **Transition frame duration in the exported GIF**
   - What we know: `GifSettings.frameDurationMs` applies to all frames. Intermediate transition frames will use this same duration (passed to gifWorker which sets `delay` per frame). The worker doesn't know which frames are transitions vs. content.
   - What's unclear: Should transition frames use a shorter duration to maintain the same total perceived time? (e.g., with 4 transition frames at 800ms each, the transition itself takes 4×800ms = 3.2 seconds).
   - Recommendation: Use a separate, shorter duration for transition frames. Hard-code `transitionFrameDurationMs = Math.round(frameDurationMs / (TRANSITION_FRAMES + 1))` for interpolated frames so the full transition takes approximately `frameDurationMs` total. This keeps the total animation pace consistent regardless of transition count. The worker needs to receive per-frame delays (already supported by gifenc's `delay` option — pass an array instead of a single value, or encode each frame independently with its own delay).

---

## Sources

### Primary (HIGH confidence)

- Existing codebase — `src/types/frames.ts`: TextFrame type already defined with `text`, `backgroundColor`, `textColor`, `fontSize` fields. GifSettings.transitionType typed as `'cut'` with explicit "Phase 3" comment.
- Existing codebase — `src/renderer/renderTick.ts`: `progress` parameter already in signature (void-suppressed). TextFrame branch TODO comment. OffscreenCanvasRenderingContext2D already supported in function signature.
- Existing codebase — `src/components/FrameGrid.tsx`: `imageFrames` filter and comment `// image frames only in Phase 1` — explicit Phase 3 extension point.
- MDN Web Docs — `CanvasRenderingContext2D.globalAlpha`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha — confirmed globalAlpha affects all subsequent draw operations; must be reset.
- MDN Web Docs — `CanvasRenderingContext2D.drawImage()`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage — `drawImage(image, dx, dy)` signature for offset-based slide.
- MDN Web Docs — `CanvasRenderingContext2D.fillText()`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillText — text rendering API; font format must be CSS shorthand.
- MDN Web Docs — `OffscreenCanvas`: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas — confirmed `new OffscreenCanvas()` available in both browser main thread and worker context.

### Secondary (MEDIUM confidence)

- gifenc 1.0.3 README (from Phase 2 research): `writeFrame` accepts `delay` per frame — confirmed milliseconds. Worker currently uses a single delay value; per-frame delays would require calling `writeFrame` differently per frame or passing all delays in the message.
- Zustand 5 docs — `getState()` pattern: https://github.com/pmndrs/zustand#readingwriting-state-and-reacting-to-changes-outside-of-components — confirmed synchronous state reads outside React components via `useFrameStore.getState()`.

### Tertiary (LOW confidence — needs validation)

- GIF transition frame count (4 frames): Engineering judgment based on typical GIF frame rates (~15fps effective for animation). No authoritative source for "ideal" intermediate frame count — validate by visual inspection during implementation.
- Transition frame duration formula (`frameDurationMs / (TRANSITION_FRAMES + 1)`): Calculated heuristic. The actual perceived smoothness depends on browser GIF rendering, not guaranteed by this formula. Validate visually.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing stack fully sufficient; confirmed from package.json and codebase
- Architecture: HIGH — extension points are explicitly marked in code (TODO comments, Phase 3 notes); Canvas 2D APIs verified from MDN
- TextFrame rendering: HIGH — Canvas 2D text API is stable, well-documented, unambiguous
- Transition compositing (crossfade/slide): HIGH — Canvas 2D globalAlpha and drawImage with offset are standard, well-understood techniques
- Export frame expansion: HIGH — architectural pattern; gifenc already handles variable frame arrays
- Transition frame count/duration: LOW — engineering judgment; validate during implementation
- File size estimate update: MEDIUM — formula is heuristic anyway; correctness of the count calculation is HIGH

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (30 days — all capabilities are stable Canvas 2D APIs and existing project patterns)
