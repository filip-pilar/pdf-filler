/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SignaturePad } from '@/components/SignaturePad/SignaturePad';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';
import { sanitizeFieldKey, isValidFieldKey } from '@/lib/keyValidation';
import { Lock } from 'lucide-react';

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
  const [fieldKeyError, setFieldKeyError] = useState('');
  const [signatureDimensions, setSignatureDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // Initialize form when field changes
  useEffect(() => {
    if (field) {
      setFieldKey(field.key || '');
      setIsLocked(!!field.locked);
      
      if (field.type === 'checkbox') {
        setCheckboxValue(!!field.sampleValue);
      } else {
        setSampleValue(field.sampleValue || '');
      }
    }
  }, [field]);
  
  const handleSave = useCallback(() => {
    if (!field) return;
    
    // Clean the field key
    const cleanedKey = fieldKey
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
    
    if (!cleanedKey) {
      setFieldKeyError('Please enter a valid field key');
      return;
    }
    
    setFieldKeyError('');
    
    // Prepare sample value based on field type
    let finalSampleValue: string | boolean | undefined = undefined;
    if (field.type === 'checkbox') {
      finalSampleValue = checkboxValue;
    } else if (field.type === 'text') {
      finalSampleValue = sampleValue || undefined;
    } else if (field.type === 'signature' || field.type === 'image') {
      finalSampleValue = sampleValue || undefined;
    }
    
    // Update the field with dimensions for signature fields
    const updateData: Partial<UnifiedField> = {
      key: cleanedKey,
      sampleValue: finalSampleValue,
      locked: isLocked
    };
    
    // If it's a signature field with calculated dimensions, update the field dimensions
    if (field.type === 'signature' && signatureDimensions && finalSampleValue) {
      updateData.width = signatureDimensions.width;
      updateData.height = signatureDimensions.height;
    }
    
    updateUnifiedField(field.id, updateData);
    
    onSave?.();
    onOpenChange(false);
  }, [field, fieldKey, sampleValue, checkboxValue, onSave, onOpenChange, updateUnifiedField, setFieldKeyError, isLocked, signatureDimensions]);
  
  // Handle Enter key to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === 'Enter' && !e.shiftKey) {
        // Don't submit if in a textarea
        if (e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, handleSave]);
  
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? `Configure ${field.type} Field` : `Edit ${field.type} Field`}
          </DialogTitle>
          <DialogDescription>
            Set the field key and preview value for this {field.type} field.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="field-key">Field Key</Label>
            <Input
              id="field-key"
              value={fieldKey}
              onChange={(e) => {
                const sanitized = sanitizeFieldKey(e.target.value);
                setFieldKey(sanitized);
                setFieldKeyError('');
              }}
              onBlur={() => {
                if (fieldKey && !isValidFieldKey(fieldKey)) {
                  setFieldKeyError('Invalid field key format');
                } else {
                  setFieldKeyError('');
                }
              }}
              placeholder={`e.g., ${field.type}_1`}
              autoFocus
              className={fieldKeyError ? 'border-destructive' : ''}
            />
            {fieldKeyError && (
              <p className="text-xs text-destructive">{fieldKeyError}</p>
            )}
            {!fieldKeyError && (
              <p className="text-xs text-muted-foreground">
                This key will be used to bind data to the field
              </p>
            )}
          </div>
          
          {/* Lock position toggle */}
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="lock-position"
              checked={isLocked}
              onCheckedChange={(checked) => setIsLocked(!!checked)}
            />
            <Label 
              htmlFor="lock-position" 
              className="text-sm font-normal cursor-pointer flex items-center gap-2"
            >
              <Lock className="h-3 w-3" />
              Lock position
            </Label>
          </div>
          {isLocked && (
            <p className="text-xs text-muted-foreground pl-6">
              When locked, this field cannot be dragged. Edit via sidebar only.
            </p>
          )}
          
          {/* Field type-specific inputs */}
          {field.type === 'text' && (
            <div className="space-y-2">
              <Label htmlFor="sample-value">Sample Value (Optional)</Label>
              <Input
                id="sample-value"
                value={sampleValue}
                onChange={(e) => setSampleValue(e.target.value)}
                placeholder="Sample text to display..."
              />
              <p className="text-xs text-muted-foreground">
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
              <Label htmlFor="checkbox-value" className="text-sm font-normal cursor-pointer">
                Field is checked
              </Label>
            </div>
          )}
          
          {field.type === 'signature' && (
            <div className="space-y-2">
              <Label>Signature</Label>
              <SignaturePad
                onSignatureSave={(data) => {
                  setSampleValue(data);
                  // Extract dimensions from the signature image
                  if (data) {
                    const img = new Image();
                    img.onload = () => {
                      // Calculate proper field dimensions based on signature aspect ratio
                      // Use a base height of 60px and scale width proportionally
                      const baseHeight = 60;
                      const aspectRatio = img.width / img.height;
                      const calculatedWidth = Math.round(baseHeight * aspectRatio);
                      
                      setSignatureDimensions({
                        width: Math.min(calculatedWidth, 300), // Cap at 300px width
                        height: baseHeight
                      });
                    };
                    img.src = data;
                  } else {
                    setSignatureDimensions(null);
                  }
                }}
                initialValue={sampleValue}
              />
              <p className="text-xs text-muted-foreground">
                Draw a sample signature for preview
              </p>
            </div>
          )}
          
          {field.type === 'image' && (
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload
                value={sampleValue}
                onChange={(data) => setSampleValue(data)}
              />
              <p className="text-xs text-muted-foreground">
                Upload a sample image for preview
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="sm:flex-row flex-col gap-2">
          {!isNew && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              Delete
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
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