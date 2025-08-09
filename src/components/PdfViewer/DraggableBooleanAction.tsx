import { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { BooleanFieldDialog } from '@/components/BooleanFieldDialog/BooleanFieldDialog';
import type { BooleanFieldAction, BooleanField } from '@/types/booleanField.types';
import { cn } from '@/lib/utils';
import { Move, Minus, Plus, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import 'react-resizable/css/styles.css';

interface DraggableBooleanActionProps {
  action: BooleanFieldAction;
  isTrue: boolean;
  booleanField: BooleanField;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  currentPage: number;
}

export function DraggableBooleanAction({
  action,
  isTrue,
  booleanField,
  scale,
  pageWidth,
  pageHeight,
  currentPage
}: DraggableBooleanActionProps) {
  const { updateBooleanAction } = useFieldStore();
  const { snapPosition, snapSize, gridSize, isEnabled } = useGridSnap();
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [resizingSize, setResizingSize] = useState<{ width: number; height: number } | null>(null);
  
  // Size state for checkmarks (single value for both width and height)
  const [checkmarkSize, setCheckmarkSize] = useState(action.size?.width || 24);
  
  // Font size state for text actions
  const [fontSize, setFontSize] = useState(action.properties?.fontSize || 14);
  
  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!nodeRef.current || !(nodeRef.current as any).contains(target)) {
        setIsSelected(false);
      }
    };
    
    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSelected]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragStop = (_e: unknown, data: { x: number; y: number }) => {
    const position = {
      x: data.x / scale,
      y: data.y / scale,
    };
    const snappedPosition = snapPosition(position);
    
    // Update position in store
    updateBooleanAction(booleanField.key, isTrue, action.id, {
      position: {
        ...action.position,
        x: snappedPosition.x,
        y: snappedPosition.y
      }
    });
    
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only open dialog if clicking on the field content, not controls
    if ((e.target as HTMLElement).closest('.no-drag')) {
      return;
    }
    e.stopPropagation();
    setShowProperties(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelected(true);
  };

  const handleResize = (_e: unknown, data: { size: { width: number; height: number } }) => {
    setResizingSize({
      width: data.size.width / scale,
      height: data.size.height / scale
    });
  };

  const handleResizeStop = (_e: unknown, data: { size: { width: number; height: number } }) => {
    const size = {
      width: data.size.width / scale,
      height: data.size.height / scale,
    };
    const snappedSize = snapSize(size);
    
    // Update size in store
    updateBooleanAction(booleanField.key, isTrue, action.id, {
      size: snappedSize
    });
    setResizingSize(null);
  };

  // Handle checkmark size change (for inline control)
  const handleCheckmarkSizeChange = (newSize: number) => {
    const clampedSize = Math.max(25, Math.min(50, newSize));
    setCheckmarkSize(clampedSize);
    
    // Update in store - also update the actual field size
    updateBooleanAction(booleanField.key, isTrue, action.id, {
      size: { width: clampedSize, height: clampedSize }
    });
  };
  
  // Handle font size change for text actions
  const handleFontSizeChange = (newSize: number) => {
    if (isNaN(newSize)) return;
    const clampedSize = Math.max(8, Math.min(48, newSize));
    setFontSize(clampedSize);
    
    // Update in store with properties
    const minHeight = clampedSize * 1.5;
    const updates: Partial<BooleanFieldAction> = {
      properties: { fontSize: clampedSize }
    };
    
    if (!action.size || action.size.height < minHeight) {
      updates.size = { width: action.size?.width || 150, height: minHeight };
    }
    
    updateBooleanAction(booleanField.key, isTrue, action.id, updates);
  };

  // Determine content to display
  const getDisplayContent = () => {
    switch (action.type) {
      case 'fillCustom':
        return action.customText || '[custom text]';
      case 'checkmark':
        return '✓';
      default:
        return '';
    }
  };

  const displayContent = getDisplayContent();
  
  // Determine default size based on content type
  const getDefaultFieldSize = () => {
    if (action.type === 'checkmark') {
      return { width: 25, height: 25 };
    }
    // Estimate width based on content length - matching regular text fields
    const estimatedWidth = Math.max(100, Math.min(250, displayContent.length * 8));
    return { width: estimatedWidth, height: 30 };
  };

  const defaultSize = getDefaultFieldSize();
  const fieldSize = action.size || defaultSize;
  const isCheckmark = action.type === 'checkmark';
  
  // Update checkmark size when resized via ResizableBox
  useEffect(() => {
    if (isCheckmark && action.size) {
      setCheckmarkSize(action.size.width);
    }
  }, [isCheckmark, action.size]);

  // Skip if not on current page (after all hooks)
  if (action.position.page !== currentPage) {
    return null;
  }


  // Color scheme based on true/false
  const colorScheme = isTrue ? {
    border: "border-green-300",
    borderSelected: "border-green-500",
    borderHover: "border-green-400",
    bg: "bg-green-50/20",
    bgSelected: "bg-green-50/50",
    bgHover: "bg-green-50/30",
    shadow: "shadow-green-500/20",
    text: "text-green-700",
    control: "bg-green-600",
    controlHover: "bg-green-700",
    controlActive: "bg-green-800",
    controlSecondary: "bg-green-500/95",
    controlInner: "bg-green-700/50"
  } : {
    border: "border-red-300",
    borderSelected: "border-red-500",
    borderHover: "border-red-400",
    bg: "bg-red-50/20",
    bgSelected: "bg-red-50/50",
    bgHover: "bg-red-50/30",
    shadow: "shadow-red-500/20",
    text: "text-red-700",
    control: "bg-red-600",
    controlHover: "bg-red-700",
    controlActive: "bg-red-800",
    controlSecondary: "bg-red-500/95",
    controlInner: "bg-red-700/50"
  };

  return (
    <>
    <Draggable
      nodeRef={nodeRef}
      position={{ x: action.position.x * scale, y: action.position.y * scale }}
      onStart={handleDragStart}
      onStop={handleDragStop}
      bounds={{
        left: 0,
        top: 0,
        right: (pageWidth - fieldSize.width) * scale,
        bottom: (pageHeight - fieldSize.height) * scale
      }}
      cancel=".no-drag, .react-resizable-handle"
      grid={isEnabled ? [gridSize * scale, gridSize * scale] : undefined}
    >
      <div
        ref={nodeRef}
        className="absolute"
        style={{ zIndex: isSelected ? 10 : isDragging ? 20 : 5 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div 
          className="group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Control bar above field */}
          <div className={cn(
            "absolute flex items-center gap-1 transition-all duration-150",
            "-top-7 left-0 z-10",
            isHovered || isDragging || isSelected ? "opacity-100" : "opacity-0"
          )}>
            {/* Drag handle */}
            <div 
              className={cn(
                "drag-handle text-white rounded px-1.5 py-0.5 cursor-move shadow-sm",
                "flex items-center gap-0.5 h-6",
                colorScheme.control,
                isSelected && colorScheme.controlHover,
                isDragging && `!opacity-100 ${colorScheme.controlActive}`
              )}
            >
              <Move className="h-3 w-3" />
              <ToggleLeft className="h-3 w-3" />
              <span className="text-[10px] font-mono">{booleanField.key}.{isTrue ? 'TRUE' : 'FALSE'}</span>
            </div>
            
            {/* Inline size controls for checkmark */}
            {isCheckmark && (isHovered || isSelected) && (
              <div className={cn(
                "flex items-center gap-1 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag",
                colorScheme.controlSecondary
              )}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                  onClick={() => handleCheckmarkSizeChange(checkmarkSize - 1)}
                  disabled={checkmarkSize <= 25}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                
                <span className={cn(
                  "h-4 w-8 flex items-center justify-center text-[11px] font-medium backdrop-blur-sm rounded px-1 text-white",
                  colorScheme.controlInner
                )}>
                  {checkmarkSize}
                </span>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                  onClick={() => handleCheckmarkSizeChange(checkmarkSize + 1)}
                  disabled={checkmarkSize >= 50}
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>
                
                <Slider
                  value={[checkmarkSize]}
                  onValueChange={(v) => handleCheckmarkSizeChange(v[0])}
                  min={25}
                  max={50}
                  step={1}
                  className={cn(
                    "w-16 ml-1 no-drag",
                    isTrue 
                      ? "[&_.bg-primary]:bg-green-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-green-600"
                      : "[&_.bg-primary]:bg-red-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-red-600"
                  )}
                />
              </div>
            )}
            
            {/* Inline size controls for text actions */}
            {!isCheckmark && (isHovered || isSelected) && (
              <div className={cn(
                "flex items-center gap-1 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag",
                colorScheme.controlSecondary
              )}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                  onClick={() => handleFontSizeChange(fontSize - 1)}
                  disabled={fontSize <= 8}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                
                <span className={cn(
                  "h-4 w-8 flex items-center justify-center text-[11px] font-medium backdrop-blur-sm rounded px-1 text-white",
                  colorScheme.controlInner
                )}>
                  {fontSize}
                </span>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                  onClick={() => handleFontSizeChange(fontSize + 1)}
                  disabled={fontSize >= 48}
                >
                  <Plus className="h-2.5 w-2.5" />
                </Button>
                
                <Slider
                  value={[fontSize]}
                  onValueChange={(v) => handleFontSizeChange(v[0])}
                  min={8}
                  max={48}
                  step={1}
                  className={cn(
                    "w-16 ml-1 no-drag",
                    isTrue 
                      ? "[&_.bg-primary]:bg-green-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-green-600"
                      : "[&_.bg-primary]:bg-red-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-red-600"
                  )}
                />
              </div>
            )}
          </div>

          {/* Use ResizableBox for all action types */}
          <ResizableBox
            width={fieldSize.width * scale}
            height={fieldSize.height * scale}
            onResize={handleResize}
            onResizeStop={handleResizeStop}
            minConstraints={isCheckmark ? [25 * scale, 25 * scale] : [50 * scale, 20 * scale]}
            maxConstraints={isCheckmark ? [50 * scale, 50 * scale] : [400 * scale, 200 * scale]}
            resizeHandles={isSelected ? ['se', 'e', 's'] : []}
            lockAspectRatio={isCheckmark}
          >
            <div
              className={cn(
                "relative w-full h-full transition-all duration-150",
                "border shadow-sm rounded-sm",
                isSelected
                  ? `border-2 ${colorScheme.borderSelected} shadow-lg ${colorScheme.shadow} ${colorScheme.bgSelected}`
                  : isHovered
                  ? `${colorScheme.borderHover} shadow-md ${colorScheme.bgHover}`
                  : `${colorScheme.border} ${colorScheme.bg}`,
                isDragging ? "shadow-xl opacity-90 cursor-grabbing" : "cursor-move"
              )}
            >
              {/* Field content */}
              <div className="px-1 h-full flex items-center justify-center">
                {isCheckmark ? (
                  <span 
                    className={cn("font-bold", colorScheme.text)}
                    style={{ 
                      fontSize: `${(resizingSize?.width || fieldSize.width) * 0.7}px`,
                      lineHeight: 1
                    }}
                  >
                    ✓
                  </span>
                ) : (
                  <span 
                    className={cn("truncate", colorScheme.text)}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {displayContent}
                  </span>
                )}
              </div>
            </div>
          </ResizableBox>
        </div>
      </div>
    </Draggable>
    
    {/* Open BooleanFieldDialog when double-clicked */}
    <BooleanFieldDialog
      booleanField={booleanField}
      open={showProperties}
      onOpenChange={setShowProperties}
    />
    </>
  );
}