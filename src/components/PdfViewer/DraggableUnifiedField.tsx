import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import type { UnifiedField, OptionRenderType } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';
import { Type, Image, PenTool, RadioIcon, CheckSquare, Move, Settings, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  onClick?: () => void;
}

export function DraggableUnifiedField({
  field,
  scale,
  pageWidth,
  pageHeight,
  isSelected,
  optionKey,
  isPreview,
  renderType,
  onDoubleClick,
  onClick
}: DraggableUnifiedFieldProps) {
  const { updateUnifiedField, deleteUnifiedField } = useFieldStore();
  const { snapPosition, snapSize, gridSize, isEnabled } = useGridSnap(pageHeight);
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [resizingSize, setResizingSize] = useState<{ width: number; height: number } | null>(null);
  
  // Content-specific states
  const [size, setSize] = useState(() => {
    if (field.type === 'text') {
      return field.properties?.fontSize || 14;
    } else if (field.type === 'checkbox') {
      return field.size?.width || 20;
    }
    return 14;
  });
  
  const [fitMode, setFitMode] = useState<'fit' | 'fill'>(
    field.properties?.fitMode || 'fit'
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Context menu disabled - deletion should be done through the field config dialog
  };
  
  const handleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Use existing double-click handler logic
    onDoubleClick?.();
  };
  
  const handleSizeChange = (newSize: number) => {
    if (isNaN(newSize)) return;
    
    const minSize = field.type === 'text' ? 8 : 20;
    const maxSize = field.type === 'text' ? 48 : 50;
    const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
    
    setSize(clampedSize);
    
    if (field.type === 'text') {
      const minHeight = clampedSize * 1.5;
      const updates: Partial<UnifiedField> = {
        properties: { ...field.properties, fontSize: clampedSize }
      };
      
      if (field.size && field.size.height < minHeight) {
        updates.size = { ...field.size, height: minHeight };
      }
      
      updateUnifiedField(field.id, updates);
    } else if (field.type === 'checkbox') {
      updateUnifiedField(field.id, {
        size: { width: clampedSize, height: clampedSize },
        properties: { ...field.properties, checkboxSize: clampedSize }
      });
    }
  };
  
  const handleFitModeChange = (value: string) => {
    if (!value) return;
    const newFitMode = value as 'fit' | 'fill';
    setFitMode(newFitMode);
    updateUnifiedField(field.id, {
      properties: { ...field.properties, fitMode: newFitMode }
    });
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
  
  // Get field dimensions
  const fieldWidth = field.size?.width || 200;
  const fieldHeight = field.size?.height || 30;
  
  // Handle drag stop - update position in store
  const handleDragStop = (_e: any, data: { x: number; y: number }) => {
    setIsDragging(false);
    
    // Convert scaled screen coordinates back to PDF coordinates
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

  // Handle resize - update temporary size for visual feedback
  const handleResize = (_e: any, data: { size: { width: number; height: number } }) => {
    setResizingSize({
      width: data.size.width / scale,
      height: data.size.height / scale
    });
  };

  // Handle resize stop - update size in store
  const handleResizeStop = (_e: any, data: { size: { width: number; height: number } }) => {
    const newWidth = data.size.width / scale;
    const newHeight = data.size.height / scale;
    
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
  const scaledWidth = (resizingSize?.width || fieldWidth) * scale;
  const scaledHeight = (resizingSize?.height || fieldHeight) * scale;

  // Determine if field should be resizable
  const isResizable = !isCheckbox && !isPreview && !optionKey;

  // Enhanced content rendering function
  const renderFieldContent = () => {
    const value = field.sampleValue || '';
    const fontSize = field.properties?.fontSize || 14;
    
    switch (field.type) {
      case 'checkbox': {
        const checkboxSize = resizingSize?.width || field.properties?.checkboxSize || field.size?.width || 20;
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
        const currentWidth = resizingSize?.width || field.size?.width || 100;
        const currentHeight = resizingSize?.height || field.size?.height || 100;
        
        return (
          <div className="flex items-center justify-center h-full w-full">
            {field.sampleValue ? (
              <img 
                src={field.sampleValue as string} 
                alt="Field image" 
                className="select-none"
                draggable={false}
                style={{ 
                  width: imageFitMode === 'fit' ? 'auto' : `${currentWidth}px`,
                  height: imageFitMode === 'fit' ? 'auto' : `${currentHeight}px`,
                  maxWidth: imageFitMode === 'fit' ? `${currentWidth}px` : 'none',
                  maxHeight: imageFitMode === 'fit' ? `${currentHeight}px` : 'none',
                  objectFit: imageFitMode === 'fit' ? 'contain' : 'fill'
                }}
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
        const signatureFitMode = field.properties?.fitMode || 'fit';
        const currentWidth = resizingSize?.width || field.size?.width || 200;
        const currentHeight = resizingSize?.height || field.size?.height || 60;
        
        return (
          <div className="flex items-center justify-center h-full w-full">
            {field.sampleValue ? (
              <img 
                src={field.sampleValue as string} 
                alt="Signature" 
                className="select-none"
                draggable={false}
                style={{ 
                  width: signatureFitMode === 'fit' ? 'auto' : `${currentWidth}px`,
                  height: signatureFitMode === 'fit' ? 'auto' : `${currentHeight}px`,
                  maxWidth: signatureFitMode === 'fit' ? `${currentWidth}px` : 'none',
                  maxHeight: signatureFitMode === 'fit' ? `${currentHeight}px` : 'none',
                  objectFit: signatureFitMode === 'fit' ? 'contain' : 'fill'
                }}
              />
            ) : (
              <div className="text-xs text-gray-400 text-center p-2">
                <PenTool className="h-6 w-6 mx-auto mb-1" />
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
            <span className="truncate">{value || displayValue || 'Your text here'}</span>
          </div>
        );
    }
  };

  const fieldContent = (
    <div
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
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={optionKey 
        ? `${field.key}: ${optionKey}${isPreview ? ' (preview)' : ''}` 
        : `${field.key} (${field.type}${field.variant !== 'single' ? ` - ${field.variant}` : ''})`}
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {renderFieldContent()}
    </div>
  );

  // For resizable fields, wrap in ResizableBox inside Draggable
  if (isResizable) {
    return (
      <Draggable
        nodeRef={nodeRef}
        position={{ x: scaledX, y: scaledY }}
        onStart={() => setIsDragging(true)}
        onStop={handleDragStop}
        grid={isEnabled ? [gridSize * scale, gridSize * scale] : undefined}
        bounds={{
          left: 0,
          top: 0,
          right: (pageWidth - fieldWidth) * scale,
          bottom: (pageHeight - fieldHeight) * scale
        }}
        cancel=".react-resizable-handle, .no-drag"
      >
        <div ref={nodeRef} style={{ position: 'absolute', width: scaledWidth, height: scaledHeight }}>
          {/* Control bar above field */}
          <div className={cn(
            "absolute flex items-center gap-1 transition-all duration-150",
            "-top-7 left-0 z-10",
            isHovered || isDragging || isSelected ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            {/* Drag handle */}
            <div className={cn(
              "drag-handle bg-blue-500/95 backdrop-blur-sm text-white rounded px-1.5 py-0.5 cursor-move shadow-sm",
              "flex items-center gap-0.5 h-6",
              isSelected && "bg-blue-600",
              isDragging && "!opacity-100 bg-blue-700"
            )}>
              <Move className="h-3 w-3" />
              <span className="text-[10px] font-mono">{field.key}</span>
            </div>
            
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
                      disabled={size <= (field.type === 'text' ? 8 : 20)}
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
                      min={field.type === 'text' ? 8 : 20}
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
          </div>
          
          <ResizableBox
            width={scaledWidth}
            height={scaledHeight}
            minConstraints={[
              field.type === 'checkbox' ? 20 * scale : 50 * scale,
              field.type === 'checkbox' ? 20 * scale : 20 * scale
            ]}
            maxConstraints={[
              field.type === 'image' || field.type === 'signature' ? 600 * scale : 
              field.type === 'checkbox' ? 50 * scale : 400 * scale,
              field.type === 'image' || field.type === 'signature' ? 600 * scale : 
              field.type === 'checkbox' ? 50 * scale : 200 * scale
            ]}
            lockAspectRatio={field.type === 'checkbox'}
            onResizeStop={handleResizeStop}
            onResize={handleResize}
            resizeHandles={isSelected ? ['se', 'e', 's'] : []}
            draggableOpts={{ grid: isEnabled ? [gridSize * scale, gridSize * scale] : undefined }}
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
      grid={isEnabled ? [gridSize * scale, gridSize * scale] : undefined}
      bounds={{
        left: 0,
        top: 0,
        right: (pageWidth - fieldWidth) * scale,
        bottom: (pageHeight - fieldHeight) * scale
      }}
      cancel=".no-drag"
    >
      <div 
        ref={nodeRef} 
        style={{ 
          position: 'absolute', 
          width: scaledWidth, 
          height: scaledHeight 
        }}
      >
        {/* Control bar above field - same as resizable fields */}
        <div className={cn(
          "absolute flex items-center gap-1 transition-all duration-150",
          "-top-7 left-0 z-10",
          isHovered || isDragging || isSelected ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          {/* Drag handle */}
          <div className={cn(
            "drag-handle bg-blue-500/95 backdrop-blur-sm text-white rounded px-1.5 py-0.5 cursor-move shadow-sm",
            "flex items-center gap-0.5 h-6",
            isSelected && "bg-blue-600",
            isDragging && "!opacity-100 bg-blue-700"
          )}>
            <Move className="h-3 w-3" />
            <span className="text-[10px] font-mono">{field.key}</span>
          </div>
          
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
          
          {/* Inline size controls for non-resizable fields */}
          {(isHovered || isSelected) && field.type === 'checkbox' && (
            <div className="flex items-center gap-1 bg-blue-500/95 backdrop-blur-sm text-white rounded px-1.5 h-6 shadow-sm no-drag">
              <Button
                size="icon"
                variant="ghost"
                className="h-4 w-4 p-0 hover:bg-white/20 text-white no-drag"
                onClick={() => handleSizeChange(size - 1)}
                disabled={size <= 20}
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
                disabled={size >= 50}
              >
                <Plus className="h-2.5 w-2.5" />
              </Button>
              
              <Slider
                value={[size]}
                onValueChange={(v) => handleSizeChange(v[0])}
                min={20}
                max={50}
                step={1}
                className="w-16 ml-1 no-drag [&_.bg-primary]:bg-blue-400 [&_[role=slider]]:bg-white [&_[role=slider]]:border-blue-600"
              />
            </div>
          )}
        </div>
        
        {fieldContent}
      </div>
    </Draggable>
  );
}