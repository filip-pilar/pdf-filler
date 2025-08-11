import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import type { UnifiedField, OptionRenderType } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';
import { Type, Image, PenTool, RadioIcon, CheckSquare } from 'lucide-react';
import 'react-resizable/css/styles.css';

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
  const { updateUnifiedField, deleteUnifiedField } = useFieldStore();
  const { snapPosition, snapSize, gridSize, isEnabled } = useGridSnap(pageHeight);
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [resizingSize, setResizingSize] = useState<{ width: number; height: number } | null>(null);

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
    if (renderType === 'checkmark' || field.type === 'checkbox') {
      return <CheckSquare className="h-3 w-3" />;
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
        return '✓';
      }
      if (renderType === 'custom' && field.sampleValue) {
        return field.sampleValue;
      }
      return optionKey;
    }
    
    if (field.type === 'checkbox') {
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
  
  // Handle drag stop - update position in store
  const handleDragStop = (_e: any, data: any) => {
    setIsDragging(false);
    
    // Convert screen coordinates back to PDF coordinates
    const newX = data.x / scale;
    const newScreenY = data.y / scale;
    const newPdfY = pageHeight - newScreenY;
    
    // Apply grid snapping
    const snapped = isEnabled 
      ? snapPosition({ x: newX, y: newPdfY })
      : { x: newX, y: newPdfY };
    
    // Update field position
    if (optionKey && field.optionMappings) {
      // Update specific option mapping position
      const updatedMappings = field.optionMappings.map(m => 
        m.key === optionKey 
          ? { ...m, position: snapped }
          : m
      );
      updateUnifiedField(field.id, {
        optionMappings: updatedMappings
      });
    } else {
      // Update main field position
      updateUnifiedField(field.id, {
        position: snapped
      });
    }
  };

  // Handle resize stop - update size in store
  const handleResizeStop = (_e: any, _direction: any, ref: any) => {
    const newWidth = ref.offsetWidth / scale;
    const newHeight = ref.offsetHeight / scale;
    
    // Apply grid snapping to size
    const snappedSize = isEnabled 
      ? snapSize({ width: newWidth, height: newHeight })
      : { width: newWidth, height: newHeight };
    
    updateUnifiedField(field.id, {
      size: snappedSize
    });
    
    setResizingSize(null);
  };

  // Calculate position and size with scale
  const scaledX = field.position.x * scale;
  const scaledY = screenY * scale;
  const scaledWidth = (field.size?.width || 200) * scale;
  const scaledHeight = (field.size?.height || 30) * scale;

  // Determine if field should be resizable
  const isResizable = !isCheckbox && !isPreview && !optionKey;

  const fieldContent = (
    <div
      ref={nodeRef}
      className={cn(
        "border rounded cursor-move overflow-hidden transition-shadow",
        "hover:shadow-md hover:z-10",
        isSelected 
          ? "border-primary bg-primary/5 shadow-lg z-20"
          : isEmptyCheckbox 
            ? "border-border/30 bg-transparent"
            : "border-border/50 bg-background/20",
        isPreview && "border-dashed opacity-60",
        field.variant === 'options' && !isPreview && "border-dotted",
        isDragging && "opacity-50 cursor-grabbing",
        isHovered && !isDragging && "shadow-lg"
      )}
      onContextMenu={handleContextMenu}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={optionKey 
        ? `${field.key}: ${optionKey}${isPreview ? ' (preview)' : ''}` 
        : `${field.key} (${field.type}${field.variant !== 'single' ? ` - ${field.variant}` : ''})`}
      style={{
        width: resizingSize ? resizingSize.width * scale : scaledWidth,
        height: resizingSize ? resizingSize.height * scale : scaledHeight,
        fontSize: 12 * scale,
      }}
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
            isCheckbox && "text-center text-lg"
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

  // For resizable fields, wrap in ResizableBox
  if (isResizable) {
    return (
      <Draggable
        nodeRef={nodeRef}
        position={{ x: scaledX, y: scaledY }}
        onStart={() => setIsDragging(true)}
        onStop={handleDragStop}
        grid={isEnabled ? [gridSize, gridSize] : undefined}
        bounds={{
          left: 0,
          top: 0,
          right: pageWidth * scale - scaledWidth,
          bottom: pageHeight * scale - scaledHeight
        }}
        scale={scale}
      >
        <div style={{ position: 'absolute' }}>
          <ResizableBox
            width={scaledWidth}
            height={scaledHeight}
            minConstraints={[50 * scale, 20 * scale]}
            maxConstraints={[pageWidth * scale, pageHeight * scale]}
            onResizeStop={handleResizeStop}
            onResize={(_e, { size }) => {
              setResizingSize({ 
                width: size.width / scale, 
                height: size.height / scale 
              });
            }}
            resizeHandles={['se', 'e', 's']}
            handleSize={[10, 10]}
          >
            {fieldContent}
          </ResizableBox>
        </div>
      </Draggable>
    );
  }

  // For non-resizable fields (checkboxes, options, previews)
  return (
    <Draggable
      nodeRef={nodeRef}
      position={{ x: scaledX, y: scaledY }}
      onStart={() => setIsDragging(true)}
      onStop={handleDragStop}
      grid={isEnabled ? [gridSize, gridSize] : undefined}
      bounds={{
        left: 0,
        top: 0,
        right: pageWidth * scale - scaledWidth,
        bottom: pageHeight * scale - scaledHeight
      }}
      scale={scale}
    >
      <div style={{ position: 'absolute' }}>
        {fieldContent}
      </div>
    </Draggable>
  );
}