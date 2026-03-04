// src/store/useFrameStore.ts
// Zustand v5 store — single source of truth for frame array and settings.
// All mutations go through store actions. No local state for frames in components.

import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { Frame, GifSettings, TextFrame } from '../types/frames';

interface FrameStore {
  frames: Frame[];
  settings: GifSettings;
  selectedId: string | null;
  exportProgress: number | null;   // null = idle, 0–100 = encoding in progress
  addFrames: (frames: Frame[]) => void;
  removeFrame: (id: string) => void;
  reorderFrames: (activeId: string, overId: string) => void;
  setSelectedId: (id: string | null) => void;
  toggleLoop: () => void;
  updateSettings: (patch: Partial<GifSettings>) => void;
  setExportProgress: (v: number | null) => void;
  addTextFrame: (text: string, backgroundColor: string, textColor: string, fontSize: number) => void;
  updateTextFrame: (id: string, patch: Partial<Pick<TextFrame, 'text' | 'backgroundColor' | 'textColor' | 'fontSize'>>) => void;
}

export const useFrameStore = create<FrameStore>((set) => ({
  frames: [],
  selectedId: null,
  exportProgress: null,
  settings: {
    frameDurationMs: 800,
    loop: true,
    outputWidth: 800,
    outputHeight: 600,
    transitionType: 'cut' as GifSettings['transitionType'],
  },

  addFrames: (newFrames) =>
    set((state) => ({ frames: [...state.frames, ...newFrames] })),

  removeFrame: (id) =>
    set((state) => {
      const target = state.frames.find((f) => f.id === id);
      // Free GPU memory immediately when an ImageFrame is deleted (Pitfall 3)
      if (target?.type === 'image') {
        target.bitmap.close();
      }
      return {
        frames: state.frames.filter((f) => f.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      };
    }),

  reorderFrames: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.frames.findIndex((f) => f.id === activeId);
      const newIndex = state.frames.findIndex((f) => f.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;
      return { frames: arrayMove(state.frames, oldIndex, newIndex) };
    }),

  setSelectedId: (id) => set({ selectedId: id }),

  toggleLoop: () =>
    set((state) => ({
      settings: { ...state.settings, loop: !state.settings.loop },
    })),

  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  setExportProgress: (v) => set({ exportProgress: v }),

  addTextFrame: (text, backgroundColor, textColor, fontSize) =>
    set((state) => {
      const frame: TextFrame = {
        type: 'text' as const,
        id: crypto.randomUUID(),
        text,
        backgroundColor,
        textColor,
        fontSize,
      };
      return { frames: [...state.frames, frame] };
    }),

  updateTextFrame: (id, patch) =>
    set((state) => ({
      frames: state.frames.map((f) =>
        f.type === 'text' && f.id === id ? { ...f, ...patch } : f,
      ),
    })),
}));
