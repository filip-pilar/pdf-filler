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
  sampleValue?: string;  // Sample value to show when renderType is 'text'
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
  
  // Ref for dialog scroll container
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Validation errors
  const [fieldKeyError, setFieldKeyError] = useState('');
  const [optionKeyError, setOptionKeyError] = useState('');

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

  // Restore state if we're coming back from placement or load field for editing
  useEffect(() => {
    if (open && placementStateRef) {
      // We have placement state - either continuing placement or just finished
      const fieldIdToEdit = placementStateRef.editingFieldId || editingFieldId;
      
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
        // Placement complete - we're now effectively editing this field
        // Keep the state but don't clear placementStateRef yet
      }
    } else if (editingFieldId && open && !placementStateRef) {
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
            sampleValue: m.sampleValue,
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
    } else if (open && !editingFieldId && !placementStateRef) {
      // New field - reset everything and generate key
      setFieldKey(generateFieldKey());
      setNewOptionKey('');
      setPlacementMode('separate');
      setRenderType('checkmark');
      setOptionMappings([]);
      setCurrentPlacingIndex(-1);
      setCombinedPosition(null);
      setIsPlacingOptions(false);
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
    if (!cleaned) {
      setOptionKeyError('Option key is required');
      return;
    }
    
    // Check for duplicates
    if (optionMappings.some(m => m.key === cleaned)) {
      setOptionKeyError('This option already exists');
      return;
    }
    
    setOptionMappings([...optionMappings, { 
      key: cleaned,
      placed: false
    }]);
    setNewOptionKey('');
    setOptionKeyError('');
    
    // Auto-scroll dialog to bottom to show the new option
    requestAnimationFrame(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    });
  };

  const handleRemoveOption = (key: string) => {
    setOptionMappings(optionMappings.filter(m => m.key !== key));
  };

  const handleUpdateCustomText = (key: string, text: string) => {
    setOptionMappings(optionMappings.map(m => 
      m.key === key ? { ...m, customText: text } : m
    ));
  };
  
  const handleUpdateSampleValue = (key: string, value: string) => {
    setOptionMappings(optionMappings.map(m => 
      m.key === key ? { ...m, sampleValue: value } : m
    ));
  };

  const handleRepositionOption = (optionKey: string) => {
    // Find the option to reposition
    const optionIndex = optionMappings.findIndex(m => m.key === optionKey);
    if (optionIndex === -1) return;
    
    const option = optionMappings[optionIndex];
    
    // Save state for when we return
    placementStateRef = {
      fieldKey,
      placementMode: 'separate', // Always separate for repositioning single option
      renderType,
      optionMappings,
      currentPlacingIndex: optionIndex,
      combinedPosition,
      editingFieldId: editingFieldId || undefined
    };
    
    // Close dialog and start position picker
    onOpenChange(false);
    shouldReopenRef.current = true;
    setIsPlacingOptions(true);
    setCurrentPlacingIndex(optionIndex);
    
    startPicking({
      actionId: `reposition-${option.key}`,
      content: renderType === 'checkmark' ? '✓' : (renderType === 'custom' ? option.customText || option.key : (option.sampleValue || option.key)),
      optionLabel: `Reposition ${option.key}`,
      actionType: renderType === 'checkmark' ? 'checkmark' : 'text',
      onComplete: () => {},
      onCancel: () => {
        setIsPlacingOptions(false);
        onOpenChange(true);
      }
    });
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
        sampleValue: renderType === 'text' ? (m.sampleValue || m.key) : undefined,
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
      startPicking({
        actionId: 'options-field-combined',
        content: `All ${optionMappings.length} options`,
        optionLabel: fieldKey,
        actionType: renderType === 'checkmark' ? 'checkmark' : 'text',
        onComplete: () => {},
        onCancel: () => {
          setIsPlacingOptions(false);
          onOpenChange(true);
        }
      });
    } else {
      setCurrentPlacingIndex(0);
      const firstOption = optionMappings[0];
      startPicking({
        actionId: `options-field-${firstOption.key}`,
        content: renderType === 'checkmark' ? '✓' : (renderType === 'custom' ? firstOption.customText || firstOption.key : (firstOption.sampleValue || firstOption.key)),
        optionLabel: `${fieldKey} (1/${optionMappings.length})`,
        actionType: renderType === 'checkmark' ? 'checkmark' : 'text',
        onComplete: () => {},
        onCancel: () => {
          setIsPlacingOptions(false);
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
            sampleValue: placementStateRef.renderType === 'text' ? (m.sampleValue || m.key) : undefined,
            size: placementStateRef.renderType === 'checkmark' 
              ? { width: 25, height: 25 }
              : { width: 100, height: 30 }
          }))
        };
        updateUnifiedField(placementStateRef.editingFieldId, updatedFieldData);
      }
      
      setIsPlacingOptions(false);
      
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
            sampleValue: placementStateRef.renderType === 'text' ? (m.sampleValue || m.key) : undefined,
            size: placementStateRef.renderType === 'checkmark' 
              ? { width: 25, height: 25 }
              : { width: 100, height: 30 }
          }))
        };
        updateUnifiedField(placementStateRef.editingFieldId, updatedFieldData);
      }
      
      // Check if this was a repositioning action (not part of initial placement)
      const isRepositioning = placementStateRef.optionMappings.filter(m => !m.placed).length === 0;
      
      if (isRepositioning) {
        // Single reposition done, go back to dialog
        setIsPlacingOptions(false);
        setCurrentPlacingIndex(-1);
        
        // Reopen dialog
        setTimeout(() => {
          onOpenChange(true);
        }, 500);
      } else {
        // Continue with placement sequence
        const nextIndex = currentIndex + 1;
        if (nextIndex < placementStateRef.optionMappings.length && !placementStateRef.optionMappings[nextIndex].placed) {
          // Find next unplaced option
          let nextUnplacedIndex = nextIndex;
          while (nextUnplacedIndex < placementStateRef.optionMappings.length && placementStateRef.optionMappings[nextUnplacedIndex].placed) {
            nextUnplacedIndex++;
          }
          
          if (nextUnplacedIndex < placementStateRef.optionMappings.length) {
            placementStateRef.currentPlacingIndex = nextUnplacedIndex;
            setCurrentPlacingIndex(nextUnplacedIndex);
            const nextOption = placementStateRef.optionMappings[nextUnplacedIndex];
            const totalOptions = placementStateRef.optionMappings.length;
            const unplacedCount = placementStateRef.optionMappings.filter(m => !m.placed).length;
            
            // Need to restart picking for the next option
            setTimeout(() => {
              startPicking({
                actionId: `options-field-${nextOption.key}`,
                content: placementStateRef.renderType === 'checkmark' ? '✓' : (placementStateRef.renderType === 'custom' ? nextOption.customText || nextOption.key : (nextOption.sampleValue || nextOption.key)),
                optionLabel: `${placementStateRef.fieldKey} (${totalOptions - unplacedCount + 1}/${totalOptions})`,
                actionType: placementStateRef.renderType === 'checkmark' ? 'checkmark' : 'text',
                onComplete: () => {},
                onCancel: () => {
                  setIsPlacingOptions(false);
                  onOpenChange(true);
                }
              });
            }, 100);
          } else {
            // All done
            setIsPlacingOptions(false);
            setCurrentPlacingIndex(-1);
            
            // Reopen dialog
            setTimeout(() => {
              onOpenChange(true);
            }, 500);
          }
        } else {
          // All done
          setIsPlacingOptions(false);
          setCurrentPlacingIndex(-1);
          
          // Reopen dialog
          setTimeout(() => {
            onOpenChange(true);
          }, 500);
        }
      }
    }
  };

  const handleSave = () => {
    // Clear previous errors
    setFieldKeyError('');
    setOptionKeyError('');
    
    // Validate field key
    if (!fieldKey.trim()) {
      setFieldKeyError('Field key is required');
      return;
    }
    
    if (!isValidFieldKey(fieldKey)) {
      setFieldKeyError('Invalid field key format');
      return;
    }
    
    if (optionMappings.length === 0) {
      setOptionKeyError('At least one option is required');
      return;
    }
    
    // Check if all options have been placed
    const unplacedOptions = optionMappings.filter(m => !m.placed);
    if (unplacedOptions.length > 0) {
      setOptionKeyError(`Please place all options on the PDF first (${unplacedOptions.length} remaining)`);
      return;
    }
    
    // Determine which field ID we're working with
    const fieldId = editingFieldId || placementStateRef?.editingFieldId;
    
    if (fieldId) {
      // Update existing field (either passed as prop or created during placement)
      const fieldData = {
        key: fieldKey.trim(),
        type: 'text' as const,
        variant: 'options' as const,
        optionMappings: optionMappings.map(m => ({
          key: m.key,
          position: m.position!,
          renderType: renderType,
          customText: renderType === 'custom' ? m.customText : undefined,
          sampleValue: renderType === 'text' ? (m.sampleValue || m.key) : undefined,
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
      
      updateUnifiedField(fieldId, fieldData);
      
      // Clear placement state after successful save since we're now officially editing
      if (placementStateRef && !editingFieldId) {
        placementStateRef = null;
      }
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
          sampleValue: renderType === 'text' ? (m.sampleValue || m.key) : undefined,
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
    }
    
    onOpenChange(false);
    resetDialog();
  };

  const resetDialog = () => {
    // Only reset if we're not continuing to edit a field we just created
    const shouldKeepState = placementStateRef?.editingFieldId && !editingFieldId;
    
    if (!shouldKeepState && !editingFieldId) {
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
            {(editingFieldId || placementStateRef?.editingFieldId) ? 'Edit Options Field' : 'Create Options Field'}
          </DialogTitle>
          <DialogDescription>
            Define how option values map to positions on your PDF
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollAreaRef}>
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
                  setFieldKeyError('');
                }}
                onBlur={() => {
                  // Validate key on blur
                  if (fieldKey && !isValidFieldKey(fieldKey)) {
                    setFieldKeyError('Invalid format. Use only letters, numbers, underscores, and hyphens.');
                  } else {
                    setFieldKeyError('');
                  }
                }}
                placeholder="e.g., options_1"
                className={cn("font-mono", fieldKeyError && "border-destructive")}
              />
              {fieldKeyError && (
                <p className="text-xs text-destructive mt-1">{fieldKeyError}</p>
              )}
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
                    <span>
                      <span className="font-medium">Checkmark</span>
                      <span className="text-xs text-muted-foreground ml-1">(shows ✓ when selected)</span>
                    </span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="text" />
                  <Label htmlFor="text" className="flex items-center gap-2 cursor-pointer">
                    <Type className="h-4 w-4" />
                    <span>
                      <span className="font-medium">Option Value</span>
                      <span className="text-xs text-muted-foreground ml-1">(displays the data value for this option)</span>
                    </span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex items-center gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    <span>
                      <span className="font-medium">Custom Text</span>
                      <span className="text-xs text-muted-foreground ml-1">(map each option to custom text)</span>
                    </span>
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
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="new-option-key"
                    value={newOptionKey}
                    onChange={(e) => {
                      setNewOptionKey(e.target.value);
                      setOptionKeyError('');
                    }}
                    placeholder="e.g., male, approved, yes"
                    className={cn("flex-1", optionKeyError && "border-destructive")}
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
                  >
                    Add Option
                  </Button>
                </div>
                {optionKeyError && (
                  <p className="text-xs text-destructive">{optionKeyError}</p>
                )}
              </div>
              
              {optionMappings.length > 0 && (
                <div className="rounded-md border bg-background/50">
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
                        
                        {renderType === 'text' && (
                          <Input
                            value={mapping.sampleValue || ''}
                            onChange={(e) => handleUpdateSampleValue(mapping.key, e.target.value)}
                            placeholder={`Sample value for ${mapping.key}...`}
                            className="flex-1 h-8 text-sm"
                          />
                        )}
                        
                        {mapping.placed && (
                          <>
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRepositionOption(mapping.key)}
                              className="h-8 w-8 p-0 shrink-0"
                              title="Reposition this option"
                            >
                              <MapPin className="h-3 w-3" />
                            </Button>
                          </>
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
                </div>
              )}
            </div>

          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex justify-between w-full">
            <div>
              {(editingFieldId || placementStateRef?.editingFieldId) && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    const fieldIdToDelete = editingFieldId || placementStateRef?.editingFieldId;
                    if (fieldIdToDelete && confirm('Are you sure you want to delete this options field?')) {
                      deleteUnifiedField(fieldIdToDelete);
                      placementStateRef = null;  // Clear placement state after deletion
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