---
phase: 03-title-cards-and-transitions
verified: 2026-03-04T14:30:00Z
status: human_needed
score: 13/13 must-haves verified
human_verification:
  - test: "Add a title card, edit its text and colors, confirm thumbnail and preview canvas update immediately"
    expected: "Dark-blue tile labeled 'Title Card' appears in frame strip; editing text and colors in EditPanel updates thumbnail background color and text in real-time; clicking Play renders the title card in the preview canvas with correct background and centered text"
    why_human: "Cannot programmatically verify CSS color rendering in the DOM thumbnail or canvas pixel output from renderTick's text path"
  - test: "Drag a title card thumbnail to a different position in the frame strip"
    expected: "Title card reorders without errors; preview reflects the new frame order"
    why_human: "dnd-kit drag interaction requires pointer events and DOM manipulation that cannot be simulated programmatically"
  - test: "Select Crossfade transition and click Play"
    expected: "Preview canvas shows a smooth alpha-blend between consecutive frames, not an instant cut"
    why_human: "Visual smoothness of animation cannot be verified by static code inspection; requires watching the canvas animate"
  - test: "Select Slide Left and Slide Right transitions and click Play for each"
    expected: "Slide Left shows frames sliding in from the right; Slide Right shows frames sliding in from the left — directional slide, not alpha fade"
    why_human: "Transition direction and visual correctness require watching the canvas animate"
  - test: "Export a GIF with transitions; open it in a browser"
    expected: "Progress bar appears during encoding; GIF downloads; exported GIF shows smooth transitions visually identical to the preview animation"
    why_human: "GIF binary output visual quality cannot be verified programmatically; file size estimate correctness requires confirming non-zero KB displayed in UI"
---

# Phase 3: Title Cards and Transitions Verification Report

**Phase Goal:** Users can add text title card frames and choose smooth transitions between frames, completing the portfolio-differentiating feature set
**Verified:** 2026-03-04T14:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GifSettings.transitionType accepts `'cut' \| 'crossfade' \| 'slide-left' \| 'slide-right'` without TypeScript errors | VERIFIED | `src/types/frames.ts` line 29; `npx tsc --noEmit` exits 0 |
| 2 | Store has addTextFrame and updateTextFrame actions that create and patch TextFrame entries | VERIFIED | Both declared in FrameStore interface (lines 21-22) and fully implemented (lines 73-91) in `useFrameStore.ts` |
| 3 | renderTick draws TextFrame with solid background fill and centered, newline-aware text scaled to output resolution | VERIFIED | `renderTick.ts` lines 44-65: fillRect background, scale by width/800, split('\n') for multi-line, centered via textAlign/textBaseline |
| 4 | renderTransitionTick composites two frames (crossfade via globalAlpha, slide via dx offset) and always resets globalAlpha to 1.0 | VERIFIED | `renderTransitionTick.ts` lines 35-58: crossfade resets at line 43, slide-left uses +offset, slide-right uses -offset |
| 5 | Shared scratch OffscreenCanvas is reused inside renderTransitionTick to avoid GC pressure | VERIFIED | Module-level `scratchCanvas` singleton at lines 13-22; resized only on dimension change |
| 6 | User can add a title card and it appears in the frame strip alongside image frames | VERIFIED (code path) | `App.tsx` lines 54-68: addTextFrame called via getState(); `FrameGrid.tsx` lines 70-74: renders TextFrameThumbnail for frame.type==='text'; HUMAN NEEDED for visual confirmation |
| 7 | When a title card is selected, EditPanel shows text, background color, text color, and font size controls | VERIFIED (code path) | `EditPanel.tsx` lines 54-107: textarea, background color picker, text color picker, font size input all guarded by `selectedFrame.type === 'text'`; HUMAN NEEDED for visual confirmation |
| 8 | Editing text or colors in EditPanel immediately updates the thumbnail | VERIFIED (code path) | Each control calls updateTextFrame on change; Zustand triggers re-render; HUMAN NEEDED for visual confirmation |
| 9 | Title cards can be dragged to reorder them in the frame strip | VERIFIED (code path) | TextFrameThumbnail uses useSortable identical to FrameThumbnail; FrameGrid drives SortableContext from full frames array; HUMAN NEEDED for drag interaction |
| 10 | Preview player animates transitions via expanded frame sequence | VERIFIED | `PreviewPlayer.tsx` lines 43-87: expandedSequenceRef rebuilt on frames/transitionType change; tick at lines 97-118 runs sequence[frameIndexRef.current].render(ctx) |
| 11 | ExportPanel transition selector shows cut, crossfade, slide-left, slide-right options | VERIFIED | `ExportPanel.tsx` lines 213-217: four `<option>` elements present |
| 12 | Export pipeline generates 4 intermediate frames per consecutive pair when transitionType is not 'cut' | VERIFIED | `ExportPanel.tsx` lines 81-88: TRANSITION_FRAMES=4, loop inserts renderTransitionTick frames; per-frame delay array passed to worker |
| 13 | File size estimate accounts for transition intermediate frames | VERIFIED | `ExportPanel.tsx` lines 133-137: encodedFrameCount = frames.length + (frames.length-1)*TRANSITION_FRAMES when not 'cut' |

