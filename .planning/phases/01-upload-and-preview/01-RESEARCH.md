# Phase 1: Upload and Preview - Research

**Researched:** 2026-02-26
**Domain:** React file upload, drag-and-drop reorder, canvas animation preview
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Grid layout**, not horizontal row or vertical list — frames arranged in a wrapped grid
- Thumbnails show image only (clean) — no persistent labels or badges on each frame
- Frame number shown on hover is acceptable; clean by default
- Selecting a frame: highlight border + show an edit panel (for delete and future edit actions)
- Deleting a frame: X button on each thumbnail (always-visible or hover-visible)
- Drag-to-reorder operates within the grid layout

### Claude's Discretion
- Thumbnail size within the grid (suggest ~160×110px)
- Edit panel position (sidebar or overlay below/beside the grid)
- Drop zone placement relative to the grid (above, separate section, or full-page on empty state)
- Loading/processing feedback when images are being decoded
- Empty state design (shown before any frames are added)
- Error handling for unsupported file types

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMP-01 | User can upload multiple images via drag-and-drop (PNG, JPG, WebP accepted) | react-dropzone 14.3.8: useDropzone with `accept` object format, `multiple: true`, onDrop → createImageBitmap pipeline |
| COMP-03 | User can reorder frames via drag-and-drop in the frame strip | @dnd-kit/sortable 10.0.0: DndContext + SortableContext with rectSortingStrategy, useSortable hook, arrayMove utility |
| COMP-04 | User can delete individual frames from the sequence | Zustand store action `removeFrame(id)`, X button with hover-visible Tailwind group/hover pattern |
| PREV-01 | User can preview the animated GIF sequence with play and pause controls | requestAnimationFrame loop in useEffect with useRef, canvas drawImage per frame, play/pause toggle via ref flag |
| PREV-02 | User can toggle loop on/off in the preview player | GifSettings.loop boolean in Zustand store, preview player checks loop flag to decide whether to restart or stop at end |
</phase_requirements>

---

## Summary

Phase 1 delivers the foundational user loop: upload images, arrange them in a grid-based frame strip, and preview the animation. The entire phase is pure client-side React with no backend. All five requirements are implementable with the locked stack — react-dropzone for upload, @dnd-kit/sortable for grid reorder, Zustand for state, and a canvas rAF loop for preview.

The most architecturally significant decision for this phase is the **shared `renderTick()` function**: the same canvas rendering logic must drive both the preview player (Phase 1) and the GIF encoder (Phase 2). Getting this abstraction right in Phase 1 prevents a rewrite in Phase 2. The preview player draws to an on-screen `<canvas>` using `requestAnimationFrame`; the encoder (Phase 2) will draw to `OffscreenCanvas` in a Web Worker calling the same function.

Three pitfalls from the global research apply directly to Phase 1 and must be addressed here: memory management via `ImageBitmap.close()` when frames are deleted, blob URL leaks if temporary URLs are created, aspect ratio letterboxing when source images differ from preview canvas dimensions, and frame reorder state desync if Zustand and @dnd-kit state diverge.

