---
phase: 02-export-and-settings
plan: 03
subsystem: export-pipeline
tags: [gif-encoding, web-worker, offscreencanvas, gifenc, dithering]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [gif-export-pipeline, worker-message-types]
  affects: [ExportPanel, gifWorker, dither]
tech_stack:
  added: [gifenc@1.0.3]
  patterns: [Web Worker ?worker import, OffscreenCanvas frame rendering, zero-copy ArrayBuffer transfer, per-frame palette quantization, Floyd-Steinberg dithering]
key_files:
  created:
    - src/workers/gifWorker.types.ts
    - src/workers/gifWorker.ts
    - src/types/gifenc.d.ts
  modified:
    - src/components/ExportPanel.tsx
key_decisions:
  - "Worker postMessage uses options object form { transfer: [...] } for TypeScript compatibility with DOM lib types"
  - "gifenc has no @types package — created src/types/gifenc.d.ts with full API declarations"
  - "Blob created from bytes.buffer cast as ArrayBuffer to satisfy BlobPart type constraint in strict TS"
metrics:
  duration: 2 min
  completed_date: "2026-03-02"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 2 Plan 03: GIF Export Pipeline Summary

**One-liner:** End-to-end GIF export via gifenc Web Worker with per-frame palette quantization, Floyd-Steinberg dithering, and zero-copy ArrayBuffer transfer.

## What Was Built

- **`src/workers/gifWorker.types.ts`** — Discriminated union message types (`WorkerIncoming` / `WorkerOutgoing`) shared between main thread and worker
- **`src/workers/gifWorker.ts`** — GIF encoder Web Worker: receives pre-rendered RGBA buffers, runs per-frame `quantize()` + Floyd-Steinberg dithering + `applyPalette()`, writes frames with `GIFEncoder`, transfers completed bytes zero-copy back to main thread
- **`src/types/gifenc.d.ts`** — TypeScript declaration file for gifenc (no official @types package)
- **`src/components/ExportPanel.tsx`** — Full `handleExport` implementation: OffscreenCanvas feature detection, frame rendering via `renderTick`, worker lifecycle management, progress updates, blob download trigger with blob URL revocation

## Key Implementation Details

The export pipeline follows the RESEARCH.md anti-pattern avoidance:
- **No ImageBitmap transfer to worker** — renders to scratch OffscreenCanvas, reads back ImageData, copies buffer with `.slice(0)` before transfer. Preview player bitmaps remain on main thread.
- **No main-thread encoding** — all GIF encoding happens in the worker, keeping UI responsive during encoding
- **Per-frame palette quantization** — each frame gets its own 256-color palette via gifenc `quantize()`, not a global palette
- **Floyd-Steinberg dithering** — applied between `quantize()` and `applyPalette()` to reduce banding on gradients
- **Correct gifenc API** — `delay` in milliseconds (not centiseconds), `repeat: 0` for loop=true / `repeat: -1` for loop=false

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript: self.postMessage array transfer list incompatible with DOM types**
- **Found during:** Task 2 verification build
- **Issue:** `self.postMessage(msg, [bytes.buffer])` — second argument typed as `string` (URL) in DOM Window, not Transferable array
- **Fix:** Changed to options object form: `self.postMessage(msg, { transfer: [bytes.buffer] })`
- **Files modified:** `src/workers/gifWorker.ts`
- **Commit:** 4695e95

**2. [Rule 1 - Bug] TypeScript: Uint8Array<ArrayBufferLike> not assignable to BlobPart**
- **Found during:** Task 2 verification build
- **Issue:** `new Blob([e.data.bytes])` fails strict TS — `bytes.buffer` is `ArrayBufferLike` not `ArrayBuffer`
- **Fix:** Cast to `e.data.bytes.buffer as ArrayBuffer`
- **Files modified:** `src/components/ExportPanel.tsx`
- **Commit:** 4695e95

**3. [Rule 2 - Missing critical functionality] gifenc has no @types package**
- **Found during:** Task 1 TypeScript check
- **Issue:** `import { GIFEncoder, quantize, applyPalette } from 'gifenc'` — TS7016 implicit any
- **Fix:** Created `src/types/gifenc.d.ts` with full API type declarations based on package source
- **Files modified:** `src/types/gifenc.d.ts` (created)
- **Commit:** 4695e95

## Verification Results

- `npm run build` — passes, zero errors
- Worker chunk `gifWorker-DuFFcgp8.js` (9KB) appears in dist output
- `npx tsc --noEmit` — clean, zero errors
- gifenc `^1.0.3` present in `package.json` dependencies
- ExportPanel imports verified: `?worker` suffix, WorkerOutgoing types, renderTick

## Self-Check

All created files exist and commits are verified below.
