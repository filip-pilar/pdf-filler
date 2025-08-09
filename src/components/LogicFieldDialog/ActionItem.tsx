import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
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
import type { FieldAction } from '@/types/logicField.types';

interface ActionItemProps {
  action: FieldAction;
  onUpdate: (updates: Partial<FieldAction>) => void;
  onDelete: () => void;
}

export function ActionItem({ 
  action, 
  onUpdate, 
  onDelete
}: ActionItemProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'fillLabel': return 'Fill with Label';
      case 'fillValue': return 'Fill with Value';
      case 'fillCustom': return 'Fill with Custom';
      case 'checkmark': return 'Checkmark';
      case 'clear': return 'Clear Field';
      default: return type;
    }
  };

  const getActionBadgeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (type) {
      case 'checkmark': return 'default';
      case 'fillCustom': return 'secondary';
      case 'clear': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <>
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={getActionBadgeVariant(action.type)}>
              {getActionTypeLabel(action.type)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Page {action.position.page} • ({Math.round(action.position.x)}, {Math.round(action.position.y)})
            </span>
          </div>
          
          {action.type === 'fillCustom' && (
            <Input
              placeholder="Custom value"
              value={action.customText || ''}
              onChange={(e) => onUpdate({ customText: e.target.value })}
              className="text-sm"
            />
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setShowDeleteAlert(true)}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
    
    <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
      <AlertDialogContent className="z-[300]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Action?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {getActionTypeLabel(action.type).toLowerCase()} action? 
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