import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FieldMappingTable } from '@/components/ImportModal/FieldMappingTable';
import { useFieldStore } from '@/store/fieldStore';
import { ArrowLeft, Import } from 'lucide-react';
import { toast } from 'sonner';

interface LocationState {
  fields: Array<{
    key: string;
    type?: string;
    sampleValue?: unknown;
    structure?: string;
    nestedKeys?: string[];
    page?: number;
    displayName?: string;
  }>;
  fromPage?: string;
}

export function ImportConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const { addUnifiedField, totalPages } = useFieldStore();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // If no fields were passed, redirect back to home
    if (!state?.fields || state.fields.length === 0) {
      navigate('/');
    }
  }, [state, navigate]);

  const handleGoBack = () => {
    // Go back to the previous page or home
    if (state?.fromPage) {
      navigate(state.fromPage);
    } else {
      navigate('/');
    }
  };

  const handleConfirmMapping = async (mappedFields: Array<{
    key: string;
    type: string;
    page: number;
    placementCount: number;
    fieldVariant: string;
    options?: string[];
  }>) => {
    setIsProcessing(true);
    
    try {
      // Process each mapped field
      // Track position offsets per page to cascade fields
      const pageOffsets: Record<number, { x: number; y: number; count: number }> = {};
      
      mappedFields.forEach(mapping => {
        // Initialize page offset if not exists
        if (!pageOffsets[mapping.page]) {
          pageOffsets[mapping.page] = { x: 50, y: 50, count: 0 };
        }
        
        const offset = pageOffsets[mapping.page];
        // Handle auto-flattening for objects
        if (mapping.fieldVariant === 'text-multi' && mapping.options) {
          // Create separate fields for multi-placement
          mapping.options.forEach((option: string, idx: number) => {
            addUnifiedField({
              key: `${mapping.key}_${option}`,
              type: mapping.type,
              variant: 'single',
              page: mapping.page,
              position: { 
                x: offset.x + (idx * 150), 
                y: offset.y + (offset.count * 40) 
              },
              enabled: true,
              structure: 'simple',
              placementCount: 1,
              sampleValue: option,
              positionVersion: 'top-edge' as const
            });
          });
          
          // Update offset for next field
          pageOffsets[mapping.page].count++;
          if (offset.x + 600 > 800) { // If getting too wide, wrap to next row
            pageOffsets[mapping.page].x = 50;
            pageOffsets[mapping.page].y += 50;
          } else {
            pageOffsets[mapping.page].x += (mapping.options.length * 150) + 20;
          }
        } else {
          // Add single unified field
          const fieldToAdd = {
            key: mapping.key,
            type: mapping.type,
            variant: mapping.fieldVariant,
            page: mapping.page,
            position: { 
              x: offset.x, 
              y: offset.y + (offset.count * 40) // Stack fields vertically with 40px spacing
            },
            enabled: true,
            structure: mapping.fieldVariant === 'text-list' ? 'array' : 'simple',
            placementCount: mapping.placementCount,
            options: mapping.options,
            sampleValue: state.fields.find(f => f.key === mapping.key)?.sampleValue,
            positionVersion: 'top-edge' as const
          };
          addUnifiedField(fieldToAdd);
          
          // Update offset for next field
          pageOffsets[mapping.page].count++;
          // Wrap to next column after 15 fields
          if (offset.count >= 15) {
            pageOffsets[mapping.page].x += 200;
            pageOffsets[mapping.page].y = 50;
            pageOffsets[mapping.page].count = 0;
          }
        }
      });
      
      toast.success(`Successfully imported ${mappedFields.length} fields`);
      
      // Navigate back to home after successful import
      navigate('/');
    } catch (error) {
      console.error('Failed to import fields:', error);
      toast.error('Failed to import fields');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!state?.fields || state.fields.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold flex items-center gap-2">
                  <Import className="h-5 w-5" />
                  Configure Field Import
                </h1>
                <p className="text-sm text-muted-foreground">
                  Review and configure how your data fields will map to PDF form fields
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{state.fields.length} fields to import</span>
              <span>•</span>
              <span>{totalPages || 1} PDF pages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <FieldMappingTable
          fields={state.fields}
          totalPages={totalPages || 1}
          onConfirm={handleConfirmMapping}
        />
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
              <span className="text-sm">Importing fields...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}