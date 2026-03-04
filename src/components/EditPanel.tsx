// src/components/EditPanel.tsx
// Appears when a frame is selected. Shows frame metadata and delete action.
// For TextFrame, shows text/color/font-size editing controls.
// Positioned as a fixed sidebar panel (right column) per research recommendation.

import { Trash2 } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';

export function EditPanel() {
  const { frames, selectedId, removeFrame, setSelectedId, updateTextFrame } = useFrameStore();
  const selectedFrame = frames.find((f) => f.id === selectedId);

  if (!selectedId || !selectedFrame) {
    return (
      <aside className="w-56 shrink-0 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <p className="text-gray-500 text-sm text-center mt-4">
          Select a frame to edit
        </p>
      </aside>
    );
  }

  const frameIndex = frames.findIndex((f) => f.id === selectedId);
  const frameNumber = frameIndex + 1;

  return (
    <aside className="w-56 shrink-0 rounded-xl border border-gray-700 bg-gray-900 p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-200">
          Frame {frameNumber}
        </h2>
        {selectedFrame.type === 'image' && (
          <p className="text-xs text-gray-500 mt-1 truncate" title={selectedFrame.name}>
            {selectedFrame.name}
          </p>
        )}
      </div>

      <div className="border-t border-gray-800 pt-4 flex flex-col gap-2">
        <button
          onClick={() => {
            removeFrame(selectedId);
            setSelectedId(null);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg
            bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white
            text-sm font-medium transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
          Delete Frame
        </button>
      </div>

      {selectedFrame.type === 'text' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Text</label>
            <textarea
              rows={3}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100
                focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              value={selectedFrame.text}
              onChange={(e) => updateTextFrame(selectedId!, { text: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedFrame.backgroundColor}
                onChange={(e) => updateTextFrame(selectedId!, { backgroundColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
              />
              <span className="text-xs text-gray-400 font-mono">{selectedFrame.backgroundColor}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Text Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedFrame.textColor}
                onChange={(e) => updateTextFrame(selectedId!, { textColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border border-gray-700 bg-transparent"
              />
              <span className="text-xs text-gray-400 font-mono">{selectedFrame.textColor}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Font Size</label>
            <input
              type="number"
              min={12}
              max={120}
              step={4}
              value={selectedFrame.fontSize}
              onChange={(e) => updateTextFrame(selectedId!, { fontSize: Number(e.target.value) })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100
                focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