**Primary recommendation:** Build in this sequence — Zustand store → image upload pipeline → frame grid with dnd-kit → canvas preview player. Each step is independently testable and the canvas renderer can be stubbed to test upload and ordering before preview is wired.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Concurrent rendering; hooks ecosystem; project decision |
| TypeScript | 5.x | Type safety | Discriminated union Frame model catches bugs at compile time |
| Vite | 6.x | Build tool + dev server | Fast HMR; `npm create vite --template react-ts` scaffolds instantly |
| Zustand | 5.0.11 | Global state | Zero-boilerplate store for frame array + settings; no provider wrapper needed |
| react-dropzone | 14.3.8 | File upload UI | Multi-file, MIME validation, drag state; React 19 compatible since 14.3.6 |
| @dnd-kit/sortable | 10.0.0 | Frame reordering | Current standard (react-beautiful-dnd is deprecated); rectSortingStrategy for grid |
| @dnd-kit/core | 6.3.1 | DnD foundation | Required peer for @dnd-kit/sortable |
| Tailwind CSS | 4.x | Styling | v4 Vite plugin: single `@import "tailwindcss"` in CSS, zero config |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.575.0 | Icons (X button, Play, Pause, etc.) | Everywhere icons are needed — tree-shakeable, actively maintained |
| @radix-ui/react-tooltip | latest | Accessible hover tooltips for frame numbers | Frame number-on-hover per locked decision |
| @radix-ui/react-dialog | latest | Accessible modal/panel patterns if edit panel is overlay | If edit panel uses modal semantics |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | react-beautiful-dnd | react-beautiful-dnd is deprecated/archived; dnd-kit is the active replacement |
| Zustand | useState + useContext | Context causes cascading re-renders on every frame array change; Zustand is surgical |
| react-dropzone | Native HTML drag events | react-dropzone handles MIME validation, directory drops, file system access API edge cases |
| Tailwind v4 | Tailwind v3 | v4 is faster, simpler setup; no postcss.config.js or tailwind.config.js needed |

**Installation:**
```bash
npm create vite@latest gifcreator -- --template react-ts
cd gifcreator
npm install zustand react-dropzone @dnd-kit/core @dnd-kit/sortable lucide-react
npm install tailwindcss @tailwindcss/vite
npm install @radix-ui/react-tooltip
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── store/
│   └── useFrameStore.ts      # Zustand store: frames[], settings, actions
├── components/
│   ├── DropZone.tsx           # react-dropzone upload area
│   ├── FrameGrid.tsx          # @dnd-kit SortableContext grid container
│   ├── FrameThumbnail.tsx     # useSortable item: image, X button, selection ring
│   ├── EditPanel.tsx          # Appears on frame select: delete + future edits
│   └── PreviewPlayer.tsx      # <canvas> + rAF loop + play/pause/loop controls
├── hooks/
│   └── useAnimationLoop.ts    # Custom hook encapsulating rAF lifecycle
├── renderer/
│   └── renderTick.ts          # SHARED: canvas drawing logic for preview AND export
└── types/
    └── frames.ts              # Frame, ImageFrame, GifSettings type definitions
```

### Pattern 1: Zustand Frame Store

**What:** Single source of truth for ordered frame array and playback settings. All mutations go through store actions.

**When to use:** Any component that reads or writes frames or settings.

**Example:**
```typescript
// src/store/useFrameStore.ts
// Source: https://zustand.docs.pmnd.rs/getting-started/introduction
import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { Frame, GifSettings } from '../types/frames';

interface FrameStore {
  frames: Frame[];
  settings: GifSettings;
  addFrames: (frames: Frame[]) => void;
  removeFrame: (id: string) => void;
  reorderFrames: (activeId: string, overId: string) => void;
  setSelectedId: (id: string | null) => void;
  selectedId: string | null;
}

export const useFrameStore = create<FrameStore>((set) => ({
  frames: [],
  selectedId: null,
  settings: {
    frameDurationMs: 800,
    loop: true,
  },
  addFrames: (newFrames) =>
    set((state) => ({ frames: [...state.frames, ...newFrames] })),
  removeFrame: (id) =>
    set((state) => ({
      frames: state.frames.filter((f) => f.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  reorderFrames: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.frames.findIndex((f) => f.id === activeId);
      const newIndex = state.frames.findIndex((f) => f.id === overId);
      return { frames: arrayMove(state.frames, oldIndex, newIndex) };
    }),
  setSelectedId: (id) => set({ selectedId: id }),
}));
```

### Pattern 2: Image Upload Pipeline

**What:** react-dropzone captures files → `createImageBitmap()` decodes each asynchronously → ImageFrame added to store. No blob URLs stored.

**When to use:** DropZone component onDrop handler.

