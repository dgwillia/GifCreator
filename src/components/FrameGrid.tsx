// src/components/FrameGrid.tsx
// DnD-kit SortableContext grid container.
// CRITICAL: Drive SortableContext items directly from Zustand store — never from local state.
// This prevents frame reorder state desync (Pitfall 2 from research).

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useFrameStore } from '../store/useFrameStore';
import { FrameThumbnail } from './FrameThumbnail';
import { FrameThumbnailGhost } from './FrameThumbnailGhost';
import { TextFrameThumbnail } from './TextFrameThumbnail';

export function FrameGrid() {
  const { frames, reorderFrames } = useFrameStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require 5px movement before drag starts to distinguish click from drag
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Synchronous store update — prevents order desync between DnD and Zustand
      reorderFrames(active.id as string, over.id as string);
    }
    setActiveId(null);
  }

  const frameIds = frames.map((f) => f.id);

  if (frames.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={frameIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {frames.map((frame) =>
            frame.type === 'image'
              ? <FrameThumbnail key={frame.id} frame={frame} />
              : <TextFrameThumbnail key={frame.id} frame={frame} />
          )}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? <FrameThumbnailGhost id={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
