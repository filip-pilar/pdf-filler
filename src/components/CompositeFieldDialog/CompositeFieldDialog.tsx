/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useFieldStore } from '@/store/fieldStore';
import { TemplateEngine } from '@/utils/templateEngine';
import type { UnifiedField } from '@/types/unifiedField.types';
import { InfoIcon, AlertCircle } from 'lucide-react';

interface CompositeFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingField?: UnifiedField;
  onSave?: (field: UnifiedField) => void;
}

export function CompositeFieldDialog({ 
  isOpen, 
  onClose, 
  editingField,
  onSave 
}: CompositeFieldDialogProps) {
  const { 
    getAvailableFieldKeys, 
    validateCompositeTemplate,
    createCompositeField,
    updateCompositeTemplate,
    currentPage,
    unifiedFields // Subscribe to fields changes
  } = useFieldStore();
  
  const [fieldKey, setFieldKey] = useState(editingField?.key || '');
  const [template, setTemplate] = useState(editingField?.template || '');
  const [emptyBehavior, setEmptyBehavior] = useState<'skip' | 'show-empty' | 'placeholder'>(
    editingField?.compositeFormatting?.emptyValueBehavior || 'skip'
  );
  const [separatorHandling, setSeparatorHandling] = useState<'smart' | 'literal'>(
    editingField?.compositeFormatting?.separatorHandling || 'smart'
  );
  const [sampleData, setSampleData] = useState<string>('{}');
  const [showPreview, setShowPreview] = useState(false);
  
  const availableFields = useMemo(() => {
    const fields = getAvailableFieldKeys();
    console.log('Available fields for composite:', fields);
    console.log('Total unified fields:', unifiedFields.length);
    return fields;
  }, [getAvailableFieldKeys, unifiedFields]);
  
  const validation = useMemo(() => {
    if (!template) return { isValid: true, dependencies: [], errors: [] };
    return validateCompositeTemplate(template);
  }, [template, validateCompositeTemplate]);
  
  const preview = useMemo(() => {
    if (!template || !showPreview) return '';
    try {
      const data = JSON.parse(sampleData) as Record<string, unknown>;
      return TemplateEngine.evaluate(template, data, {
        emptyValueBehavior: emptyBehavior,
        separatorHandling: separatorHandling,
        whitespaceHandling: 'normalize'
      });
    } catch {
      return 'Invalid sample data';
    }
  }, [template, sampleData, emptyBehavior, separatorHandling, showPreview]);
  
  const suggestions = useMemo(() => {
    return TemplateEngine.suggestTemplates(availableFields);
  }, [availableFields]);
  
  useEffect(() => {
    // Create sample data from available fields
    if (validation.dependencies.length > 0 && sampleData === '{}') {
      const sample: Record<string, string | Record<string, string>> = {};
      validation.dependencies.forEach(dep => {
        if (dep.includes('.')) {
          const [parent, child] = dep.split('.');
          if (!sample[parent]) sample[parent] = {} as Record<string, string>;
          (sample[parent] as Record<string, string>)[child] = `Sample ${child}`;
        } else {
          sample[dep] = `Sample ${dep}`;
        }
      });
      setSampleData(JSON.stringify(sample, null, 2));
    }
  }, [validation.dependencies, sampleData]);
  
  const handleSave = () => {
    if (!validation.isValid || !fieldKey) return;
    
    if (editingField) {
      // Update existing field
      updateCompositeTemplate(editingField.id, template);
      if (onSave) {
        onSave({
          ...editingField,
          key: fieldKey,
          template,
          dependencies: validation.dependencies,
          compositeFormatting: {
            emptyValueBehavior: emptyBehavior,
            separatorHandling: separatorHandling,
            whitespaceHandling: 'normalize'
          }
        });
      }
    } else {
      // Create new field - will be placed later
      const newField = createCompositeField(
        template,
        { x: 100, y: 100 }, // Default position, will be updated when placed
        currentPage
      );
      if (onSave) onSave(newField);
    }
    
    onClose();
  };
  
  const handleUseSuggestion = (suggestionTemplate: string) => {
    setTemplate(suggestionTemplate);
  };
  
  const cleanFieldKey = (value: string) => {
    // Replace spaces with underscores and remove special characters
    return value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingField ? 'Edit Composite Field' : 'Create Composite Field'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Field Key */}
          <div className="space-y-2">
            <Label htmlFor="field-key">Field Key</Label>
            <Input
              id="field-key"
              value={fieldKey}
              onChange={(e) => setFieldKey(cleanFieldKey(e.target.value))}
              placeholder="e.g., full_name, complete_address"
            />
            <p className="text-xs text-muted-foreground">
              This key will be used to reference the composite field
            </p>
          </div>
          
          {/* Template */}
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="e.g., {firstName} {lastName} or {addressLine1}, {city}, {state} {zipCode}"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{fieldKey}'} to reference other fields. The template will be evaluated with actual data values.
            </p>
          </div>
          
          {/* Template Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Suggested Templates</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseSuggestion(suggestion.template)}
                  >
                    {suggestion.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Available Fields */}
          <div className="space-y-2">
            <Label>Available Fields</Label>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 border rounded">
              {availableFields.map(field => (
                <Badge
                  key={field}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => setTemplate(template + `{${field}}`)}
                >
                  {field}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click on a field to add it to your template
            </p>
          </div>
          
          {/* Validation */}
          {template && (
            <div className="space-y-2">
              {validation.isValid ? (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    Template is valid. Dependencies: {validation.dependencies.join(', ') || 'None'}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validation.errors.join('. ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {/* Formatting Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Formatting Options</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="empty-behavior">Empty Value Behavior</Label>
                <Select value={emptyBehavior} onValueChange={(v: any) => setEmptyBehavior(v)}>
                  <SelectTrigger id="empty-behavior">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip (leave blank)</SelectItem>
                    <SelectItem value="show-empty">Show Empty Space</SelectItem>
                    <SelectItem value="placeholder">Show Placeholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="separator-handling">Separator Handling</Label>
                <Select value={separatorHandling} onValueChange={(v: any) => setSeparatorHandling(v)}>
                  <SelectTrigger id="separator-handling">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart">Smart (clean up extra commas/spaces)</SelectItem>
                    <SelectItem value="literal">Literal (keep as-is)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
            
            {showPreview && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sample-data">Sample Data (JSON)</Label>
                  <Textarea
                    id="sample-data"
                    value={sampleData}
                    onChange={(e) => setSampleData(e.target.value)}
                    rows={4}
                    placeholder='{"firstName": "John", "lastName": "Doe"}'
                  />
                </div>
                
                <div className="p-3 bg-muted rounded">
                  <p className="text-sm font-medium mb-1">Result:</p>
                  <p className="font-mono">{preview || '(empty)'}</p>
                </div>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!validation.isValid || !fieldKey}
          >
            {editingField ? 'Update' : 'Create'} Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}