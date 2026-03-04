---
phase: 03-title-cards-and-transitions
plan: 02
subsystem: ui
tags: [react, dnd-kit, zustand, tailwind, typescript]

# Dependency graph
requires:
  - phase: 03-01
    provides: TextFrame type, addTextFrame/updateTextFrame store actions, renderTransitionTick
provides:
  - TextFrameThumbnail component with dnd-kit sortable and CSS-based preview
  - FrameGrid updated to handle mixed ImageFrame/TextFrame rendering
  - EditPanel text editing controls (textarea, color pickers, font size)
  - Add Title Card button in populated left sidebar
affects:
  - 03-03 (GIF encoder will need to render TextFrame via existing renderTransitionTick)
  - 03-04 (human-verify of full title card flow end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useFrameStore.getState() for synchronous ID read after addTextFrame outside React render
    - Discriminated union conditional rendering in FrameGrid (frame.type === 'image' ? A : B)
    - TextFrame editing controls guarded by selectedFrame.type === 'text' in EditPanel

key-files:
  created:
    - src/components/TextFrameThumbnail.tsx
  modified:
    - src/components/FrameGrid.tsx
    - src/components/EditPanel.tsx
    - src/App.tsx

key-decisions:
  - "FrameGrid uses all frames (not filtered) in SortableContext — supports mixed ImageFrame + TextFrame drag-and-drop"
  - "TextFrameThumbnail uses identical dnd-kit useSortable pattern as FrameThumbnail for consistent drag behavior"
  - "Add Title Card button placed in populated left sidebar only — empty state is for initial upload flow only"

patterns-established:
  - "Pattern: getState() synchronous read after store mutation for immediate ID access outside React hooks"

requirements-completed: [COMP-02]

# Metrics
duration: 2min
completed: 2026-03-04
---

# Phase 3 Plan 02: Title Card UI Summary

**CSS-based TextFrameThumbnail with dnd-kit sortable, mixed-type FrameGrid, EditPanel color/text/size controls, and Add Title Card button wired to Zustand getState() sync pattern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-04T13:35:31Z
- **Completed:** 2026-03-04T13:37:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created TextFrameThumbnail with CSS div preview (background color + text), delete button, and same dnd-kit useSortable pattern as FrameThumbnail
- Updated FrameGrid to render both ImageFrame and TextFrame in the strip using discriminated union conditional rendering
- Added EditPanel text editing controls: textarea, background color picker, text color picker, and font size input — all wired to updateTextFrame store action
- Added "Add Title Card" button in populated left sidebar using useFrameStore.getState() synchronous pattern to immediately select the new frame

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TextFrameThumbnail + update FrameGrid for mixed types** - `a31d4ca` (feat)
2. **Task 2: Add EditPanel text controls + 'Add Title Card' button in App** - `5c7eb3e` (feat)

## Files Created/Modified
- `src/components/TextFrameThumbnail.tsx` - New CSS-based title card thumbnail with dnd-kit sortable, background color preview, text display, and delete button
- `src/components/FrameGrid.tsx` - Updated to use all frames (not filtered) with conditional rendering for image vs text thumbnails
- `src/components/EditPanel.tsx` - Added textarea, two color pickers (background + text), and font size input for TextFrame editing
- `src/App.tsx` - Added Type icon import and "Add Title Card" button in populated left sidebar

## Decisions Made
- FrameGrid no longer filters to imageFrames — it uses the full frames array and renders the correct thumbnail component based on frame.type. This avoids the need for separate SortableContext lists and ensures TextFrames can be dragged alongside ImageFrames.
- The "Add Title Card" button uses `useFrameStore.getState()` (Zustand static access) for both addTextFrame and the immediate ID readback. This is required because we are inside a click handler (not a React render), and getState() is synchronous — the new frame is immediately available after calling addTextFrame.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Title card UI is complete end-to-end: create, view in strip, drag to reorder, select, and edit via EditPanel
- Plan 03-03 (GIF encoder TextFrame rendering) can now consume existing renderTransitionTick which was established in 03-01
- Plan 03-04 (human-verify) can test the full title card workflow in the browser

---
*Phase: 03-title-cards-and-transitions*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: src/components/TextFrameThumbnail.tsx
- FOUND: src/components/FrameGrid.tsx
- FOUND: src/components/EditPanel.tsx
- FOUND: src/App.tsx
- FOUND: .planning/phases/03-title-cards-and-transitions/03-02-SUMMARY.md
- FOUND: commit a31d4ca (Task 1)
- FOUND: commit 5c7eb3e (Task 2)
