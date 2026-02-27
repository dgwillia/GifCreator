// src/components/FrameThumbnail.tsx
// Sortable frame item. Uses useSortable from @dnd-kit/sortable.
// Canvas thumbnail uses letterbox draw (scale+offset) to avoid distortion (Pitfall 6).

import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X } from 'lucide-react';
import { useFrameStore } from '../store/useFrameStore';
import type { ImageFrame } from '../types/frames';

interface Props {
  frame: ImageFrame;
}

export function FrameThumbnail({ frame }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: frame.id });

  const { removeFrame, setSelectedId, selectedId } = useFrameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSelected = selectedId === frame.id;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: bw, height: bh } = frame.bitmap;
    const { width: cw, height: ch } = canvas;
    // Letterbox: maintain aspect ratio, fill gaps with dark background
    const scale = Math.min(cw / bw, ch / bh);
    const dx = Math.round((cw - bw * scale) / 2);
    const dy = Math.round((ch - bh * scale) / 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(frame.bitmap, dx, dy, Math.round(bw * scale), Math.round(bh * scale));
  }, [frame.bitmap]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setSelectedId(isSelected ? null : frame.id)}
      className={[
        'relative group cursor-grab active:cursor-grabbing rounded-md overflow-hidden border-2 transition-colors',
        isSelected
          ? 'border-blue-500'
          : 'border-transparent hover:border-gray-600',
      ].join(' ')}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={110}
        className="w-full h-auto block"
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          removeFrame(frame.id);
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity
          bg-black/60 hover:bg-red-600 text-white rounded-full p-0.5 cursor-pointer"
        aria-label={`Delete frame ${frame.name}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
