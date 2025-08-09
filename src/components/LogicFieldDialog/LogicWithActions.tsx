import { useState, forwardRef, useImperativeHandle } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  X, 
  Edit2, 
  Edit3,
  Check, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  Type,
  MapPin
} from 'lucide-react';
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
import type { FieldOption, FieldAction } from '@/types/logicField.types';

interface LogicWithActionsProps {
  options: FieldOption[];
  onOptionsChange: (options: FieldOption[]) => void;
  expandedOptionIndex: number | null;
  onExpandedOptionChange: (index: number | null) => void;
  editingOptionIndex: number | null;
  onEditingOptionChange: (index: number | null) => void;
  onStartPickingPosition: (
    optionIndex: number,
    callback: (position: { x: number; y: number; page: number }) => void,
    actionType?: string,
    customText?: string
  ) => void;
  onPendingOptionChange?: (label: string, value: string) => void;
}

export interface LogicWithActionsRef {
  addOption: () => void;
  saveEdit: () => void;
}

interface LogicActionRowProps {
  option: FieldOption;
  onAddAction: (actionType: 'checkmark' | 'fillLabel' | 'fillCustom', customText?: string) => void;
  onDeleteAction: (actionId: string) => void;
}

function LogicActionRow({ 
  option, 
  onAddAction, 
  onDeleteAction
}: LogicActionRowProps) {
  const [actionType, setActionType] = useState<'checkmark' | 'fillLabel' | 'fillCustom'>('checkmark');
  const [customText, setCustomText] = useState('');
  const [showAddAction, setShowAddAction] = useState(option.actions.length === 0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<{ id: string; type: string; text?: string } | null>(null);
  
  // Auto-show action builder only when initially no actions exist
  React.useEffect(() => {
    if (option.actions.length === 0) {
      setShowAddAction(true);
    } else {
      setShowAddAction(false);
    }
  }, [option.actions.length]);

  const handlePlaceAction = () => {
    if (actionType === 'fillCustom' && !customText.trim()) {
      return;
    }
    onAddAction(actionType, customText);
    // Clear custom text and hide input row after adding
    if (actionType === 'fillCustom') {
      setCustomText('');
    }
    setShowAddAction(false);
  };

  const handleCancel = () => {
    setShowAddAction(false);
    setCustomText('');
    setActionType('checkmark');
  };

  const handleDeleteClick = (action: FieldAction) => {
    setActionToDelete({
      id: action.id,
      type: action.type,
      text: action.customText
    });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (actionToDelete) {
      onDeleteAction(actionToDelete.id);
    }
    setShowDeleteConfirm(false);
    setActionToDelete(null);
  };

  const formatActionDisplay = (action: FieldAction) => {
    if (action.type === 'checkmark') {
      return '✓';
    } else if (action.type === 'fillLabel') {
      return `"${option.label}"`;
    }
    return `"${action.customText}"`;
  };

  const getActionTypeDisplay = () => {
    if (!actionToDelete) return '';
    if (actionToDelete.type === 'checkmark') return 'checkmark';
    if (actionToDelete.type === 'fillLabel') return `label "${option.label}"`;
    return `custom text "${actionToDelete.text}"`;
  };

  return (
    <>
      <div className="space-y-3">
        {/* Option Info */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm">When</span>
          <div className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-sm">
            {option.label}
          </div>
          <span className="text-sm">is selected, then:</span>
        </div>

          {/* Existing Actions */}
          {option.actions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Existing actions:
              </Label>
              <div className="space-y-1.5">
                {option.actions.map((action) => (
                  <div
                    key={action.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-sm w-full"
                  >
                    <span className="text-muted-foreground">Place</span>
                    <span className="font-medium">{formatActionDisplay(action)}</span>
                    <span className="text-muted-foreground">
                      at page {action.position.page} ({Math.round(action.position.x)}, {Math.round(action.position.y)})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteClick(action);
                      }}
                      className="ml-auto h-6 w-6 p-0 hover:bg-destructive/20 relative z-10"
                      aria-label="Delete action"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Another Action Button */}
          {option.actions.length > 0 && !showAddAction && (
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAction(true)}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add another action
              </Button>
            </div>
          )}

          {/* Action Builder */}
          {showAddAction && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm">Place</span>
              
              <Select 
                value={actionType} 
                onValueChange={(value: 'checkmark' | 'fillLabel' | 'fillCustom') => {
                  setActionType(value);
                  if (value !== 'fillCustom') {
                    setCustomText('');
                  }
                }}
              >
                <SelectTrigger className="h-8 text-sm w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[250]" align="start">
                  <SelectItem value="checkmark">
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      <span>Checkmark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fillLabel">
                    <div className="flex items-center gap-2">
                      <Type className="h-3 w-3" />
                      <span>{option.label || 'Option Label'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fillCustom">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-3 w-3" />
                      <span>Custom Text</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {actionType === 'fillCustom' && (
                <Input
                  placeholder="enter text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-[140px] h-8 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customText.trim()) {
                      e.preventDefault();
                      handlePlaceAction();
                    }
                  }}
                />
              )}

              <span className="text-sm">at</span>

              <Button
                variant="default"
                size="sm"
                onClick={handlePlaceAction}
                disabled={actionType === 'fillCustom' && !customText.trim()}
                className="h-8 w-8 p-0"
                title="Pick position on PDF"
              >
                <MapPin className="h-4 w-4" />
              </Button>

              {option.actions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 ml-2"
                >
                  Cancel
                </Button>
              )}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {getActionTypeDisplay()} action 
              from the "{option.label}" option?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const LogicWithActions = forwardRef<LogicWithActionsRef, LogicWithActionsProps>(({ 
  options, 
  onOptionsChange,
  expandedOptionIndex,
  onExpandedOptionChange,
  editingOptionIndex,
  onEditingOptionChange,
  onStartPickingPosition,
  onPendingOptionChange
}, ref) => {
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionKey, setNewOptionKey] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editKey, setEditKey] = useState('');

  const handleLabelChange = (label: string) => {
    setNewOptionLabel(label);
    // Auto-generate key only if field is empty
    if (!newOptionKey) {
      setNewOptionKey(`option_${options.length + 1}`);
    }
    // Notify parent of pending changes
    if (onPendingOptionChange) {
      onPendingOptionChange(label, newOptionKey || `option_${options.length + 1}`);
    }
  };

  const handleAddOption = () => {
    const optLabel = newOptionLabel.trim();
    const optKey = newOptionKey.trim() || `option_${options.length + 1}`;
    
    if (optLabel && optKey && !options.some(o => o.key === optKey)) {
      const newOption: FieldOption = { 
        label: optLabel, 
        key: optKey,
        actions: []
      };
      const newOptions = [...options, newOption];
      onOptionsChange(newOptions);
      setNewOptionLabel('');
      setNewOptionKey('');
      // Auto-expand the newly added option
      onExpandedOptionChange(newOptions.length - 1);
      // Clear pending state in parent
      if (onPendingOptionChange) {
        onPendingOptionChange('', '');
      }
    }
  };

  const handleRemoveOption = () => {
    if (deleteIndex === null) return;
    
    const newOptions = options.filter((_, i) => i !== deleteIndex);
    onOptionsChange(newOptions);
    
    // Adjust expanded index if needed
    if (expandedOptionIndex === deleteIndex) {
      onExpandedOptionChange(null);
    } else if (expandedOptionIndex !== null && expandedOptionIndex > deleteIndex) {
      onExpandedOptionChange(expandedOptionIndex - 1);
    }
    
    setDeleteIndex(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newOptionLabel.trim()) {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleStartEdit = (index: number) => {
    const option = options[index];
    onEditingOptionChange(index);
    setEditLabel(option.label);
    setEditKey(option.key);
  };

  const handleSaveEdit = () => {
    if (editingOptionIndex === null) return;
    
    const trimmedLabel = editLabel.trim();
    const trimmedKey = editKey.trim();
    
    if (!trimmedLabel || !trimmedKey) return;
    
    // Check if key is unique (excluding current option)
    const isDuplicate = options.some((opt, idx) => 
      idx !== editingOptionIndex && opt.key === trimmedKey
    );
    
    if (isDuplicate) {
      return;
    }
    
    const newOptions = [...options];
    newOptions[editingOptionIndex] = {
      ...newOptions[editingOptionIndex],
      label: trimmedLabel,
      key: trimmedKey
    };
    
    // Preserve the expanded state after save
    const wasExpanded = expandedOptionIndex === editingOptionIndex;
    
    onOptionsChange(newOptions);
    onEditingOptionChange(null);
    setEditLabel('');
    setEditKey('');
    
    // Restore expanded state if it was expanded before edit
    if (wasExpanded) {
      setTimeout(() => onExpandedOptionChange(editingOptionIndex), 0);
    }
  };

  const handleCancelEdit = () => {
    onEditingOptionChange(null);
    setEditLabel('');
    setEditKey('');
  };

  const handleAddAction = (optionIndex: number, actionType: 'checkmark' | 'fillLabel' | 'fillCustom', customText?: string) => {
    onStartPickingPosition(optionIndex, (position) => {
      const newAction: FieldAction = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: actionType,
        position,
        customText: actionType === 'fillCustom' ? customText?.trim() : undefined
      };

      const newOptions = [...options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        actions: [...newOptions[optionIndex].actions, newAction]
      };
      onOptionsChange(newOptions);
    }, actionType, customText);
  };

  const handleDeleteAction = (optionIndex: number, actionId: string) => {
    const newOptions = [...options];
    newOptions[optionIndex] = {
      ...newOptions[optionIndex],
      actions: newOptions[optionIndex].actions.filter(a => a.id !== actionId)
    };
    onOptionsChange(newOptions);
  };

  // Expose functions to parent
  useImperativeHandle(ref, () => ({
    addOption: handleAddOption,
    saveEdit: handleSaveEdit
  }));

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="option-label">Options</Label>
          
          {/* Add New Option Form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="option-label"
                placeholder="Option label"
                value={newOptionLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Input
                placeholder="Key"
                value={newOptionKey}
                onChange={(e) => {
                  setNewOptionKey(e.target.value);
                  if (onPendingOptionChange) {
                    onPendingOptionChange(newOptionLabel, e.target.value);
                  }
                }}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={handleAddOption}
                disabled={!newOptionLabel.trim()}
                size="default"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Options List with Actions */}
          {options.length > 0 && (
            <div className="space-y-2 mt-4">
              {options.map((option, index) => (
                <div key={option.key}>
                  {editingOptionIndex === index ? (
                    // Edit Mode
                    <div className="border rounded-lg border-blue-500 p-3">
                      <div className="flex gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Label"
                            className="flex-1"
                            autoFocus
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                            }}
                          />
                          <Input
                            value={editKey}
                            onChange={(e) => setEditKey(e.target.value)}
                            placeholder="Key"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={handleSaveEdit}
                            title="Save changes (Enter)"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            title="Cancel (Escape)"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode with Actions
                    <Collapsible 
                      open={expandedOptionIndex === index}
                      onOpenChange={(open) => onExpandedOptionChange(open ? index : null)}
                    >
                      <div className="space-y-2">
                        {/* Option Header */}
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left hover:bg-accent rounded px-2 py-1">
                            {expandedOptionIndex === index ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{option.label}</span>
                            <Badge variant="secondary" className="ml-2">
                              {option.key}
                            </Badge>
                            {option.actions.length === 0 ? (
                              <Badge variant="destructive" className="ml-auto">
                                No actions
                              </Badge>
                            ) : (
                              <Badge variant="default" className="ml-auto">
                                {option.actions.length} action{option.actions.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </CollapsibleTrigger>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEdit(index)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteIndex(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Expanded Actions */}
                        <CollapsibleContent>
                          <LogicActionRow
                            option={option}
                            onAddAction={(actionType, customText) => handleAddAction(index, actionType, customText)}
                            onDeleteAction={(actionId) => handleDeleteAction(index, actionId)}
                          />
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}
                </div>
              ))}
            </div>
          )}

          {options.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No options added yet. Add your first option above.
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={() => setDeleteIndex(null)}>
        <AlertDialogContent className="z-[150]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteIndex !== null ? options[deleteIndex]?.label : ''}"? 
              This will also remove all associated actions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteIndex(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveOption}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});