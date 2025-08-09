import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from '@/lib/debounce';
import { sanitizeFieldKey } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import type { BooleanField } from '@/types/booleanField.types';
import { BooleanFieldForm } from './BooleanFieldForm';
import { BooleanActionsEditor } from './BooleanActionsEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BooleanFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booleanField?: BooleanField | null;
  initialField?: BooleanField;
  initialDropPosition?: { x: number; y: number; page: number };
}

export function BooleanFieldDialog({ 
  open, 
  onOpenChange, 
  booleanField, 
  initialField: propsInitialField,
  initialDropPosition 
}: BooleanFieldDialogProps) {
  const { 
    updateBooleanField, 
    deleteBooleanField,
    addBooleanField,
    booleanFields,
    currentPage
  } = useFieldStore();
  const { startPicking } = usePositionPickerStore();
  
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [initialField, setInitialField] = useState<BooleanField | null>(null);
  const [isPickingPosition, setIsPickingPosition] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh after position picking
  const [originalFieldKey, setOriginalFieldKey] = useState<string | null>(null); // Store original key for lookups
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createdFieldKey, setCreatedFieldKey] = useState<string | null>(null);
  
  // Always get the current field from store to ensure we have latest data
  // This will re-calculate whenever booleanFields changes or refreshKey changes
  const fieldToUse = React.useMemo(() => {
    // If we have a created field key, use it to find the field
    if (createdFieldKey) {
      return booleanFields.find(f => f.key === createdFieldKey);
    }
    // If we have an original field key (editing), find it
    if (originalFieldKey) {
      return booleanFields.find(f => f.key === originalFieldKey);
    }
    // If we're explicitly given a boolean field, use it
    if (booleanField) {
      const currentField = booleanFields.find(f => f.key === booleanField.key);
      return currentField || booleanField;
    }
    // Otherwise check props
    return propsInitialField || null;
  }, [booleanField, booleanFields, propsInitialField, refreshKey, createdFieldKey, originalFieldKey]);

  useEffect(() => {
    if (open) {
      if (fieldToUse) {
        // Existing field mode
        setIsCreateMode(false);
        // Store initial state to detect if it's a new field
        if (!initialField || initialField.key !== fieldToUse.key) {
          setInitialField({
            ...fieldToUse,
            trueActions: [...fieldToUse.trueActions],
            falseActions: [...fieldToUse.falseActions]
          });
        }
        // Always update the original field key when dialog opens - this is the key the field currently has
        setOriginalFieldKey(fieldToUse.key);
        // Always restore field data when opening
        setKey(fieldToUse.key);
        setLabel(fieldToUse.label);
        
        // If we have an initial drop position and no actions, automatically place first action
        if (initialDropPosition && fieldToUse.trueActions.length === 0 && fieldToUse.falseActions.length === 0) {
          // Automatically add a TRUE checkmark action at the drop position
          const newAction = {
            id: `act_${Date.now()}`,
            type: 'checkmark' as const,
            position: initialDropPosition
          };
          const newTrueActions = [newAction];
          // Direct store update
          updateBooleanField(fieldToUse.key, { trueActions: newTrueActions });
        }
      } else if (!booleanField && !createdFieldKey) {
        // Create mode - generate default values
        setIsCreateMode(true);
        const existingNumbers = booleanFields
          .map(f => {
            const match = f.key.match(/^boolean_field_([0-9]+)$/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(n => n > 0);
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        setKey(`boolean_field_${nextNumber}`);
        setLabel(`Boolean Field ${nextNumber}`);
      }
    } else if (!open && !isPickingPosition) {
      // Only reset when truly closing, not during position picking
      if (!booleanField && !createdFieldKey) {
        setKey('');
        setLabel('');
        setInitialField(null);
        setOriginalFieldKey(null);
        setIsCreateMode(false);
        setCreatedFieldKey(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldToUse, open, initialDropPosition, updateBooleanField, isPickingPosition, booleanField, createdFieldKey, booleanFields]);

  // Debounced save for auto-saving changes
  const debouncedSave = useMemo(
    () => debounce((fieldKeyToUpdate: string, updates: Partial<BooleanField>) => {
      if (fieldKeyToUpdate) {
        // Save immediately to store using the original key
        updateBooleanField(fieldKeyToUpdate, updates);
      }
    }, 300),
    [updateBooleanField]
  );

  const handleKeyChange = (newKey: string) => {
    const sanitized = sanitizeFieldKey(newKey);
    setKey(sanitized);
    // Don't update the key in the store immediately - this causes lookup issues
    // The key will be saved when the dialog closes
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    if (originalFieldKey) {
      debouncedSave(originalFieldKey, { label: newLabel });
    }
  };

  const handleUpdateTrueActions = (actions: BooleanField['trueActions']) => {
    if (originalFieldKey) {
      updateBooleanField(originalFieldKey, { trueActions: actions });
    }
  };

  const handleUpdateFalseActions = (actions: BooleanField['falseActions']) => {
    if (originalFieldKey) {
      updateBooleanField(originalFieldKey, { falseActions: actions });
    }
  };

  const handleStartPickingPosition = useCallback((
    callback: (position: { x: number; y: number; page: number }) => void, 
    isTrue: boolean,
    actionType?: string, 
    customText?: string
  ) => {
    let content = '';
    
    // Determine what content to show based on action type
    if (actionType === 'checkmark') {
      content = '✓';
    } else if (actionType === 'fillCustom') {
      content = customText || 'Custom Text';
    } else {
      content = 'Action';
    }
    
    // Set flag before closing dialog for position picking
    setIsPickingPosition(true);
    onOpenChange(false);
    
    startPicking({
      actionId: 'temp',
      content,
      optionLabel: isTrue ? 'TRUE' : 'FALSE',
      actionType: actionType as 'checkmark' | 'fillCustom',
      onComplete: (position) => {
        // If in create mode, create the field now
        let fieldKeyToUse = createdFieldKey || originalFieldKey || key;
        if (isCreateMode && !createdFieldKey) {
          const newField: BooleanField = {
            key,
            label,
            trueActions: [],
            falseActions: [],
            page: currentPage
          };
          addBooleanField(newField);
          setCreatedFieldKey(key);
          setOriginalFieldKey(key); // Also set the original field key
          setIsCreateMode(false);
          fieldKeyToUse = key; // Use the newly created key
        }
        
        // First call the callback which adds the action to store with the correct key
        callback(position);
        
        // Force refresh to get fresh data
        setRefreshKey(prev => prev + 1);
        setIsPickingPosition(false);
        
        // Reopen dialog immediately
        onOpenChange(true);
      },
      onCancel: () => {
        setIsPickingPosition(false);
        onOpenChange(true);
      }
    });
  }, [startPicking, onOpenChange, isCreateMode, createdFieldKey, key, label, addBooleanField]);

  const handleDelete = () => {
    const fieldToDelete = propsInitialField || booleanField;
    if (fieldToDelete) {
      deleteBooleanField(fieldToDelete.key);
      onOpenChange(false);
      setShowDeleteAlert(false);
    }
  };

  // Get field key for store lookups - this is the key that the field currently has in the store
  // NOT the key being edited in the input field
  const fieldKeyForLookup = createdFieldKey || originalFieldKey || booleanField?.key || propsInitialField?.key || fieldToUse?.key;
  
  // ALWAYS get fresh data from store on every render for real-time updates
  // Use the same pattern as BooleanActionsEditor for consistency
  const currentFieldFromStore = React.useMemo(() => {
    if (!fieldKeyForLookup) return null;
    // Find the field using the stable lookup key
    return booleanFields.find(f => f.key === fieldKeyForLookup);
  }, [fieldKeyForLookup, booleanFields]);
  
  // Calculate notification states based on fresh store data
  
  const handleClose = () => {
    // If this is a field with no actions, treat as cancel
    if (!fieldToUse || (currentFieldFromStore?.trueActions?.length === 0 && currentFieldFromStore?.falseActions?.length === 0)) {
      // Delete the field if it was created
      if (createdFieldKey) {
        deleteBooleanField(createdFieldKey);
      }
      onOpenChange(false);
      return;
    }
    
    // Save all pending changes
    if (originalFieldKey || createdFieldKey) {
      const fieldKeyToUpdate = createdFieldKey || originalFieldKey;
      const updates: Partial<BooleanField> = {};
      
      // Save the key if it has changed
      if (key && key !== fieldKeyToUpdate) {
        updates.key = key;
      }
      
      // Save the label if it's different from what's in store
      if (label !== currentFieldFromStore?.label) {
        updates.label = label;
      }
      
      // Apply all updates at once
      if (Object.keys(updates).length > 0 && fieldKeyToUpdate) {
        updateBooleanField(fieldKeyToUpdate, updates);
      }
    }
    
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Delete the field if it was created but has no actions
    if (createdFieldKey && (!currentFieldFromStore || 
        (currentFieldFromStore.trueActions.length === 0 && currentFieldFromStore.falseActions.length === 0))) {
      deleteBooleanField(createdFieldKey);
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleCancel();
        } else {
          onOpenChange(newOpen);
        }
      }}>
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh] z-[100] p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>
              Configure actions for TRUE and FALSE values
            </DialogTitle>
            <DialogDescription className="sr-only">
              Set up the field properties and define what happens when the checkbox is checked or unchecked.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-5 px-5 pb-3">
            {/* Field Configuration Form */}
            <div className="space-y-4">
              <BooleanFieldForm
                fieldKey={key}
                label={label}
                onKeyChange={handleKeyChange}
                onLabelChange={handleLabelChange}
                currentFieldKey={fieldKeyForLookup || undefined}
              />
            </div>

            {/* Actions Editor */}
            <div className="border-t pt-5">
              <BooleanActionsEditor
                key={`${refreshKey}-${currentFieldFromStore?.trueActions?.length || 0}-${currentFieldFromStore?.falseActions?.length || 0}`}
                booleanFieldKey={fieldKeyForLookup || key || ''}
                fieldLabel={label}
                trueActions={currentFieldFromStore?.trueActions || []}
                falseActions={currentFieldFromStore?.falseActions || []}
                onUpdateTrueActions={handleUpdateTrueActions}
                onUpdateFalseActions={handleUpdateFalseActions}
                onStartPickingPosition={handleStartPickingPosition}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 px-5 pb-5">
            <div className="flex justify-between w-full">
              {booleanField && (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                className="ml-auto"
                onClick={handleClose}
                variant={!fieldToUse || (currentFieldFromStore?.trueActions?.length === 0 && currentFieldFromStore?.falseActions?.length === 0) ? "outline" : "default"}
              >
                {!fieldToUse || (currentFieldFromStore?.trueActions?.length === 0 && currentFieldFromStore?.falseActions?.length === 0) ? 'Cancel' : 'Save & Close'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Boolean Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this boolean field? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}