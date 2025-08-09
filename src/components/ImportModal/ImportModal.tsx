import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SqlImporter } from './SqlImporter';
import { JsonImporter } from './JsonImporter';
import { TypeScriptImporter } from './TypeScriptImporter';
import { useFieldStore } from '@/store/fieldStore';
import type { Field } from '@/types/field.types';
import { Database, FileJson, Code2, Import, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [generatedFields, setGeneratedFields] = useState<Partial<Field>[]>([]);
  const [activeTab, setActiveTab] = useState<string>('sql');
  const { addField } = useFieldStore();
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

    // Add all fields to the store (default to page 1)
    for (const field of generatedFields) {
      addField({
        ...field,
        page: field.page || 1
      } as Omit<Field, 'id'>);
    }
    
    toast.success(`Successfully imported ${generatedFields.length} fields`);

    // Reset and close
    setGeneratedFields([]);
    setError('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setGeneratedFields([]);
    setError('');
    onOpenChange(false);
  };

  return (
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
            Import {generatedFields.length > 0 && `${generatedFields.length} Fields`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}