import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Check, Type, Edit3, MapPin, AlertCircle, Plus, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ActionItem } from './ActionItem';
import type { FieldOption, FieldAction } from '@/types/logicField.types';

interface ActionsEditorProps {
  options: FieldOption[];
  selectedOptionIndex: number;
  onUpdateOption: (index: number, updates: Partial<FieldOption>) => void;
  onStartPickingPosition: (callback: (position: { x: number; y: number; page: number }) => void, actionType?: string, customText?: string) => void;
  onSelectedOptionChange: (index: number) => void;
  onCloseDialog?: () => void;
}

export function ActionsEditor({
  options,
  selectedOptionIndex,
  onUpdateOption,
  onStartPickingPosition,
  onSelectedOptionChange,
  onCloseDialog
}: ActionsEditorProps) {
  const [actionType, setActionType] = useState<'checkmark' | 'fillLabel' | 'fillCustom'>('checkmark');
  const [customText, setCustomText] = useState('');
  const [localSelectedIndex, setLocalSelectedIndex] = useState(selectedOptionIndex);
  const [showActionCompleteDialog, setShowActionCompleteDialog] = useState(false);
  const [justPlacedOption, setJustPlacedOption] = useState<string>('');
  const selectedOption = options[localSelectedIndex];
  
  useEffect(() => {
    setLocalSelectedIndex(selectedOptionIndex);
  }, [selectedOptionIndex]);
  
  const handleOptionChange = (index: number) => {
    setLocalSelectedIndex(index);
    onSelectedOptionChange(index);
  };

  if (!selectedOption) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No option selected</p>
        <p className="text-sm">Add options first, then configure their actions</p>
      </div>
    );
  }

  const handleAddAction = () => {
    // For custom text, ensure we have text before picking position
    if (actionType === 'fillCustom' && !customText.trim()) {
      return;
    }
    
    onStartPickingPosition((position) => {
      const newAction: FieldAction = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: actionType,
        position,
        customText: actionType === 'fillCustom' ? customText.trim() : undefined
      };

      const updatedOption = {
        ...selectedOption,
        actions: [...selectedOption.actions, newAction]
      };
      onUpdateOption(localSelectedIndex, updatedOption);
      
      // Set the option that was just placed and show dialog
      setJustPlacedOption(selectedOption.label);
      setShowActionCompleteDialog(true);
      
      // Clear custom text after adding
      if (actionType === 'fillCustom') {
        setCustomText('');
      }
    }, actionType, customText);
  };

  const handleUpdateAction = (actionId: string, updates: Partial<FieldAction>) => {
    const updatedActions = selectedOption.actions.map(a =>
      a.id === actionId ? { ...a, ...updates } : a
    );
    onUpdateOption(localSelectedIndex, { actions: updatedActions });
  };

  const handleDeleteAction = (actionId: string) => {
    const updatedActions = selectedOption.actions.filter(a => a.id !== actionId);
    onUpdateOption(localSelectedIndex, { actions: updatedActions });
  };



  const optionsWithoutActions = options.filter(opt => opt.actions.length === 0);

  return (
    <>
    <div className="space-y-4">
      {/* Progress Indicator */}
      {options.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Configuration Progress</span>
            <span className="text-sm text-muted-foreground">
              {options.filter(opt => opt.actions.length > 0).length} of {options.length} complete
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(options.filter(opt => opt.actions.length > 0).length / options.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Option Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Configure Actions For:</Label>
          {optionsWithoutActions.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span className="font-medium">{optionsWithoutActions.length} need actions</span>
            </div>
          )}
        </div>
        <Select 
            value={localSelectedIndex.toString()} 
            onValueChange={(value) => handleOptionChange(parseInt(value))}
            disabled={options.length === 0}
          >
            <SelectTrigger className="w-full hover:bg-accent transition-colors">
              <div className="flex items-center justify-between w-full">
                <SelectValue />
                {selectedOption && selectedOption.actions.length === 0 && (
                  <span className="flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="z-[200]">
              {options.map((option, index) => (
                <SelectItem key={option.key} value={index.toString()}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="font-medium">{option.label}</span>
                    <div className="flex items-center gap-2">
                      {option.actions.length === 0 ? (
                        <>
                          <span className="flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                          <span className="text-xs text-red-600 font-medium">needs actions</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">✓ {option.actions.length} actions</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
      </div>

      <div className="space-y-2">
        <Label>Add Action</Label>
        <div className="space-y-3">
          <ToggleGroup 
            type="single" 
            value={actionType} 
            onValueChange={(value) => {
              if (value) {
                setActionType(value as 'checkmark' | 'fillLabel' | 'fillCustom');
                if (value !== 'fillCustom') {
                  setCustomText('');
                }
              }
            }}
            className="justify-start"
          >
            <ToggleGroupItem 
              value="checkmark" 
              aria-label="Checkmark" 
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-input hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Check className="h-4 w-4" />
              <span className="font-medium">Checkmark</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="fillLabel" 
              aria-label="Fill with Label" 
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-input hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Type className="h-4 w-4" />
              <span className="font-medium">Label</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="fillCustom" 
              aria-label="Fill with Custom Text" 
              className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground border border-input hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Edit3 className="h-4 w-4" />
              <span className="font-medium">Custom Text</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          {actionType === 'fillCustom' && (
            <Input
              placeholder="Enter custom text to fill"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && customText.trim()) {
                  e.preventDefault();
                  handleAddAction();
                }
              }}
            />
          )}
          
          <Button 
            onClick={handleAddAction}
            disabled={actionType === 'fillCustom' && !customText.trim()}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Pick Position on PDF
          </Button>
        </div>
      </div>

      {selectedOption.actions.length > 0 && (
        <div className="space-y-2">
          <Label>Actions ({selectedOption.actions.length})</Label>
          <ScrollArea className="h-[300px] w-full">
            <div className="space-y-2 pr-4">
              {selectedOption.actions.map((action) => (
                <ActionItem
                  key={action.id}
                  action={action}
                  onUpdate={(updates) => handleUpdateAction(action.id, updates)}
                  onDelete={() => handleDeleteAction(action.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
    
    {/* Action Complete Dialog */}
    <AlertDialog open={showActionCompleteDialog} onOpenChange={setShowActionCompleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Action Placed Successfully
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription>
            You've successfully added an action for "{justPlacedOption}". 
            Would you like to add more actions or are you done configuring?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => {
              setShowActionCompleteDialog(false);
              if (onCloseDialog) {
                onCloseDialog();
              }
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            I'm Done
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              setShowActionCompleteDialog(false);
              // Check if there are more options that need actions
              const optionsNeedingActions = options.filter((opt, idx) => 
                opt.actions.length === 0 && idx !== localSelectedIndex
              );
              
              if (optionsNeedingActions.length > 0) {
                // Auto-advance to next option needing actions
                const nextIncompleteIndex = options.findIndex(opt => opt.actions.length === 0);
                if (nextIncompleteIndex !== -1 && nextIncompleteIndex !== localSelectedIndex) {
                  handleOptionChange(nextIncompleteIndex);
                }
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add More Actions
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}