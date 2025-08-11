import { useDrag } from 'react-dnd';
import { useFieldStore } from '@/store/fieldStore';
import { cn } from '@/lib/utils';
import { GitBranch } from 'lucide-react';

export function DraggableLogicFieldItem() {
  const { pdfUrl } = useFieldStore();
  const isDisabled = !pdfUrl;

  const [{ isDragging }, drag] = useDrag({
    type: 'NEW_LOGIC_FIELD',
    item: {
      type: 'NEW_LOGIC_FIELD',
    },
    canDrag: !isDisabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
        isDisabled ? (
          "opacity-50 cursor-not-allowed"
        ) : (
          "cursor-move hover:bg-accent hover:text-accent-foreground"
        ),
        "border border-transparent",
        !isDisabled && "hover:border-border",
        isDragging && "opacity-50",
      )}
      title={isDisabled ? "Load a PDF first to add fields" : "Drag to add logic field"}
    >
      <GitBranch className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">Logic Field</span>
    </div>
  );
}