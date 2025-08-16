import { useRef, useState, useEffect, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { PdfNavigationBar } from './PdfNavigationBar';
import { PdfCanvas } from './PdfCanvas';
import { GridOverlay } from './GridOverlay';
import { UnifiedFieldOverlay } from './UnifiedFieldOverlay';
import { FieldConfigDialog } from '@/components/FieldConfigDialog/FieldConfigDialog';
import { OptionsFieldDialog } from '@/components/OptionsFieldDialog/OptionsFieldDialog';
import { CompositeFieldDialog } from '@/components/CompositeFieldDialog/CompositeFieldDialog';
import { PositionPickerOverlay } from '@/components/PositionPicker/PositionPickerOverlay';
import { PdfDropTarget } from './PdfDropTarget';
import type { FieldType } from '@/types/field.types';
import type { UnifiedField } from '@/types/unifiedField.types';

// Set worker URL
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PdfEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [containerBounds, setContainerBounds] = useState({ left: 0, width: 0 });
  
  // Local state for PDF display
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPageLocal] = useState(1);
  
  // Sync page changes with store
  const setCurrentPage = (page: number) => {
    setCurrentPageLocal(page);
    setStoreCurrentPage(page);
  };
  const [scale, setScale] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [naturalPageSize, setNaturalPageSize] = useState({ width: 0, height: 0 });
  
  // Unified field dialog state
  const [unifiedFieldForConfig, setUnifiedFieldForConfig] = useState<UnifiedField | null>(null);
  const [showUnifiedFieldConfig, setShowUnifiedFieldConfig] = useState(false);
  const [isNewUnifiedField, setIsNewUnifiedField] = useState(false);
  const [showOptionsFieldDialog, setShowOptionsFieldDialog] = useState(false);
  const [editingOptionsFieldId, setEditingOptionsFieldId] = useState<string | undefined>();
  const [showCompositeFieldDialog, setShowCompositeFieldDialog] = useState(false);
  const [editingCompositeField, setEditingCompositeField] = useState<UnifiedField | undefined>();
  
  const { 
    pdfUrl, 
    gridSize, 
    gridEnabled,
    setCurrentPage: setStoreCurrentPage,
    setTotalPages,
    unifiedFields,
    addUnifiedField,
    selectedUnifiedFieldId,
    deselectUnifiedField
  } = useFieldStore();
  const { snapPosition } = useGridSnap();
  const { isPickingPosition, pickingActionType, confirmPosition } = usePositionPickerStore();
  
  // Track container position for centering controls
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerBounds({ left: rect.left, width: rect.width });
      }
    };
    
    updateBounds();
    window.addEventListener('resize', updateBounds);
    
    // Update bounds when sidebar toggles (slight delay for animation)
    const observer = new ResizeObserver(() => {
      setTimeout(updateBounds, 100);
    });
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateBounds);
      observer.disconnect();
    };
  }, []);
  
  // Handle double-click on unified fields
  const handleUnifiedFieldDoubleClick = (field: UnifiedField) => {
    if (field.variant === 'options') {
      setEditingOptionsFieldId(field.id);
      setShowOptionsFieldDialog(true);
    } else if (field.type === 'composite-text') {
      setEditingCompositeField(field);
      setShowCompositeFieldDialog(true);
    } else {
      setUnifiedFieldForConfig(field);
      setShowUnifiedFieldConfig(true);
    }
  };

  // Handle field drops from sidebar
  const handleFieldDrop = (fieldType: FieldType, position: { x: number; y: number }, page: number) => {
    // Create a new unified field with the dropped type and position
    const newField = addUnifiedField({
      // Don't provide a key - let the store generate it properly (text_1, checkbox_2, etc.)
      type: fieldType,
      variant: 'single',
      page,
      position,
      enabled: true,
      structure: 'simple',
      placementCount: 1,
      positionVersion: 'top-edge'
    });

    // Open the field config dialog for immediate editing
    setUnifiedFieldForConfig(newField);
    setIsNewUnifiedField(true);
    setShowUnifiedFieldConfig(true);
  };


  const handleZoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.25, 4)), []);
  const handleZoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.25, 0.25)), []);
  
  const handleFitToWidth = useCallback(() => {
    if (containerRef.current && naturalPageSize.width) {
      const containerWidth = containerRef.current.clientWidth - 64;
      const newScale = containerWidth / naturalPageSize.width;
      setScale(Math.min(newScale, 4));
    }
  }, [naturalPageSize.width]);
  
  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Zoom in (Ctrl/Cmd + Plus)
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      }
      
      // Zoom out (Ctrl/Cmd + Minus)
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      
      // Reset zoom (Ctrl/Cmd + 0)
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleFitToWidth();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFitToWidth, handleZoomIn, handleZoomOut]);
  
  // Remove auto-adjust zoom - let user control zoom regardless of sidebar state
  // Horizontal scrolling will handle overflow when zoomed in


  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setTotalPages(numPages);
  };

  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    const { width, height } = page;
    // Store both scaled and natural (unscaled) dimensions
    setPageSize({ width, height });
    setNaturalPageSize({ width: width / scale, height: height / scale });
  };



  return (
    <>
      {/* Fixed floating controls centered over PDF editor */}
      <div 
        className="fixed z-50 pointer-events-none"
        style={{ 
          top: '80px',
          left: `${containerBounds.left + containerBounds.width / 2}px`,
          transform: 'translateX(-50%)'
        }}
      >
        <div className="pointer-events-auto">
          <PdfNavigationBar
            currentPage={currentPage}
            numPages={numPages}
            scale={scale}
            onPageChange={setCurrentPage}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitToWidth={handleFitToWidth}
            onZoomChange={setScale}
          />
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative w-full h-full bg-muted/30 transition-colors overflow-auto"
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem',
            paddingTop: '5rem', // Extra padding for floating controls
            minHeight: '100%',
            width: 'max-content',
            minWidth: '100%',
          }}
        >
          {pdfUrl && (
            <div 
              ref={pdfRef}
              className="relative bg-white shadow-lg"
              style={{ minHeight: 'min-content' }}
              onClick={(e) => {
                // Deselect field if clicked on background
                if (e.target === e.currentTarget || e.target === pdfRef.current) {
                  deselectUnifiedField();
                }
              }}
            >
              <PdfCanvas
                url={pdfUrl}
                currentPage={currentPage}
                scale={scale}
                onLoadSuccess={onDocumentLoadSuccess}
                onPageLoadSuccess={onPageLoadSuccess}
              />
              
              <PdfDropTarget
                currentPage={currentPage}
                scale={scale}
                pageWidth={naturalPageSize.width}
                pageHeight={naturalPageSize.height}
                onFieldDrop={handleFieldDrop}
                className="absolute inset-0"
              >
                <GridOverlay
                  show={gridEnabled}
                  enabled={gridEnabled}
                  pageWidth={pageSize.width}
                  pageHeight={pageSize.height}
                  scale={scale}
                  gridSize={gridSize}
                />
                
                <UnifiedFieldOverlay
                  fields={unifiedFields}
                  selectedFieldId={selectedUnifiedFieldId}
                  currentPage={currentPage}
                  scale={scale}
                  pageWidth={naturalPageSize.width}
                  pageHeight={naturalPageSize.height}
                  onFieldDoubleClick={handleUnifiedFieldDoubleClick}
                />

                
                {isPickingPosition && (
                  <PositionPickerOverlay
                    pageWidth={naturalPageSize.width}
                    pageHeight={naturalPageSize.height}
                    scale={scale}
                    onPositionClick={(x, y) => {
                      // Get the actual field size that will be rendered
                      const getFieldSize = () => {
                        if (pickingActionType === 'checkmark') {
                          return { width: 25, height: 25 };
                        }
                        // For text fields, always use 100px width for centering
                        // This matches the minWidth in the preview and the defaultSize
                        return { width: 100, height: 30 };
                      };
                      
                      const fieldSize = getFieldSize();
                      
                      // Convert click position to PDF coordinates
                      const screenX = x / scale;
                      const screenY = y / scale;
                      
                      // Center the field on the click position
                      const centeredScreenX = screenX - (fieldSize.width / 2);
                      const centeredScreenY = screenY - (fieldSize.height / 2);
                      
                      // For top-edge positioning: Y=0 is at TOP of page
                      // No inversion needed - use screen coordinates directly
                      const pdfX = centeredScreenX;
                      const pdfY = centeredScreenY; // Direct mapping for top-edge positioning
                      
                      // Apply grid snapping if enabled
                      const finalPosition = gridEnabled 
                        ? snapPosition({ x: pdfX, y: pdfY })
                        : { x: pdfX, y: pdfY };
                      
                      // Place field centered on click position (matching the preview)
                      confirmPosition({ 
                        x: Math.max(0, finalPosition.x), 
                        y: Math.max(0, finalPosition.y), 
                        page: currentPage 
                      });
                    }}
                  />
                )}
              </PdfDropTarget>
            </div>
          )}
        </div>
      </div>

      
      <FieldConfigDialog
        field={unifiedFieldForConfig}
        open={showUnifiedFieldConfig}
        onOpenChange={(open) => {
          setShowUnifiedFieldConfig(open);
          if (!open) {
            setUnifiedFieldForConfig(null);
            setIsNewUnifiedField(false);
          }
        }}
        isNew={isNewUnifiedField}
        onSave={() => {
          setIsNewUnifiedField(false);
        }}
      />
      
      <OptionsFieldDialog
        open={showOptionsFieldDialog}
        onOpenChange={setShowOptionsFieldDialog}
        editingFieldId={editingOptionsFieldId}
      />
      
      <CompositeFieldDialog
        isOpen={showCompositeFieldDialog}
        onClose={() => {
          setShowCompositeFieldDialog(false);
          setEditingCompositeField(undefined);
        }}
        editingField={editingCompositeField}
      />
    </>
  );
}