**Example:**
```typescript
// src/components/DropZone.tsx
// Source: https://github.com/react-dropzone/react-dropzone/blob/master/README.md
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFrameStore } from '../store/useFrameStore';
import type { ImageFrame } from '../types/frames';

const ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

export function DropZone() {
  const addFrames = useFrameStore((s) => s.addFrames);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const frames: ImageFrame[] = await Promise.all(
      acceptedFiles.map(async (file) => {
        const bitmap = await createImageBitmap(file);
        return {
          type: 'image' as const,
          id: crypto.randomUUID(),
          file,
          bitmap,
          name: file.name,
        };
      })
    );
    addFrames(frames);
  }, [addFrames]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      {isDragActive
        ? <p>Drop images here</p>
        : <p>Drag images or click to select</p>}
    </div>
  );
}
```

### Pattern 3: Sortable Grid with @dnd-kit

**What:** DndContext wraps the whole app (or section); SortableContext receives ordered frame IDs; each FrameThumbnail uses useSortable. DragOverlay renders a ghost during drag.

**When to use:** FrameGrid component.

**Example:**
```typescript
// src/components/FrameGrid.tsx
// Source: https://dndkit.com/presets/sortable
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { useFrameStore } from '../store/useFrameStore';
import { FrameThumbnail } from './FrameThumbnail';

export function FrameGrid() {
  const { frames, reorderFrames } = useFrameStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderFrames(active.id as string, over.id as string);
    }
    setActiveId(null);
  }

  const frameIds = frames.map((f) => f.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={frameIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-4 gap-3 p-4">
          {frames.map((frame) => (
            <FrameThumbnail key={frame.id} frame={frame} />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeId ? (
          <div className="opacity-80 shadow-lg">
            {/* Presentational thumbnail clone — no useSortable inside */}
            <FrameThumbnailGhost id={activeId} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Pattern 4: Sortable Frame Thumbnail

**What:** Each thumbnail uses `useSortable`, applies transform/transition as inline style, shows X button and selection ring.

**Example:**
```typescript
// src/components/FrameThumbnail.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import type { ImageFrame } from '../types/frames';
import { useEffect, useRef } from 'react';

interface Props { frame: ImageFrame; }

