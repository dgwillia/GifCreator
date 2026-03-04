// src/types/frames.ts
// Discriminated union frame model — single source of truth for all frame types.
// TextFrame defined in Phase 1 to avoid rename refactor in Phase 3.

export interface ImageFrame {
  type: 'image';
  id: string;
  file: File;
  bitmap: ImageBitmap;
  name: string;
}

export interface TextFrame {
  type: 'text';
  id: string;
  text: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

export type Frame = ImageFrame | TextFrame;

export interface GifSettings {
  frameDurationMs: number;
  loop: boolean;
  outputWidth: number;        // Phase 2: default 800
  outputHeight: number;       // Phase 2: default 600
  transitionType: 'cut' | 'crossfade' | 'slide-left' | 'slide-right'; // Phase 3 widening from literal 'cut'
}

export const RESOLUTION_PRESETS = [
  { label: '1200 × 900',   width: 1200, height: 900  },
  { label: '800 × 600',    width: 800,  height: 600  },
  { label: '1:1 (1080)',   width: 1080, height: 1080 },
  { label: '16:9 (720p)',  width: 1280, height: 720  },
] as const;
