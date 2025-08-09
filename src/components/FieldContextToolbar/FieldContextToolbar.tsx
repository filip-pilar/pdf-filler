import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Type, Square, Image, PenTool, Minus, Plus } from 'lucide-react';
import type { Field } from '@/types/field.types';

interface FieldContextToolbarProps {
  field: Field;
  position: { x: number; y: number };
  scale: number;
  onUpdateField: (updates: Partial<Field>) => void;
  onClose: () => void;
}

type ImageFitMode = 'fit' | 'fill';

export function FieldContextToolbar({ 
  field, 
  position, 
  scale,
  onUpdateField,
  onClose 
}: FieldContextToolbarProps) {
  // Initialize state based on field type
  const [size, setSize] = useState(() => {
    if (field.type === 'text') {
      return field.properties?.fontSize || 14;
    } else if (field.type === 'checkbox') {
      return field.size.width || 25;
    }
    return 14;
  });
  
  const [fitMode, setFitMode] = useState<ImageFitMode>(
    field.properties?.fitMode || 'fit'
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.field-context-toolbar')) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSizeChange = (newSize: number) => {
    if (isNaN(newSize)) return;
    
    // Clamp size to valid range
    const minSize = field.type === 'text' ? 8 : 20;
    const maxSize = field.type === 'text' ? 48 : 50;
    const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
    
    setSize(clampedSize);
    
    if (field.type === 'text') {
      // Auto-adjust field height if needed
      const minHeight = clampedSize * 1.5;
      const updates: Partial<Field> = {
        properties: { ...field.properties, fontSize: clampedSize }
      };
      
      if (field.size.height < minHeight) {
        updates.size = { ...field.size, height: minHeight };
      }
      
      onUpdateField(updates);
    } else if (field.type === 'checkbox') {
      onUpdateField({
        size: { width: clampedSize, height: clampedSize }
      });
    }
  };

  const handleSliderChange = (value: number[]) => {
    handleSizeChange(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      handleSizeChange(value);
    }
  };

  const handleIncrement = () => {
    handleSizeChange(size + 1);
  };

  const handleDecrement = () => {
    handleSizeChange(size - 1);
  };

  const handleFitModeChange = (value: string) => {
    if (!value) return;
    const newFitMode = value as ImageFitMode;
    setFitMode(newFitMode);
    onUpdateField({
      properties: { ...field.properties, fitMode: newFitMode }
    });
  };

  // Position toolbar to the right of the field
  const toolbarStyle = {
    position: 'absolute' as const,
    left: (position.x + field.size.width) * scale + 10,
    top: position.y * scale,
    zIndex: 1000,
  };

  const renderContent = () => {
    switch (field.type) {
      case 'text':
      case 'checkbox': {
        const minSize = field.type === 'text' ? 8 : 20;
        const maxSize = field.type === 'text' ? 48 : 50;
        const icon = field.type === 'text' ? 
          <Type className="h-4 w-4 text-primary/60" /> : 
          <Square className="h-4 w-4 text-primary/60" />;
        
        return (
          <div className="flex items-center gap-2 px-2 py-1.5">
            {icon}
            
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={handleDecrement}
                disabled={size <= minSize}
              >
                <Minus className="h-3 w-3" />
              </Button>
              
              <Input
                type="number"
                value={size}
                onChange={handleInputChange}
                className="h-5 w-10 text-xs text-center px-0.5"
                min={minSize}
                max={maxSize}
              />
              
              <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5"
                onClick={handleIncrement}
                disabled={size >= maxSize}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            <Slider
              value={[size]}
              onValueChange={handleSliderChange}
              min={minSize}
              max={maxSize}
              step={1}
              className="w-20"
            />
          </div>
        );
      }

      case 'image':
      case 'signature': {
        const fieldIcon = field.type === 'image' ? 
          <Image className="h-4 w-4 text-primary/60" /> :
          <PenTool className="h-4 w-4 text-primary/60" />;
        
        return (
          <div className="flex items-center gap-2 px-2 py-1.5">
            {fieldIcon}
            
            <ToggleGroup 
              type="single" 
              value={fitMode} 
              onValueChange={handleFitModeChange}
              className="gap-1"
            >
              <ToggleGroupItem 
                value="fit" 
                className="h-6 px-3 text-xs"
                title="Scale image to fit within bounds while maintaining aspect ratio"
              >
                Fit
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="fill" 
                className="h-6 px-3 text-xs"
                title="Stretch image to fill exact dimensions (may distort)"
              >
                Fill
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div 
      className={cn(
        "field-context-toolbar",
        "absolute bg-white/90 backdrop-blur-sm",
        "border border-gray-200 rounded-md shadow-md",
        "animate-in fade-in slide-in-from-left-1 duration-150"
      )}
      style={toolbarStyle}
    >
      <div className="relative">
        {/* Arrow pointing to field */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-white/90 border-l border-t border-gray-200 rotate-45" />
        {renderContent()}
      </div>
    </div>
  );
}