export function FrameThumbnail({ frame }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: frame.id });

  const { removeFrame, setSelectedId, selectedId } = useFrameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSelected = selectedId === frame.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Draw bitmap to thumbnail canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Letterbox draw: maintain aspect ratio
    const { width: cw, height: ch } = canvas;
    const { width: bw, height: bh } = frame.bitmap;
    const scale = Math.min(cw / bw, ch / bh);
    const dx = (cw - bw * scale) / 2;
    const dy = (ch - bh * scale) / 2;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(frame.bitmap, dx, dy, bw * scale, bh * scale);
  }, [frame.bitmap]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedId(frame.id)}
      className={`relative group cursor-grab rounded-md overflow-hidden border-2 transition-colors
        ${isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-400'}`}
    >
      <canvas ref={canvasRef} width={160} height={110} className="w-full h-auto block" />
      <button
        onClick={(e) => { e.stopPropagation(); removeFrame(frame.id); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5"
        aria-label="Delete frame"
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

### Pattern 5: Canvas Preview Player with rAF Loop

**What:** useEffect starts a requestAnimationFrame loop. useRef holds the rAF ID and playback state. Loop calls `renderTick()` on each frame. Cleanup cancels the rAF on unmount.

**Example:**
```typescript
// src/components/PreviewPlayer.tsx
import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import { renderTick } from '../renderer/renderTick';

const PREVIEW_WIDTH = 640;
const PREVIEW_HEIGHT = 480;

export function PreviewPlayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const playingRef = useRef(false);
  const frameIndexRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { frames, settings } = useFrameStore();

  const tick = useCallback((timestamp: number) => {
    if (!playingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const elapsed = timestamp - lastFrameTimeRef.current;
    if (elapsed >= settings.frameDurationMs) {
      lastFrameTimeRef.current = timestamp;
      const currentFrame = frames[frameIndexRef.current];
      renderTick(ctx, currentFrame, PREVIEW_WIDTH, PREVIEW_HEIGHT);

      const nextIndex = frameIndexRef.current + 1;
      if (nextIndex >= frames.length) {
        if (settings.loop) {
          frameIndexRef.current = 0;
        } else {
          playingRef.current = false;
          setIsPlaying(false);
          return;
        }
      } else {
        frameIndexRef.current = nextIndex;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [frames, settings]);

  const play = useCallback(() => {
    playingRef.current = true;
    lastFrameTimeRef.current = performance.now();
    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    playingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        className="rounded-lg bg-gray-900 border border-gray-700"
      />
      <div className="flex gap-2">
        <button onClick={isPlaying ? pause : play} className="...">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>
    </div>
  );
}
```

### Pattern 6: Shared renderTick (Phase 1 stub — image frames only)

**What:** Pure function that draws a single frame to a 2D canvas context. Phase 1 handles image frames only. Phase 2 will add crossfade/slide logic without changing the signature.

**Example:**
```typescript
// src/renderer/renderTick.ts
// Called by preview player AND (Phase 2) GIF encoder — never diverge these paths
import type { Frame } from '../types/frames';

export function renderTick(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  frame: Frame,
  width: number,
  height: number,
  progress = 1.0  // reserved for Phase 2 transitions (0.0–1.0)
): void {
  ctx.clearRect(0, 0, width, height);

  if (frame.type === 'image') {
    // Letterbox: preserve aspect ratio, fill remainder with background
    const { width: bw, height: bh } = frame.bitmap;
    const scale = Math.min(width / bw, height / bh);
    const dx = Math.round((width - bw * scale) / 2);
    const dy = Math.round((height - bh * scale) / 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(frame.bitmap, dx, dy, Math.round(bw * scale), Math.round(bh * scale));
  }
  // Phase 2: add TextFrame branch, crossfade alpha blend, slide transitions
}
```

### Anti-Patterns to Avoid

- **Storing blob URLs in the Zustand store:** Creates memory leaks. Store `File` + `ImageBitmap` only. If a `<img>` src blob URL is needed, create it in a component's `useMemo`/`useEffect` and revoke it in cleanup.
- **Using `useState` for frames in local component state:** Breaks the "Zustand is single source of truth" contract. Any component can read frames from the store without prop drilling.
- **Calling `useSortable` inside `DragOverlay`:** Creates ID collisions. Render a presentational `FrameThumbnailGhost` inside DragOverlay instead.
- **Using `useEffect` for the rAF loop with `frames` as a dependency:** The rAF ID will be cancelled and restarted on every frame array change. Store frames in a ref or read from the store inside the loop via a stable getter.
- **Not letterboxing thumbnails:** Drawing a 2560×1600 image onto a 160×110 canvas without preserving ratio produces distorted thumbnails. Always use scale+offset math.
- **Keeping full-resolution ImageBitmaps for thumbnails:** Draw to the small thumbnail canvas immediately after upload, then close the full-res bitmap if it is only needed for thumbnails (save the bitmap if needed for export). In Phase 1, keep the bitmap for preview rendering.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File drag-and-drop upload zone | Custom HTML5 drag event handlers | react-dropzone | Handles MIME validation, directory drops, File System Access API, browser quirks, accessible keyboard trigger |
| Frame drag-to-reorder | CSS drag events + position tracking | @dnd-kit/sortable | Handles keyboard accessibility, screen readers, touch events, scroll during drag, collision detection |
| Icon set | SVG inline copy-paste | lucide-react | Tree-shakeable, consistent sizing, actively maintained, all standard UI icons present |
| Unique frame IDs | `Math.random().toString()` | `crypto.randomUUID()` | Native browser API; collision-safe; no library needed |
| MIME type filtering | Manual file.type checks | react-dropzone `accept` prop | accept handles wildcards, extension matching, browser normalization edge cases |

**Key insight:** The upload and reorder interactions have enormous browser compatibility surface area. Both react-dropzone and @dnd-kit have years of production battle-testing across platforms. Roll your own only if a specific limitation forces it.

---

## Common Pitfalls

### Pitfall 1: react-dropzone `accept` prop format (v14 breaking change)

**What goes wrong:** Using string format (`accept="image/*"`) from v11-era docs. v14 requires an object format.
**Why it happens:** Most tutorials and StackOverflow answers predate v14.
**How to avoid:** Always use the object format:
```typescript
accept: {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
}
```
**Warning signs:** Dropzone accepts all file types regardless of what you configure.

### Pitfall 2: Frame Reorder State Desync

**What goes wrong:** Frame strip shows one order; canvas preview plays a different order.
**Why it happens:** If DnD item list is stored in local state and not immediately synced from the Zustand store, optimistic renders can diverge.
**How to avoid:** Drive `SortableContext items` directly from `useFrameStore((s) => s.frames.map(f => f.id))`. On `onDragEnd`, call `reorderFrames()` synchronously before any re-render.
**Warning signs:** After a fast drag, preview plays stale order for 1-2 seconds.

### Pitfall 3: Memory Exhaustion with Retina Screenshots

**What goes wrong:** 10 × 2560×1600 screenshots = ~160MB of GPU memory in ImageBitmap objects.
**Why it happens:** `createImageBitmap()` decoded images stay in GPU memory until `.close()` is called.
**How to avoid:** In Phase 1, keep bitmaps alive for preview rendering (needed for `renderTick`). When `removeFrame(id)` is called, call `bitmap.close()` in the store action:
```typescript
removeFrame: (id) =>
  set((state) => {
    const frame = state.frames.find(f => f.id === id);
    if (frame?.type === 'image') frame.bitmap.close();
    return { frames: state.frames.filter(f => f.id !== id) };
  }),
```
**Warning signs:** Memory usage in DevTools grows with each upload; tab crashes on large batches.

### Pitfall 4: Blob URL Memory Leaks

**What goes wrong:** Memory grows as user uploads images; `URL.createObjectURL()` calls accumulate.
**Why it happens:** Every blob URL holds a reference to the File in memory until `revokeObjectURL()` is called.
**How to avoid:** Do not store blob URLs. Use `ImageBitmap` for rendering (no URL needed). If you ever pass a blob URL to an `<img>` tag (e.g., for a fallback), revoke it in `useEffect` cleanup.
**Warning signs:** Chrome DevTools Memory tab shows increasing blob allocations.

### Pitfall 5: rAF Loop Not Cleaned Up on Unmount

**What goes wrong:** After navigating away from PreviewPlayer, the rAF loop continues consuming CPU. If the component remounts, a second loop starts — double-ticking.
**Why it happens:** `requestAnimationFrame` callbacks continue until `cancelAnimationFrame` is called.
**How to avoid:**
```typescript
useEffect(() => {
  return () => { cancelAnimationFrame(rafRef.current); };
}, []);
```
**Warning signs:** CPU stays high after player is paused or component unmounts.

### Pitfall 6: Aspect Ratio Distortion in Thumbnails and Preview

**What goes wrong:** Uploaded 16:9 screenshot is stretched/squished in the 4:3 or square preview canvas.
**Why it happens:** `ctx.drawImage(bitmap, 0, 0, canvasWidth, canvasHeight)` ignores source aspect ratio.
**How to avoid:** Always compute letterbox offsets:
```typescript
const scale = Math.min(canvasW / bitmapW, canvasH / bitmapH);
const dx = (canvasW - bitmapW * scale) / 2;
const dy = (canvasH - bitmapH * scale) / 2;
ctx.drawImage(bitmap, dx, dy, bitmapW * scale, bitmapH * scale);
```
**Warning signs:** Thumbnails look squished; designers notice immediately.

### Pitfall 7: DragOverlay ID Collision

**What goes wrong:** Dragging a frame causes a console error or visual glitch where the original item and the overlay render identically and conflict.
**Why it happens:** Rendering a component that calls `useSortable({ id })` inside `DragOverlay` creates a second sortable with the same ID.
**How to avoid:** Create a presentational `FrameThumbnailGhost` component that renders the thumbnail appearance without calling `useSortable`. Only use this inside `DragOverlay`.
**Warning signs:** React warnings about duplicate keys; drag ghost appears in wrong position.

### Pitfall 8: Tailwind v4 Config Confusion

**What goes wrong:** Using v3 config patterns (`tailwind.config.js`, `content` globs, PostCSS config) with v4.
**Why it happens:** Most tutorials are v3; v4 changed installation fundamentally.
**How to avoid:** Tailwind v4 with Vite needs only:
1. `npm install tailwindcss @tailwindcss/vite`
2. Add `tailwindcss()` plugin to `vite.config.ts`
3. Add `@import "tailwindcss";` to `src/index.css`
No `tailwind.config.js`. No PostCSS config. No `content` arrays.
**Warning signs:** Tailwind classes not applying; build step fails on postcss config.

---

## Code Examples

Verified patterns from official sources:

### Frame Type Definitions

```typescript
// src/types/frames.ts
export interface ImageFrame {
  type: 'image';
  id: string;
  file: File;
  bitmap: ImageBitmap;
  name: string;
}

// Phase 2+ (TextFrame not needed in Phase 1 but define now to avoid rename refactor)
export interface TextFrame {
  type: 'text';
  id: string;
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

export type Frame = ImageFrame | TextFrame;

export interface GifSettings {
  frameDurationMs: number;
  loop: boolean;
  // Phase 2 additions: outputWidth, outputHeight, transitionType, transitionDurationMs
}
```

### Vite + Tailwind v4 Configuration

```typescript
// vite.config.ts
// Source: https://tailwindcss.com/docs/installation
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

```css
/* src/index.css */
@import "tailwindcss";
```

### react-dropzone Accept Object Format (v14)

```typescript
// Source: https://github.com/react-dropzone/react-dropzone/releases/tag/v14.0.0
const ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
  onDrop,
  accept: ACCEPT,
  multiple: true,
  onDropRejected: (rejections) => {
    // Show user-friendly error: "Only PNG, JPG, WebP images accepted"
    console.warn('Rejected files:', rejections);
  },
});
```

### @dnd-kit arrayMove (reorder utility)

```typescript
// Source: https://dndkit.com/presets/sortable
import { arrayMove } from '@dnd-kit/sortable';

