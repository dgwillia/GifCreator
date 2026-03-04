---
phase: 03-title-cards-and-transitions
plan: "01"
subsystem: renderer
tags: [types, store, renderer, transitions, text-frames]
dependency_graph:
  requires: []
  provides: [GifSettings.transitionType-union, addTextFrame, updateTextFrame, TextFrame-rendering, renderTransitionTick]
  affects: [src/types/frames.ts, src/store/useFrameStore.ts, src/renderer/renderTick.ts, src/renderer/renderTransitionTick.ts, src/components/ExportPanel.tsx]
tech_stack:
  added: []
  patterns: [discriminated-union-frames, shared-offscreen-canvas-scratch, module-level-singleton]
key_files:
  created:
    - src/renderer/renderTransitionTick.ts
  modified:
    - src/types/frames.ts
    - src/store/useFrameStore.ts
    - src/renderer/renderTick.ts
    - src/components/ExportPanel.tsx
decisions:
  - "transitionType default cast uses GifSettings['transitionType'] instead of 'cut' as const to prevent literal narrowing against the wider union"
  - "renderTransitionTick uses module-level OffscreenCanvas singleton (scratchCanvas) to avoid GC pressure on each transition frame"
  - "progress parameter in renderTick retained with void suppression — used by renderTransitionTick callers, not renderTick itself"
metrics:
  duration: "~2 min"
  completed_date: "2026-03-04"
  tasks_completed: 2
  files_changed: 5
---

# Phase 3 Plan 01: Type and Rendering Foundation Summary

Established the Phase 3 type and rendering contracts: widened the transitionType union, added text frame store actions, added TextFrame rendering to renderTick, and created the renderTransitionTick compositing module.

## What Was Built

**GifSettings.transitionType widened** — Changed from literal `'cut'` to `'cut' | 'crossfade' | 'slide-left' | 'slide-right'` in `src/types/frames.ts`. All existing code using `'cut'` remains valid as a union member.

**Store actions added** — `addTextFrame` and `updateTextFrame` added to FrameStore interface and implementation in `src/store/useFrameStore.ts`. `addTextFrame` creates a TextFrame with `crypto.randomUUID()` and appends it to the frames array. `updateTextFrame` patches an existing TextFrame by id.

**TextFrame rendering branch** — `renderTick` in `src/renderer/renderTick.ts` now handles `frame.type === 'text'`: fills the canvas with `frame.backgroundColor`, then draws centered, newline-aware text scaled proportionally from a 800px baseline using `frame.fontSize`.

**renderTransitionTick created** — New file `src/renderer/renderTransitionTick.ts` exports `renderTransitionTick` with three compositing modes:
- `crossfade`: renders fromFrame as base, composites toFrame via `ctx.globalAlpha = progress`, always resets to 1.0
- `slide-left`: toFrame slides in from the right using `drawImage(scratchCanvas, offset, 0)`
- `slide-right`: toFrame slides in from the left using `drawImage(scratchCanvas, -offset, 0)`

A module-level `scratchCanvas` singleton is reused across calls, resized only when dimensions change.

**ExportPanel cast fixed** — `handleTransitionChange` now casts via `GifSettings['transitionType']` instead of the now-too-narrow `'cut'`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Widen GifSettings.transitionType + add store actions | 3b6a4a5 | src/types/frames.ts, src/store/useFrameStore.ts, src/components/ExportPanel.tsx |
| 2 | Add TextFrame branch to renderTick + create renderTransitionTick | e6e7e8b | src/renderer/renderTick.ts, src/renderer/renderTransitionTick.ts |

## Verification

```
npx tsc --noEmit
```
Exit 0 — zero TypeScript errors across all five modified/created files.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- src/types/frames.ts — FOUND
- src/store/useFrameStore.ts — FOUND
- src/renderer/renderTick.ts — FOUND
- src/renderer/renderTransitionTick.ts — FOUND
- src/components/ExportPanel.tsx — FOUND
- Commit 3b6a4a5 — FOUND
- Commit e6e7e8b — FOUND
