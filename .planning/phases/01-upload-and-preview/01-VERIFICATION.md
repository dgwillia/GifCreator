---
phase: 01-upload-and-preview
verified: 2026-02-27T00:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Drag 3+ PNG/JPG/WebP files onto the drop zone; confirm frames appear as letterboxed thumbnails in the left grid with no stretching"
    expected: "Thumbnails appear for each file, grid switches to populated layout, images are letterboxed (black bars, aspect ratio preserved)"
    why_human: "createImageBitmap + letterbox math cannot be exercised without actual file drop events; canvas pixel output requires visual inspection"
  - test: "Drag a thumbnail to a new position in the frame strip and observe the grid"
    expected: "Grid updates immediately to the new order, no duplicate keys in DevTools console, preview reflects new order on next play"
    why_human: "DnD-kit reorder interaction requires a real pointer device; state sync between DragOverlay and SortableContext is visually observable only"
  - test: "Click Play, observe animation, then click Pause"
    expected: "Canvas cycles through frames at ~800ms per frame; Pause stops animation on the current frame without jumping"
    why_human: "requestAnimationFrame timing and the frame-advance state machine require live browser execution to observe"
  - test: "Toggle Loop off, click Play, let animation reach the last frame"
    expected: "Animation stops on the last frame and does not restart; toggle Loop back on, click Play — animation loops continuously"
    why_human: "Loop branch in the rAF tick callback requires observing end-of-sequence behavior in real time"
  - test: "Drop a non-image file (e.g. .txt or .pdf) onto the drop zone"
    expected: "File is rejected; red error message appears below the drop zone: 'Only PNG, JPG, and WebP images are accepted.'"
    why_human: "react-dropzone rejection logic requires a real file drop event; cannot test MIME filtering programmatically without a browser"
---

# Phase 1: Upload and Preview Verification Report

**Phase Goal:** Deliver a working upload-and-preview UI: drag-and-drop image upload, frame reordering, and animated canvas preview with play/pause/loop controls.
**Verified:** 2026-02-27
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can drag-and-drop multiple PNG, JPG, or WebP files onto the app and see them appear as frames in order | ? HUMAN | DropZone.tsx uses react-dropzone with correct MIME object format; onDrop pipeline calls `createImageBitmap` then `addFrames`. Wiring is complete but drop interaction requires browser. |
| 2 | User can reorder frames by dragging them in the frame strip and the preview reflects the new order immediately | ? HUMAN | FrameGrid.tsx drives SortableContext from Zustand store (not local state); `reorderFrames` called synchronously in `handleDragEnd`. Wiring is complete but DnD requires browser. |
| 3 | User can delete a frame and it is removed from the sequence without affecting other frames | ✓ VERIFIED | FrameThumbnail X button calls `removeFrame(frame.id)` with `e.stopPropagation()`. EditPanel Delete button calls `removeFrame(selectedId)` then `setSelectedId(null)`. Store's removeFrame also calls `bitmap.close()` to free GPU memory. |
| 4 | User can play and pause the animated preview to see what the GIF will look like | ? HUMAN | PreviewPlayer has Play/Pause button wired to `handlePlay`/`handlePause`. rAF loop in useAnimationLoop drives frame advance. Calls `renderTick` for every frame. Start/stop logic verified in source; timing behavior requires browser. |
| 5 | User can toggle loop on/off in the preview player and the animation behavior changes accordingly | ? HUMAN | Loop button calls `toggleLoop` from store; `loopRef` is kept current via `useEffect`. In the rAF tick, `loopRef.current` gates the restart vs. stop branch. End-of-sequence behavior requires browser to observe. |

