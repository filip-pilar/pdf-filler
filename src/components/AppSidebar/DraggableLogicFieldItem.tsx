import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Workflow } from 'lucide-react';

interface LogicDragItem {
  type: 'NEW_LOGIC_FIELD';
}

export function DraggableLogicFieldItem() {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: 'new-logic-field',
    data: {
      type: 'NEW_LOGIC_FIELD',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md cursor-move transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        "border border-transparent hover:border-border",
        "bg-primary/5",
      )}
      title="Drag to create Logic field"
    >
      <Workflow className="h-4 w-4 flex-shrink-0 text-primary" />
      <span className="text-sm font-medium">Logic Field</span>
    </div>
  );
}