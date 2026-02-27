// src/store/useFrameStore.ts
// Zustand v5 store — single source of truth for frame array and settings.
// All mutations go through store actions. No local state for frames in components.

import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import type { Frame, GifSettings } from '../types/frames';

interface FrameStore {
  frames: Frame[];
  settings: GifSettings;
  selectedId: string | null;
  addFrames: (frames: Frame[]) => void;
  removeFrame: (id: string) => void;
  reorderFrames: (activeId: string, overId: string) => void;
  setSelectedId: (id: string | null) => void;
  toggleLoop: () => void;
}

export const useFrameStore = create<FrameStore>((set) => ({
  frames: [],
  selectedId: null,
  settings: {
    frameDurationMs: 800,
    loop: true,
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
}));
