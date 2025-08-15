import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';
import { exportUnifiedPDF, downloadPDF } from '@/exporters/unifiedPdfExporter';
import type { UnifiedField } from '@/types/unifiedField.types';
import { toast } from 'sonner';

interface PdfExportTabProps {
  pdfUrl: string | null;
  pdfFileName?: string;
  unifiedFields?: UnifiedField[];
}

export function PdfExportTab({ pdfUrl, pdfFileName, unifiedFields = [] }: PdfExportTabProps) {
  const fieldCount = unifiedFields.length;
  const [exporting, setExporting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup on unmount to prevent async canceled errors
  useEffect(() => {
    return () => {
      // Cancel any ongoing fetch operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setExporting(false);
    };
  }, []);

  const generateSampleValues = () => {
    const values: Record<string, string | boolean | number | string[]> = {};
    
    if (unifiedFields) {
      for (const field of unifiedFields) {
        if (!field.enabled) continue;
        
        if (field.variant === 'options' && field.optionMappings && field.optionMappings.length > 0) {
          // For options fields, select the first option(s)
          values[field.key] = field.multiSelect 
            ? [field.optionMappings[0].key]
            : field.optionMappings[0].key;
        } else {
          // Use sample value or generate based on type
          if (field.sampleValue !== undefined) {
            values[field.key] = field.sampleValue;
          } else {
            switch (field.type) {
              case 'checkbox':
                values[field.key] = true;
                break;
              case 'text': {
                // Generate contextual sample data
                const key = field.key.toLowerCase();
                if (key.includes('email')) {
                  values[field.key] = 'john.doe@example.com';
                } else if (key.includes('phone')) {
                  values[field.key] = '(555) 123-4567';
                } else if (key.includes('name')) {
                  values[field.key] = 'John Doe';
                } else if (key.includes('date')) {
                  values[field.key] = new Date().toLocaleDateString();
                } else if (key.includes('address')) {
                  values[field.key] = '123 Main Street, Suite 100';
                } else if (key.includes('city')) {
                  values[field.key] = 'San Francisco';
                } else if (key.includes('state')) {
                  values[field.key] = 'CA';
                } else if (key.includes('zip')) {
                  values[field.key] = '94105';
                } else {
                  values[field.key] = `Sample ${field.key}`;
                }
                break;
              }
              default:
                values[field.key] = field.properties?.defaultValue || '';
            }
          }
        }
      }
    }
    
    return values;
  };

  const handleExportPDF = async () => {
    if (!pdfUrl) {
      toast.error('Please upload a PDF first');
      return;
    }

    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this operation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setExporting(true);
    try {
      // Fetch the PDF bytes with abort signal
      const response = await fetch(pdfUrl, {
        signal: abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const pdfBytes = await response.arrayBuffer();
      
      // Generate sample values for preview
      const sampleValues = generateSampleValues();
      
      // Use unified exporter
      const filledPdfBytes = await exportUnifiedPDF(pdfBytes, {
        fields: unifiedFields,
        fieldValues: sampleValues
      });
      
      // Download the preview PDF
      const filename = pdfFileName ? `preview-${pdfFileName}` : 'preview-form.pdf';
      downloadPDF(filledPdfBytes, filename);
      
      toast.success('PDF preview generated successfully!');
    } catch (error) {
      // Don't show error if it was an abort
      const err = error as Error;
      if (err?.name === 'AbortError' || err?.message?.includes('abort')) {
        console.log('PDF export was canceled');
      } else {
        console.error('Failed to generate PDF preview:', error);
        toast.error('Failed to generate PDF preview. Please try again.');
      }
    } finally {
      setExporting(false);
      // Clear the abort controller reference
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Eye className="h-16 w-16 text-muted-foreground" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Generate PDF Preview</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Generate a preview PDF with sample values to visualize how your 
          configured fields will appear when filled with actual data.
        </p>
      </div>
      <Button 
        size="lg" 
        onClick={handleExportPDF}
        disabled={!pdfUrl || fieldCount === 0 || exporting}
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
            Generating Preview...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Download Preview PDF
          </>
        )}
      </Button>
      {fieldCount === 0 && (
        <p className="text-xs text-destructive">
          Add some fields to the PDF first
        </p>
      )}
      {fieldCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Preview will include {fieldCount} field{fieldCount !== 1 ? 's' : ''} with sample values
        </p>
      )}
    </div>
  );
}