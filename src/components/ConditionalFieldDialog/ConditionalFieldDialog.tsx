import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import type {
  UnifiedField,
  SimplifiedConditionalBranch,
  SimplifiedConditionalOperator,
} from '@/types/unifiedField.types';
import {
  Plus,
  Trash2,
  GitBranch,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ConditionalFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: UnifiedField | null;
  onSave: (field: Partial<UnifiedField>) => void;
}

const OPERATOR_LABELS: Record<SimplifiedConditionalOperator, string> = {
  'equals': 'equals',
  'not-equals': 'not equals',
  'contains': 'contains',
  'exists': 'exists',
  'not-exists': 'does not exist',
};

export function ConditionalFieldDialog({
  open,
  onOpenChange,
  field,
  onSave,
}: ConditionalFieldDialogProps) {
  const { unifiedFields, currentPage } = useFieldStore();
  const { startPicking } = usePositionPickerStore();
  
  // Get available field keys for dropdown
  const availableFields = unifiedFields
    .filter(f => f.type !== 'conditional')
    .map(f => ({ key: f.key, type: f.type }))
    .sort((a, b) => a.key.localeCompare(b.key));

  // Field configuration
  const [fieldKey, setFieldKey] = useState('');
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [fontSize, setFontSize] = useState(10);
  const [renderAs, setRenderAs] = useState<'text' | 'checkbox'>('text');
  
  // Conditional branches
  const [branches, setBranches] = useState<SimplifiedConditionalBranch[]>([]);
  const [defaultValue, setDefaultValue] = useState('');

  // Initialize from existing field
  useEffect(() => {
    if (field && field.type === 'conditional') {
      setFieldKey(field.key || '');
      setPosition(field.position || { x: 100, y: 100 });
      setFontSize(field.properties?.fontSize || 10);
      setRenderAs(field.conditionalRenderAs || 'text');
      setBranches(field.conditionalBranches || []);
      setDefaultValue(field.conditionalDefaultValue || '');
    } else {
      // Reset for new field
      setFieldKey('');
      setPosition({ x: 100, y: 100 });
      setFontSize(10);
      setRenderAs('text');
      setBranches([]);
      setDefaultValue('');
    }
  }, [field]);
  
  // Convert values intelligently when switching render modes
  const handleRenderAsChange = (value: 'text' | 'checkbox') => {
    setRenderAs(value);
    
    if (value === 'checkbox') {
      // Converting to checkbox mode - try to preserve meaningful values
      setBranches(branches.map(branch => {
        let newValue = branch.renderValue;
        
        // If it's already a valid checkbox value or field reference, keep it
        if (newValue && (
          ['checked', 'unchecked', 'true', 'false', '1', '0'].includes(newValue.toLowerCase()) ||
          newValue.match(/^{[^}]+}$/)
        )) {
          return branch;
        }
        
        // Try to convert common text patterns
        if (newValue) {
          const lower = newValue.toLowerCase();
          if (lower.includes('yes') || lower.includes('true') || lower === 'x') {
            newValue = 'checked';
          } else if (lower.includes('no') || lower.includes('false') || lower === '') {
            newValue = 'unchecked';
          } else {
            // Can't convert meaningfully - leave as is and let validation catch it
            newValue = '';
          }
        }
        
        return { ...branch, renderValue: newValue };
      }));
      
      // Convert default value similarly
      if (defaultValue) {
        const lower = defaultValue.toLowerCase();
        if (lower.includes('yes') || lower.includes('true')) {
          setDefaultValue('checked');
        } else if (lower.includes('no') || lower.includes('false')) {
          setDefaultValue('unchecked');
        } else if (!defaultValue.match(/^{[^}]+}$/)) {
          setDefaultValue('');
        }
      }
    }
    // When switching to text mode, values can stay as-is since any string is valid
  };

  const addBranch = () => {
    const newBranch: SimplifiedConditionalBranch = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      condition: {
        field: availableFields[0]?.key || '',
        operator: 'equals',
        value: '',
      },
      renderValue: '',  // Let user fill this in
    };
    setBranches([...branches, newBranch]);
  };

  const updateBranch = (index: number, updates: Partial<SimplifiedConditionalBranch>) => {
    const newBranches = [...branches];
    newBranches[index] = { ...newBranches[index], ...updates };
    setBranches(newBranches);
  };

  const deleteBranch = (index: number) => {
    setBranches(branches.filter((_, i) => i !== index));
  };

  const handlePickPosition = () => {
    // Close dialog temporarily
    onOpenChange(false);
    
    // Start position picking
    startPicking({
      actionId: `conditional-position-${Date.now()}`,
      content: fieldKey || 'Conditional',
      optionLabel: 'Position',
      actionType: 'text',
      onComplete: (pickedPosition) => {
        setPosition({ 
          x: pickedPosition.x, 
          y: pickedPosition.y 
        });
        // Reopen dialog
        onOpenChange(true);
      },
      onCancel: () => {
        // Reopen dialog even if cancelled
        onOpenChange(true);
      }
    });
  };

  const handleSave = () => {
    if (!fieldKey.trim()) {
      toast.error('Please enter a field key');
      return;
    }

    if (branches.length === 0) {
      toast.error('Please add at least one condition');
      return;
    }
    
    // Check for nonsensical mode combinations
    if (renderAs === 'checkbox') {
      const hasComplexTemplate = branches.some(branch => {
        const value = branch.renderValue;
        // Check if it's a complex template (not just a simple field reference or checkbox value)
        return value && 
               !['checked', 'unchecked', 'true', 'false', '1', '0'].includes(value.toLowerCase()) &&
               !value.match(/^{[^}]+}$/) && // Not a simple field reference
               value.includes('{'); // But contains template syntax
      });
      
      if (hasComplexTemplate) {
        const proceed = window.confirm(
          'Warning: You have complex templates in checkbox mode (e.g., "Status: {field}").\n\n' +
          'Checkbox fields work best with simple values like "checked", "unchecked", or "{boolean_field}".\n\n' +
          'Complex templates will be evaluated but may not display as expected.\n\n' +
          'Do you want to continue anyway?'
        );
        if (!proceed) {
          return;
        }
      }
    }

    // Validate all branches
    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      if (!branch.condition.field) {
        toast.error(`Condition ${i + 1}: Please select a field to check`);
        return;
      }
      if (
        branch.condition.operator !== 'exists' &&
        branch.condition.operator !== 'not-exists' &&
        (branch.condition.value === undefined || branch.condition.value === '')
      ) {
        toast.error(`Condition ${i + 1}: Please enter a value to compare`);
        return;
      }
      
      // Different validation for checkbox vs text mode
      if (renderAs === 'checkbox') {
        // For checkbox mode, validate against strict values
        if (branch.renderValue) {
          const trimmedValue = branch.renderValue.trim().toLowerCase();
          
          // Allow escape syntax
          if (branch.renderValue.startsWith('\\')) {
            // Escaped value is valid but will be treated as unchecked
            continue;
          }
          
          // Check if it's a valid checkbox value or field reference
          const validCheckboxValues = ['checked', 'unchecked', 'true', 'false', 'yes', 'no', '1', '0', ''];
          if (!validCheckboxValues.includes(trimmedValue) &&
              !branch.renderValue.match(/^{[^}]+}$/)) {
            toast.error(`Condition ${i + 1}: Use exact values (checked, unchecked, true, false) or {field_reference}. Values like "Answer: true" won't work as expected.`);
            return;
          }
        }
      } else {
        // For text mode, require non-empty value
        if (!branch.renderValue) {
          toast.error(`Condition ${i + 1}: Please enter text to display`);
          return;
        }
      }
    }

    const conditionalField: Partial<UnifiedField> = {
      id: field?.id, // Preserve ID when editing
      key: fieldKey,
      type: 'conditional',
      variant: 'single',
      page: currentPage,
      position,
      size: renderAs === 'checkbox' ? { width: 20, height: 20 } : { width: 200, height: fontSize + 10 },
      enabled: true,
      structure: 'simple',
      placementCount: 0,
      conditionalBranches: branches,
      conditionalDefaultValue: defaultValue,
      conditionalRenderAs: renderAs,
      properties: {
        // Only set fontSize for text mode
        ...(renderAs === 'text' && { fontSize }),
        fontFamily: 'Helvetica',
        textColor: { r: 0, g: 0, b: 0 },
        // Only set checkboxSize for checkbox mode
        ...(renderAs === 'checkbox' && { checkboxSize: 20 }),
      },
      positionVersion: 'top-edge',
    };

    onSave(conditionalField);
    onOpenChange(false);
  };

  const renderBranchEditor = (branch: SimplifiedConditionalBranch, index: number) => {
    const needsValue =
      branch.condition.operator !== 'exists' && 
      branch.condition.operator !== 'not-exists';

    return (
      <Card key={branch.id} className="mb-2">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">IF</span>
            
            <Select
              value={branch.condition.field}
              onValueChange={(value) =>
                updateBranch(index, {
                  condition: { ...branch.condition, field: value },
                })
              }
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    No fields available
                  </SelectItem>
                ) : (
                  availableFields.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.key}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={branch.condition.operator}
              onValueChange={(value: SimplifiedConditionalOperator) =>
                updateBranch(index, {
                  condition: { ...branch.condition, operator: value },
                })
              }
            >
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                  <SelectItem key={op} value={op}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsValue && (
              <Input
                className="w-32 h-8"
                value={branch.condition.value || ''}
                onChange={(e) =>
                  updateBranch(index, {
                    condition: { ...branch.condition, value: e.target.value },
                  })
                }
                placeholder="value"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium">THEN SHOW</span>
            {renderAs === 'checkbox' ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  className={`flex-1 h-8 ${
                    branch.renderValue && 
                    !branch.renderValue.startsWith('\\') &&
                    !['checked', 'unchecked', 'true', 'false', 'yes', 'no', '1', '0', ''].includes(branch.renderValue.trim().toLowerCase()) &&
                    !branch.renderValue.match(/^{[^}]+}$/)
                      ? 'border-orange-500 focus:border-orange-500' 
                      : ''
                  }`}
                  value={branch.renderValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateBranch(index, { renderValue: value });
                    
                    // Real-time validation feedback
                    const trimmed = value.trim().toLowerCase();
                    if (value && 
                        !value.startsWith('\\') && // Allow escape syntax
                        !['checked', 'unchecked', 'true', 'false', 'yes', 'no', '1', '0', ''].includes(trimmed) &&
                        !value.match(/^{[^}]+}$/)) {
                      // Invalid value - will show via border color
                    }
                  }}
                  placeholder="checked, unchecked, or {field}"
                  title="Use 'checked', 'unchecked', or {field_key} to reference a boolean field"
                />
                {branch.renderValue && 
                 !branch.renderValue.startsWith('\\') &&
                 !['checked', 'unchecked', 'true', 'false', 'yes', 'no', '1', '0', ''].includes(branch.renderValue.trim().toLowerCase()) &&
                 !branch.renderValue.match(/^{[^}]+}$/) && (
                  <HelpCircle className="h-4 w-4 text-orange-500" />
                )}
              </div>
            ) : (
              <Input
                className="flex-1 h-8"
                value={branch.renderValue}
                onChange={(e) =>
                  updateBranch(index, {
                    renderValue: e.target.value,
                  })
                }
                placeholder="text or {field_key}"
                title="You can use {field_key} to reference other fields"
                list={`field-suggestions-${index}`}
              />
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => deleteBranch(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {field ? 'Edit' : 'Create'} Conditional Field
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <div>Display different text or checkbox based on field values.</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              <span>
                <strong>Tip:</strong> Use {`{field_key}`} syntax to reference other fields in any text value.
                For example: "Dear {`{firstName}`}" or "{`{status_field}`}"
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Field Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Field Key</Label>
              <Input
                value={fieldKey}
                onChange={(e) => setFieldKey(e.target.value)}
                placeholder="e.g., status_indicator"
                className="font-mono"
              />
            </div>
            <div>
              <Label>Render As</Label>
              <Select value={renderAs} onValueChange={handleRenderAsChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {renderAs === 'text' && (
            <div>
              <Label>Font Size</Label>
              <Input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value) || 10)}
                min="8"
                max="24"
              />
            </div>
          )}

          <div>
            <Label>Position</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={position.x}
                onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) || 0 })}
                placeholder="X"
                className="w-24"
              />
              <Input
                type="number"
                value={position.y}
                onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) || 0 })}
                placeholder="Y"
                className="w-24"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handlePickPosition}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Pick Position
              </Button>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <Label className="mb-2 block">Conditions</Label>
            {branches.map((branch, index) => renderBranchEditor(branch, index))}
            
            <Button
              size="sm"
              variant="outline"
              onClick={addBranch}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </div>

          {/* Default Value */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label>Default Value (Else)</Label>
              <HelpCircle 
                className="h-3 w-3 text-muted-foreground cursor-help" 
              />
            </div>
            {renderAs === 'checkbox' ? (
              <Input
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="checked, unchecked, or {field} (optional)"
                title="Use 'checked', 'unchecked', or {field_key} to reference a boolean field"
                list="default-field-suggestions"
              />
            ) : (
              <Input
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="Default text or {field_key} (optional)"
                title="You can use {field_key} to reference other fields"
                list="default-field-suggestions"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {field ? 'Update' : 'Create'} Field
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Datalists for field suggestions */}
      {branches.map((_, index) => (
        <datalist key={index} id={`field-suggestions-${index}`}>
          {availableFields.map(field => (
            <option key={field.key} value={`{${field.key}}`} />
          ))}
          {/* Common template patterns */}
          <option value="{firstName} {lastName}" />
          <option value="Status: {status}" />
          <option value="{field1}, {field2}" />
        </datalist>
      ))}
      
      {/* Datalist for default value */}
      <datalist id="default-field-suggestions">
        {availableFields.map(field => (
          <option key={field.key} value={`{${field.key}}`} />
        ))}
      </datalist>
    </Dialog>
  );
}