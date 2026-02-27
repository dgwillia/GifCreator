---
phase: 01-upload-and-preview
plan: 02
subsystem: ui-components
tags: [react, dnd-kit, react-dropzone, zustand, canvas, tailwind]
dependency_graph:
  requires:
    - 01-01  # store, types, renderer foundation
  provides:
    - upload-ui
    - frame-grid-ui
    - edit-panel-ui
  affects:
    - 01-03  # App layout will compose these components
key_files:
  created:
    - src/components/DropZone.tsx
    - src/components/FrameThumbnail.tsx
    - src/components/FrameThumbnailGhost.tsx
    - src/components/FrameGrid.tsx
    - src/components/EditPanel.tsx
  modified: []
decisions:
  - "react-dropzone v15 object accept format used (same requirement as v14+ — string format silently broken)"
  - "FrameThumbnailGhost is presentational-only with no useSortable call — avoids DnD-kit ID collision in DragOverlay"
  - "SortableContext items driven directly from Zustand store — prevents reorder state desync"
  - "Canvas letterbox draw with scale+offset — no image stretching or distortion"
metrics:
  duration: 4 min
  completed: 2026-02-27
  tasks_completed: 3
  files_created: 5
  files_modified: 0
---

# Phase 1 Plan 02: Upload and Frame Management UI Summary

**One-liner:** Five React components delivering the full upload, reorder, and delete interaction loop using DnD-kit sortable grid with canvas letterbox thumbnails.

## What Was Built

### DropZone (src/components/DropZone.tsx)

File upload drop zone that:
- Uses react-dropzone v15 with MIME-type object accept format (`{ 'image/png': ['.png'], ... }`)
- Accepts PNG, JPG, and WebP only; rejects other file types with a user-visible error message
- Pipeline: `File -> createImageBitmap() -> ImageFrame` stored in Zustand via `addFrames`
- Shows drag-active, loading, and error states
- Never stores blob URLs — ImageBitmap objects stored directly in frame objects

### FrameThumbnailGhost (src/components/FrameThumbnailGhost.tsx)

Presentational-only drag overlay thumbnail that:
- Renders inside DnD-kit `DragOverlay` — deliberately does NOT call `useSortable()`
- Reads frame data from Zustand store by ID
- Uses identical letterbox canvas draw logic as FrameThumbnail
- Shows blue border and slight opacity to indicate drag-in-progress

### FrameThumbnail (src/components/FrameThumbnail.tsx)

Sortable frame item that:
- Calls `useSortable({ id: frame.id })` from `@dnd-kit/sortable`
- Renders ImageBitmap to canvas using letterbox scaling (aspect ratio preserved, dark fill for gaps)
- Shows blue selection border when selected
- X button on hover calls `removeFrame` (propagation stopped to avoid triggering selection)
- Fades to 35% opacity while dragging (actual item, ghost handles visual feedback)

### FrameGrid (src/components/FrameGrid.tsx)

DnD-kit sortable grid container that:
- Uses `DndContext + SortableContext + DragOverlay` pattern
- `SortableContext items` driven from Zustand store frames array — prevents reorder desync
- `rectSortingStrategy` for 2D grid layout
- `PointerSensor` with `activationConstraint: { distance: 5 }` — prevents accidental drags on click
- `KeyboardSensor` with `sortableKeyboardCoordinates` for accessibility
- `handleDragEnd` calls `reorderFrames(activeId, overId)` synchronously
- Returns `null` when no frames — no empty grid rendered

### EditPanel (src/components/EditPanel.tsx)

Frame selection sidebar that:
- Shows "Select a frame to edit" placeholder when nothing is selected
- When a frame is selected: shows frame number, filename (for ImageFrames), and Delete Frame button
- Delete button calls `removeFrame(selectedId)` then `setSelectedId(null)` to clear selection
- Styled as fixed-width right sidebar (`w-56 shrink-0`)
- Placeholder comment for Phase 3 text frame editing controls

## Architecture Confirmations

**FrameThumbnailGhost is presentational-only (no useSortable):**
- Confirmed: file contains no `useSortable` call — only a comment explaining why it must not
- This avoids DnD-kit throwing "Duplicate ID" errors when the overlay renders simultaneously with the real item

**SortableContext items from Zustand store:**
- `const frameIds = imageFrames.map((f) => f.id)` derived from `useFrameStore()` directly
- No local state copy of the frame array — prevents desync between drag state and store state

**Canvas letterbox draw:**
- `scale = Math.min(cw / bw, ch / bh)` — uniform scale to fit
- `dx, dy` offsets calculated to center within canvas
- Dark `#1a1a1a` fill before draw — fills letterbox bars
- Used in both FrameThumbnail and FrameThumbnailGhost

## Deviations from Plan

None — plan executed exactly as written.

The plan noted `react-dropzone 14.3.8` in a comment but the installed version is v15.0.0. The object-format accept API (the critical constraint) applies identically to both versions, so no code change was required.

## Self-Check

Files confirmed to exist:
- src/components/DropZone.tsx
- src/components/FrameThumbnail.tsx
- src/components/FrameThumbnailGhost.tsx
- src/components/FrameGrid.tsx
- src/components/EditPanel.tsx

Build: passed (0 TypeScript errors, vite build exit 0)

Commits:
- 944f278: feat(01-02): create DropZone component with image upload pipeline
- ece6100: feat(01-02): create FrameThumbnail, FrameThumbnailGhost, and FrameGrid
- dc31e31: feat(01-02): create EditPanel component
