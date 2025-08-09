import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Download } from 'lucide-react';
import { exportFilledPDF, downloadPDF } from '@/exporters/pdfExporter';
import type { Field } from '@/types/field.types';

interface PdfExportTabProps {
  fields: Field[];
  pdfUrl: string | null;
  pdfFileName?: string;
}

export function PdfExportTab({ fields, pdfUrl, pdfFileName }: PdfExportTabProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!pdfUrl) {
      alert('Please upload a PDF first');
      return;
    }

    setExporting(true);
    try {
      // Fetch the PDF bytes
      const response = await fetch(pdfUrl);
      const pdfBytes = await response.arrayBuffer();
      
      // Export filled PDF
      const filledPdfBytes = await exportFilledPDF(pdfBytes, fields);
      
      // Download the filled PDF
      const filename = pdfFileName ? `filled-${pdfFileName}` : 'filled-form.pdf';
      downloadPDF(filledPdfBytes, filename);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <FileDown className="h-16 w-16 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Export Filled PDF</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Download a PDF with all the sample values filled in. 
          This is useful for testing your field configuration.
        </p>
      </div>
      <Button 
        size="lg" 
        onClick={handleExportPDF}
        disabled={!pdfUrl || fields.length === 0 || exporting}
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Download Filled PDF
          </>
        )}
      </Button>
      {fields.length === 0 && (
        <p className="text-xs text-destructive">
          Add some fields to the PDF first
        </p>
      )}
    </div>
  );
}