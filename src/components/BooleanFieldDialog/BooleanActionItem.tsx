import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Type, Edit2, Save, X, Trash2 } from 'lucide-react';
import type { BooleanFieldAction } from '@/types/booleanField.types';
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

interface BooleanActionItemProps {
  action: BooleanFieldAction;
  onUpdate: (updates: Partial<BooleanFieldAction>) => void;
  onDelete: () => void;
}

export function BooleanActionItem({ action, onUpdate, onDelete }: BooleanActionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(action.customText || '');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleSave = () => {
    if (action.type === 'fillCustom' && editValue.trim()) {
      onUpdate({ customText: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(action.customText || '');
    setIsEditing(false);
  };

  const getActionIcon = () => {
    switch (action.type) {
      case 'checkmark':
        return <Check className="h-3 w-3" />;
      case 'fillCustom':
        return <Type className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getActionLabel = () => {
    switch (action.type) {
      case 'checkmark':
        return 'Checkmark';
      case 'fillCustom':
        return `Custom: "${action.customText}"`;
      default:
        return 'Unknown';
    }
  };

  return (
    <>
    <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {getActionIcon()}
          {isEditing && action.type === 'fillCustom' ? (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-7 text-sm"
              placeholder="Enter custom text"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              autoFocus
            />
          ) : (
            <span className="text-sm font-medium">{getActionLabel()}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            Page {action.position.page}
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({Math.round(action.position.x)}, {Math.round(action.position.y)})
          </span>
        </div>
      </div>
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSave}
            >
              <Save className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            {action.type === 'fillCustom' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteAlert(true)}
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
    
    <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
      <AlertDialogContent className="z-[300]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Action?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {action.type === 'checkmark' ? 'checkmark' : 'custom text'} action? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onDelete();
              setShowDeleteAlert(false);
            }}
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