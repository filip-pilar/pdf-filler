import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from '@/lib/debounce';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle } from 'lucide-react';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import type { LogicField, FieldOption } from '@/types/logicField.types';
import { LogicFieldForm } from './LogicFieldForm';
import { LogicWithActions } from './LogicWithActions';
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

interface LogicFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logicField?: LogicField | null;
}

export function LogicFieldDialog({ open, onOpenChange, logicField }: LogicFieldDialogProps) {
  const { 
    updateLogicField, 
    deleteLogicField,
    addLogicField,
    logicFields,
    currentPage
  } = useFieldStore();
  const { startPicking } = usePositionPickerStore();
  
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [pendingOptionLabel, setPendingOptionLabel] = useState('');
  const [pendingOptionValue, setPendingOptionValue] = useState('');
  const [initialField, setInitialField] = useState<LogicField | null>(null);
  const [expandedOptionIndex, setExpandedOptionIndex] = useState<number | null>(null);
  const [editingOptionIndex, setEditingOptionIndex] = useState<number | null>(null);
  const optionsManagerRef = useRef<{ addOption: () => void; saveEdit: () => void } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh after position picking
  const [isPickingPosition, setIsPickingPosition] = useState(false);
  const [originalFieldKey, setOriginalFieldKey] = useState<string | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [createdFieldKey, setCreatedFieldKey] = useState<string | null>(null);
  
  // Always get the current field from store to ensure we have latest data
  const fieldToUse = React.useMemo(() => {
    // If we're explicitly given a logic field, use it
    if (logicField) {
      const currentField = logicFields.find(f => f.key === logicField.key);
      return currentField || logicField;
    }
    // If we created a field during this session, find it
    if (createdFieldKey) {
      return logicFields.find(f => f.key === createdFieldKey);
    }
    // If we have an original field key (during editing), find it
    if (originalFieldKey) {
      return logicFields.find(f => f.key === originalFieldKey);
    }
    // Otherwise return null (create mode)
    return null;
  }, [logicField, logicFields, refreshKey, originalFieldKey, createdFieldKey]);

  useEffect(() => {
    if (open) {
      // Don't reset if we're reopening after position picking
      if (isPickingPosition) {
        return;
      }
      
      if (fieldToUse) {
        // Existing field mode
        setIsCreateMode(false);
        // Store initial state to detect if it's a new field
        if (!initialField || initialField.key !== fieldToUse.key) {
          setInitialField({
            ...fieldToUse,
            options: [...fieldToUse.options]
          });
        }
        // Track the original key
        setOriginalFieldKey(fieldToUse.key);
        // Always restore when opening with existing field
        setKey(fieldToUse.key);
        setLabel(fieldToUse.label);
        setOptions(fieldToUse.options);
      } else if (!logicField && !createdFieldKey && !originalFieldKey) {
        // Create mode - generate default values
        setIsCreateMode(true);
        const existingNumbers = logicFields
          .map(f => {
            const match = f.key.match(/^logic_field_([0-9]+)$/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(n => n > 0);
        
        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        setKey(`logic_field_${nextNumber}`);
        setLabel(`Logic Field ${nextNumber}`);
        setOptions([]);
      }
    } else if (!open && !isPickingPosition) {
      // Reset everything when dialog closes (unless we're just picking position)
      setKey('');
      setLabel('');
      setOptions([]);
      setExpandedOptionIndex(null);
      setEditingOptionIndex(null);
      setInitialField(null);
      setOriginalFieldKey(null);
      setIsCreateMode(false);
      setCreatedFieldKey(null);
    }
  }, [fieldToUse, open, logicField, isPickingPosition, createdFieldKey, logicFields, originalFieldKey]);

  // Debounced save for auto-saving changes
  const debouncedSave = useMemo(
    () => debounce((updates: Partial<LogicField>) => {
      const keyToUpdate = createdFieldKey || originalFieldKey || logicField?.key;
      if (keyToUpdate) {
        updateLogicField(keyToUpdate, updates);
      }
    }, 300),
    [createdFieldKey, originalFieldKey, logicField, updateLogicField]
  );


  const handleKeyChange = (newKey: string) => {
    setKey(newKey);
    
    // If in create mode and not yet created, don't save yet
    // The field will be created when options are added or save is clicked
    if (!isCreateMode || createdFieldKey) {
      debouncedSave({ key: newKey });
    }
  };

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    
    // If in create mode and not yet created, don't save yet
    // The field will be created when options are added or save is clicked
    if (!isCreateMode || createdFieldKey) {
      debouncedSave({ label: newLabel });
    }
  };

  const handleUpdateOptions = (newOptions: FieldOption[]) => {
    setOptions(newOptions);
    
    // If in create mode and not yet created, create the field now
    if (isCreateMode && !createdFieldKey) {
      const newField: LogicField = {
        key,
        label,
        options: newOptions,
        page: currentPage
      };
      addLogicField(newField);
      setCreatedFieldKey(key);
      setIsCreateMode(false);
    } else {
      // Otherwise update existing field
      debouncedSave({ options: newOptions });
    }
  };

  const handleStartPickingPosition = useCallback((
    optionIndex: number,
    callback: (position: { x: number; y: number; page: number }) => void, 
    actionType?: string, 
    customText?: string
  ) => {
    const option = options[optionIndex];
    let content = '';
    
    // Determine what content to show based on action type
    if (actionType === 'checkmark') {
      content = '✓';
    } else if (actionType === 'fillLabel') {
      content = option?.label || 'Label';
    } else if (actionType === 'fillCustom') {
      content = customText || 'Custom Text';
    } else {
      content = 'Action';
    }
    
    // Store the currently expanded option before closing
    const currentlyExpanded = expandedOptionIndex;
    
    // Set flag before closing dialog for position picking
    setIsPickingPosition(true);
    onOpenChange(false);
    
    startPicking({
      actionId: 'temp',
      content,
      optionLabel: option?.label || 'Option',
      actionType: actionType as 'checkmark' | 'fillLabel' | 'fillCustom',
      onComplete: (position) => {
        // If in create mode, create the field now
        if (isCreateMode && !createdFieldKey) {
          const newField: LogicField = {
            key,
            label,
            options: [],
            page: currentPage
          };
          addLogicField(newField);
          setCreatedFieldKey(key);
          setIsCreateMode(false);
        }
        
        callback(position);
        setRefreshKey(k => k + 1); // Force refresh to get latest data
        setIsPickingPosition(false); // Clear flag
        onOpenChange(true);
        
        // Restore the expanded state to the option we were working on
        setTimeout(() => {
          // Keep the current option expanded since we were working on it
          setExpandedOptionIndex(optionIndex);
        }, 50);
      },
      onCancel: () => {
        setIsPickingPosition(false); // Clear flag
        onOpenChange(true);
        // Restore the previously expanded option on cancel
        setTimeout(() => {
          setExpandedOptionIndex(currentlyExpanded);
        }, 50);
      }
    });
  }, [startPicking, onOpenChange, options, expandedOptionIndex, isCreateMode, createdFieldKey, key, label, addLogicField]);


  const handleDelete = () => {
    const fieldToDelete = fieldToUse || (createdFieldKey ? { key: createdFieldKey } : null);
    if (fieldToDelete) {
      deleteLogicField(fieldToDelete.key);
      onOpenChange(false);
      setShowDeleteAlert(false);
      setCreatedFieldKey(null);
    }
  };

  const hasOptionsWithoutActions = options.some(opt => opt.actions.length === 0);
  
  const handleClose = () => {
    // If there's pending option data, add it first
    if ((pendingOptionLabel || pendingOptionValue) && optionsManagerRef.current) {
      optionsManagerRef.current.addOption();
      // Don't close the dialog, just clear the pending state
    } else {
      onOpenChange(false);
    }
  };
  
  const handleCancel = () => {
    onOpenChange(false);
  };
  
  const getButtonText = () => {
    if (editingOptionIndex !== null) {
      return 'Save Option';
    } else if (pendingOptionLabel || pendingOptionValue) {
      return 'Add Option';
    } else if (options.length === 0) {
      return 'Cancel';
    } else if (hasOptionsWithoutActions) {
      return 'Save & Configure Actions Later';
    } else {
      return 'Save & Close';
    }
  };
  
  const handleMainButtonClick = () => {
    // If in create mode and not yet created, create the field now
    if (isCreateMode && !createdFieldKey) {
      const newField: LogicField = {
        key,
        label,
        options,
        page: currentPage
      };
      addLogicField(newField);
      setCreatedFieldKey(key);
      setIsCreateMode(false);
    }
    
    if (editingOptionIndex !== null && optionsManagerRef.current) {
      // Trigger save on the LogicWithActions component
      optionsManagerRef.current.saveEdit?.();
    } else {
      handleClose();
    }
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
        <DialogContent className="max-w-lg flex flex-col max-h-[90vh] z-[100] p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>
              {logicField ? 'Edit Logic Field' : 'Create Logic Field'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configure options and their corresponding actions for conditional field population
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 pb-3">
            {/* Field Configuration */}
            <div className="space-y-4">
              <LogicFieldForm
                fieldKey={key}
                label={label}
                onKeyChange={handleKeyChange}
                onLabelChange={handleLabelChange}
                currentFieldKey={originalFieldKey || logicField?.key || undefined}
              />
            </div>

            {/* Options and Actions Manager */}
            <div className="border-t mt-5 pt-5">
              <LogicWithActions
                ref={optionsManagerRef}
                options={options}
                onOptionsChange={handleUpdateOptions}
                expandedOptionIndex={expandedOptionIndex}
                onExpandedOptionChange={setExpandedOptionIndex}
                editingOptionIndex={editingOptionIndex}
                onEditingOptionChange={setEditingOptionIndex}
                onStartPickingPosition={handleStartPickingPosition}
                onPendingOptionChange={(label, value) => {
                  setPendingOptionLabel(label);
                  setPendingOptionValue(value);
                }}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 px-5 pb-5">
            <div className="flex flex-col gap-2 w-full">
              {hasOptionsWithoutActions && options.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Some options still need actions configured</span>
                </div>
              )}
              <div className="flex justify-between w-full">
                {(logicField || createdFieldKey) && (
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
                  onClick={handleMainButtonClick}
                  variant={editingOptionIndex !== null ? "default" : options.length === 0 ? "outline" : "default"}
                >
                  {getButtonText()}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Logic Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this logic field? This action cannot be undone.
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