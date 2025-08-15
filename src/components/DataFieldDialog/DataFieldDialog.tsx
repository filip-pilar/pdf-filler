import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFieldStore } from '@/store/fieldStore';
import type { FieldType } from '@/types/field.types';
import { Database, InfoIcon } from 'lucide-react';

interface DataFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DataFieldDialog({ isOpen, onClose }: DataFieldDialogProps) {
  const { addUnifiedField, getUnifiedFieldByKey, currentPage } = useFieldStore();
  
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [error, setError] = useState('');
  
  const handleKeyChange = (value: string) => {
    // Clean the key - allow alphanumeric, underscore, hyphen, and dot for nested paths
    const cleaned = value.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    setFieldKey(cleaned);
    
    // Check for duplicate keys
    if (cleaned && getUnifiedFieldByKey(cleaned)) {
      setError(`A field with key "${cleaned}" already exists`);
    } else {
      setError('');
    }
  };
  
  const handleSave = () => {
    if (!fieldKey) {
      setError('Field key is required');
      return;
    }
    
    if (getUnifiedFieldByKey(fieldKey)) {
      setError(`A field with key "${fieldKey}" already exists`);
      return;
    }
    
    // Create a data-only field (no position)
    addUnifiedField({
      key: fieldKey,
      type: fieldType,
      variant: 'single',
      structure: 'simple',
      page: currentPage || 1, // Use current page for organization
      // No position - this makes it a data-only field
      enabled: true,
      placementCount: 0, // No placement needed
      properties: {
        fontSize: fieldType === 'text' ? 12 : undefined,
        checkboxSize: fieldType === 'checkbox' ? 20 : undefined,
      }
    });
    
    // Reset and close
    setFieldKey('');
    setFieldType('text');
    setError('');
    onClose();
  };
  
  const handleCancel = () => {
    setFieldKey('');
    setFieldType('text');
    setError('');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Create Data-Only Field
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Data-only fields don't appear on the PDF but can be used in composite fields 
              and are included in the exported API.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="field-key">Field Key</Label>
            <Input
              id="field-key"
              value={fieldKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder="e.g., firstName, user.email"
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use dots for nested paths (e.g., user.firstName)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="checkbox">Checkbox (Boolean)</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="signature">Signature</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The type affects how the field is handled in composite templates
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!fieldKey || !!error}
          >
            Create Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}