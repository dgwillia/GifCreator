# GIF Creator

A browser-based tool for designers to turn screenshots of their work into high-quality, portfolio-ready GIFs — no installs, no external tools.

## What It Does

Upload a folder of screenshots, arrange the frames, configure timing and transitions, and export a polished GIF ready to embed in a portfolio site.

## Features

- **Upload & arrange** — drag and drop images, reorder frames freely
- **Live preview** — play back your sequence before exporting
- **Export settings** — choose output resolution from fixed presets, set frame duration, loop control
- **High-quality output** — client-side GIF encoding with Floyd-Steinberg dithering via [gifenc](https://github.com/mattdesl/gifenc)

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand (state management)
- dnd-kit (drag and drop)
- gifenc (GIF encoding via Web Worker)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Roadmap

- [x] Phase 1 — Upload and preview
- [x] Phase 2 — Export and settings
- [ ] Phase 3 — Title cards and transitions
