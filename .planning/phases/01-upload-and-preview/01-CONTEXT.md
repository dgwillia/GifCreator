# Phase 1: Upload and Preview - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Upload screenshots (PNG, JPG, WebP), arrange them into an ordered frame sequence via drag-and-drop, and preview the animation with play/pause and loop toggle. No exporting in this phase — the output is a working animated preview in the browser.

Requirements: COMP-01, COMP-03, COMP-04, PREV-01, PREV-02

</domain>

<decisions>
## Implementation Decisions

### Frame Strip Layout
- **Grid layout**, not horizontal row or vertical list — frames arranged in a wrapped grid
- Thumbnails show image only (clean) — no persistent labels or badges on each frame
- Frame number shown on hover is acceptable; clean by default
- Selecting a frame: highlight border + show an edit panel (for delete and future edit actions)
- Deleting a frame: X button on each thumbnail (always-visible or hover-visible)
- Drag-to-reorder operates within the grid layout

### Claude's Discretion
- Thumbnail size within the grid (suggest ~160×110px)
- Edit panel position (sidebar or overlay below/beside the grid)
- Drop zone placement relative to the grid (above, separate section, or full-page on empty state)
- Loading/processing feedback when images are being decoded
- Empty state design (shown before any frames are added)
- Error handling for unsupported file types

</decisions>

<specifics>
## Specific Ideas

- Grid layout suggests a spatial, thumbnail-browser feel — closer to a contact sheet than a timeline
- The edit panel appears on frame selection, not permanently visible

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-upload-and-preview*
*Context gathered: 2026-02-26*
