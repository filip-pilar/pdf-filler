import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { FieldPropertiesDialog } from '@/components/FieldPropertiesDialog/FieldPropertiesDialog';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Field } from '@/types/field.types';
import { cn } from '@/lib/utils';
import { Settings, Move, Minus, Plus, Image, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-resizable/css/styles.css';

interface DraggableFieldProps {
  field: Field;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  isSelected: boolean;
}

export function DraggableField({ 
  field, 
  scale, 
  pageWidth, 
  pageHeight,
  isSelected 
}: DraggableFieldProps) {
  const { updateField, selectField } = useFieldStore();
  const { snapPosition, snapSize, gridSize, isEnabled } = useGridSnap();
  const nodeRef = useRef(null);
  const [showProperties, setShowProperties] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [resizingSize, setResizingSize] = useState<{ width: number; height: number } | null>(null);
  const [size, setSize] = useState(() => {
    if (field.type === 'text') {
      return field.properties?.fontSize || 14;
    } else if (field.type === 'checkbox') {
      return field.size.width || 25;
    }
    return 14;
  });
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>(
    field.properties?.fitMode || 'fit'
  );
  
  // Conditional logic removed - feature not in use
  const isHidden = false;
  const isDisabled = false;
  const isRequired = false;

  const handleDragStart = (_e: unknown, data: { x: number; y: number }) => {
    setIsDragging(true);
    // If grid is enabled and field isn't aligned, snap it immediately
    if (isEnabled) {
      const currentPos = { x: field.position.x, y: field.position.y };
      const snappedPos = snapPosition(currentPos);
      if (currentPos.x !== snappedPos.x || currentPos.y !== snappedPos.y) {
        // Update field position to snap to grid
        updateField(field.key, { position: snappedPos });
      }
    }
  };

  const handleDragStop = (_e: unknown, data: { x: number; y: number }) => {
    setIsDragging(false);
    const position = {
      x: data.x / scale,
      y: data.y / scale,
    };
    const snappedPosition = snapPosition(position);
    updateField(field.key, {
      position: snappedPosition
    });
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
    updateField(field.key, {
      size: snappedSize
    });
    setResizingSize(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectField(field.key);
  };

  const handleSizeChange = (newSize: number) => {
    if (isNaN(newSize)) return;
    
    const minSize = field.type === 'text' ? 8 : 25;
    const maxSize = field.type === 'text' ? 48 : 50;
    const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
    
    setSize(clampedSize);
    
    if (field.type === 'text') {
      const minHeight = clampedSize * 1.5;
      const updates: Partial<Field> = {
        properties: { ...field.properties, fontSize: clampedSize }
      };
      
      if (field.size.height < minHeight) {
        updates.size = { ...field.size, height: minHeight };
      }
      
      updateField(field.key, updates);
    } else if (field.type === 'checkbox') {
      updateField(field.key, {
        size: { width: clampedSize, height: clampedSize },
        properties: { ...field.properties, checkboxSize: clampedSize }
      });
    }
  };

  const handleFitModeChange = (value: string) => {
    if (!value) return;
    const newFitMode = value as 'fit' | 'fill';
    setFitMode(newFitMode);
    updateField(field.key, {
      properties: { ...field.properties, fitMode: newFitMode }
    });
  };

  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProperties(true);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only open dialog if clicking on the field content, not controls
    if ((e.target as HTMLElement).closest('.no-drag')) {
      return;
    }
    e.stopPropagation();
    setShowProperties(true);
  };

  // Render field content based on type
  const renderFieldContent = () => {
    const value = field.sampleValue || '';
    const fontSize = field.properties?.fontSize || 14;
    
    switch (field.type) {
      case 'checkbox': {
        const checkboxSize = resizingSize?.width || field.properties?.checkboxSize || field.size.width || 25;
        return (
          <div className="flex items-center justify-center h-full">
            {field.sampleValue ? (
              <span 
                className="text-black font-bold"
                style={{ fontSize: `${checkboxSize * 0.7}px` }}
              >
                ✓
              </span>
            ) : null}
          </div>
        );
      }
      
      case 'image': {
        const imageFitMode = field.properties?.fitMode || 'fit';
        const currentWidth = resizingSize?.width || field.size.width;
        const currentHeight = resizingSize?.height || field.size.height;
        
        return (
          <div className="flex items-center justify-center h-full w-full">
            {field.sampleValue ? (
              <img 
                src={field.sampleValue} 
                alt="Field image" 
                className="select-none"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ 
                  userSelect: 'none', 
                  WebkitUserDrag: 'none',
                  width: imageFitMode === 'fit' ? 'auto' : `${currentWidth}px`,
                  height: imageFitMode === 'fit' ? 'auto' : `${currentHeight}px`,
                  maxWidth: imageFitMode === 'fit' ? `${currentWidth}px` : 'none',
                  maxHeight: imageFitMode === 'fit' ? `${currentHeight}px` : 'none',
                  objectFit: imageFitMode === 'fit' ? 'contain' : 'fill'
                } as React.CSSProperties}
              />
            ) : (
              <div className="text-xs text-gray-400 text-center p-2">
                <Image className="h-6 w-6 mx-auto mb-1" />
                Your image here
              </div>
            )}
          </div>
        );
      }
      
      case 'signature': {
        const sigFitMode = field.properties?.fitMode || 'fit';
        const currentWidth = resizingSize?.width || field.size.width;
        const currentHeight = resizingSize?.height || field.size.height;
        
        return (
          <div className="flex items-center justify-center h-full w-full">
            {field.sampleValue ? (
              <img 
                src={field.sampleValue} 
                alt="Signature" 
                className="select-none"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ 
                  userSelect: 'none', 
                  WebkitUserDrag: 'none',
                  width: sigFitMode === 'fit' ? 'auto' : `${currentWidth}px`,
                  height: sigFitMode === 'fit' ? 'auto' : `${currentHeight}px`,
                  maxWidth: sigFitMode === 'fit' ? `${currentWidth}px` : 'none',
                  maxHeight: sigFitMode === 'fit' ? `${currentHeight}px` : 'none',
                  objectFit: sigFitMode === 'fit' ? 'contain' : 'fill'
                } as React.CSSProperties}
              />
            ) : (
              <div className="text-xs text-gray-400 text-center p-2">
                <PenTool className="h-5 w-5 mx-auto mb-1" />
                Your signature here
              </div>
            )}
          </div>
        );
      }
      
      default:
        return (
          <div 
            className="px-1 text-gray-700 overflow-hidden flex items-center h-full"
            style={{ fontSize: `${fontSize}px` }}
          >
            <span className="truncate">{value || 'Your text here'}</span>
          </div>
        );
    }
  };

  // Don't render if hidden
  if (isHidden && !isSelected) {
    return null;
  }

  return (
    <>
    <Draggable
      nodeRef={nodeRef}
      position={{ x: field.position.x * scale, y: field.position.y * scale }}
      onStart={handleDragStart}
      onStop={handleDragStop}
      bounds={{
        left: 0,
        top: 0,
        right: (pageWidth - field.size.width) * scale,
        bottom: (pageHeight - field.size.height) * scale
      }}
      cancel=".no-drag, .react-resizable-handle"
      grid={isEnabled ? [gridSize * scale, gridSize * scale] : undefined}
    >
      <div
        ref={nodeRef}
        className="absolute"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ zIndex: isSelected ? 10 : 1 }}
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
                  "drag-handle bg-blue-500/95 backdrop-blur-sm text-white rounded px-1.5 py-0.5 cursor-move shadow-sm",
                  "flex items-center gap-0.5 h-6",
                  isSelected && "bg-blue-600",
                  isDragging && "!opacity-100 bg-blue-700"
                )}
              >
                <Move className="h-3 w-3" />
                <span className="text-[10px] font-mono">{field.key || field.name}</span>
                {isRequired && <span className="text-red-400 text-xs ml-0.5">*</span>}
              </div>
              
              {/* Inline size controls - show on hover or selection */}
              {(isHovered || isSelected) && (
                <>
                  {(field.type === 'text' || field.type === 'checkbox') && (
                    <div className="flex items-center gap-1 bg-blue-500/95 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                        onClick={() => handleSizeChange(size - 1)}
                        disabled={size <= (field.type === 'text' ? 8 : 25)}
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </Button>
                      
                      <span className="h-4 w-8 flex items-center justify-center text-[11px] font-medium bg-blue-700/50 backdrop-blur-sm rounded px-1 text-white">
                        {size}
                      </span>
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                        onClick={() => handleSizeChange(size + 1)}
                        disabled={size >= (field.type === 'text' ? 48 : 50)}
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                      
                      <Slider
                        value={[size]}
                        onValueChange={(v) => handleSizeChange(v[0])}
                        min={field.type === 'text' ? 8 : 25}
                        max={field.type === 'text' ? 48 : 50}
                        step={1}
                        className="w-16 ml-1 no-drag [&_.bg-primary]:bg-blue-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-blue-600"
                      />
                    </div>
                  )}
                  
                  {(field.type === 'image' || field.type === 'signature') && (
                    <div className="flex items-center gap-1 bg-blue-500/95 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag">
                      <ToggleGroup 
                        type="single" 
                        value={fitMode} 
                        onValueChange={handleFitModeChange}
                        className="gap-0.5 no-drag"
                      >
                        <ToggleGroupItem 
                          value="fit" 
                          className="h-4 px-1.5 text-[10px] data-[state=on]:bg-blue-800 data-[state=on]:text-white bg-blue-600/50 hover:bg-blue-700/50 text-white"
                        >
                          Fit
                        </ToggleGroupItem>
                        <ToggleGroupItem 
                          value="fill" 
                          className="h-4 px-1.5 text-[10px] data-[state=on]:bg-blue-800 data-[state=on]:text-white bg-blue-600/50 hover:bg-blue-700/50 text-white"
                        >
                          Fill
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  )}
                </>
              )}
              
              {/* Settings button */}
              <Button
                size="icon"
                className={cn(
                  "no-drag h-6 w-6",
                  "bg-blue-500/95 hover:bg-blue-600 backdrop-blur-sm text-white shadow-sm",
                  "transition-all duration-150"
                )}
                onClick={handleSettings}
                title="Field settings"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>
            
            <ResizableBox
              width={field.size.width * scale}
              height={field.size.height * scale}
              onResize={handleResize}
              onResizeStop={handleResizeStop}
              minConstraints={[
                field.type === 'checkbox' ? 25 * scale : 50 * scale,
                field.type === 'checkbox' ? 25 * scale : 20 * scale
              ]}
              maxConstraints={[
                field.type === 'image' || field.type === 'signature' ? 600 * scale : 
                field.type === 'checkbox' ? 50 * scale : 400 * scale,
                field.type === 'image' || field.type === 'signature' ? 600 * scale : 
                field.type === 'checkbox' ? 50 * scale : 200 * scale
              ]}
              resizeHandles={isSelected ? ['se', 'e', 's'] : []}
              lockAspectRatio={field.type === 'checkbox'}
              draggableOpts={{ grid: isEnabled ? [gridSize * scale, gridSize * scale] : undefined }}
            >
              <div
                className={cn(
                  "relative w-full h-full transition-all duration-150",
                  "border shadow-sm rounded-sm",
                  isSelected
                    ? "border-2 border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-50/50"
                    : isHovered
                    ? "border-blue-400 shadow-md bg-white/60"
                    : "border-gray-300 bg-white/50",
                  isDragging ? "shadow-xl opacity-90 cursor-grabbing" : "cursor-move",
                  isHidden && "opacity-50",
                  isDisabled && "opacity-60 cursor-not-allowed",
                  isRequired && "border-red-400 bg-red-50/10",
                  field.type === 'text' && "border-b-2"
                )}
              >
                {/* Field content */}
                {renderFieldContent()}
              </div>
            </ResizableBox>
          </div>
      </div>
    </Draggable>
    
    <FieldPropertiesDialog
      field={field}
      open={showProperties}
      onOpenChange={setShowProperties}
    />
    </>
  );
}