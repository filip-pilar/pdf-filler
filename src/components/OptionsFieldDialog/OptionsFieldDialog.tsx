import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import type { OptionRenderType } from '@/types/unifiedField.types';
import { 
  X, 
  MousePointer, 
  Type, 
  CheckSquare, 
  FileText, 
  MapPin,
  List,
  Info,
  ArrowRight,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OptionsFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFieldId?: string;
}

type PlacementMode = 'separate' | 'combined';

interface OptionMapping {
  key: string;
  position?: { x: number; y: number };
  customText?: string;
  placed?: boolean;
}

export function OptionsFieldDialog({ 
  open, 
  onOpenChange,
  editingFieldId
}: OptionsFieldDialogProps) {
  const { 
    addUnifiedField, 
    updateUnifiedField, 
    getUnifiedFieldById,
    unifiedFields,
    currentPage 
  } = useFieldStore();
  const { startPicking, isPickingPosition } = usePositionPickerStore();
  
  // Basic field info
  const [fieldKey, setFieldKey] = useState('');
  const [newOptionKey, setNewOptionKey] = useState('');
  
  // Placement configuration
  const [placementMode, setPlacementMode] = useState<PlacementMode>('separate');
  const [renderType, setRenderType] = useState<OptionRenderType>('checkmark');
  
  // Option mappings with placement status
  const [optionMappings, setOptionMappings] = useState<OptionMapping[]>([]);
  
  // Placement flow state
  const [isPlacingOptions, setIsPlacingOptions] = useState(false);
  const [currentPlacingIndex, setCurrentPlacingIndex] = useState(-1);
  const [combinedPosition, setCombinedPosition] = useState<{ x: number; y: number } | null>(null);

  // Generate simple field key for new fields
  const generateFieldKey = () => {
    const existingOptionsFields = unifiedFields.filter(f => f.variant === 'options');
    const existingNumbers = existingOptionsFields
      .map(f => {
        const match = f.key.match(/^options_(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `options_${nextNumber}`;
  };

  // Load existing field if editing
  useEffect(() => {
    if (editingFieldId && open) {
      const field = getUnifiedFieldById(editingFieldId);
      
      if (field && field.variant === 'options') {
        setFieldKey(field.key);
        
        // Load all option mappings
        if (field.optionMappings && field.optionMappings.length > 0) {
          const loadedMappings = field.optionMappings.map(m => ({
            key: m.key,
            position: m.position,
            customText: m.customText,
            placed: true
          }));
          setOptionMappings(loadedMappings);
          
          // Determine render type and placement mode
          const firstMapping = field.optionMappings[0];
          if (firstMapping.renderType) {
            setRenderType(firstMapping.renderType);
          }
          
          // Check if all positions are the same (combined mode)
          const allSamePosition = field.optionMappings.every(m => 
            m.position?.x === firstMapping.position?.x && 
            m.position?.y === firstMapping.position?.y
          );
          
          if (allSamePosition && field.optionMappings.length > 1) {
            setPlacementMode('combined');
            setCombinedPosition(firstMapping.position || null);
          } else {
            setPlacementMode('separate');
          }
        }
      }
    } else if (open && !editingFieldId) {
      // New field - generate key
      setFieldKey(generateFieldKey());
    }
  }, [editingFieldId, open]);

  // Handle Enter key to add option (when in option input) or save (when not placing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Enter' && !e.shiftKey) {
        // If we're in the new option input, add the option
        if (document.activeElement?.id === 'new-option-key' && newOptionKey.trim()) {
          e.preventDefault();
          handleAddOption();
        }
        // Otherwise, if we're not placing and have at least one option, save
        else if (!isPlacingOptions && !isPickingPosition && optionMappings.length > 0) {
          e.preventDefault();
          handleSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, newOptionKey, isPlacingOptions, isPickingPosition, optionMappings, fieldKey]);

  // Position picker callback
  useEffect(() => {
    const unsubscribe = usePositionPickerStore.subscribe((state) => {
      if (!state.isPickingPosition && isPlacingOptions) {
        const position = state.lastConfirmedPosition;
        if (position) {
          handlePositionPicked(position);
        }
      }
    });
    
    return unsubscribe;
  }, [isPlacingOptions, currentPlacingIndex, optionMappings, placementMode]);

  const handleAddOption = () => {
    const cleaned = newOptionKey.trim();
    if (!cleaned) return;
    
    // Check for duplicates
    if (optionMappings.some(m => m.key === cleaned)) {
      toast.error('Option already exists');
      return;
    }
    
    setOptionMappings([...optionMappings, { 
      key: cleaned,
      placed: false
    }]);
    setNewOptionKey('');
  };

  const handleRemoveOption = (key: string) => {
    setOptionMappings(optionMappings.filter(m => m.key !== key));
  };

  const handleUpdateCustomText = (key: string, text: string) => {
    setOptionMappings(optionMappings.map(m => 
      m.key === key ? { ...m, customText: text } : m
    ));
  };

  const handleStartPlacement = () => {
    if (placementMode === 'combined') {
      // For combined mode, pick a single position
      setIsPlacingOptions(true);
      toast.info('Click on the PDF to place all options at one position');
      startPicking('text');
    } else {
      // For separate mode, start placing the first option
      setIsPlacingOptions(true);
      setCurrentPlacingIndex(0);
      toast.info(`Click to place option: ${optionMappings[0].key}`);
      startPicking(renderType === 'checkmark' ? 'checkmark' : 'text');
    }
  };

  const handlePositionPicked = (position: { x: number; y: number; page: number }) => {
    if (placementMode === 'combined') {
      // Apply position to all options
      setCombinedPosition({ x: position.x, y: position.y });
      const updatedMappings = optionMappings.map(m => ({
        ...m,
        position: { x: position.x, y: position.y },
        placed: true
      }));
      setOptionMappings(updatedMappings);
      setIsPlacingOptions(false);
      toast.success('All options placed successfully!');
    } else {
      // Place individual option
      const updatedMappings = [...optionMappings];
      updatedMappings[currentPlacingIndex] = {
        ...updatedMappings[currentPlacingIndex],
        position: { x: position.x, y: position.y },
        placed: true
      };
      setOptionMappings(updatedMappings);
      
      // Move to next option or finish
      const nextIndex = currentPlacingIndex + 1;
      if (nextIndex < optionMappings.length) {
        setCurrentPlacingIndex(nextIndex);
        toast.info(`Click to place option: ${optionMappings[nextIndex].key}`);
        startPicking(renderType === 'checkmark' ? 'checkmark' : 'text');
      } else {
        setIsPlacingOptions(false);
        setCurrentPlacingIndex(-1);
        toast.success('All options placed successfully!');
      }
    }
  };

  const handleSave = () => {
    if (!fieldKey.trim()) {
      toast.error('Field key is required');
      return;
    }
    
    if (optionMappings.length === 0) {
      toast.error('At least one option is required');
      return;
    }
    
    // Check if all options have been placed
    const unplacedOptions = optionMappings.filter(m => !m.placed);
    if (unplacedOptions.length > 0) {
      toast.error('Please place all options on the PDF first');
      return;
    }
    
    // Prepare field data
    const fieldData = {
      key: fieldKey.trim(),
      type: 'text' as const,
      variant: 'options' as const,
      optionMappings: optionMappings.map(m => ({
        key: m.key,
        position: m.position!,
        renderType: renderType,
        customText: renderType === 'custom' ? m.customText : undefined,
        size: renderType === 'checkmark' 
          ? { width: 25, height: 25 }
          : { width: 100, height: 30 }
      })),
      page: currentPage,
      position: combinedPosition || optionMappings[0].position!,
      size: renderType === 'checkmark' 
        ? { width: 25, height: 25 }
        : { width: 100, height: 30 },
      structure: placementMode === 'combined' ? 'merged' : 'simple',
      enabled: true,
      placementCount: optionMappings.length
    };
    
    if (editingFieldId) {
      // Update existing field
      updateUnifiedField(editingFieldId, fieldData);
      toast.success('Options field updated');
    } else {
      // Create new field
      addUnifiedField(fieldData);
      toast.success('Options field created');
    }
    
    onOpenChange(false);
    resetDialog();
  };

  const resetDialog = () => {
    if (!editingFieldId) {
      setFieldKey('');
      setNewOptionKey('');
      setPlacementMode('separate');
      setRenderType('checkmark');
      setOptionMappings([]);
      setIsPlacingOptions(false);
      setCurrentPlacingIndex(-1);
      setCombinedPosition(null);
    }
  };

  const handleClose = () => {
    if (!editingFieldId) {
      resetDialog();
    }
  };

  // Check if we're currently placing
  const isCurrentlyPlacing = isPickingPosition || currentPlacingIndex >= 0;

  // Get description for render type
  const getRenderDescription = () => {
    switch (renderType) {
      case 'text':
        return 'The actual value will be shown (e.g., "male")';
      case 'checkmark':
        return 'A checkmark ✓ will appear at the position';
      case 'custom':
        return 'Your custom text will be shown for each option';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open && !isCurrentlyPlacing) {
        onOpenChange(false);
        resetDialog();
      }
    }}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] h-[90vh] sm:h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogTitle>
            {editingFieldId ? 'Edit Options Field' : 'Create Options Field'}
          </DialogTitle>
          <DialogDescription>
            Define how option values map to positions on your PDF
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 sm:space-y-6 px-4 sm:px-6 py-4">
            {/* Step 1: Field Key */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                  1
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Field Key</h3>
              </div>
              
              <div className="ml-9 sm:ml-10">
                <Input
                  id="field-key"
                  value={fieldKey}
                  onChange={(e) => {
                    // Auto-clean the field key as user types
                    const cleaned = e.target.value
                      .replace(/\s+/g, '_')  // Replace spaces with underscores
                      .replace(/[^a-zA-Z0-9_-]/g, ''); // Remove special chars
                    setFieldKey(cleaned);
                  }}
                  placeholder="e.g., options_1"
                  className="font-mono"
                  disabled={isCurrentlyPlacing}
                />
              </div>
            </div>

            <Separator />

            {/* Step 2: Display Type */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                  2
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Display Type</h3>
              </div>
              
              <div className="ml-9 sm:ml-10 space-y-3 sm:space-y-4">
                <RadioGroup 
                  value={renderType} 
                  onValueChange={(v) => setRenderType(v as OptionRenderType)}
                  disabled={isCurrentlyPlacing}
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="checkmark" id="checkmark" className="mt-1" />
                    <Label htmlFor="checkmark" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium text-sm">Checkmark</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Show ✓ at the selected option(s) position(s)
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="text" id="text" className="mt-1" />
                    <Label htmlFor="text" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Type className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium text-sm">Text Value</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Show the selected value(s) as text
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <Label htmlFor="custom" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium text-sm">Custom Text</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Show custom text for selected option(s)
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* Step 3: Placement Strategy */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                  3
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Placement Strategy</h3>
              </div>
              
              <div className="ml-9 sm:ml-10 space-y-3 sm:space-y-4">
                <RadioGroup 
                  value={placementMode} 
                  onValueChange={(v) => setPlacementMode(v as PlacementMode)}
                  disabled={isCurrentlyPlacing}
                >
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="separate" id="separate" className="mt-1" />
                    <Label htmlFor="separate" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium text-sm">Separate Positions</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Each option at its own position (like radio buttons)
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="combined" id="combined" className="mt-1" />
                    <Label htmlFor="combined" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <List className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="font-medium text-sm">Combined Position</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          All selected options appear at one position as a list
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* Step 4: Option Keys */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold">
                  4
                </div>
                <h3 className="font-semibold text-sm sm:text-base">Option Keys</h3>
              </div>
              
              <div className="ml-9 sm:ml-10 space-y-3">
                <div className="flex gap-2">
                  <Input
                    id="new-option-key"
                    value={newOptionKey}
                    onChange={(e) => setNewOptionKey(e.target.value)}
                    placeholder="e.g., male, female, other"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    disabled={isCurrentlyPlacing}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleAddOption}
                    disabled={!newOptionKey.trim() || isCurrentlyPlacing}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                
                {optionMappings.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {optionMappings.map((mapping) => (
                      <div key={mapping.key} className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                        <Badge 
                          variant={mapping.placed ? "default" : "outline"} 
                          className="font-mono text-xs"
                        >
                          {mapping.key}
                        </Badge>
                        
                        {renderType === 'custom' && (
                          <Input
                            value={mapping.customText || ''}
                            onChange={(e) => handleUpdateCustomText(mapping.key, e.target.value)}
                            placeholder="Custom text..."
                            className="flex-1 h-7 text-xs"
                            disabled={isCurrentlyPlacing}
                          />
                        )}
                        
                        {mapping.placed && (
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(mapping.key)}
                          disabled={isCurrentlyPlacing}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Info Alert */}
            {getRenderDescription() && (
              <Alert className="mx-4 sm:mx-0">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs sm:text-sm">
                  {getRenderDescription()}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 border-t">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {!isCurrentlyPlacing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onOpenChange(false);
                    handleClose();
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                
                {optionMappings.length > 0 && !optionMappings.every(m => m.placed) && (
                  <Button 
                    onClick={handleStartPlacement}
                    className="w-full sm:w-auto"
                  >
                    <MousePointer className="h-4 w-4 mr-2" />
                    Start Placement
                  </Button>
                )}
                
                {optionMappings.length > 0 && optionMappings.every(m => m.placed) && (
                  <Button 
                    onClick={handleSave}
                    className="w-full sm:w-auto"
                  >
                    Save
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center w-full gap-2 text-sm text-muted-foreground">
                <MousePointer className="h-4 w-4 animate-pulse" />
                {placementMode === 'combined' 
                  ? 'Click on the PDF to place all options'
                  : `Placing option ${currentPlacingIndex + 1} of ${optionMappings.length}: ${optionMappings[currentPlacingIndex]?.key}`
                }
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}