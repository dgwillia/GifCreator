// src/components/FrameThumbnailGhost.tsx
// PRESENTATIONAL ONLY — rendered inside DragOverlay.
// Must NOT call useSortable() — would cause ID collision with the real sortable item.

import { useEffect, useRef } from 'react';
import { useFrameStore } from '../store/useFrameStore';
import type { ImageFrame } from '../types/frames';

interface Props {
  id: string;
}

export function FrameThumbnailGhost({ id }: Props) {
  const frame = useFrameStore((s) =>
    s.frames.find((f) => f.id === id),
  ) as ImageFrame | undefined;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!frame || frame.type !== 'image') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: bw, height: bh } = frame.bitmap;
    const { width: cw, height: ch } = canvas;
    const scale = Math.min(cw / bw, ch / bh);
    const dx = Math.round((cw - bw * scale) / 2);
    const dy = Math.round((ch - bh * scale) / 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(frame.bitmap, dx, dy, Math.round(bw * scale), Math.round(bh * scale));
  }, [frame]);

  if (!frame) return null;

  return (
    <div className="rounded-md overflow-hidden border-2 border-blue-400 shadow-2xl opacity-90">
      <canvas ref={canvasRef} width={160} height={110} className="w-full h-auto block" />
    </div>
  );
}
