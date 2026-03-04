# Roadmap: GIF Creator

## Overview

Three phases deliver the complete v1 product. Phase 1 establishes the core loop: upload images, arrange frames, preview the animation. Phase 2 makes the tool useful: export a real GIF with quality defaults, resolution presets, timing control, and progress feedback. Phase 3 adds the differentiators that justify building this instead of using Ezgif: title card text frames and smooth transitions. After Phase 3, a designer can go from a folder of screenshots to a portfolio-ready GIF without touching any other tool.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Upload and Preview** - Users can upload images, arrange them into a frame sequence, and preview the animation
- [x] **Phase 2: Export and Settings** - Users can export a high-quality GIF with resolution presets, timing controls, and progress feedback
- [ ] **Phase 3: Title Cards and Transitions** - Users can add text frames and smooth transitions to complete the portfolio-focused feature set

## Phase Details

### Phase 1: Upload and Preview
**Goal**: Users can upload screenshots, arrange them as an ordered frame sequence, and preview the animation before export
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-03, COMP-04, PREV-01, PREV-02
**Success Criteria** (what must be TRUE):
  1. User can drag-and-drop multiple PNG, JPG, or WebP files onto the app and see them appear as frames in order
  2. User can reorder frames by dragging them in the frame strip and the preview reflects the new order immediately
  3. User can delete a frame and it is removed from the sequence without affecting other frames
  4. User can play and pause the animated preview to see what the GIF will look like
  5. User can toggle loop on/off in the preview player and the animation behavior changes accordingly
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold project + type definitions + Zustand store + shared renderTick renderer
- [x] 01-02-PLAN.md — DropZone upload component + FrameGrid + FrameThumbnail + EditPanel
- [x] 01-03-PLAN.md — useAnimationLoop hook + PreviewPlayer canvas animation
- [x] 01-04-PLAN.md — App layout wiring + visual verification checkpoint

### Phase 2: Export and Settings
**Goal**: Users can configure output settings and export a high-quality GIF that downloads to their machine
**Depends on**: Phase 1
**Requirements**: TRAN-01, TIME-01, TIME-02, EXPO-01, EXPO-02, EXPO-03, EXPO-04
**Success Criteria** (what must be TRUE):
  1. User can select an output resolution from presets (1200x900, 800x600, 1:1, 16:9) and the exported GIF uses that resolution
  2. User can set a global frame duration and the exported GIF respects that timing
  3. User can toggle whether the exported GIF loops forever or plays once
  4. User can see an estimated file size before triggering export
  5. User can click export, watch a progress indicator during encoding, and receive a downloaded GIF file
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Extend GifSettings type + Zustand store + Floyd-Steinberg dither utility
- [x] 02-02-PLAN.md — ExportPanel UI (resolution, duration, loop, transition, file size estimate)
- [x] 02-03-PLAN.md — GIF Web Worker encoder + handleExport wiring + browser download
- [x] 02-04-PLAN.md — Visual and functional verification checkpoint

### Phase 3: Title Cards and Transitions
**Goal**: Users can add text title card frames and choose smooth transitions between frames, completing the portfolio-differentiating feature set
**Depends on**: Phase 2
**Requirements**: COMP-02, TRAN-02, TRAN-03
**Success Criteria** (what must be TRUE):
  1. User can add a title card frame with custom background color and text, and it appears in the frame strip alongside image frames
  2. User can select crossfade transition and the preview and exported GIF both show a smooth alpha-blend between frames
  3. User can select slide left or slide right transition and the preview and exported GIF both show the correct directional slide
  4. A GIF exported with title cards and transitions looks visually identical to what the user saw in the preview
**Plans**: 4 plans

Plans:
- [ ] 03-01-PLAN.md — Type widening + store actions + renderTick TextFrame branch + renderTransitionTick
- [ ] 03-02-PLAN.md — TextFrameThumbnail + FrameGrid mixed types + EditPanel text controls + Add Title Card button
- [ ] 03-03-PLAN.md — PreviewPlayer expanded sequence + ExportPanel transition frames + file size estimate
- [ ] 03-04-PLAN.md — Visual and functional verification checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Upload and Preview | 4/4 | Complete | 2026-02-27 |
| 2. Export and Settings | 4/4 | Complete | 2026-03-03 |
| 3. Title Cards and Transitions | 3/4 | In Progress|  |
