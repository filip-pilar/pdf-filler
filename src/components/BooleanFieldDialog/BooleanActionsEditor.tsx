import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Check, Type, MapPin, CheckCircle, Plus, X, AlertCircle } from 'lucide-react';
import { useFieldStore } from '@/store/fieldStore';
import type { BooleanField, BooleanFieldAction } from '@/types/booleanField.types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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

interface BooleanActionsEditorProps {
  booleanFieldKey: string;
  fieldLabel: string;
  trueActions: BooleanField['trueActions'];
  falseActions: BooleanField['falseActions'];
  onUpdateTrueActions: (actions: BooleanField['trueActions']) => void;
  onUpdateFalseActions: (actions: BooleanField['falseActions']) => void;
  onStartPickingPosition: (
    callback: (position: { x: number; y: number; page: number }) => void,
    isTrue: boolean,
    actionType?: string,
    customText?: string
  ) => void;
}

interface ActionRowProps {
  isTrue: boolean;
  fieldLabel: string;
  actions: BooleanFieldAction[];
  onAddAction: (actionType: 'checkmark' | 'fillCustom', customText?: string) => void;
  onDeleteAction: (actionId: string) => void;
  needsConfiguration: boolean;
}

function ActionRow({ 
  isTrue, 
  fieldLabel, 
  actions, 
  onAddAction, 
  onDeleteAction,
  needsConfiguration
}: ActionRowProps) {
  const [actionType, setActionType] = useState<'checkmark' | 'fillCustom'>('checkmark');
  const [customText, setCustomText] = useState('');
  const [showAddAction, setShowAddAction] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<{ id: string; type: string; text?: string } | null>(null);
  
  // Update showAddAction when actions change
  React.useEffect(() => {
    if (actions.length === 0) {
      setShowAddAction(true);
    }
  }, [actions.length]);

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

  const handleDeleteClick = (action: BooleanFieldAction) => {
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

  const formatActionDisplay = (action: BooleanFieldAction) => {
    if (action.type === 'checkmark') {
      return '✓';
    }
    return `"${action.customText}"`;
  };

  const getActionTypeDisplay = () => {
    if (!actionToDelete) return '';
    return actionToDelete.type === 'checkmark' ? 'checkmark' : `custom text "${actionToDelete.text}"`;
  };

  return (
    <>
      <Card className={cn(
        "transition-all",
        isTrue ? "border-l-4 border-l-green-500" : "border-l-4 border-l-red-500"
      )}>
        <CardContent className="p-4 space-y-3">
          {/* Condition Sentence */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm">If</span>
            <div className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-sm">
              {fieldLabel || 'field'}
            </div>
            <span className="text-sm">is</span>
            <div className={cn(
              "px-2 py-0.5 rounded font-bold text-sm",
              isTrue ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}>
              {isTrue ? 'TRUE' : 'FALSE'}
            </div>
            <span className="text-sm">then:</span>
          </div>

          {/* Existing Actions - Show first when they exist */}
          {actions.length > 0 && (
            <div className="pl-4 space-y-2">
              <Label className="text-xs text-muted-foreground">
                Existing actions:
              </Label>
              <div className="space-y-1.5">
                {actions.map((action) => (
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

          {/* Add Another Action Button - Show when actions exist and input is hidden */}
          {actions.length > 0 && !showAddAction && (
            <div className="pl-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAction(true)}
                className="h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add another action for {isTrue ? 'TRUE' : 'FALSE'}
              </Button>
            </div>
          )}

          {/* Action Builder Sentence - Show when no actions OR when adding new */}
          {(actions.length === 0 || showAddAction) && (
            <div className="flex items-center gap-1.5 flex-wrap pl-4">
              <span className="text-sm">Place</span>
              
              <Select 
                value={actionType} 
                onValueChange={(value: 'checkmark' | 'fillCustom') => {
                  setActionType(value);
                  if (value !== 'fillCustom') {
                    setCustomText('');
                  }
                }}
              >
                <SelectTrigger className={cn(
                  "h-8 text-sm transition-all",
                  actionType === 'fillCustom' ? "w-[42px] px-2" : "w-[140px]"
                )}>
                  {actionType === 'fillCustom' ? (
                    <Type className="h-3 w-3" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent className="z-[250]" align="start">
                  <SelectItem value="checkmark">
                    <div className="flex items-center gap-2">
                      <Check className="h-3 w-3" />
                      <span>Checkmark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fillCustom">
                    <div className="flex items-center gap-2">
                      <Type className="h-3 w-3" />
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
                onClick={handlePlaceAction}
                disabled={actionType === 'fillCustom' && !customText.trim()}
                variant="default"
                size="sm"
                className="h-8 w-8 p-0"
                title="Set position on PDF"
              >
                <MapPin className="h-4 w-4" />
              </Button>

              {/* Cancel button when adding additional actions */}
              {actions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-8 text-sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {/* Configuration Warning */}
          {needsConfiguration && actions.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-600 pl-4">
              <AlertCircle className="h-3 w-3" />
              <span>Action required</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {getActionTypeDisplay()} action? 
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirm(false);
              setActionToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function BooleanActionsEditor({
  booleanFieldKey,
  fieldLabel,
  trueActions,
  falseActions,
  onUpdateTrueActions,
  onUpdateFalseActions,
  onStartPickingPosition
}: BooleanActionsEditorProps) {
  const { addBooleanAction, booleanFields } = useFieldStore();
  const [showActionCompleteDialog, setShowActionCompleteDialog] = useState(false);
  const [justPlacedValue, setJustPlacedValue] = useState<'TRUE' | 'FALSE'>('TRUE');
  const [lastConfiguredValue, setLastConfiguredValue] = useState<'TRUE' | 'FALSE' | null>(null);
  
  // ALWAYS get the field directly from store to ensure we have fresh data
  const currentField = booleanFields.find(f => f.key === booleanFieldKey);
  const actualTrueActions = currentField?.trueActions || trueActions || [];
  const actualFalseActions = currentField?.falseActions || falseActions || [];
  
  const needsTrueActions = actualTrueActions.length === 0;
  const needsFalseActions = actualFalseActions.length === 0;

  const handleAddTrueAction = (actionType: 'checkmark' | 'fillCustom', customText?: string) => {
    onStartPickingPosition((position) => {
      const actionData = {
        type: actionType,
        position,
        customText: actionType === 'fillCustom' ? customText?.trim() : undefined
      };
      
      addBooleanAction(booleanFieldKey, true, actionData);
      setJustPlacedValue('TRUE');
      setLastConfiguredValue('TRUE');
      
      // Only show dialog if this was the first action for TRUE
      if (actualTrueActions.length === 0) {
        setShowActionCompleteDialog(true);
      }
    }, true, actionType, customText);
  };

  const handleAddFalseAction = (actionType: 'checkmark' | 'fillCustom', customText?: string) => {
    onStartPickingPosition((position) => {
      const actionData = {
        type: actionType,
        position,
        customText: actionType === 'fillCustom' ? customText?.trim() : undefined
      };
      
      addBooleanAction(booleanFieldKey, false, actionData);
      setJustPlacedValue('FALSE');
      setLastConfiguredValue('FALSE');
      
      // Only show dialog if this was the first action for FALSE
      if (actualFalseActions.length === 0) {
        setShowActionCompleteDialog(true);
      }
    }, false, actionType, customText);
  };


  const handleDeleteTrueAction = (actionId: string) => {
    // Get fresh data from store to avoid stale closure
    const currentField = booleanFields.find(f => f.key === booleanFieldKey);
    const currentActions = currentField?.trueActions || [];
    const updatedActions = currentActions.filter(a => a.id !== actionId);
    onUpdateTrueActions(updatedActions);
  };

  const handleDeleteFalseAction = (actionId: string) => {
    // Get fresh data from store to avoid stale closure
    const currentField = booleanFields.find(f => f.key === booleanFieldKey);
    const currentActions = currentField?.falseActions || [];
    const updatedActions = currentActions.filter(a => a.id !== actionId);
    onUpdateFalseActions(updatedActions);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Progress Indicator */}
        <div className={cn(
          "rounded-lg p-3 transition-colors duration-300",
          (!needsTrueActions && !needsFalseActions) ? "bg-green-50" : 
          (!needsTrueActions || !needsFalseActions) ? "bg-amber-50" : 
          "bg-red-50"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn(
              "text-sm font-medium",
              (!needsTrueActions && !needsFalseActions) ? "text-green-700" : 
              (!needsTrueActions || !needsFalseActions) ? "text-yellow-600" : 
              "text-red-700"
            )}>
              Configuration Progress
            </span>
            <span className={cn(
              "text-sm font-medium",
              (!needsTrueActions && !needsFalseActions) ? "text-green-700" : 
              (!needsTrueActions || !needsFalseActions) ? "text-yellow-600" : 
              "text-red-700"
            )}>
              {(!needsTrueActions && !needsFalseActions) ? '2 of 2 values configured' : 
                needsTrueActions && needsFalseActions ? '0 of 2 values configured' :
                '1 of 2 values configured'}
            </span>
          </div>
          <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-300",
                (!needsTrueActions && !needsFalseActions) ? "bg-green-500" : 
                (!needsTrueActions || !needsFalseActions) ? "bg-yellow-400" : 
                "bg-red-500"
              )}
              style={{ 
                width: `${
                  (!needsTrueActions && !needsFalseActions) ? 100 : 
                  (!needsTrueActions || !needsFalseActions) ? 50 : 0
                }%` 
              }}
            />
          </div>
        </div>
        
        {/* Actions Configuration */}
        <div className="space-y-4">
          <ActionRow
            key={`true-${actualTrueActions.map(a => a.id).join('-')}`}
            isTrue={true}
            fieldLabel={fieldLabel}
            actions={actualTrueActions}
            onAddAction={handleAddTrueAction}
            onDeleteAction={handleDeleteTrueAction}
            needsConfiguration={needsTrueActions}
          />
          
          <ActionRow
            key={`false-${actualFalseActions.map(a => a.id).join('-')}`}
            isTrue={false}
            fieldLabel={fieldLabel}
            actions={actualFalseActions}
            onAddAction={handleAddFalseAction}
            onDeleteAction={handleDeleteFalseAction}
            needsConfiguration={needsFalseActions}
          />
        </div>
      </div>
      
      {/* Action Complete Dialog - Only shows for first action of each value */}
      <AlertDialog open={showActionCompleteDialog} onOpenChange={setShowActionCompleteDialog}>
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                First Action Configured
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              You've configured the first action for the {justPlacedValue} value.
              {needsFalseActions && lastConfiguredValue === 'TRUE' && (
                <span className="block mt-2 font-medium">
                  Don't forget to also configure at least one action for the FALSE value.
                </span>
              )}
              {needsTrueActions && lastConfiguredValue === 'FALSE' && (
                <span className="block mt-2 font-medium">
                  Don't forget to also configure at least one action for the TRUE value.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setShowActionCompleteDialog(false);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}