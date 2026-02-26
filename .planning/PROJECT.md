# GIF Creator

## What This Is

A web-based GIF creator for designers to turn screenshots of their work into high-quality, portfolio-ready GIFs. Users upload images, arrange frames, add title cards, configure transitions, and export a polished GIF at a fixed preset resolution.

## Core Value

A designer can go from a folder of screenshots to a shareable portfolio GIF in minutes — without touching external tools.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can upload multiple screenshots and arrange them into a frame sequence
- [ ] User can add title card frames (solid background color + custom text)
- [ ] User can choose transition type between frames (cut, crossfade, slide, etc.)
- [ ] User can set global frame duration and transition duration
- [ ] User can choose output resolution from fixed presets (e.g. 1200×800, 800×600)
- [ ] User can export a high-quality GIF ready for portfolio site embedding

### Out of Scope

- Per-frame duration control — global speed is sufficient for v1
- Audio — GIF format doesn't support it
- Video export — GIF only for v1
- Cloud storage / account system — local, session-based tool
- Mobile — desktop browser only for v1

## Context

- Built for a designer to showcase their own design work in a portfolio site
- Screenshots are the primary input — likely high-res UI/UX work
- Output destination is a personal portfolio site (embedded GIF)
- Quality matters: artifacts, dithering, and color banding are failure modes
- The tool is for personal use initially, but clean enough for other designers to use

## Constraints

- **Platform**: Web app (browser-based) — no install required
- **Output format**: GIF only — the target format for portfolio embedding
- **Output resolution**: Fixed presets — user selects from predefined sizes rather than entering custom dimensions
- **Processing**: Client-side preferred — no server needed for simple use case, but server-side acceptable if needed for quality

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over desktop | No install, immediately shareable tool | — Pending |
| Fixed output presets | Simpler UX than custom dimensions; covers common portfolio sizes | — Pending |
| Global frame timing | Reduces complexity; consistent pacing looks cleaner in portfolios | — Pending |
| Client-side vs server-side GIF generation | TBD based on quality research | — Pending |

---
*Last updated: 2026-02-26 after initialization*