**Score:** 13/13 truths verified (5 additionally require human visual confirmation)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/frames.ts` | Widened GifSettings.transitionType union | VERIFIED | Contains `'cut' \| 'crossfade' \| 'slide-left' \| 'slide-right'` at line 29 |
| `src/store/useFrameStore.ts` | addTextFrame and updateTextFrame actions | VERIFIED | Both in interface (lines 21-22) and implemented (lines 73-91); imports TextFrame |
| `src/renderer/renderTick.ts` | TextFrame rendering branch | VERIFIED | `if (frame.type === 'text')` at line 44; full background+text implementation lines 44-65 |
| `src/renderer/renderTransitionTick.ts` | Two-frame compositing; exports renderTransitionTick | VERIFIED | Exports function at line 24; crossfade, slide-left, slide-right branches; shared scratch canvas |
| `src/components/TextFrameThumbnail.tsx` | CSS-based title card thumbnail with sortable drag support | VERIFIED | useSortable pattern, CSS.Transform, isDragging, background/textColor preview div, X delete button |
| `src/components/FrameGrid.tsx` | Mixed-type frame strip (ImageFrame + TextFrame) | VERIFIED | Uses all frames (not filtered), imports TextFrameThumbnail, conditional render at lines 71-74 |
| `src/components/EditPanel.tsx` | Text frame editing controls | VERIFIED | textarea, two color pickers, font size input; all call updateTextFrame on change |
| `src/App.tsx` | 'Add Title Card' button in left sidebar | VERIFIED | Button at lines 54-68 calls addTextFrame and synchronously reads new frame ID to select it |
| `src/components/PreviewPlayer.tsx` | Expanded sequence animation using renderTransitionTick | VERIFIED | expandedSequenceRef, useEffect rebuilds on frames/transitionType/frameDurationMs change, tick uses sequence |
| `src/components/ExportPanel.tsx` | Transition frame expansion + transition selector + corrected file size estimate | VERIFIED | TRANSITION_FRAMES constant, handleExport loop, four option elements, encodedFrameCount calculation |
| `src/workers/gifWorker.ts` | Per-frame delay array support (fix from 03-04) | VERIFIED | `frameDelays?.[i] ?? frameDurationMs` at line 50; WorkerIncoming accepts optional frameDelays |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/types/frames.ts` | `src/store/useFrameStore.ts` | GifSettings type import | WIRED | `import type { Frame, GifSettings, TextFrame }` at line 7 of store |
| `src/renderer/renderTransitionTick.ts` | `src/renderer/renderTick.ts` | import renderTick | WIRED | `import { renderTick } from './renderTick'` at line 9 |
| `src/App.tsx` | `src/store/useFrameStore.ts` | addTextFrame + setSelectedId via getState() | WIRED | `useFrameStore.getState()` called in onClick handler; addTextFrame invoked at line 57 |
| `src/components/EditPanel.tsx` | `src/store/useFrameStore.ts` | updateTextFrame action | WIRED | Destructured at line 10; called in four onChange handlers (lines 63, 73, 86, 101) |
| `src/components/FrameGrid.tsx` | `src/components/TextFrameThumbnail.tsx` | conditional render for frame.type === 'text' | WIRED | Import at line 26; rendered at line 73 |
| `src/components/PreviewPlayer.tsx` | `src/renderer/renderTransitionTick.ts` | import and call in expanded sequence | WIRED | Import at line 19; called at line 78 inside expandedSequenceRef rebuild |
| `src/components/ExportPanel.tsx` | `src/renderer/renderTransitionTick.ts` | transition frame generation in handleExport loop | WIRED | Import at line 14; called at line 84 inside handleExport loop |
| `src/components/ExportPanel.tsx` | `src/workers/gifWorker.ts` | frameDelays array passed with transition timing | WIRED | frameDelays array built at lines 68-88; passed in postMessage at line 126 |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COMP-02 | 03-01, 03-02, 03-04 | User can add title card frames with custom solid background color and text | SATISFIED | TextFrame type, addTextFrame store action, TextFrameThumbnail, EditPanel controls all present and wired |
| TRAN-02 | 03-01, 03-03, 03-04 | User can select crossfade (alpha blend) transition between frames | SATISFIED | renderTransitionTick crossfade branch, expandedSequenceRef in PreviewPlayer, handleExport loop in ExportPanel |
| TRAN-03 | 03-01, 03-03, 03-04 | User can select slide left or slide right transition between frames | SATISFIED | renderTransitionTick slide-left/slide-right branches, four options in ExportPanel selector, sequence expansion in PreviewPlayer |

