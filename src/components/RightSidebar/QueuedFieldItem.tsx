import { useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Type, CheckSquare, Image, PenTool, List, Braces, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';

interface QueuedFieldItemProps {
  field: UnifiedField;
}

export function QueuedFieldItem({ field }: QueuedFieldItemProps) {
  const { removeFromQueue } = useFieldStore();
  const dragRef = useRef<HTMLDivElement>(null);
  
  // Set up drag
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'QUEUED_FIELD',
    item: { field },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Connect drag to ref
  useEffect(() => {
    if (dragRef.current) {
      drag(dragRef.current);
    }
  }, [drag]);

  // Get appropriate icon for field type
  const getFieldIcon = () => {
    if (field.type === 'composite-text') return Braces;
    if (field.variant === 'options') {
      if (field.renderType === 'checkmark' || field.type === 'checkbox') return CheckSquare;
      return List;
    }
    if (field.type === 'checkbox') return CheckSquare;
    if (field.type === 'image') return Image;
    if (field.type === 'signature') return PenTool;
    return Type;
  };

  // Get field type label
  const getFieldTypeLabel = () => {
    if (field.type === 'composite-text') return 'Composite';
    if (field.variant === 'options') return 'Options';
    return field.type.charAt(0).toUpperCase() + field.type.slice(1);
  };

  const Icon = getFieldIcon();

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Remove "${field.key}" from queue?`)) {
      removeFromQueue(field.id);
    }
  };

  return (
    <div
      ref={dragRef}
      className={cn(
        "group relative flex items-center gap-2 p-2 rounded-md border bg-card",
        "hover:bg-accent hover:border-accent-foreground/20 transition-all",
        "cursor-move select-none",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      {/* Field icon */}
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      
      {/* Field info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono truncate">{field.key}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {getFieldTypeLabel()}
          </Badge>
          {field.variant === 'options' && field.optionMappings && (
            <Badge variant="secondary" className="text-[10px] px-1 py-0">
              {field.optionMappings.length} options
            </Badge>
          )}
        </div>
      </div>
      
      {/* Remove button */}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleRemove}
        title="Remove from queue"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}