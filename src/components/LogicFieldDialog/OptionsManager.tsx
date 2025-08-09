import { useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizeFieldKey } from '@/lib/utils';
import { Plus, X, AlertCircle, Edit2, Check, XCircle } from 'lucide-react';
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
import type { FieldOption } from '@/types/logicField.types';

interface OptionsManagerProps {
  options: FieldOption[];
  onOptionsChange: (options: FieldOption[]) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onPendingOptionChange?: (label: string, key: string) => void;
}

export interface OptionsManagerRef {
  addOption: () => void;
}

export const OptionsManager = forwardRef<OptionsManagerRef, OptionsManagerProps>(({ 
  options, 
  onOptionsChange,
  selectedIndex,
  onSelectedIndexChange,
  onPendingOptionChange
}, ref) => {
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');

  const handleLabelChange = (label: string) => {
    setNewOptionLabel(label);
    // Auto-generate value only if field is empty
    if (!newOptionValue) {
      setNewOptionValue(`option_${options.length + 1}`);
    }
    // Notify parent of pending changes
    if (onPendingOptionChange) {
      onPendingOptionChange(label, newOptionValue || `option_${options.length + 1}`);
    }
  };

  const handleAddOption = () => {
    const optLabel = newOptionLabel.trim();
    const optValue = newOptionValue.trim() || `option_${options.length + 1}`;
    
    if (optLabel && optValue && !options.some(o => o.key === optValue)) {
      const newOption: FieldOption = { 
        label: optLabel, 
        key: optValue,
        actions: []
      };
      onOptionsChange([...options, newOption]);
      setNewOptionLabel('');
      setNewOptionValue('');
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
    
    if (selectedIndex >= newOptions.length) {
      onSelectedIndexChange(Math.max(0, newOptions.length - 1));
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
    setEditingIndex(index);
    setEditLabel(option.label);
    setEditValue(option.key);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    const trimmedLabel = editLabel.trim();
    const trimmedValue = editValue.trim();
    
    if (!trimmedLabel || !trimmedValue) return;
    
    // Check if value is unique (excluding current option)
    const isDuplicate = options.some((opt, idx) => 
      idx !== editingIndex && opt.key === trimmedValue
    );
    
    if (isDuplicate) {
      // Could show error toast here
      return;
    }
    
    const newOptions = [...options];
    newOptions[editingIndex] = {
      ...newOptions[editingIndex],
      label: trimmedLabel,
      key: trimmedValue
    };
    
    onOptionsChange(newOptions);
    setEditingIndex(null);
    setEditLabel('');
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditLabel('');
    setEditValue('');
  };

  // Expose addOption function to parent
  useImperativeHandle(ref, () => ({
    addOption: handleAddOption
  }));

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Add Option</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Label (e.g., Corporation)"
              value={newOptionLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Input
              placeholder="Value (e.g., corp)"
              value={newOptionValue}
              onChange={(e) => {
                const sanitized = sanitizeFieldKey(e.target.value);
                setNewOptionValue(sanitized);
                // Notify parent of pending changes
                if (onPendingOptionChange) {
                  onPendingOptionChange(newOptionLabel, sanitized);
                }
              }}
              onKeyPress={handleKeyPress}
              className="flex-1 font-mono"
            />
            <Button
              onClick={handleAddOption}
              disabled={!newOptionLabel.trim()}
              size="icon"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Values are used for data binding (alphanumeric and underscore only)
          </p>
        </div>

        {options.length > 0 && (
          <div className="space-y-2">
            <Label>Options ({options.length})</Label>
            <ScrollArea className="h-[200px] w-full rounded-md border p-2">
              <div className="space-y-1">
                {options.map((option, index) => (
                <div
                  key={option.key}
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors"
                >
                  <div className="flex-1">
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            placeholder="Label"
                            className="flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(sanitizeFieldKey(e.target.value))}
                            placeholder="Value"
                            className="flex-1 font-mono"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveEdit();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleSaveEdit}
                            disabled={!editLabel.trim() || !editValue.trim()}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            ({option.key})
                          </span>
                        </div>
                        {option.actions.length > 0 ? (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {option.actions.length} actions configured
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-red-600">⚠️ Configure actions for this option</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {editingIndex !== index && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStartEdit(index)}
                        title="Edit option"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteIndex(index)}
                        title="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

    <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
      <AlertDialogContent className="z-[150]">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Option</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove the option "{deleteIndex !== null ? options[deleteIndex]?.label : ''}"? 
            This will also delete all associated actions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDeleteIndex(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRemoveOption} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
});