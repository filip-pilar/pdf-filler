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

  // Load existing field if editing
  useEffect(() => {
    if (editingFieldId && open) {
      const field = getUnifiedFieldById(editingFieldId);
      console.log('Loading field for editing:', field);
      
      if (field && field.variant === 'options') {
        setFieldKey(field.key);
        
        // Load all option mappings
        if (field.optionMappings && field.optionMappings.length > 0) {
          console.log('Loading option mappings:', field.optionMappings);
          
          const loadedMappings = field.optionMappings.map(m => ({
            key: m.key,
            position: m.position,
            customText: m.customText,
            placed: true
          }));
          setOptionMappings(loadedMappings);
          
          // Check if all options share the same position (combined mode)
          const firstPos = field.optionMappings[0].position;
          const allSamePosition = field.optionMappings.every(
            m => m.position.x === firstPos.x && m.position.y === firstPos.y
          );
          
          console.log('All same position?', allSamePosition, 'First pos:', firstPos);
          
          if (allSamePosition && field.optionMappings.length > 1) {
            setPlacementMode('combined');
            setCombinedPosition(firstPos);
          } else {
            setPlacementMode('separate');
          }
        }
        
        setRenderType(field.renderType || 'checkmark');
      }
    } else if (open) {
      // Reset for new field
      resetDialog();
    }
  }, [editingFieldId, open, getUnifiedFieldById]);

  const resetDialog = () => {
    setFieldKey('');
    setNewOptionKey('');
    setPlacementMode('separate');
    setRenderType('checkmark');
    setOptionMappings([]);
    setIsPlacingOptions(false);
    setCurrentPlacingIndex(-1);
    setCombinedPosition(null);
  };

  // Reposition a single option
  const repositionSingleOption = (optionKey: string) => {
    const option = optionMappings.find(m => m.key === optionKey);
    if (!option) return;
    
    // Close dialog temporarily
    onOpenChange(false);
    
    const actionType = renderType === 'checkmark' ? 'checkmark' : 
                       renderType === 'custom' ? 'fillCustom' : 'fillLabel';
    const displayText = renderType === 'custom' && option.customText 
      ? option.customText 
      : option.key;
    
    // Start position picker for this specific option
    setTimeout(() => {
      startPicking({
        actionId: `${fieldKey}_${option.key}_reposition`,
        content: displayText,
        optionLabel: `Reposition "${option.key}"`,
        actionType: actionType,
        onComplete: (position) => {
          // Update just this option's position
          const updatedMappings = optionMappings.map(m => 
            m.key === optionKey 
              ? { ...m, position, placed: true }
              : m
          );
          setOptionMappings(updatedMappings);
          
          // Save the field with updated position
          if (editingFieldId) {
            const field = getUnifiedFieldById(editingFieldId);
            if (field) {
              updateUnifiedField(editingFieldId, {
                ...field,
                optionMappings: updatedMappings.map(m => ({
                  key: m.key,
                  position: m.position!,
                  size: renderType === 'checkmark' 
                    ? { width: 25, height: 25 }
                    : { width: 100, height: 30 },
                  customText: m.customText
                }))
              });
              toast.success(`Repositioned "${optionKey}"`);
            }
          }
          
          // Reopen dialog
          onOpenChange(true);
        },
        onCancel: () => {
          // Reopen dialog if cancelled
          onOpenChange(true);
        }
      });
    }, 200);
  };
  
  // Validate key - no spaces or special characters
  const validateKey = (key: string): string | null => {
    const trimmed = key.trim();
    if (!trimmed) return null;
    
    // Replace spaces with underscores and remove special chars
    const cleaned = trimmed
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_-]/g, ''); // Only allow alphanumeric, underscore, hyphen
    
    return cleaned || null;
  };
  
  const handleAddOption = () => {
    const cleaned = validateKey(newOptionKey);
    if (!cleaned) {
      if (newOptionKey.trim()) {
        toast.error('Invalid key. Use only letters, numbers, underscores, and hyphens.');
      }
      return;
    }
    
    if (optionMappings.some(m => m.key === cleaned)) {
      toast.error(`Option "${cleaned}" already exists`);
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

  const handleCustomTextChange = (key: string, text: string) => {
    setOptionMappings(prev => prev.map(m => 
      m.key === key ? { ...m, customText: text } : m
    ));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newOptionKey.trim()) {
      e.preventDefault();
      handleAddOption();
    }
  };

  // Start the placement flow
  const startPlacement = () => {
    if (!fieldKey.trim()) {
      toast.error('Please enter a field key');
      return;
    }
    if (optionMappings.length === 0) {
      toast.error('Please add at least one option');
      return;
    }

    setIsPlacingOptions(true);
    
    // Close the dialog to show the PDF clearly
    onOpenChange(false);
    
    // Small delay to let dialog close animation complete
    setTimeout(() => {
      if (placementMode === 'combined') {
        // Place single position for all options
        placeCombinedPosition();
      } else {
        // Start placing individual options with current mappings
        setCurrentPlacingIndex(0);
        placeNextOption(0, optionMappings);
      }
    }, 200);
  };

  // Place combined position (for list mode)
  const placeCombinedPosition = () => {
    startPicking({
      actionId: `${fieldKey}_combined`,
      content: 'combined list',
      optionLabel: 'All Options',
      actionType: 'fillLabel',
      onComplete: (position) => {
        setCombinedPosition(position);
        // Update all option mappings with the same position
        const updatedMappings = optionMappings.map(m => ({
          ...m,
          position,
          placed: true
        }));
        setOptionMappings(updatedMappings);
        finishPlacement(updatedMappings);
      },
      onCancel: () => {
        setIsPlacingOptions(false);
        setCurrentPlacingIndex(-1);
        // Reopen dialog if cancelled
        onOpenChange(true);
      }
    });
  };

  // Place individual option positions - NOT using useCallback to avoid stale closures
  const placeNextOption = (index: number, mappingsToPlace?: OptionMapping[]) => {
    // Use passed mappings or current state
    const currentMappings = mappingsToPlace || optionMappings;
    
    if (index >= currentMappings.length) {
      // All placed, save the field with current mappings
      finishPlacement(currentMappings);
      return;
    }

    const option = currentMappings[index];
    const actionType = renderType === 'checkmark' ? 'checkmark' : 
                       renderType === 'custom' ? 'fillCustom' : 'fillLabel';
    const displayText = renderType === 'custom' && option.customText 
      ? option.customText 
      : option.key;
    
    startPicking({
      actionId: `${fieldKey}_${option.key}`,
      content: displayText,
      optionLabel: `${option.key} (${index + 1} of ${currentMappings.length})`,
      actionType: actionType,
      onComplete: (position) => {
        // Update the mapping with position
        const updatedMappings = [...currentMappings];
        updatedMappings[index] = {
          ...updatedMappings[index],
          position,
          placed: true
        };
        setOptionMappings(updatedMappings);
        
        // Move to next option
        const nextIndex = index + 1;
        if (nextIndex < updatedMappings.length) {
          setCurrentPlacingIndex(nextIndex);
          // Small delay for visual feedback, pass the updated mappings
          setTimeout(() => placeNextOption(nextIndex, updatedMappings), 100);
        } else {
          // All done with all mappings
          finishPlacement(updatedMappings);
        }
      },
      onCancel: () => {
        setIsPlacingOptions(false);
        setCurrentPlacingIndex(-1);
        // Reopen dialog if cancelled  
        onOpenChange(true);
      }
    });
  };

  // Complete the placement and create/update field
  const finishPlacement = (mappings: OptionMapping[]) => {
    // Determine field type based on renderType
    const fieldType = renderType === 'checkmark' ? 'checkbox' : 'text';
    
    // Debug: check what we're about to save
    const finalMappings = mappings.filter(m => m.position && m.key !== 'combined').map(m => ({
      key: m.key,
      position: m.position!,
      size: renderType === 'checkmark' 
        ? { width: 25, height: 25 }
        : { width: 100, height: 30 },
      customText: renderType === 'custom' ? m.customText : undefined
    }));
    
    console.log('Saving field with mappings:', finalMappings);
    
    const field = {
      key: fieldKey,
      type: fieldType as const,
      variant: 'options' as const,
      page: currentPage,
      position: placementMode === 'combined' 
        ? combinedPosition || { x: 100, y: 100 }
        : mappings[0]?.position || { x: 100, y: 100 },
      enabled: true,
      structure: 'array' as const,  // Always array since options can be multiple
      multiSelect: true,  // The actual behavior depends on the data at generation time
      renderType,
      placementCount: finalMappings.length,
      optionMappings: finalMappings
    };
    
    if (editingFieldId) {
      updateUnifiedField(editingFieldId, field);
      toast.success(`Field "${fieldKey}" updated`);
    } else {
      addUnifiedField(field);
      toast.success(`Field "${fieldKey}" created with ${optionMappings.length} options`);
    }
    
    // Reset state
    setIsPlacingOptions(false);
    setCurrentPlacingIndex(-1);
    // Don't reset dialog if we're editing - we want to keep the state
    if (!editingFieldId) {
      resetDialog();
    }
    // Dialog already closed, don't reopen
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
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {editingFieldId ? 'Edit Options Field' : 'Create Options Field'}
          </DialogTitle>
          <DialogDescription>
            Define how option values map to positions on your PDF
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-4">
            {/* Step 1: Field Key */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <h3 className="font-semibold">Field Key</h3>
              </div>
              
              <div className="ml-10">
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
                  placeholder="e.g., gender, status, permissions"
                  className="font-mono"
                  disabled={isCurrentlyPlacing}
                />
              </div>
            </div>

            <Separator />

            {/* Step 2: Display Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <h3 className="font-semibold">Display Type</h3>
              </div>
              
              <div className="ml-10 space-y-4">
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
                          <CheckSquare className="h-4 w-4" />
                          <span className="font-medium">Checkmark</span>
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
                          <Type className="h-4 w-4" />
                          <span className="font-medium">Text Value</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Show the selected value(s) as text at the position(s)
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <Label htmlFor="custom" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">Custom Text</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Show custom text for the selected option(s) at the position(s)
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* Step 3: Placement Strategy */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <h3 className="font-semibold">Placement Strategy</h3>
              </div>
              
              <div className="ml-10 space-y-4">
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
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">Each option at its own position</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Like checkboxes or radio buttons on a form - each option has a specific location
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="combined" id="combined" className="mt-1" />
                    <Label htmlFor="combined" className="cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          <span className="font-medium">All selected at one position</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Selected values appear as a list at a single location (e.g., "option1, option2")
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            {/* Step 4: Option Keys */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  4
                </div>
                <h3 className="font-semibold">Define Options</h3>
              </div>
              
              <div className="ml-10 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                      value={newOptionKey}
                      onChange={(e) => setNewOptionKey(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="e.g., male, female, other"
                      className="font-mono"
                      disabled={isCurrentlyPlacing}
                    />
                  <Button
                    onClick={handleAddOption}
                    variant="outline"
                    disabled={!newOptionKey.trim() || isCurrentlyPlacing}
                    className="w-full"
                  >
                    Add Option
                  </Button>
                </div>

                {/* Options List - Compact */}
                {optionMappings.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {optionMappings.map((mapping) => (
                        <div key={mapping.key} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border bg-secondary/50">
                          <span className="font-mono text-sm">{mapping.key}</span>
                          {mapping.placed && (
                            <Check className="h-3 w-3 text-green-600" />
                          )}
                          {editingFieldId && mapping.placed && placementMode === 'separate' && (
                            <Button
                              onClick={() => repositionSingleOption(mapping.key)}
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0 hover:bg-primary/20"
                              disabled={isCurrentlyPlacing}
                              title="Reposition this option"
                            >
                              <MapPin className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            onClick={() => handleRemoveOption(mapping.key)}
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0 ml-1 hover:bg-destructive/20"
                            disabled={isCurrentlyPlacing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    {editingFieldId && optionMappings.some(m => m.placed) && placementMode === 'separate' && (
                      <p className="text-xs text-muted-foreground">
                        Click the pin icon to reposition individual options
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No options added yet
                  </div>
                )}
                
                {/* Custom text inputs for custom render type */}
                {renderType === 'custom' && optionMappings.length > 0 && (
                  <div className="space-y-2 mt-4 p-3 bg-muted/50 rounded-lg">
                    <Label className="text-xs font-medium">Custom Display Text</Label>
                    {optionMappings.map((mapping) => (
                      <div key={mapping.key} className="flex items-center gap-2">
                        <span className="font-mono text-sm w-24">{mapping.key}:</span>
                        <Input
                          value={mapping.customText || ''}
                          onChange={(e) => handleCustomTextChange(mapping.key, e.target.value)}
                          placeholder="Display text"
                          className="h-7 text-sm flex-1"
                          disabled={isCurrentlyPlacing}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* Placement Progress */}
            {isPlacingOptions && currentPlacingIndex >= 0 && (
              <Alert>
                <MousePointer className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">
                      Placing option {currentPlacingIndex + 1} of {optionMappings.length}
                    </div>
                    <div className="text-xs">
                      Click on the PDF to place: <span className="font-mono">{optionMappings[currentPlacingIndex]?.key}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (!isCurrentlyPlacing) {
                onOpenChange(false);
                resetDialog();
              }
            }}
            disabled={isCurrentlyPlacing}
          >
            Cancel
          </Button>
          <Button
            onClick={startPlacement}
            disabled={!fieldKey.trim() || optionMappings.length === 0 || isCurrentlyPlacing}
            className="gap-2"
          >
            {isCurrentlyPlacing ? (
              <>
                <MousePointer className="h-4 w-4 animate-pulse" />
                Placing Options...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Start Placement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}