import { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { LogicFieldDialog } from '@/components/LogicFieldDialog/LogicFieldDialog';
import type { FieldAction, FieldOption, LogicField } from '@/types/logicField.types';
import { cn } from '@/lib/utils';
import { Move, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import 'react-resizable/css/styles.css';

interface DraggableActionFieldProps {
  action: FieldAction;
  option: FieldOption;
  logicField: LogicField;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  currentPage: number;
}

export function DraggableActionField({ 
  action, 
  option,
  logicField,
  scale, 
  pageWidth, 
  pageHeight,
  currentPage
}: DraggableActionFieldProps) {
  const { updateAction } = useFieldStore();
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
    updateAction(logicField.key, option.key, action.id, {
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
    updateAction(logicField.key, option.key, action.id, {
      size: snappedSize
    });
    setResizingSize(null);
  };

  // Handle checkmark size change (for inline control)
  const handleCheckmarkSizeChange = (newSize: number) => {
    const clampedSize = Math.max(25, Math.min(50, newSize));
    setCheckmarkSize(clampedSize);
    
    // Update in store - also update the actual field size
    updateAction(logicField.key, option.key, action.id, {
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
    const updates: Partial<FieldAction> = {
      properties: { fontSize: clampedSize }
    };
    
    if (!action.size || action.size.height < minHeight) {
      updates.size = { width: action.size?.width || 150, height: minHeight };
    }
    
    updateAction(logicField.key, option.key, action.id, updates);
  };

  // Determine content to display
  const getDisplayContent = () => {
    switch (action.type) {
      case 'fillLabel':
        return option.label;
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
          {/* Control bar above field - matches DraggableField pattern */}
          <div className={cn(
            "absolute flex items-center gap-1 transition-all duration-150",
            "-top-7 left-0 z-10",
            isHovered || isDragging || isSelected ? "opacity-100" : "opacity-0"
          )}>
            {/* Drag handle */}
            <div 
              className={cn(
                "drag-handle bg-purple-600 text-white rounded px-1.5 py-0.5 cursor-move shadow-sm",
                "flex items-center gap-0.5 h-6",
                isSelected && "bg-purple-700",
                isDragging && "!opacity-100 bg-purple-800"
              )}
            >
              <Move className="h-3 w-3" />
              <span className="text-[10px] font-mono">{logicField.key}.{option.key}</span>
            </div>
            
            {/* Inline size controls for checkmark */}
            {isCheckmark && (isHovered || isSelected) && (
              <div className="flex items-center gap-1 bg-purple-500/95 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                  onClick={() => handleCheckmarkSizeChange(checkmarkSize - 1)}
                  disabled={checkmarkSize <= 25}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                
                <span className="h-4 w-8 flex items-center justify-center text-[11px] font-medium bg-purple-700/50 backdrop-blur-sm rounded px-1 text-white">
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
                  className="w-16 ml-1 no-drag [&_.bg-primary]:bg-purple-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-purple-600"
                />
              </div>
            )}
            
            {/* Inline size controls for text actions */}
            {!isCheckmark && (isHovered || isSelected) && (
              <div className="flex items-center gap-1 bg-purple-500/95 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                  onClick={() => handleFontSizeChange(fontSize - 1)}
                  disabled={fontSize <= 8}
                >
                  <Minus className="h-2.5 w-2.5" />
                </Button>
                
                <span className="h-4 w-8 flex items-center justify-center text-[11px] font-medium bg-purple-700/50 backdrop-blur-sm rounded px-1 text-white">
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
                  className="w-16 ml-1 no-drag [&_.bg-primary]:bg-purple-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-purple-600"
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
                  ? "border-2 border-purple-500 shadow-lg shadow-purple-500/20 bg-purple-50/50"
                  : isHovered
                  ? "border-purple-400 shadow-md bg-purple-50/30"
                  : "border-purple-300 bg-purple-50/20",
                isDragging ? "shadow-xl opacity-90 cursor-grabbing" : "cursor-move"
              )}
            >
              {/* Field content */}
              <div className="px-1 h-full flex items-center justify-center">
                {isCheckmark ? (
                  <span 
                    className="text-purple-700 font-bold"
                    style={{ 
                      fontSize: `${(resizingSize?.width || fieldSize.width) * 0.7}px`,
                      lineHeight: 1
                    }}
                  >
                    ✓
                  </span>
                ) : (
                  <span 
                    className="text-purple-700 truncate"
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
    
    <LogicFieldDialog
      logicField={logicField}
      open={showProperties}
      onOpenChange={setShowProperties}
    />
    </>
  );
}