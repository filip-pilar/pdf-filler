import { useEffect, useState, useMemo } from 'react';
import { debounce } from '@/lib/debounce';
import { sanitizeFieldKey } from '@/lib/utils';
import { useFieldStore } from '@/store/fieldStore';
import type { Field } from '@/types/field.types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SignaturePad } from '@/components/SignaturePad/SignaturePad';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
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

interface FieldPropertiesDialogProps {
  field: Field | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FieldPropertiesDialog({ field, open, onOpenChange }: FieldPropertiesDialogProps) {
  const { updateField, deleteField } = useFieldStore();
  const [localField, setLocalField] = useState<Field | null>(field);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Debounced save for text inputs - moved before conditionals
  const debouncedUpdateField = useMemo(
    () => debounce((key: string, updates: Partial<Field>) => {
      updateField(key, updates);
    }, 300),
    [updateField]
  );

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Don't trigger if user is in a textarea and pressing shift+enter for new line
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA') return;
        
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  if (!localField) return null;

  const handleKeyChange = (value: string) => {
    const sanitized = sanitizeFieldKey(value);
    setLocalField({ ...localField, key: sanitized });
    debouncedUpdateField(localField.key, { key: sanitized });
  };

  const handleSampleValueChange = (value: string | boolean) => {
    setLocalField({ ...localField, sampleValue: value });
    // Immediate save for non-text inputs, debounced for text
    if (localField.type === 'text') {
      debouncedUpdateField(localField.key, { sampleValue: value });
    } else {
      updateField(localField.key, { sampleValue: value });
    }
  };

  const handleDelete = () => {
    deleteField(localField.key);
    onOpenChange(false);
    setShowDeleteAlert(false);
  };


  const renderSampleValueInput = () => {
    switch (localField.type) {
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={localField.sampleValue || false}
              onCheckedChange={handleSampleValueChange}
            />
            <Label className="text-sm">{localField.sampleValue ? 'Checked (✓ will appear)' : 'Unchecked (empty)'}</Label>
          </div>
        );
      
      
      
      case 'signature':
        return (
          <div className="space-y-2">
            <SignaturePad
              onSignatureSave={handleSampleValueChange}
              initialValue={localField.sampleValue}
            />
            {localField.sampleValue && (
              <img 
                src={localField.sampleValue} 
                alt="Signature preview" 
                className="max-w-full h-16 object-contain border rounded bg-white p-2"
              />
            )}
          </div>
        );
        
      case 'image':
        return (
          <ImageUpload
            value={localField.sampleValue}
            onChange={handleSampleValueChange}
          />
        );
      
      default:
        return (
          <Input
            value={localField.sampleValue || ''}
            onChange={(e) => handleSampleValueChange(e.target.value)}
            placeholder="Enter sample value..."
            className="text-sm"
          />
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Field Settings</DialogTitle>
            <DialogDescription>
              Configure properties for {localField.key}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-key" className="text-sm">
                Field Key
              </Label>
              <Input
                id="field-key"
                value={localField.key || ''}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="field_name"
                className="text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Used for data binding (alphanumeric and underscore only)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Sample Value</Label>
              {renderSampleValueInput()}
            </div>
          </div>


          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Delete Field
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the field "{localField.key}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}