**Score:** 1/5 truths fully verifiable programmatically; 4/5 require human verification of runtime behavior. All 5 are structurally WIRED and non-stub. No automated failures.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/frames.ts` | ImageFrame, TextFrame, Frame union, GifSettings type definitions | ✓ VERIFIED | All 4 exports present and match spec exactly. Discriminated union on `type` field. GifSettings has `frameDurationMs: number` and `loop: boolean`. |
| `src/store/useFrameStore.ts` | Zustand store with frames, settings, selectedId, addFrames, removeFrame, reorderFrames, setSelectedId, toggleLoop | ✓ VERIFIED | All 7 fields/actions present. removeFrame calls `bitmap.close()` on ImageFrame. reorderFrames uses `arrayMove` from @dnd-kit/sortable. |
| `src/renderer/renderTick.ts` | Shared canvas rendering function accepting both CanvasRenderingContext2D and OffscreenCanvasRenderingContext2D | ✓ VERIFIED | Signature: `(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, frame: Frame, width: number, height: number, progress = 1.0): void`. Letterbox math uses `Math.min(width/bw, height/bh)` scale + centered offset. |
| `src/components/DropZone.tsx` | File upload drop zone with MIME filtering and onDrop pipeline to Zustand store | ✓ VERIFIED | Uses react-dropzone v15 object accept format `{'image/png': ['.png'], ...}`. Pipeline: File → createImageBitmap → ImageFrame → addFrames. Error state for rejections. |
| `src/components/FrameGrid.tsx` | DnD-kit SortableContext grid container | ✓ VERIFIED | DndContext + SortableContext items driven from Zustand (not local state). PointerSensor with `activationConstraint: { distance: 5 }`. rectSortingStrategy. DragOverlay with FrameThumbnailGhost. |
| `src/components/FrameThumbnail.tsx` | Sortable frame thumbnail with canvas rendering, X button, selection ring | ✓ VERIFIED | Uses useSortable. Letterbox canvas draw. X button calls removeFrame. onClick calls setSelectedId. Blue border (border-blue-500) when selected. |
| `src/components/FrameThumbnailGhost.tsx` | Presentational-only thumbnail for DragOverlay (no useSortable) | ✓ VERIFIED | Does NOT call useSortable — confirmed by grep. Reads frame from store by id. Renders canvas with letterbox draw. |
| `src/components/EditPanel.tsx` | Frame selection panel showing delete button and frame metadata | ✓ VERIFIED | Shows "Select a frame to edit" placeholder when no frame selected. When selected: shows frame number, filename, Delete Frame button calling removeFrame + setSelectedId(null). |
| `src/hooks/useAnimationLoop.ts` | Custom hook with requestAnimationFrame lifecycle, play/pause/cleanup | ✓ VERIFIED | Exports `{ start, stop, isRunningRef }`. start() is idempotent (guard on isRunningRef.current). Cleanup useEffect cancels rAF on unmount. tickRef pattern avoids stale closures. |
| `src/components/PreviewPlayer.tsx` | Canvas preview player with play/pause/loop controls reading from Zustand store | ✓ VERIFIED | Calls renderTick (not inline ctx.drawImage) for all frame rendering. Inline ctx.clearRect/fillRect only in the no-frames empty-state branch (correct). useAnimationLoop manages rAF lifecycle. Loop toggle wired to store's toggleLoop. |
| `src/App.tsx` | Root layout wiring all Phase 1 components into a cohesive app | ✓ VERIFIED | Two-state layout: empty state (centered DropZone) and populated state (left grid + center preview + right edit panel). All 4 components imported and rendered. |
| `vite.config.ts` | Vite config with React and Tailwind v4 plugins | ✓ VERIFIED | `plugins: [react(), tailwindcss()]`. No tailwind.config.js or postcss.config.js exists. src/index.css contains only `@import "tailwindcss"`. |

**All 12 artifacts: exist, are substantive, and are wired.**

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/store/useFrameStore.ts` | `src/types/frames.ts` | `import type { Frame, GifSettings }` | ✓ WIRED | Line 7: `import type { Frame, GifSettings } from '../types/frames'` |
| `src/renderer/renderTick.ts` | `src/types/frames.ts` | `import type { Frame }` | ✓ WIRED | Line 6: `import type { Frame } from '../types/frames'` |
| `src/components/DropZone.tsx` | `src/store/useFrameStore.ts` | `addFrames` called in onDrop | ✓ WIRED | Line 19: selector; line 41: `addFrames(frames)` called after successful createImageBitmap |
| `src/components/FrameGrid.tsx` | `src/store/useFrameStore.ts` | `reorderFrames` called in handleDragEnd | ✓ WIRED | Line 29: destructured from store; line 50: called synchronously in handleDragEnd |
| `src/components/FrameThumbnail.tsx` | `src/store/useFrameStore.ts` | `removeFrame` and `setSelectedId` | ✓ WIRED | Line 20: both destructured; line 53: setSelectedId on click; line 70: removeFrame on X button |
| `src/components/EditPanel.tsx` | `src/store/useFrameStore.ts` | `removeFrame` on Delete button click | ✓ WIRED | Line 10: destructured; line 42: `removeFrame(selectedId)` |
| `src/components/PreviewPlayer.tsx` | `src/renderer/renderTick.ts` | `renderTick` called in animation tick | ✓ WIRED | Line 14: imported; lines 57, 95, 118: called with canvas context and frame |
| `src/components/PreviewPlayer.tsx` | `src/store/useFrameStore.ts` | reads frames, settings; calls toggleLoop | ✓ WIRED | Line 33: `const { frames, settings, toggleLoop } = useFrameStore()`; line 166: toggleLoop bound to loop button |
| `src/components/PreviewPlayer.tsx` | `src/hooks/useAnimationLoop.ts` | `useAnimationLoop` drives rAF lifecycle | ✓ WIRED | Line 15: imported; line 73: `const { start, stop } = useAnimationLoop(tick)` |
| `src/App.tsx` | `src/components/DropZone.tsx` | renders DropZone | ✓ WIRED | Line 12: imported; lines 32, 51: rendered in both layout states |
| `src/App.tsx` | `src/components/FrameGrid.tsx` | renders FrameGrid | ✓ WIRED | Line 13: imported; line 52: rendered in populated state |
| `src/App.tsx` | `src/components/PreviewPlayer.tsx` | renders PreviewPlayer | ✓ WIRED | Line 14: imported; line 57: rendered in populated state |
| `src/App.tsx` | `src/components/EditPanel.tsx` | renders EditPanel | ✓ WIRED | Line 15: imported; line 61: rendered in populated state |

