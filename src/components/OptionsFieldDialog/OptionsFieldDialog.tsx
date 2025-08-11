import { useState, useEffect, useRef } from 'react';
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
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeFieldKey, isValidFieldKey } from '@/lib/keyValidation';
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

// Store placement state outside component for persistence
interface PlacementState {
  fieldKey: string;
  placementMode: PlacementMode;
  renderType: OptionRenderType;
  optionMappings: OptionMapping[];
  currentPlacingIndex: number;
  combinedPosition: { x: number; y: number } | null;
  editingFieldId?: string;
}

let placementStateRef: PlacementState | null = null;

export function OptionsFieldDialog({ 
  open, 
  onOpenChange,
  editingFieldId
}: OptionsFieldDialogProps) {
  const { 
    addUnifiedField, 
    updateUnifiedField,
    deleteUnifiedField, 
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

  // Track if we should auto-reopen after placement
  const shouldReopenRef = useRef(false);
  
  // Ref for options list scroll container
  const optionsListRef = useRef<HTMLDivElement>(null);

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

  // Restore state if we're coming back from placement
  useEffect(() => {
    if (open && placementStateRef) {
      // Restore state from placement
      setFieldKey(placementStateRef.fieldKey);
      setPlacementMode(placementStateRef.placementMode);
      setRenderType(placementStateRef.renderType);
      setOptionMappings(placementStateRef.optionMappings);
      setCurrentPlacingIndex(placementStateRef.currentPlacingIndex);
      setCombinedPosition(placementStateRef.combinedPosition);
      
      // Check if placement is complete
      const allPlaced = placementStateRef.optionMappings.every(m => m.placed);
      if (allPlaced) {
        // Don't auto-save - field is already created and updated during placement
        // Just show success message
        toast.success('All options placed successfully! You can now close the dialog.');
      }
      
      // Clear the state
      placementStateRef = null;
    } else if (editingFieldId && open) {
      // Load existing field if editing
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
        // Otherwise, if we have all placed options, save
        else if (optionMappings.length > 0 && optionMappings.every(m => m.placed)) {
          e.preventDefault();
          handleSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, newOptionKey, optionMappings, fieldKey]);

  // Track last processed position to detect changes
  const lastProcessedPositionRef = useRef<{ x: number; y: number; page: number } | null>(null);
  
  // Position picker callback
  useEffect(() => {
    const unsubscribe = usePositionPickerStore.subscribe((state) => {
      if (!state.isPickingPosition && isPlacingOptions && state.lastConfirmedPosition) {
        // Check if this is a new position (not the one we already processed)
        const position = state.lastConfirmedPosition;
        const isNewPosition = !lastProcessedPositionRef.current || 
          lastProcessedPositionRef.current.x !== position.x ||
          lastProcessedPositionRef.current.y !== position.y ||
          lastProcessedPositionRef.current.page !== position.page;
        
        if (isNewPosition) {
          lastProcessedPositionRef.current = { ...position };
          handlePositionPicked(position);
        }
      }
    });
    
    return () => {
      unsubscribe();
      lastProcessedPositionRef.current = null;
    };
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
    
    // Auto-scroll to show the new option
    setTimeout(() => {
      const scrollContainer = document.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }, 100);
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
    // Create or update field immediately with initial data
    const initialFieldData = {
      key: fieldKey.trim(),
      type: 'text' as const,
      variant: 'options' as const,
      optionMappings: optionMappings.map(m => ({
        key: m.key,
        position: m.position || { x: 100, y: 100 }, // Default position if not placed
        renderType: renderType,
        customText: renderType === 'custom' ? m.customText : undefined,
        size: renderType === 'checkmark' 
          ? { width: 25, height: 25 }
          : { width: 100, height: 30 }
      })),
      page: currentPage,
      position: { x: 100, y: 100 }, // Will be updated during placement
      size: renderType === 'checkmark' 
        ? { width: 25, height: 25 }
        : { width: 100, height: 30 },
      structure: placementMode === 'combined' ? 'merged' : 'simple',
      enabled: true,
      placementCount: optionMappings.length
    };
    
    let fieldId = editingFieldId;
    if (!fieldId) {
      // Create new field immediately
      const newField = addUnifiedField(initialFieldData);
      fieldId = newField.id;
      toast.success('Options field created - now place the options');
    } else {
      // Update existing field
      updateUnifiedField(fieldId, initialFieldData);
    }
    
    // Save current state with field ID
    placementStateRef = {
      fieldKey,
      placementMode,
      renderType,
      optionMappings,
      currentPlacingIndex: 0,
      combinedPosition,
      editingFieldId: fieldId // Save the field ID for updates
    };
    
    // Close dialog to allow PDF interaction
    onOpenChange(false);
    shouldReopenRef.current = true;
    
    // Start placement
    setIsPlacingOptions(true);
    
    if (placementMode === 'combined') {
      toast.info('Click on the PDF to place all options at one position');
      startPicking({
        actionId: 'options-field-combined',
        content: `All ${optionMappings.length} options`,
        optionLabel: fieldKey,
        actionType: renderType === 'checkmark' ? 'checkmark' : 'text',
        onComplete: () => {},
        onCancel: () => {
          setIsPlacingOptions(false);
          toast.error('Placement cancelled');
          onOpenChange(true);
        }
      });
    } else {
      setCurrentPlacingIndex(0);
      const firstOption = optionMappings[0];
      toast.info(`Click to place option 1 of ${optionMappings.length}: ${firstOption.key}`);
      startPicking({
        actionId: `options-field-${firstOption.key}`,
        content: renderType === 'checkmark' ? '✓' : firstOption.key,
        optionLabel: `${fieldKey} (1/${optionMappings.length})`,
        actionType: renderType === 'checkmark' ? 'checkmark' : 'text',
        onComplete: () => {},
        onCancel: () => {
          setIsPlacingOptions(false);
          toast.error('Placement cancelled');
          onOpenChange(true);
        }
      });
    }
  };

  const handlePositionPicked = (position: { x: number; y: number; page: number }) => {
    if (!placementStateRef) return;
    
    if (placementStateRef.placementMode === 'combined') {
      // Apply position to all options
      placementStateRef.combinedPosition = { x: position.x, y: position.y };
      placementStateRef.optionMappings = placementStateRef.optionMappings.map(m => ({
        ...m,
        position: { x: position.x, y: position.y },
        placed: true
      }));
      
      // Update field in store immediately
      if (placementStateRef.editingFieldId) {
        const updatedFieldData = {
          position: position,
          optionMappings: placementStateRef.optionMappings.map(m => ({
            key: m.key,
            position: m.position!,
            renderType: placementStateRef.renderType,
            customText: placementStateRef.renderType === 'custom' ? m.customText : undefined,
            size: placementStateRef.renderType === 'checkmark' 
              ? { width: 25, height: 25 }
              : { width: 100, height: 30 }
          }))
        };
        updateUnifiedField(placementStateRef.editingFieldId, updatedFieldData);
      }
      
      setIsPlacingOptions(false);
      toast.success('All options placed!');
      
      // Reopen dialog
      setTimeout(() => {
        onOpenChange(true);
      }, 500);
    } else {
      // Place individual option
      const currentIndex = placementStateRef.currentPlacingIndex;
      placementStateRef.optionMappings[currentIndex] = {
        ...placementStateRef.optionMappings[currentIndex],
        position: { x: position.x, y: position.y },
        placed: true
      };
      
      // Update field in store immediately with the new option position
      if (placementStateRef.editingFieldId) {
        const updatedFieldData = {
          position: placementStateRef.optionMappings[0].position || position, // Use first option position as field position
          optionMappings: placementStateRef.optionMappings.map(m => ({
            key: m.key,
            position: m.position || { x: 100, y: 100 },
            renderType: placementStateRef.renderType,
            customText: placementStateRef.renderType === 'custom' ? m.customText : undefined,
            size: placementStateRef.renderType === 'checkmark' 
              ? { width: 25, height: 25 }
              : { width: 100, height: 30 }
          }))
        };
        updateUnifiedField(placementStateRef.editingFieldId, updatedFieldData);
        toast.success(`Option "${placementStateRef.optionMappings[currentIndex].key}" placed`);
      }
      
      // Move to next option or finish
      const nextIndex = currentIndex + 1;
      if (nextIndex < placementStateRef.optionMappings.length) {
        placementStateRef.currentPlacingIndex = nextIndex;
        setCurrentPlacingIndex(nextIndex); // Update React state too
        const nextOption = placementStateRef.optionMappings[nextIndex];
        const totalOptions = placementStateRef.optionMappings.length;
        toast.info(`Click to place option ${nextIndex + 1} of ${totalOptions}: ${nextOption.key}`);
        
        // Need to restart picking for the next option
        setTimeout(() => {
          startPicking({
            actionId: `options-field-${nextOption.key}`,
            content: placementStateRef.renderType === 'checkmark' ? '✓' : nextOption.key,
            optionLabel: `${placementStateRef.fieldKey} (${nextIndex + 1}/${totalOptions})`,
            actionType: placementStateRef.renderType === 'checkmark' ? 'checkmark' : 'text',
            onComplete: () => {},
            onCancel: () => {
              setIsPlacingOptions(false);
              toast.error('Placement cancelled');
              onOpenChange(true);
            }
          });
        }, 100); // Small delay to ensure state updates
      } else {
        setIsPlacingOptions(false);
        setCurrentPlacingIndex(-1);
        toast.success('All options placed successfully!');
        
        // Reopen dialog
        setTimeout(() => {
          onOpenChange(true);
        }, 500);
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
    
    // If field was created during placement, don't create another one
    // The field is already in the store with all the correct data
    if (placementStateRef && placementStateRef.editingFieldId && !editingFieldId) {
      // Final update to ensure everything is saved
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
      
      updateUnifiedField(placementStateRef.editingFieldId, fieldData);
      toast.success('Options field saved successfully');
    } else if (editingFieldId) {
      // Update existing field (editing mode)
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
      
      updateUnifiedField(editingFieldId, fieldData);
      toast.success('Options field updated');
    } else {
      // Create new field (shouldn't normally reach here if placement worked)
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
      placementStateRef = null;
      shouldReopenRef.current = false;
    }
  };


  // Check if ready to place
  const canStartPlacement = optionMappings.length > 0 && !optionMappings.every(m => m.placed);
  const canSave = optionMappings.length > 0 && optionMappings.every(m => m.placed);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        // If closing and not in placement mode, reset
        if (!shouldReopenRef.current) {
          resetDialog();
        }
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            {editingFieldId ? 'Edit Options Field' : 'Create Options Field'}
          </DialogTitle>
          <DialogDescription>
            Define how option values map to positions on your PDF
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Step 1: Field Key */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Field Key</Label>
              <Input
                id="field-key"
                value={fieldKey}
                onChange={(e) => {
                  const sanitized = sanitizeFieldKey(e.target.value);
                  setFieldKey(sanitized);
                }}
                onBlur={() => {
                  // Ensure key follows pattern on blur
                  if (fieldKey && !isValidFieldKey(fieldKey)) {
                    const sanitized = sanitizeFieldKey(fieldKey);
                    setFieldKey(sanitized);
                    if (!sanitized) {
                      toast.error('Invalid field key. Must start with a letter and contain only letters, numbers, underscores, and hyphens.');
                    }
                  }
                }}
                placeholder="e.g., options_1"
                className="font-mono"
              />
            </div>

            <Separator />

            {/* Step 2: Display Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Display Type</Label>
              <RadioGroup 
                value={renderType} 
                onValueChange={(v) => setRenderType(v as OptionRenderType)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checkmark" id="checkmark" />
                  <Label htmlFor="checkmark" className="flex items-center gap-2 cursor-pointer">
                    <CheckSquare className="h-4 w-4" />
                    Checkmark (shows ✓)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer">
                    <Type className="h-4 w-4" />
                    Text Value (shows the option text)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    Custom Text (define custom text per option)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Step 3: Placement Strategy */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Placement Strategy</Label>
              <RadioGroup 
                value={placementMode} 
                onValueChange={(v) => setPlacementMode(v as PlacementMode)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="separate" id="separate" />
                  <Label htmlFor="separate" className="flex items-center gap-2 cursor-pointer">
                    <MapPin className="h-4 w-4" />
                    Separate Positions (each option at its own spot)
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="combined" id="combined" />
                  <Label htmlFor="combined" className="flex items-center gap-2 cursor-pointer">
                    <List className="h-4 w-4" />
                    Combined Position (all options at one spot)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Step 4: Option Keys */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Options</Label>
              <div className="flex gap-2">
                <Input
                  id="new-option-key"
                  value={newOptionKey}
                  onChange={(e) => setNewOptionKey(e.target.value)}
                  placeholder="e.g., male, approved, yes"
                  className="w-1/2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddOption}
                  disabled={!newOptionKey.trim()}
                  className="w-1/2"
                >
                  Add Option
                </Button>
              </div>
              
              {optionMappings.length > 0 && (
                <ScrollArea 
                  className="h-[200px] rounded-md border bg-background/50"
                  ref={optionsListRef}
                >
                  <div className="p-3 space-y-2">
                    {optionMappings.map((mapping) => (
                      <div key={mapping.key} className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                        <Badge 
                          variant={mapping.placed ? "default" : "outline"} 
                          className="font-mono shrink-0"
                        >
                          {mapping.key}
                        </Badge>
                        
                        {renderType === 'custom' && (
                          <Input
                            value={mapping.customText || ''}
                            onChange={(e) => handleUpdateCustomText(mapping.key, e.target.value)}
                            placeholder="Custom text..."
                            className="flex-1 h-8 text-sm"
                          />
                        )}
                        
                        {mapping.placed && (
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(mapping.key)}
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex justify-between w-full">
            <div>
              {editingFieldId && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this options field?')) {
                      deleteUnifiedField(editingFieldId);
                      toast.success('Options field deleted');
                      onOpenChange(false);
                      resetDialog();
                    }
                  }}
                >
                  Delete Field
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  onOpenChange(false);
                  resetDialog();
                }}
              >
                Cancel
              </Button>
              
              {canStartPlacement && (
                <Button 
                  onClick={handleStartPlacement}
                  className="gap-2"
                >
              <MousePointer className="h-4 w-4" />
              Start Placement
            </Button>
          )}
          
          {canSave && (
            <Button onClick={handleSave}>
              Save Field
            </Button>
          )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}