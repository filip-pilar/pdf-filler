/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { InfoIcon, AlertCircle, Plus } from 'lucide-react';

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
    unifiedFields, // Subscribe to fields changes
    addUnifiedField,
    getUnifiedFieldByKey
  } = useFieldStore();
  
  const [fieldKey, setFieldKey] = useState('');
  const [template, setTemplate] = useState('');
  const [emptyBehavior, setEmptyBehavior] = useState<'skip' | 'show-empty' | 'placeholder'>('skip');
  const [separatorHandling, setSeparatorHandling] = useState<'smart' | 'literal'>('smart');
  const [sampleData, setSampleData] = useState<string>('{}');
  const [showFieldBreakdown] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showQuickCreateField, setShowQuickCreateField] = useState(false);
  const [quickFieldKey, setQuickFieldKey] = useState('');
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Reset form when dialog opens/closes or editingField changes
  useEffect(() => {
    if (isOpen) {
      if (editingField) {
        // Editing existing field
        setFieldKey(editingField.key || '');
        setTemplate(editingField.template || '');
        setEmptyBehavior(editingField.compositeFormatting?.emptyValueBehavior || 'skip');
        setSeparatorHandling(editingField.compositeFormatting?.separatorHandling || 'smart');
      } else {
        // Creating new field - reset everything
        setFieldKey('');
        setTemplate('');
        setEmptyBehavior('skip');
        setSeparatorHandling('smart');
      }
      setSampleData('{}');
      setShowPreview(false);
    }
  }, [isOpen, editingField]);
  
  const availableFields = useMemo(() => {
    return getAvailableFieldKeys();
  }, [getAvailableFieldKeys]);
  
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
    // Create sample data from ALL available fields with actual sample values
    // Only update if sample data is still the default or if dependencies changed
    try {
      const currentData = JSON.parse(sampleData);
      const isDefault = Object.keys(currentData).length === 0;
      if (!isDefault) return; // User has modified the sample data, don't overwrite
    } catch {
      // Invalid JSON, proceed with update
    }
    
    const sample: Record<string, string | Record<string, string>> = {};
    
    // Generate sample data for ALL available fields, not just dependencies
    availableFields.forEach(fieldKey => {
      // Check if this is an option field reference (fieldKey.optionKey)
      if (fieldKey.includes('.')) {
        const [baseFieldKey, optionKey] = fieldKey.split('.');
        const field = unifiedFields.find(f => f.key === baseFieldKey);
        
        if (field?.variant === 'options') {
          // For options fields, use the option key as the value
          sample[fieldKey] = optionKey;
        } else {
          // For nested regular fields
          if (!sample[baseFieldKey]) sample[baseFieldKey] = {} as Record<string, string>;
          (sample[baseFieldKey] as Record<string, string>)[optionKey] = field?.sampleValue || `Sample ${optionKey}`;
        }
      } else {
        const field = unifiedFields.find(f => f.key === fieldKey);
        const fieldValue = field?.sampleValue;
        // Handle different types of sample values
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          sample[fieldKey] = String(fieldValue);
        } else {
          sample[fieldKey] = `Sample ${fieldKey}`;
        }
      }
    });
    setSampleData(JSON.stringify(sample, null, 2));
  }, [availableFields, sampleData, unifiedFields]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (validation.isValid && fieldKey) {
          handleSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, validation.isValid, fieldKey]);
  
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
      // Create new field without position - will be placed via position picker
      const newField = createCompositeField(
        template,
        undefined, // No position yet - will be set via position picker
        currentPage
      );
      // Override the key with the user-provided one
      newField.key = fieldKey;
      newField.compositeFormatting = {
        emptyValueBehavior: emptyBehavior,
        separatorHandling: separatorHandling,
        whitespaceHandling: 'normalize'
      };
      if (onSave) onSave(newField);
    }
    
    onClose();
  };
  
  const handleUseSuggestion = (suggestionTemplate: string) => {
    setTemplate(suggestionTemplate);
  };
  
  const cleanFieldKey = (value: string) => {
    // Replace spaces with underscores and remove special characters
    // Preserve dots for nested paths
    return value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');
  };
  
  const handleQuickCreateField = () => {
    const cleanedKey = cleanFieldKey(quickFieldKey);
    if (!cleanedKey) return;
    
    // Check if field already exists
    if (getUnifiedFieldByKey(cleanedKey)) {
      alert(`Field "${cleanedKey}" already exists`);
      return;
    }
    
    // Create data-only field (no position)
    addUnifiedField({
      key: cleanedKey,
      type: 'text',
      variant: 'single',
      structure: 'simple',
      page: currentPage || 1,
      enabled: true,
      placementCount: 0,
      sampleValue: `Sample ${cleanedKey}`,
      properties: {
        fontSize: 12
      }
    });
    
    // Add to template
    const currentTemplate = template;
    const newTemplate = currentTemplate ? `${currentTemplate} {${cleanedKey}}` : `{${cleanedKey}}`;
    setTemplate(newTemplate);
    
    // Reset quick create form
    setQuickFieldKey('');
    setShowQuickCreateField(false);
    templateTextareaRef.current?.focus();
  };
  
  const handleClose = () => {
    // Auto-save if editing existing field and template has changed
    if (editingField && template && template !== editingField.template) {
      updateCompositeTemplate(editingField.id, template);
    }
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingField ? 'Edit Composite Field' : 'Create Composite Field'}
          </DialogTitle>
          <DialogDescription>
            Combine multiple fields into a single output using a template
          </DialogDescription>
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
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This key will be used to reference the composite field
            </p>
          </div>
          
          {/* Template */}
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Textarea
              ref={templateTextareaRef}
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
          
          {/* Available Data Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Available Fields</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowQuickCreateField(!showQuickCreateField)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Quick Add
              </Button>
            </div>
            
            {/* Quick Create Field Form */}
            {showQuickCreateField && (
              <div className="flex gap-2 p-2 border rounded-md bg-blue-50">
                <Input
                  placeholder="New field key (e.g., firstName)"
                  value={quickFieldKey}
                  onChange={(e) => setQuickFieldKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickCreateField();
                    }
                    if (e.key === 'Escape') {
                      setShowQuickCreateField(false);
                      setQuickFieldKey('');
                    }
                  }}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleQuickCreateField}
                  disabled={!quickFieldKey.trim()}
                >
                  Create & Add
                </Button>
              </div>
            )}
            
            <div className="p-2 border rounded-md bg-muted/30">
              {availableFields.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {availableFields.map(field => (
                    <Button
                      key={field}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs font-mono"
                      onClick={() => {
                        const currentTemplate = template;
                        const newTemplate = currentTemplate ? `${currentTemplate} {${field}}` : `{${field}}`;
                        setTemplate(newTemplate);
                        templateTextareaRef.current?.focus();
                      }}
                      title="Click to add to template"
                    >
                      {field}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No fields available yet. Use "Quick Add" above or create data fields using the "Data Field (Invisible)" button.
                </p>
              )}
            </div>
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
                  onClick={() => {
                    const newTemplate = template + `{${field}}`;
                    setTemplate(newTemplate);
                    // Focus back on textarea and move cursor to end
                    setTimeout(() => {
                      if (templateTextareaRef.current) {
                        templateTextareaRef.current.focus();
                        templateTextareaRef.current.setSelectionRange(newTemplate.length, newTemplate.length);
                      }
                    }, 0);
                  }}
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
                    className="font-mono text-sm"
                  />
                </div>
                
                {/* Field breakdown */}
                {showFieldBreakdown && validation.dependencies.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded space-y-2">
                    <p className="text-sm font-medium">Field Values:</p>
                    <div className="space-y-1">
                      {validation.dependencies.map(dep => {
                        try {
                          const data = JSON.parse(sampleData) as Record<string, any>;
                          let value = data[dep];
                          if (dep.includes('.')) {
                            const parts = dep.split('.');
                            value = parts.reduce((obj, key) => obj?.[key], data);
                          }
                          return (
                            <div key={dep} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="font-mono">{dep}</Badge>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono">{String(value || '(empty)')}</span>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })}
                    </div>
                  </div>
                )}
                
                <div className="p-3 bg-primary/5 border border-primary/20 rounded">
                  <p className="text-sm font-medium mb-2">Composite Result:</p>
                  <div className="font-mono text-lg bg-background p-2 rounded border">
                    {preview || '(empty)'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Estimated length: {preview?.length || 0} characters
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl</kbd>+<kbd className="px-1 py-0.5 text-xs bg-muted rounded">Enter</kbd> to save
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!validation.isValid || !fieldKey || !template.trim()}
              >
                {editingField ? 'Update' : 'Create'} Field
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}