**All 13 key links: WIRED.**

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COMP-01 | 01-01, 01-02, 01-04 | User can upload multiple images via drag-and-drop (PNG, JPG, WebP accepted) | ? HUMAN | DropZone.tsx structurally complete with correct MIME filtering, createImageBitmap pipeline, and addFrames wiring. Runtime behavior requires browser. |
| COMP-03 | 01-01, 01-02, 01-04 | User can reorder frames via drag-and-drop in the frame strip | ? HUMAN | FrameGrid.tsx uses DnD-kit with SortableContext driven from Zustand store. reorderFrames action wired in handleDragEnd. Runtime behavior requires browser. |
| COMP-04 | 01-01, 01-02, 01-04 | User can delete individual frames from the sequence | ✓ SATISFIED | Two deletion paths: X button (FrameThumbnail) and Delete Frame button (EditPanel). Both call removeFrame. Store frees GPU memory via bitmap.close(). |
| PREV-01 | 01-01, 01-03, 01-04 | User can preview the animated GIF sequence with play and pause controls | ? HUMAN | PreviewPlayer has Play/Pause toggle wired to useAnimationLoop start/stop. renderTick called for each frame in rAF loop. Runtime animation behavior requires browser. |
| PREV-02 | 01-01, 01-03, 01-04 | User can toggle loop on/off in the preview player | ? HUMAN | Loop button calls toggleLoop; loopRef.current gates rAF restart vs. stop at end-of-sequence. Runtime end-of-sequence behavior requires browser. |

**No orphaned requirements.** REQUIREMENTS.md traceability table maps COMP-01, COMP-03, COMP-04, PREV-01, PREV-02 to Phase 1. All five are claimed by this phase's plans and verified above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/FrameGrid.tsx` | 60 | `return null` | ℹ️ Info | Intentional: component returns null when no image frames exist (correct behavior for empty-before-upload state; DropZone handles the empty layout) |
| `src/components/FrameThumbnailGhost.tsx` | 36 | `return null` | ℹ️ Info | Intentional: returns null when frame not found in store (guard against stale DragOverlay after deletion) |
| `src/App.css` | — | Leftover Vite scaffold CSS (`.logo`, `#root` styles) | ℹ️ Info | Not imported anywhere — App.tsx and main.tsx do not import App.css. Dead file; no runtime impact. |

