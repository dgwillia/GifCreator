// src/App.tsx
// Root app layout. Two states:
// 1. Empty state: full-page centered drop zone (no frames yet)
// 2. Populated state: left column (grid + drop zone) + center (preview) + right (edit panel)
//
// Layout per research recommendation:
// - Drop zone: full-page on empty, small "Add more" strip above grid when frames exist
// - Edit panel: fixed right sidebar (avoids layout reflow on selection)
// - Preview player: center/main column

import { useFrameStore } from './store/useFrameStore';
import { DropZone } from './components/DropZone';
import { FrameGrid } from './components/FrameGrid';
import { PreviewPlayer } from './components/PreviewPlayer';
import { EditPanel } from './components/EditPanel';
import { ExportPanel } from './components/ExportPanel';

export function App() {
  const frames = useFrameStore((s) => s.frames);
  const isEmpty = frames.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-100">
            GIF Creator
          </h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            Upload screenshots to build an animated portfolio GIF
          </p>
          <DropZone />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-gray-100">GIF Creator</h1>
        <span className="text-gray-500 text-sm">
          {frames.length} {frames.length === 1 ? 'frame' : 'frames'}
        </span>
      </header>

      {/* Main layout: frame strip left, preview center, edit panel right */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: frame grid + add more */}
        <div className="w-80 shrink-0 border-r border-gray-800 flex flex-col overflow-y-auto p-4 gap-4">
          <DropZone />
          <FrameGrid />
        </div>

        {/* Center: preview player */}
        <main className="flex-1 flex items-center justify-center p-6 overflow-auto">
          <PreviewPlayer />
        </main>

        {/* Right: edit panel + export settings */}
        <div className="shrink-0 border-l border-gray-800 p-4 flex flex-col gap-6 overflow-y-auto">
          <EditPanel />
          <div className="border-t border-gray-800" />
          <ExportPanel />
        </div>
      </div>
    </div>
  );
}
