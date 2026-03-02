---
phase: 02-export-and-settings
plan: "02"
subsystem: export-ui
tags: [export, settings, zustand, ui, tailwind]
dependency_graph:
  requires: [02-01]
  provides: [ExportPanel, App-layout-with-export]
  affects: [src/App.tsx, src/components/ExportPanel.tsx]
tech_stack:
  added: []
  patterns: [zustand-selector, controlled-input, tailwind-v4-dark-theme]
key_files:
  created:
    - src/components/ExportPanel.tsx
  modified:
    - src/App.tsx
decisions:
  - "ExportPanel placed below EditPanel in same right sidebar with divider — avoids new column while keeping context separation"
  - "Sidebar gets overflow-y-auto so scroll is possible when ExportPanel extends beyond viewport"
  - "Export handleExport is an empty arrow function — Plan 03 replaces it with GIF worker call"
  - "Resolution select key derived from widthxheight string — simple and uniquely identifies each preset"
metrics:
  duration: 1 min
  completed: "2026-03-02T15:23:29Z"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 02 Plan 02: ExportPanel UI and App Layout Wiring Summary

ExportPanel component with all settings controls (resolution, duration, loop, transition, file size estimate, export button stub) created and wired into App right sidebar alongside EditPanel.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create ExportPanel component with all settings controls | 6cdb2cc | src/components/ExportPanel.tsx (created) |
| 2 | Wire ExportPanel into App layout | f2809ad | src/App.tsx (modified) |

## What Was Built

### ExportPanel.tsx

A self-contained export settings panel reading from and writing to `useFrameStore`. All 8 UI elements from the plan spec are present:

1. Section header "Export Settings" in `text-sm font-semibold text-gray-300`
2. Resolution `<select>` populated from `RESOLUTION_PRESETS`, wired to `updateSettings({ outputWidth, outputHeight })`
3. Frame duration `<input type="number">` (min 50, max 5000, step 50) wired to `updateSettings({ frameDurationMs })`
4. Loop toggle button with blue-on / gray-off styling, calls `updateSettings({ loop: !settings.loop })`
5. Transition `<select>` with single "Cut (instant)" option, forward-compatible for Phase 3
6. Live file size estimate using RESEARCH.md Pattern 7 formula — shows "—" when no frames
7. Export button with `Download` icon — disabled when no frames or exporting, no-op stub for Plan 03
8. Progress bar shown only when `exportProgress !== null`, displaying `exportProgress%`

### App.tsx Changes

Right sidebar updated from single `<EditPanel />` to a vertically stacked layout with divider:
- `EditPanel` (frame-specific settings)
- Gray horizontal divider
- `ExportPanel` (output/export controls)

Sidebar also received `flex flex-col gap-6 overflow-y-auto` to handle the increased height.

## Verification

- `npx tsc --noEmit` — no errors
- `npm run build` — succeeded in 709ms, zero TypeScript or module errors
- ExportPanel renders in right sidebar of populated layout
- All 5 settings controls call `updateSettings` correctly
- File size estimate uses correct formula
- Export button present, disabled when no frames, no-op until Plan 03

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/components/ExportPanel.tsx` exists
- [x] `src/App.tsx` contains ExportPanel import and render
- [x] Commit `6cdb2cc` exists (ExportPanel)
- [x] Commit `f2809ad` exists (App layout)
- [x] Build passes with zero errors
