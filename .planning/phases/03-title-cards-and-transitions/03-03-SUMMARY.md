---
phase: 03-title-cards-and-transitions
plan: 03
subsystem: ui
tags: [react, canvas, transitions, crossfade, slide, animation, gif-export]

# Dependency graph
requires:
  - phase: 03-01
    provides: renderTransitionTick function and GifSettings.transitionType union type
provides:
  - Expanded sequence animation in PreviewPlayer (crossfade, slide-left, slide-right in live preview)
  - Transition frame expansion in ExportPanel handleExport (4 intermediate frames per pair)
  - Full transition selector UI (cut, crossfade, slide-left, slide-right)
  - Corrected file size estimate accounting for transition frame count
affects: [03-title-cards-and-transitions, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Expanded sequence pattern: content frames + N intermediate transition frames built into a flat ExpandedTick[] array for uniform tick iteration"
    - "Module-level TRANSITION_FRAMES constant shared between handleExport and encodedFrameCount estimate — single source of truth"
    - "transitionTypeRef tracks settings.transitionType in animation loop refs to avoid stale closures"

key-files:
  created: []
  modified:
    - src/components/PreviewPlayer.tsx
    - src/components/ExportPanel.tsx

key-decisions:
  - "Expanded sequence is a flat ExpandedTick[] array rather than nested structure — simplifies tick callback to sequence[index](ctx) with uniform increment logic"
  - "Preview clamps frameIndexRef to new sequence length on rebuild to handle transition type changes mid-session without out-of-bounds access"
  - "TRANSITION_FRAMES = 4 defined as module-level constant in ExportPanel to avoid duplication between handleExport loop and encodedFrameCount estimate"

patterns-established:
  - "ExpandedTick type alias: (ctx: CanvasRenderingContext2D) => void — captures both renderTick and renderTransitionTick calls in uniform callable form"
  - "encodedFrameCount = frames.length + (frames.length - 1) * TRANSITION_FRAMES for non-cut transitions — standard formula for accurate size estimates"

requirements-completed: [TRAN-02, TRAN-03]

# Metrics
duration: 4min
completed: 2026-03-04
---

# Phase 3 Plan 03: Wire Transition Pipeline into Preview and Export

**Crossfade and slide transitions wired into PreviewPlayer via expanded ExpandedTick[] sequence and into ExportPanel with 4 intermediate frames per pair, making preview match exported GIF exactly**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-04T00:02:02Z
- **Completed:** 2026-03-04T00:06:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- PreviewPlayer builds an expanded tick sequence on every frames/transitionType change — 4 intermediate frames inserted between each consecutive pair for crossfade and slide transitions
- ExportPanel handleExport generates the same 4 intermediate frames per pair using renderTransitionTick, so exported GIF matches preview exactly
- Transition selector in ExportPanel widened from 1 option (cut) to 4 (cut, crossfade, slide-left, slide-right)
- File size estimate updated to use actual encoded frame count including transition frames

## Task Commits

Each task was committed atomically:

1. **Task 1: Update PreviewPlayer to animate transitions via expanded sequence** - `a755342` (feat)
2. **Task 2: Update ExportPanel — transition selector + frame expansion + file size estimate** - `be21245` (feat)

## Files Created/Modified

- `src/components/PreviewPlayer.tsx` - Added renderTransitionTick import, transitionTypeRef, expandedSequenceRef, ExpandedTick type, expanded sequence rebuild effect, tick callback updated to call sequence[index](ctx)
- `src/components/ExportPanel.tsx` - Added renderTransitionTick import, TRANSITION_FRAMES constant, four-option transition selector, transition frame expansion in handleExport, corrected encodedFrameCount for size estimate

## Decisions Made

- Expanded sequence is a flat `ExpandedTick[]` array rather than a nested structure — allows the tick callback to remain a uniform `sequence[frameIndexRef.current](ctx)` call with no branching
- `frameIndexRef` clamped to new sequence length on every rebuild to handle transition type switches mid-session without out-of-bounds access
- `TRANSITION_FRAMES = 4` extracted as a module-level constant in ExportPanel (above the component function) to share between the export loop and the size estimate formula

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Transition pipeline fully wired: preview and export are now visually identical for cut, crossfade, slide-left, and slide-right
- Ready for plan 03-04 (title cards or human verification checkpoint)
- No blockers

---
*Phase: 03-title-cards-and-transitions*
*Completed: 2026-03-04*

## Self-Check: PASSED

- FOUND: src/components/PreviewPlayer.tsx
- FOUND: src/components/ExportPanel.tsx
- FOUND: .planning/phases/03-title-cards-and-transitions/03-03-SUMMARY.md
- FOUND commit: a755342 (Task 1)
- FOUND commit: be21245 (Task 2)
