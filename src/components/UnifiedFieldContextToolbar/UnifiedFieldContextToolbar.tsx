import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Minus, Plus, Type, Square, Image, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Trash2 } from 'lucide-react';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';

interface UnifiedFieldContextToolbarProps {
  field: UnifiedField;
  position: { x: number; y: number };
  scale: number;
  onClose: () => void;
}

type ImageFitMode = 'fit' | 'fill' | 'stretch';
type TextAlign = 'left' | 'center' | 'right';

export function UnifiedFieldContextToolbar({ 
  field, 
  position, 
  scale, 
  onClose 
}: UnifiedFieldContextToolbarProps) {
  const { updateUnifiedField, deleteUnifiedField } = useFieldStore();
  
  // Initialize state from field properties
  const [fontSize, setFontSize] = useState(field.properties?.fontSize || 12);
  const [textAlign, setTextAlign] = useState<TextAlign>(field.properties?.textAlign || 'left');
  const [bold, setBold] = useState(field.properties?.bold || false);
  const [italic, setItalic] = useState(field.properties?.italic || false);
  const [fitMode, setFitMode] = useState<ImageFitMode>(field.properties?.fitMode || 'fit');
  const [checkboxSize, setCheckboxSize] = useState(field.properties?.checkboxSize || field.size?.width || 20);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.unified-field-context-toolbar')) {
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

  const handleFontSizeChange = (newSize: number) => {
    if (isNaN(newSize) || newSize < 8 || newSize > 48) return;
    setFontSize(newSize);
    updateUnifiedField(field.id, {
      properties: { ...field.properties, fontSize: newSize }
    });
  };

  const handleTextAlignChange = (align: TextAlign) => {
    setTextAlign(align);
    updateUnifiedField(field.id, {
      properties: { ...field.properties, textAlign: align }
    });
  };

  const handleBoldToggle = () => {
    const newBold = !bold;
    setBold(newBold);
    updateUnifiedField(field.id, {
      properties: { ...field.properties, bold: newBold }
    });
  };

  const handleItalicToggle = () => {
    const newItalic = !italic;
    setItalic(newItalic);
    updateUnifiedField(field.id, {
      properties: { ...field.properties, italic: newItalic }
    });
  };

  const handleCheckboxSizeChange = (newSize: number) => {
    if (isNaN(newSize) || newSize < 10 || newSize > 50) return;
    setCheckboxSize(newSize);
    updateUnifiedField(field.id, {
      size: { width: newSize, height: newSize },
      properties: { ...field.properties, checkboxSize: newSize }
    });
  };

  const handleFitModeChange = (value: string) => {
    const newFitMode = value as ImageFitMode;
    setFitMode(newFitMode);
    updateUnifiedField(field.id, {
      properties: { ...field.properties, fitMode: newFitMode }
    });
  };

  const handleDelete = () => {
    if (confirm(`Delete field "${field.key}"?`)) {
      deleteUnifiedField(field.id);
      onClose();
    }
  };

  // Position toolbar to the right of the field
  const toolbarStyle = {
    position: 'absolute' as const,
    left: (position.x + (field.size?.width || 100)) * scale + 10,
    top: position.y * scale,
    zIndex: 1000,
  };

  const renderContent = () => {
    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-3 p-3">
            {/* Font Size */}
            <div className="space-y-1">
              <Label className="text-xs">Font Size</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleFontSizeChange(fontSize - 1)}
                  disabled={fontSize <= 8}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={fontSize}
                  onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                  className="h-6 w-14 text-xs text-center"
                  min={8}
                  max={48}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => handleFontSizeChange(fontSize + 1)}
                  disabled={fontSize >= 48}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Slider
                  value={[fontSize]}
                  onValueChange={(v) => handleFontSizeChange(v[0])}
                  min={8}
                  max={48}
                  step={1}
                  className="w-20"
                />
              </div>
            </div>

            {/* Text Formatting */}
            <div className="space-y-1">
              <Label className="text-xs">Text Format</Label>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant={textAlign === 'left' ? 'default' : 'ghost'}
                  className="h-6 w-6"
                  onClick={() => handleTextAlignChange('left')}
                >
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant={textAlign === 'center' ? 'default' : 'ghost'}
                  className="h-6 w-6"
                  onClick={() => handleTextAlignChange('center')}
                >
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant={textAlign === 'right' ? 'default' : 'ghost'}
                  className="h-6 w-6"
                  onClick={() => handleTextAlignChange('right')}
                >
                  <AlignRight className="h-3 w-3" />
                </Button>
                <div className="w-px bg-border mx-1" />
                <Button
                  size="icon"
                  variant={bold ? 'default' : 'ghost'}
                  className="h-6 w-6"
                  onClick={handleBoldToggle}
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant={italic ? 'default' : 'ghost'}
                  className="h-6 w-6"
                  onClick={handleItalicToggle}
                >
                  <Italic className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2 p-3">
            <Label className="text-xs">Checkbox Size</Label>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => handleCheckboxSizeChange(checkboxSize - 2)}
                disabled={checkboxSize <= 10}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Input
                type="number"
                value={checkboxSize}
                onChange={(e) => handleCheckboxSizeChange(parseInt(e.target.value))}
                className="h-6 w-14 text-xs text-center"
                min={10}
                max={50}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => handleCheckboxSizeChange(checkboxSize + 2)}
                disabled={checkboxSize >= 50}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Slider
                value={[checkboxSize]}
                onValueChange={(v) => handleCheckboxSizeChange(v[0])}
                min={10}
                max={50}
                step={2}
                className="w-20"
              />
            </div>
          </div>
        );

      case 'image':
      case 'signature':
        return (
          <div className="space-y-2 p-3">
            <Label className="text-xs">Image Fit Mode</Label>
            <Select value={fitMode} onValueChange={handleFitModeChange}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fit">Fit (maintain aspect ratio)</SelectItem>
                <SelectItem value="fill">Fill (crop to fill)</SelectItem>
                <SelectItem value="stretch">Stretch (ignore aspect ratio)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card 
      className="unified-field-context-toolbar shadow-lg border bg-background"
      style={toolbarStyle}
    >
      <div className="min-w-[200px]">
        {renderContent()}
        
        {/* Delete button */}
        <div className="border-t px-3 py-2">
          <Button
            size="sm"
            variant="destructive"
            className="w-full h-7 text-xs"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete Field
          </Button>
        </div>
      </div>
    </Card>
  );
}