All three Phase 3 requirements (COMP-02, TRAN-02, TRAN-03) claimed across plans 03-01 through 03-04 are accounted for. No orphaned requirements from REQUIREMENTS.md for Phase 3.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/renderer/renderTick.ts` | 69 | `void progress;` suppression | Info | Intentional — progress parameter retained in signature for caller compatibility; documented in comment |

No blockers or warnings found. The `void progress;` pattern is intentional and documented — the progress parameter exists in renderTick's signature because it was part of the original API contract used by renderTransitionTick callers; retaining it avoids a signature breaking change.

### Human Verification Required

Phase 03-04 documents that a human completed 7 visual verification checks on 2026-03-04 and confirmed all passed. The following checks need a human to re-confirm if this verification is being performed independently:

#### 1. Title Card Creation and Editing

**Test:** Upload 2-3 image files. Click "Add Title Card" in the left sidebar. Type text in the EditPanel textarea. Change background and text colors.
**Expected:** A dark-blue tile labeled "Title Card" appears in the frame strip. Thumbnail updates text and background color immediately as you type/change colors. Clicking Play shows the title card rendered in the preview canvas with the correct background and centered text.
**Why human:** CSS color rendering in DOM and canvas pixel output from the text rendering path cannot be verified programmatically.

#### 2. Title Card Drag Reordering

**Test:** Drag a title card thumbnail to a different position among image frames in the strip.
**Expected:** The title card reorders within the strip without errors; preview reflects the new order immediately.
**Why human:** dnd-kit pointer events require real user interaction; sortable behavior cannot be verified from static analysis.

#### 3. Crossfade Transition Animation

**Test:** In Export Settings, change Transition to "Crossfade". Click Play.
**Expected:** The preview canvas shows a smooth alpha-blend between frames — visible intermediate opacity frames between cuts, not instant transitions.
**Why human:** Visual smoothness requires watching the canvas animate; static analysis confirms the code path but not the rendered output.

#### 4. Slide Left and Slide Right Transitions

**Test:** Change Transition to "Slide Left" and click Play. Then change to "Slide Right" and click Play.
**Expected:** Slide Left shows the incoming frame sliding in from the right. Slide Right shows the incoming frame sliding in from the left. Directional slide animation, not alpha fade.
**Why human:** Direction and visual quality of slide animation require watching the canvas; the offset sign difference between slide-left (+offset) and slide-right (-offset) is coded correctly but visual result needs human confirmation.

#### 5. Export with Transitions and Preview-Matches-Export

**Test:** Set Transition to "Crossfade". Confirm file size estimate is > 0 KB. Click Export GIF. Open downloaded GIF in a browser.
**Expected:** Progress bar appears during encoding. GIF downloads successfully. Exported GIF shows smooth crossfade transitions visually identical to the canvas preview animation. (The 03-04 SUMMARY confirms the per-frame delay fix ensures preview-matches-export timing.)
**Why human:** GIF binary output visual quality cannot be verified programmatically; preview-matches-export identity requires comparing two animated outputs.

### Gaps Summary

No gaps. All automated checks pass:

- TypeScript type checking exits 0 (`npx tsc --noEmit` clean)
- Production build succeeds (Vite outputs 329KB bundle + 9KB worker)
- All 11 artifacts exist and are substantive (no stubs, no empty implementations)
- All 8 key links verified wired (imports exist AND are used in non-trivial call sites)
- All 3 requirements (COMP-02, TRAN-02, TRAN-03) have complete implementation evidence
- Per-frame delay fix from 03-04 is present in gifWorker.ts and gifWorker.types.ts
- No anti-patterns blocking goal achievement

The status is `human_needed` because 5 of the 13 truths involve visual/interactive behavior (color rendering, drag interaction, animation smoothness, exported GIF quality) that requires human verification. The 03-04 SUMMARY documents that a human already completed 7 visual checks on 2026-03-04 and confirmed all passed. If that human sign-off is accepted, the phase goal is fully achieved.

---

_Verified: 2026-03-04T14:30:00Z_
_Verifier: Claude (gsd-verifier)_
