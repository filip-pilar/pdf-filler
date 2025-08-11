import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SqlImporter } from './SqlImporter';
import { JsonImporter } from './JsonImporter';
import { TypeScriptImporter } from './TypeScriptImporter';
import { FieldMappingDialog } from './FieldMappingDialog';
import { useFieldStore } from '@/store/fieldStore';
import type { Field } from '@/types/field.types';
import { Database, FileJson, Code2, Import, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const navigate = useNavigate();
  const [generatedFields, setGeneratedFields] = useState<Partial<Field>[]>([]);
  const [activeTab, setActiveTab] = useState<string>('sql');
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const { addField, useUnifiedFields } = useFieldStore();
  const [error, setError] = useState<string>('');

  const handleFieldsGenerated = (fields: Partial<Field>[]) => {
    setGeneratedFields(fields);
    setError('');
  };

  const handleImport = () => {
    if (generatedFields.length === 0) {
      setError('No fields to import. Please enter valid schema data.');
      return;
    }

    if (useUnifiedFields) {
      // Navigate to the full-page configuration
      onOpenChange(false);
      navigate('/import-config', { 
        state: { 
          fields: generatedFields,
          fromPage: '/'
        } 
      });
    } else {
      // Use old dialog for legacy mode
      onOpenChange(false);
      setShowMappingDialog(true);
    }
  };

  const handleConfirmMapping = (mappedFields: Partial<Field>[]) => {
    // Add all mapped fields to the store
    for (const field of mappedFields) {
      addField({
        ...field,
        page: field.page || 1
      } as Omit<Field, 'id'>);
    }
    
    toast.success(`Successfully imported ${mappedFields.length} fields`);

    // Reset and close
    setGeneratedFields([]);
    setError('');
    setShowMappingDialog(false);
    onOpenChange(false);
  };
  
  // This function is no longer used when useUnifiedFields is true
  // as we navigate to the full page instead

  const handleCancel = () => {
    setGeneratedFields([]);
    setError('');
    setShowMappingDialog(false);
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Schema</DialogTitle>
          <DialogDescription>
            Import fields from SQL, JSON, or TypeScript to automatically generate form fields
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sql" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              SQL
            </TabsTrigger>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="typescript" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              TypeScript
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <TabsContent value="sql" className="mt-0">
              <SqlImporter onFieldsGenerated={handleFieldsGenerated} />
            </TabsContent>
            <TabsContent value="json" className="mt-0">
              <JsonImporter onFieldsGenerated={handleFieldsGenerated} />
            </TabsContent>
            <TabsContent value="typescript" className="mt-0">
              <TypeScriptImporter onFieldsGenerated={handleFieldsGenerated} />
            </TabsContent>

            {generatedFields.length > 0 && (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-3">
                    Preview: {generatedFields.length} fields will be created
                  </h3>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
                    {generatedFields.map((field, index) => (
                      <div 
                        key={index} 
                        className="text-xs p-2 bg-muted rounded flex items-center justify-between"
                      >
                        <span className="font-mono">{field.key}</span>
                        <span className="text-muted-foreground">{field.type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={generatedFields.length === 0}
            className="flex items-center gap-2"
          >
            <Import className="h-4 w-4" />
            Configure & Import {generatedFields.length > 0 && `${generatedFields.length} Fields`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Only show legacy dialog for non-unified fields mode */}
    {!useUnifiedFields && (
      <FieldMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        fields={generatedFields}
        onConfirm={handleConfirmMapping}
      />
    )}
    </>
  );
}