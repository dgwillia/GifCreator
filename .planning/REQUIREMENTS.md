# Requirements: GIF Creator

**Defined:** 2026-02-26
**Core Value:** A designer can go from a folder of screenshots to a shareable portfolio GIF in minutes — without touching external tools.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Frame Composition

- [ ] **COMP-01**: User can upload multiple images via drag-and-drop (PNG, JPG, WebP accepted)
- [ ] **COMP-02**: User can add title card frames with a custom solid background color and text
- [ ] **COMP-03**: User can reorder frames via drag-and-drop in the frame strip
- [ ] **COMP-04**: User can delete individual frames from the sequence

### Preview

- [ ] **PREV-01**: User can preview the animated GIF sequence with play and pause controls
- [ ] **PREV-02**: User can toggle loop on/off in the preview player

### Transitions

- [ ] **TRAN-01**: User can select cut (instant) transition between frames
- [ ] **TRAN-02**: User can select crossfade (alpha blend) transition between frames
- [ ] **TRAN-03**: User can select slide left or slide right transition between frames

### Timing

- [ ] **TIME-01**: User can set a global frame duration that applies to all frames
- [ ] **TIME-02**: User can toggle whether the exported GIF loops forever or plays once

### Export

- [ ] **EXPO-01**: User can select output resolution from presets: 1200×900, 800×600, 1:1 (1080×1080), 16:9 (1280×720)
- [ ] **EXPO-02**: User can export a high-quality GIF using per-frame color palette quantization and Floyd-Steinberg dithering
- [ ] **EXPO-03**: User can see export encoding progress while the GIF is being generated
- [ ] **EXPO-04**: User can see estimated file size before triggering export

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Timing

- **TIME-V2-01**: User can set per-frame duration (override global for individual frames)
- **TIME-V2-02**: User can set transition duration (how long crossfade/slide lasts)

### Transitions

- **TRAN-V2-01**: User can select additional transition types (wipe, zoom)

### Export

- **EXPO-V2-01**: User can enter custom output dimensions
- **EXPO-V2-02**: User can export with reverse playback (forward + reverse loop)

### Polish

- **POL-V2-01**: User can use keyboard shortcuts for common actions (reorder, delete, play/pause)
- **POL-V2-02**: User can view frame labels/notes in the strip

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Video input / screen recording | Different workflow and technical problem; ScreenToGif covers it |
| Text/sticker overlays on image frames | Meme territory; title cards cover the portfolio text use case cleanly |
| Filters and color effects | Not a designer workflow — bring polished screenshots to this tool |
| Editing existing GIFs | Different use case; creation-from-images only |
| Social sharing / GIPHY upload | Wrong audience and destination; portfolio site is a direct file upload |
| Account system / cloud storage | Massive complexity for no clear gain; local-first is right for this tool |
| Mobile browser support | Desktop-native screenshot workflow; DnD reordering is painful on mobile |
| Video export (MP4/WebM) | GIF only — the format constraint is part of the tool's identity |
| Undo/redo history | High complexity; sessions are short and frame ops are forgiving |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | Phase 1 | Pending |
| COMP-02 | Phase 3 | Pending |
| COMP-03 | Phase 1 | Pending |
| COMP-04 | Phase 1 | Pending |
| PREV-01 | Phase 1 | Pending |
| PREV-02 | Phase 1 | Pending |
| TRAN-01 | Phase 2 | Pending |
| TRAN-02 | Phase 3 | Pending |
| TRAN-03 | Phase 3 | Pending |
| TIME-01 | Phase 2 | Pending |
| TIME-02 | Phase 2 | Pending |
| EXPO-01 | Phase 2 | Pending |
| EXPO-02 | Phase 2 | Pending |
| EXPO-03 | Phase 2 | Pending |
| EXPO-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 after roadmap creation*
