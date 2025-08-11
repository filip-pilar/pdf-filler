import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField, OptionRenderType } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';
import { Type, Image, PenTool, RadioIcon } from 'lucide-react';

interface DraggableUnifiedFieldProps {
  field: UnifiedField;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
  optionKey?: string;
  isPreview?: boolean;
  renderType?: OptionRenderType;
  onDoubleClick?: () => void;
}

export function DraggableUnifiedField({
  field,
  scale,
  pageHeight,
  isSelected,
  optionKey,
  isPreview,
  renderType,
  onDoubleClick
}: DraggableUnifiedFieldProps) {
  const { deleteUnifiedField } = useFieldStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: field.id,
    data: {
      field,
      type: 'unified-field',
      scale,
      pageHeight,
      optionKey,
    }
  });

  // Note: We'll handle repositioning through a drop zone on the PDF overlay
  // This is just for initiating the drag

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm(`Delete field "${field.key}"?`)) {
      deleteUnifiedField(field.id);
    }
  };

  // Convert PDF coordinates (bottom-left origin) to screen coordinates (top-left origin)
  // Now field.position.y stores distance from PDF bottom to field's TOP edge
  const screenY = pageHeight - field.position.y;

  // Get appropriate icon for field type/variant
  const getFieldIcon = () => {
    // For checkboxes, show checkmark symbol instead of checkbox icon
    if (renderType === 'checkmark' || field.type === 'checkbox') {
      return <span className="text-base">✓</span>;
    }
    if (field.type === 'image') return <Image className="h-3 w-3" />;
    if (field.type === 'signature') return <PenTool className="h-3 w-3" />;
    if (field.variant === 'options') return <RadioIcon className="h-3 w-3" />;
    return <Type className="h-3 w-3" />;
  };

  // Get display value based on field type and structure
  const getDisplayValue = () => {
    // For option fields in preview mode
    if (optionKey && isPreview) {
      if (renderType === 'checkmark') {
        return '✓'; // Just checkmark, no box
      }
      if (renderType === 'custom' && field.sampleValue) {
        return field.sampleValue; // Custom text
      }
      return optionKey; // Show the option key
    }
    
    if (field.type === 'checkbox') {
      // Only show checkmark when checked, nothing when unchecked
      return field.sampleValue ? '✓' : '';
    }
    
    if (field.type === 'image') {
      return field.sampleValue ? '' : '[Image placeholder]';
    }
    
    if (field.type === 'signature') {
      return field.sampleValue ? '' : '[Signature placeholder]';
    }
    
    if (field.sampleValue !== undefined && field.sampleValue !== null) {
      const strValue = String(field.sampleValue);
      return strValue.length > 20 ? strValue.substring(0, 20) + '...' : strValue;
    }
    
    return field.key;
  };

  const displayValue = getDisplayValue();
  const isCheckbox = field.type === 'checkbox';
  const isEmptyCheckbox = isCheckbox && !field.sampleValue;
  const isImage = field.type === 'image';
  const isSignature = field.type === 'signature';
  const hasImageData = (isImage || isSignature) && field.sampleValue && typeof field.sampleValue === 'string' && field.sampleValue.startsWith('data:');
  
  // CRITICAL: Transform handles movement, opacity hides original
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1, // Hide original when dragging
    transition: 'opacity 0.15s', // Smooth fade
    left: field.position.x * scale,
    top: screenY * scale,
    width: (field.size?.width || 200) * scale,
    height: (field.size?.height || 30) * scale,
    fontSize: 12 * scale,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute border rounded cursor-move overflow-hidden",
        "hover:shadow-md hover:z-10",
        isSelected 
          ? "border-primary bg-primary/5 shadow-lg z-20" // Much more transparent
          : isEmptyCheckbox 
            ? "border-border/30 bg-transparent" // Very subtle for empty checkboxes
            : "border-border/50 bg-background/20", // Very transparent background
        isPreview && "border-dashed opacity-60",
        field.variant === 'options' && !isPreview && "border-dotted",
        // Remove ALL isDragging-based opacity/pointer-events changes
      )}
      onContextMenu={handleContextMenu}
      onDoubleClick={onDoubleClick}
      title={optionKey 
        ? `${field.key}: ${optionKey}${isPreview ? ' (preview)' : ''}` 
        : `${field.key} (${field.type}${field.variant !== 'single' ? ` - ${field.variant}` : ''})`}
    >
      {/* Render image/signature if available */}
      {hasImageData ? (
        <img 
          src={field.sampleValue as string}
          alt={field.type === 'signature' ? 'Signature' : 'Image'}
          className="w-full h-full object-contain"
          style={{ pointerEvents: 'none' }}
        />
      ) : (
        <div className="flex items-center gap-1 p-1 h-full">
          {(!isEmptyCheckbox || isSelected) && (
            <div className="flex-shrink-0 text-muted-foreground">
              {getFieldIcon()}
            </div>
          )}
          <div className={cn(
            "flex-1 truncate text-xs font-mono",
            isCheckbox && "text-center text-lg" // Larger checkmark
          )}>
            {displayValue}
          </div>
          {field.placementCount > 1 && !optionKey && (
            <div className="flex-shrink-0">
              <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                ×{field.placementCount}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}