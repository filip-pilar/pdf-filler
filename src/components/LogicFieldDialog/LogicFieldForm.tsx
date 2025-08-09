import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFieldStore } from '@/store/fieldStore';
import { sanitizeFieldKey } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface LogicFieldFormProps {
  fieldKey: string;
  label: string;
  onKeyChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  currentFieldKey?: string;
}

export function LogicFieldForm({ 
  fieldKey, 
  label, 
  onKeyChange, 
  onLabelChange,
  currentFieldKey
}: LogicFieldFormProps) {
  const { fields, logicFields } = useFieldStore();
  
  const checkDuplicateKey = (key: string): string | null => {
    if (!key) return null;
    
    // Check regular fields
    const duplicateField = fields.find(f => f.key === key);
    if (duplicateField) {
      return `Key "${key}" is already used by a regular field`;
    }
    
    // Check logic fields (excluding current field if editing)
    const duplicateLogicField = logicFields.find(f => 
      f.key === key && f.key !== currentFieldKey
    );
    if (duplicateLogicField) {
      return `Key "${key}" is already used by another logic field`;
    }
    
    return null;
  };
  
  const handleKeyChange = (value: string) => {
    const sanitized = sanitizeFieldKey(value);
    onKeyChange(sanitized);
  };
  
  const keyError = checkDuplicateKey(fieldKey);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="field-key">Field Key</Label>
        <Input
          id="field-key"
          placeholder="e.g., filing_type"
          value={fieldKey}
          onChange={(e) => handleKeyChange(e.target.value)}
          className="font-mono"
        />
        {keyError ? (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{keyError}</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Used for data binding (alphanumeric and underscore only)
          </p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="field-label">Field Label</Label>
        <Input
          id="field-label"
          placeholder="e.g., Filing Type"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Display name for this field
        </p>
      </div>
    </div>
  );
}