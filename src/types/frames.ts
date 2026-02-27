// src/types/frames.ts
// Discriminated union frame model — single source of truth for all frame types.
// TextFrame defined now to avoid rename refactor in Phase 3.

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
  // Phase 2 additions: outputWidth, outputHeight, transitionType
}
