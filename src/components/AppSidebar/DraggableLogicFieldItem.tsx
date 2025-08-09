import { useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { cn } from '@/lib/utils';
import { Workflow } from 'lucide-react';

interface LogicDragItem {
  type: 'NEW_LOGIC_FIELD';
}

export function DraggableLogicFieldItem() {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'NEW_LOGIC_FIELD',
    item: { type: 'NEW_LOGIC_FIELD' } as LogicDragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md cursor-move transition-all",
        "hover:bg-accent hover:text-accent-foreground",
        "border border-transparent hover:border-border",
        "bg-primary/5",
        isDragging && "opacity-0"
      )}
      title="Drag to create Logic field"
    >
      <Workflow className="h-4 w-4 flex-shrink-0 text-primary" />
      <span className="text-sm font-medium">Logic Field</span>
      {isDragging && (
        <span className="ml-auto text-xs text-muted-foreground">Drop to create</span>
      )}
    </div>
  );
}