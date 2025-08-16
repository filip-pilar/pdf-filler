import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  const [sampleValue, setSampleValue] = useState('');
  const [error, setError] = useState('');
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter to save (when not in select dropdown)
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        // Don't submit if focus is on select trigger or inside select content
        if (!target.closest('[role="combobox"]') && !target.closest('[role="listbox"]')) {
          e.preventDefault();
          if (fieldKey && !error) {
            handleSave();
          }
        }
      }
      // Escape to cancel (handled by Dialog component)
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fieldKey, error]);
  
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
    
    // Generate default sample value if not provided
    const finalSampleValue = sampleValue || (() => {
      switch (fieldType) {
        case 'checkbox': return true;
        case 'image': return '';
        case 'signature': return '';
        default: return `Sample ${fieldKey}`;
      }
    })();
    
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
      sampleValue: finalSampleValue,
      properties: {
        fontSize: fieldType === 'text' ? 12 : undefined,
        checkboxSize: fieldType === 'checkbox' ? 20 : undefined,
      }
    });
    
    // Reset and close
    setFieldKey('');
    setFieldType('text');
    setSampleValue('');
    setError('');
    onClose();
  };
  
  const handleCancel = () => {
    setFieldKey('');
    setFieldType('text');
    setSampleValue('');
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
          <DialogDescription>
            Create fields that exist in the data model but don't appear on the PDF
          </DialogDescription>
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
              autoFocus
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
          
          <div className="space-y-2">
            <Label htmlFor="sample-value">Sample Value (for previews)</Label>
            <Input
              id="sample-value"
              value={sampleValue}
              onChange={(e) => setSampleValue(e.target.value)}
              placeholder={fieldType === 'checkbox' ? 'true/false' : `e.g., John Doe`}
            />
            <p className="text-xs text-muted-foreground">
              Used in composite field previews and PDF exports. Leave empty for default.
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