// In Zustand store action:
reorderFrames: (activeId: string, overId: string) =>
  set((state) => {
    const oldIndex = state.frames.findIndex((f) => f.id === activeId);
    const newIndex = state.frames.findIndex((f) => f.id === overId);
    if (oldIndex === -1 || newIndex === -1) return state;
    return { frames: arrayMove(state.frames, oldIndex, newIndex) };
  }),
```

### ImageBitmap Cleanup on Frame Delete

```typescript
// Cleanup bitmap memory when frame is deleted
// Source pattern: https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close
removeFrame: (id) =>
  set((state) => {
    const target = state.frames.find((f) => f.id === id);
    if (target?.type === 'image') {
      target.bitmap.close(); // Frees GPU memory immediately
    }
    return {
      frames: state.frames.filter((f) => f.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    };
  }),
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/sortable | 2022 (rbd archived) | rbd is archived; dnd-kit is the replacement |
| react-dropzone `accept` as string | accept as MIME→extensions object | v14 (2022) | Old string format silently breaks; must use object format |
| Tailwind PostCSS config + tailwind.config.js | @tailwindcss/vite plugin + single CSS import | Tailwind v4 (2025) | Simpler setup; no config files needed |
| Zustand `createWithEqualityFn` (v4 custom equality) | Zustand v5: equality not supported in `create` | Zustand v5 (2024) | Use subscribeWithSelector middleware if needed |
| `gif.js` for GIF encoding | `gifenc` | 2020+ | gif.js unmaintained; gifenc has per-frame palette |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Archived/deprecated since 2022. Do not use.
- `gif.js`: Unmaintained since ~2017. Do not use.
- `react-dropzone` string `accept` format: Broken in v14+. Always use object format.
- Tailwind v3 config pattern: Does not apply to v4 setup.

---

## Open Questions

1. **Thumbnail canvas size vs. grid responsiveness**
   - What we know: User constraint says ~160×110px thumbnail (Claude's discretion)
   - What's unclear: If the grid uses CSS responsive columns (e.g., `grid-cols-3` on narrow viewports), canvas width must match or thumbnails will appear wrong-sized
   - Recommendation: Use fixed 160×110 canvas with `w-full h-auto` CSS so the grid reflows. The canvas resolution stays high; CSS scales it down on narrow screens.

2. **Edit panel placement for Phase 1**
   - What we know: Appears on frame selection; shows delete + future edit actions (Claude's discretion)
   - What's unclear: Sidebar panel vs. contextual panel below the grid vs. floating panel
   - Recommendation: Sidebar panel (fixed right column) is simplest and cleanest. Avoids layout reflow when a frame is selected. The edit panel can grow in Phase 3 without changing layout.

3. **Drop zone placement when frames already exist**
   - What we know: Claude has discretion on drop zone placement
   - What's unclear: Whether the full-page drop zone should appear on empty state only, or always
   - Recommendation: Full-page drop target on empty state (before any frames). Once frames exist, show a smaller "Add more images" button above the grid. This avoids accidentally triggering the drop zone while reordering.

4. **Preview canvas dimensions for Phase 1**
   - What we know: Output resolution presets are a Phase 2 concern (EXPO-01)
   - What's unclear: What fixed resolution to use for the preview canvas in Phase 1
   - Recommendation: Use 640×480 for Phase 1 preview. It is fast to render, reasonable aspect ratio, and easily replaced by a dynamic value in Phase 2 when resolution settings arrive.

---

## Sources

### Primary (HIGH confidence)
- `https://dndkit.com/presets/sortable` — @dnd-kit/sortable SortableContext, useSortable, arrayMove, DragOverlay API
- `https://github.com/react-dropzone/react-dropzone/blob/master/README.md` — useDropzone options, accept object format, return values
- `https://tailwindcss.com/docs/installation` — Tailwind v4 Vite plugin installation steps
- `https://zustand.docs.pmnd.rs/` — Zustand v5 create, store patterns, subscriptions
- `https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close` — ImageBitmap.close() memory management
- `https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap` — createImageBitmap() API

### Secondary (MEDIUM confidence)
- `https://github.com/react-dropzone/react-dropzone/releases/tag/v14.0.0` — v14 accept format breaking change (verified on GitHub releases)
- `https://github.com/react-dropzone/react-dropzone/releases/tag/v14.2.3` — React 19 fix landed in 14.3.6+; 14.3.8 is current
- WebSearch: @dnd-kit/core 6.3.1 and @dnd-kit/sortable 10.0.0 on npm — cross-verified with npm page description
- WebSearch: Zustand 5.0.11 on npm — 25 days ago as of 2026-02-26
- WebSearch: lucide-react 0.575.0 — 7 days ago as of 2026-02-26

### Tertiary (LOW confidence — needs validation)
- WebSearch: @dnd-kit last published "a year ago" — library is stable but low recent activity; verify it still works with React 19 before first use

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm and official docs
- Architecture: HIGH — patterns derived from official @dnd-kit, react-dropzone, and Zustand docs
- Pitfalls: HIGH — sourced from global PITFALLS.md (project-researched) plus library-specific gotchas verified against official release notes
- Code examples: MEDIUM-HIGH — patterns are correct but not run against actual project yet

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (30 days — all libraries are stable)
