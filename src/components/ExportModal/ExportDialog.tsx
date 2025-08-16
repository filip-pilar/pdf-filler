import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useFieldStore } from '@/store/fieldStore';
import { JsonExportTab } from './JsonExportTab';
import { JavaScriptExportTab } from './JavaScriptExportTab';
import { PdfExportTab } from './PdfExportTab';
import { NextJsApiExportTab } from './NextJsApiExportTab';
import { FileJson, Code2, FileDown, Braces } from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'json' | 'javascript' | 'nextjs' | 'pdf';

export function ExportDialog({ open, onOpenChange }: ExportModalProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('json');
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const { unifiedFields, pdfFile, pdfUrl, queuedFields } = useFieldStore();

  // Track when dialog has been opened for lazy initialization
  useEffect(() => {
    if (open && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [open, hasBeenOpened]);

  // Validate fields and generate warnings
  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    
    // Check for unplaced queued fields
    if (queuedFields && queuedFields.length > 0) {
      issues.push(`${queuedFields.length} field(s) in the queue haven't been placed on the PDF`);
    }
    
    // Check for composite fields without positions
    const unplacedCompositeFields = unifiedFields.filter(
      f => f.type === 'composite-text' && !f.position
    );
    if (unplacedCompositeFields.length > 0) {
      issues.push(`${unplacedCompositeFields.length} composite field(s) haven't been placed on the PDF`);
    }
    
    // Check for composite fields with empty templates
    const emptyCompositeFields = unifiedFields.filter(
      f => f.type === 'composite-text' && (!f.template || f.template.trim() === '')
    );
    if (emptyCompositeFields.length > 0) {
      issues.push(`${emptyCompositeFields.length} composite field(s) have empty templates`);
    }
    
    // Check for fields with missing dependencies
    const compositeFields = unifiedFields.filter(f => f.type === 'composite-text' && f.template);
    const availableKeys = new Set(
      unifiedFields
        .filter(f => f.type !== 'composite-text')
        .flatMap(f => {
          if (f.variant === 'options' && f.optionMappings) {
            return f.optionMappings.map(m => `${f.key}.${m.key}`);
          }
          return [f.key];
        })
    );
    
    const fieldsWithMissingDeps = compositeFields.filter(field => {
      if (!field.dependencies) return false;
      return field.dependencies.some(dep => !availableKeys.has(dep));
    });
    
    if (fieldsWithMissingDeps.length > 0) {
      issues.push(`${fieldsWithMissingDeps.length} composite field(s) reference non-existent fields`);
    }
    
    return issues;
  }, [unifiedFields, queuedFields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Export Configuration</DialogTitle>
          <DialogDescription>
            Export your field configuration or generate a preview PDF
          </DialogDescription>
        </DialogHeader>

        {validationIssues.length > 0 && (
          <Alert className="mx-6 mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: Incomplete Configuration</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {validationIssues.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as ExportFormat)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 mx-6 mt-4" style={{ width: 'calc(100% - 3rem)' }}>
            <TabsTrigger value="json" className="flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="javascript" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              JavaScript
            </TabsTrigger>
            <TabsTrigger value="nextjs" className="flex items-center gap-2">
              <Braces className="h-4 w-4" />
              API Route
            </TabsTrigger>
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              PDF Preview
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {hasBeenOpened && (
              <>
                <TabsContent value="json" className="space-y-4 mt-4" forceMount>
                  <div style={{ display: activeFormat === 'json' ? 'block' : 'none' }}>
                    <JsonExportTab 
                      pdfFileName={pdfFile?.name}
                      unifiedFields={unifiedFields}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="javascript" className="space-y-4 mt-4" forceMount>
                  <div style={{ display: activeFormat === 'javascript' ? 'block' : 'none' }}>
                    <JavaScriptExportTab 
                      unifiedFields={unifiedFields}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="nextjs" className="space-y-4 mt-4" forceMount>
                  <div style={{ display: activeFormat === 'nextjs' ? 'block' : 'none' }}>
                    <NextJsApiExportTab 
                      pdfFileName={pdfFile?.name}
                      unifiedFields={unifiedFields}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pdf" className="space-y-4 mt-4" forceMount>
                  <div style={{ display: activeFormat === 'pdf' ? 'block' : 'none' }}>
                    <PdfExportTab
                      pdfUrl={pdfUrl}
                      pdfFileName={pdfFile?.name}
                      unifiedFields={unifiedFields}
                    />
                  </div>
                </TabsContent>
              </>
            )}
            {!hasBeenOpened && (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}