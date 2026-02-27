---
phase: 01-upload-and-preview
plan: 03
subsystem: ui
tags: [react, canvas, requestAnimationFrame, zustand, lucide-react]

# Dependency graph
requires:
  - phase: 01-upload-and-preview
    plan: 01
    provides: "renderTick shared renderer, useFrameStore Zustand store, Frame type system"
provides:
  - useAnimationLoop hook with idempotent start/stop and rAF cleanup on unmount
  - PreviewPlayer component with canvas animation, play/pause/reset, loop toggle
  - Complete PREV-01 and PREV-02 requirements
affects:
  - 01-04
  - phase-02-export

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tickRef pattern: store callback in ref so rAF loop reads latest values without restart"
    - "framesRef/settingsRef pattern: keep Zustand values in refs inside animation tick to avoid stale closures"
    - "Idempotent rAF start: guard with isRunningRef.current check prevents double-loop bug"

key-files:
  created:
    - src/hooks/useAnimationLoop.ts
    - src/components/PreviewPlayer.tsx
  modified: []

key-decisions:
  - "renderTick called from shared renderer path — no inline canvas drawing in PreviewPlayer (preserves Phase 2 encoder contract)"
  - "useAnimationLoop cleanup effect cancels rAF on unmount to prevent CPU leak"
  - "Refs pattern for store values inside tick avoids stale closures without restarting loop on every state change"
  - "Idempotent start() guards against double-loop bug on remount"

patterns-established:
  - "Animation tick always uses renderTick() — never inline ctx.drawImage or ctx.fillText"
  - "rAF lifecycle owned entirely by useAnimationLoop hook — components use start/stop only"
  - "Store values accessed inside rAF tick via refs updated on each render"

requirements-completed: [PREV-01, PREV-02]

# Metrics
duration: 1min
completed: 2026-02-27
---

# Phase 1 Plan 03: Preview Player Summary

**requestAnimationFrame animation loop with play/pause/loop/reset controls rendering via shared renderTick() to maintain Phase 2 encoder contract**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-27T13:46:39Z
- **Completed:** 2026-02-27T13:47:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `useAnimationLoop` custom hook encapsulates the full rAF lifecycle: start, stop, idempotent start guard, and cleanup on unmount (prevents CPU leak)
- `PreviewPlayer` component renders canvas animation using `renderTick()` from the shared renderer — no inline canvas drawing logic
- Play/pause toggle tracked with React state; loop toggle wired to `useFrameStore.toggleLoop()`; reset returns to frame 0 and redraws
- Empty-state canvas shows dark placeholder with "Upload images to preview" message and disabled controls

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useAnimationLoop custom hook** - `2f3ce08` (feat)
2. **Task 2: Create PreviewPlayer component** - `7bccecc` (feat)

## Files Created/Modified

- `src/hooks/useAnimationLoop.ts` - Custom hook encapsulating rAF lifecycle: start (idempotent), stop, and cleanup on unmount. tickRef pattern keeps callback fresh without restarting the loop.
- `src/components/PreviewPlayer.tsx` - Canvas animated preview player. Reads frames and settings from Zustand via refs to avoid stale closures. Calls renderTick() for all canvas drawing. Controls: play/pause, reset, loop toggle.

## Decisions Made

- `renderTick()` from `src/renderer/renderTick.ts` is called for all canvas drawing in `PreviewPlayer` — no inline canvas logic. This is the critical contract: Phase 2 GIF encoder uses the same function, so preview and encoded output stay visually identical.
- rAF cleanup on unmount is handled in `useAnimationLoop`'s cleanup effect (not in `PreviewPlayer`). This encapsulates the lifecycle concern in the hook and prevents the CPU leak pitfall.
- Frames and settings are kept in refs inside the tick callback to avoid stale closures without restarting the rAF loop on every Zustand state change.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `PreviewPlayer` is complete and ready for integration into the main `App.tsx` layout (Plan 04)
- `useAnimationLoop` is available for any future animation needs
- Both files compile cleanly with the full build passing (29 modules, no TS errors)
- Phase 2 encoder contract maintained: `renderTick()` is the single drawing function for both preview and export paths

---
*Phase: 01-upload-and-preview*
*Completed: 2026-02-27*

## Self-Check: PASSED

- FOUND: src/hooks/useAnimationLoop.ts
- FOUND: src/components/PreviewPlayer.tsx
- FOUND: .planning/phases/01-upload-and-preview/01-03-SUMMARY.md
- FOUND commit: 2f3ce08 (feat(01-03): create useAnimationLoop custom hook)
- FOUND commit: 7bccecc (feat(01-03): create PreviewPlayer canvas animation component)
