// src/components/TextFrameThumbnail.tsx
// CSS-based title card thumbnail for the frame strip.
// Uses same dnd-kit useSortable pattern as FrameThumbnail for consistent drag behavior.

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import type { TextFrame } from '../types/frames';

interface Props {
  frame: TextFrame;
}

export function TextFrameThumbnail({ frame }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: frame.id });

  const { removeFrame, setSelectedId, selectedId } = useFrameStore();
  const isSelected = selectedId === frame.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedId(isSelected ? null : frame.id)}
      className={[
        'relative group cursor-grab active:cursor-grabbing rounded-md overflow-hidden border-2 transition-colors',
        isSelected ? 'border-blue-500' : 'border-transparent hover:border-gray-600',
      ].join(' ')}
    >
      {/* Preview area: fixed size matching FrameThumbnail canvas (160×110) */}
      <div
        className="w-40 h-[110px] flex items-center justify-center text-center p-2"
        style={{ backgroundColor: frame.backgroundColor, color: frame.textColor }}
      >
        <span className="text-sm font-bold leading-tight line-clamp-3 break-words">
          {frame.text || 'Title Card'}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); removeFrame(frame.id); }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer"
        aria-label="Delete title card"
      >
        <X size={14} />
      </button>
    </div>
  );
}
