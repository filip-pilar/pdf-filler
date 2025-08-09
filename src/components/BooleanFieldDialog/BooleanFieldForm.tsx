import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldStore } from '@/store/fieldStore';
import { sanitizeFieldKey } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import type { BooleanField } from '@/types/booleanField.types';

interface BooleanFieldFormProps {
  fieldKey: string;
  label: string;
  onKeyChange: (key: string) => void;
  onLabelChange: (label: string) => void;
  currentFieldKey?: string;
}

export function BooleanFieldForm({
  fieldKey,
  label,
  onKeyChange,
  onLabelChange,
  currentFieldKey
}: BooleanFieldFormProps) {
  const { booleanFields } = useFieldStore();
  
  // Check if key is already taken by ANOTHER field (not the one being edited)
  // If we're editing an existing field, exclude it from the check
  const isKeyTaken = fieldKey && booleanFields.some((field: BooleanField) => {
    // If this is the field we're currently editing, it's not "taken"
    if (currentFieldKey && field.key === currentFieldKey) {
      return false;
    }
    // Otherwise, check if another field has this key
    return field.key === fieldKey;
  });

  const handleKeyChange = (value: string) => {
    const sanitized = sanitizeFieldKey(value);
    onKeyChange(sanitized);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="field-key">Field Key</Label>
        <Input
          id="field-key"
          placeholder="e.g., isActive"
          value={fieldKey}
          onChange={(e) => handleKeyChange(e.target.value)}
          className={isKeyTaken ? 'border-red-500' : ''}
        />
        {isKeyTaken && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>This key is already in use</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Used for data binding (alphanumeric and underscore only)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-label">Display Label</Label>
        <Input
          id="field-label"
          placeholder="e.g., Is Active"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>
    </div>
  );
}