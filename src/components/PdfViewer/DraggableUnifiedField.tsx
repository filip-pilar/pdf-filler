import { useDrag } from 'react-dnd';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';
import { Type, CheckSquare, Image, PenTool, List, Hash } from 'lucide-react';

interface DraggableUnifiedFieldProps {
  field: UnifiedField;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
}

export function DraggableUnifiedField({
  field,
  scale,
  pageHeight,
  isSelected
}: DraggableUnifiedFieldProps) {
  const { updateUnifiedField, deleteUnifiedField } = useFieldStore();

  const [{ isDragging }, drag] = useDrag({
    type: 'unified-field',
    item: { 
      id: field.id,
      type: 'unified-field'
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    updateUnifiedField(field.id, {
      position: { x, y }
    });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm(`Delete field "${field.key}"?`)) {
      deleteUnifiedField(field.id);
    }
  };

  // Convert PDF coordinates (bottom-left origin) to screen coordinates (top-left origin)
  const screenY = pageHeight - field.position.y - (field.size?.height || 30);

  // Get appropriate icon for field type/variant
  const getFieldIcon = () => {
    if (field.type === 'checkbox') return <CheckSquare className="h-3 w-3" />;
    if (field.type === 'image') return <Image className="h-3 w-3" />;
    if (field.type === 'signature') return <PenTool className="h-3 w-3" />;
    if (field.variant === 'text-list') return <List className="h-3 w-3" />;
    if (field.variant === 'text-multi') return <Hash className="h-3 w-3" />;
    return <Type className="h-3 w-3" />;
  };

  // Get display value based on field type and structure
  const getDisplayValue = () => {
    if (field.type === 'checkbox') {
      return field.sampleValue ? '☑' : '☐';
    }
    
    if (field.type === 'image' || field.type === 'signature') {
      return `[${field.type}]`;
    }
    
    if (field.variant === 'text-list' && field.options) {
      return field.options.slice(0, 3).join(', ') + (field.options.length > 3 ? '...' : '');
    }
    
    if (field.sampleValue !== undefined && field.sampleValue !== null) {
      const strValue = String(field.sampleValue);
      return strValue.length > 20 ? strValue.substring(0, 20) + '...' : strValue;
    }
    
    return field.key;
  };

  return (
    <div
      ref={drag}
      className={cn(
        "absolute border rounded cursor-move transition-all",
        "hover:shadow-md hover:z-10",
        isSelected 
          ? "border-primary bg-primary/10 shadow-lg z-20" 
          : "border-border bg-background/90",
        isDragging && "opacity-50",
        field.variant === 'text-multi' && "border-dashed",
        field.variant === 'checkbox-multi' && "border-dotted"
      )}
      style={{
        left: field.position.x * scale,
        top: screenY * scale,
        width: (field.size?.width || 200) * scale,
        height: (field.size?.height || 30) * scale,
        fontSize: 12 * scale,
      }}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onContextMenu={handleContextMenu}
      title={`${field.key} (${field.type}${field.variant !== 'single' ? ` - ${field.variant}` : ''})`}
    >
      <div className="flex items-center gap-1 p-1 h-full">
        <div className="flex-shrink-0 text-muted-foreground">
          {getFieldIcon()}
        </div>
        <div className="flex-1 truncate text-xs font-mono">
          {getDisplayValue()}
        </div>
        {field.placementCount > 1 && (
          <div className="flex-shrink-0">
            <span className="text-xs bg-primary/20 text-primary px-1 rounded">
              ×{field.placementCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}