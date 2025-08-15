import { useDrag } from 'react-dnd';
import { useFieldStore } from '@/store/fieldStore';
import type { FieldType } from '@/types/field.types';
import { cn } from '@/lib/utils';

interface DraggableFieldItemProps {
  type: FieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DragItem {
  type: 'NEW_FIELD';
  fieldType: FieldType;
}

export function DraggableFieldItem({ type, label, icon: Icon }: DraggableFieldItemProps) {
  const { pdfUrl } = useFieldStore();
  const isDisabled = !pdfUrl;

  const [{ isDragging }, drag] = useDrag({
    type: 'NEW_FIELD',
    item: {
      type: 'NEW_FIELD',
      fieldType: type,
    },
    canDrag: !isDisabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag as unknown as React.RefObject<HTMLDivElement>}
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
      title={isDisabled ? "Load a PDF first to add fields" : `Drag to add ${label} field`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </div>
  );
}