**No blocker anti-patterns found.** No TODOs, FIXMEs, placeholder implementations, console.log-only handlers, or unimplemented stubs.

**Notable observation:** The two `return null` instances are defensive guards, not stubs. They are correct behavior per the component contract.

**Notable observation:** `src/App.css` is a leftover from the Vite scaffold but is not imported anywhere in the project. It has no runtime effect. Could be deleted for cleanliness but does not affect goal achievement.

---

### Build Verification

**npm run build result:** Exit 0. Zero TypeScript errors. 1758 modules transformed.

```
vite v7.3.1 building client environment for production...
✓ 1758 modules transformed.
dist/assets/index-DqKBo7Y5.css   17.04 kB │ gzip:  4.10 kB
dist/assets/index-8ulwaWC9.js   318.30 kB │ gzip: 99.13 kB
✓ built in 701ms
```

**Tailwind v4 configuration:** Correct. Plugin-only setup (`@tailwindcss/vite` in vite.config.ts, `@import "tailwindcss"` in index.css). No tailwind.config.js or postcss.config.js.

**@dnd-kit/utilities:** Not listed in package.json but resolved at build time (transitive dependency of @dnd-kit/core or @dnd-kit/sortable). Build succeeds confirming it is available.

---

### Human Verification Required

All 5 items require a live browser because they involve drag-and-drop events, canvas animation timing, or requestAnimationFrame behavior that cannot be exercised programmatically.

**1. Upload via drag-and-drop (COMP-01)**

**Test:** Start `npm run dev`, open http://localhost:5173, drag 3+ PNG/JPG/WebP screenshots onto the centered drop zone.

**Expected:** Each file becomes a frame thumbnail in the left grid; layout switches to populated state (header + 3-column); thumbnails are letterboxed (black bars visible for non-4:3 images, no stretching).

**Why human:** `createImageBitmap` requires a real browser context; canvas rendering requires visual inspection to confirm letterbox correctness.

**2. Frame reorder via drag (COMP-03)**

**Test:** With frames loaded, drag a thumbnail to a different position in the grid.

**Expected:** Grid reorders immediately (the dragged item snaps to the new slot); no duplicate key warnings in DevTools console; the preview canvas reflects the new first frame after reorder.

**Why human:** DnD-kit PointerSensor requires real pointer events; state-sync correctness between DragOverlay and SortableContext is visually observable only.

**3. Play and Pause animation (PREV-01)**

**Test:** Click Play. Observe canvas cycling through frames. Click Pause.

**Expected:** Canvas advances through all frames at approximately 800ms intervals; Pause stops the animation on the current frame (not the first frame); the button label toggles between "Play" and "Pause" correctly.

**Why human:** requestAnimationFrame timing and frame-advance logic require live execution; the timestamp-based frame advance cannot be statically verified.

**4. Loop toggle (PREV-02)**

**Test:** Click "Loop: On" to turn loop off. Click Play. Let animation reach the last frame.

**Expected:** Animation stops on the last frame and does not restart; "Play" button re-enables. Then click "Loop: Off" to turn it back on; click Play — animation now loops from last frame back to first continuously.

**Why human:** The end-of-sequence branch in the rAF tick requires observing what happens at the last frame boundary.

**5. File rejection error (COMP-01 edge case)**

**Test:** Drop a .txt or .pdf file onto the drop zone.

**Expected:** File is rejected; red error message appears below the drop zone ("Only PNG, JPG, and WebP images are accepted."); no frame is added; no console errors.

**Why human:** react-dropzone MIME rejection requires a real file drop event from the browser.

---

## Summary

All Phase 1 artifacts exist, are fully implemented (not stubs), and are correctly wired together. The build passes cleanly with zero TypeScript errors. No anti-patterns or placeholder implementations were found.

The 5 observable success criteria from the ROADMAP cannot be fully verified without a live browser session because they depend on drag-and-drop event handling, requestAnimationFrame timing, and canvas rendering output. All structural preconditions for those behaviors are present and wired correctly.

**Automated confidence is high** that the phase goal is achieved. The human verification steps above are the final gate to confirm runtime behavior matches the implementation.

---

_Verified: 2026-02-27_
_Verifier: Claude (gsd-verifier)_
