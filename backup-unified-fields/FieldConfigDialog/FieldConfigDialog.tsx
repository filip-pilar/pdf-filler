import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from '@/components/SignaturePad/SignaturePad';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';

interface FieldConfigDialogProps {
  field: UnifiedField | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  isNew?: boolean;
}

export function FieldConfigDialog({ 
  field, 
  open, 
  onOpenChange, 
  onSave,
  isNew = false 
}: FieldConfigDialogProps) {
  const { updateUnifiedField, deleteUnifiedField } = useFieldStore();
  
  const [fieldKey, setFieldKey] = useState('');
  const [sampleValue, setSampleValue] = useState<any>('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  
  // Initialize form when field changes
  useEffect(() => {
    if (field) {
      setFieldKey(field.key || '');
      
      if (field.type === 'checkbox') {
        setCheckboxValue(!!field.sampleValue);
      } else {
        setSampleValue(field.sampleValue || '');
      }
    }
  }, [field]);
  
  const handleSave = () => {
    if (!field) return;
    
    // Clean the field key
    const cleanedKey = fieldKey
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
    
    if (!cleanedKey) {
      alert('Please enter a valid field key');
      return;
    }
    
    // Prepare sample value based on field type
    let finalSampleValue: any = undefined;
    if (field.type === 'checkbox') {
      finalSampleValue = checkboxValue;
    } else if (field.type === 'text') {
      finalSampleValue = sampleValue || undefined;
    } else if (field.type === 'signature' || field.type === 'image') {
      finalSampleValue = sampleValue || undefined;
    }
    
    // Update the field
    updateUnifiedField(field.id, {
      key: cleanedKey,
      sampleValue: finalSampleValue
    });
    
    onSave?.();
    onOpenChange(false);
  };
  
  const handleDelete = () => {
    if (!field) return;
    if (confirm(`Delete field "${field.key}"?`)) {
      deleteUnifiedField(field.id);
      onOpenChange(false);
    }
  };
  
  const handleCancel = () => {
    if (isNew && field) {
      // If it's a new field and user cancels, delete it
      deleteUnifiedField(field.id);
    }
    onOpenChange(false);
  };
  
  if (!field) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNew ? `Configure ${field.type} Field` : `Edit ${field.type} Field`}
          </DialogTitle>
          <DialogDescription>
            Set the field key and preview value for this {field.type} field.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="field-key">Field Key</Label>
            <Input
              id="field-key"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g., user_name, email, status"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              This key will be used to bind data to the field
            </p>
          </div>
          
          {/* Field type-specific inputs */}
          {field.type === 'text' && (
            <div>
              <Label htmlFor="sample-value">Sample Value (Optional)</Label>
              <Input
                id="sample-value"
                value={sampleValue}
                onChange={(e) => setSampleValue(e.target.value)}
                placeholder="Sample text to display..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Preview value shown in the editor
              </p>
            </div>
          )}
          
          {field.type === 'checkbox' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="checkbox-value"
                checked={checkboxValue}
                onCheckedChange={(checked) => setCheckboxValue(!!checked)}
              />
              <Label htmlFor="checkbox-value" className="text-sm font-normal">
                Field is checked
              </Label>
            </div>
          )}
          
          {field.type === 'signature' && (
            <div>
              <Label>Signature</Label>
              <SignaturePad
                onSignatureSave={(data) => setSampleValue(data)}
                initialValue={sampleValue}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Draw a sample signature for preview
              </p>
            </div>
          )}
          
          {field.type === 'image' && (
            <div>
              <Label>Image</Label>
              <ImageUpload
                value={sampleValue}
                onChange={(data) => setSampleValue(data)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload a sample image for preview
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div>
            {!isNew && (
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}