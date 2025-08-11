import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `new-field-${type}`,
    data: {
      type: 'NEW_FIELD',
      fieldType: type,
    },
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isDisabled ? listeners : {})}
      {...(!isDisabled ? attributes : {})}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md transition-all",
        isDisabled ? (
          "opacity-50 cursor-not-allowed"
        ) : (
          "cursor-move hover:bg-accent hover:text-accent-foreground"
        ),
        "border border-transparent",
        !isDisabled && "hover:border-border",
      )}
      title={isDisabled ? "Load a PDF first to add fields" : `Drag to add ${label} field`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{label}</span>
    </div>
  );
}