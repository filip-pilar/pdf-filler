import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { fields, logicFields, pdfFile, pdfUrl } = useFieldStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Export Configuration</DialogTitle>
          <DialogDescription>
            Export your field configuration or download a filled PDF
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeFormat} onValueChange={(v) => setActiveFormat(v as ExportFormat)}>
          <TabsList className="grid w-full grid-cols-4">
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
              Filled PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="space-y-4">
            <JsonExportTab 
              fields={fields}
              logicFields={logicFields}
              pdfFileName={pdfFile?.name}
            />
          </TabsContent>

          <TabsContent value="javascript" className="space-y-4">
            <JavaScriptExportTab fields={fields} logicFields={logicFields} />
          </TabsContent>

          <TabsContent value="nextjs" className="space-y-4">
            <NextJsApiExportTab 
              fields={fields}
              logicFields={logicFields}
              pdfFileName={pdfFile?.name}
            />
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4">
            <PdfExportTab 
              fields={fields}
              logicFields={logicFields}
              pdfUrl={pdfUrl}
              pdfFileName={pdfFile?.name}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}