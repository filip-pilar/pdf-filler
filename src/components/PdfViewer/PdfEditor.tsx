import { useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { PdfNavigationBar } from './PdfNavigationBar';
import { PdfCanvas } from './PdfCanvas';
import { GridOverlay } from './GridOverlay';
import { FieldOverlay } from './FieldOverlay';
import { UnifiedFieldOverlay } from './UnifiedFieldOverlay';
import { FieldPropertiesDialog } from '@/components/FieldPropertiesDialog/FieldPropertiesDialog';
import { LogicFieldDialog } from '@/components/LogicFieldDialog/LogicFieldDialog';
import { FieldConfigDialog } from '@/components/FieldConfigDialog/FieldConfigDialog';
import { OptionsFieldDialog } from '@/components/OptionsFieldDialog/OptionsFieldDialog';
import { PositionPickerOverlay } from '@/components/PositionPicker/PositionPickerOverlay';
import { PdfDropTarget } from './PdfDropTarget';
import { cn } from '@/lib/utils';
import type { Field } from '@/types/field.types';
import type { FieldType } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { UnifiedField } from '@/types/unifiedField.types';

// Set worker URL
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();


interface PdfEditorProps {
  onDragStateChange?: (isDragging: boolean) => void;
}

export function PdfEditor({ }: PdfEditorProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  
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
  const [newFieldForConfig, setNewFieldForConfig] = useState<Field | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [showLogicFieldDialog, setShowLogicFieldDialog] = useState(false);
  const [editingLogicField, setEditingLogicField] = useState<LogicField | null>(null);
  
  // Unified field dialog state
  const [unifiedFieldForConfig, setUnifiedFieldForConfig] = useState<UnifiedField | null>(null);
  const [showUnifiedFieldConfig, setShowUnifiedFieldConfig] = useState(false);
  const [isNewUnifiedField, setIsNewUnifiedField] = useState(false);
  const [showOptionsFieldDialog, setShowOptionsFieldDialog] = useState(false);
  const [editingOptionsFieldId, setEditingOptionsFieldId] = useState<string | undefined>();
  
  const { 
    fields, 
    selectedFieldKey,
    getAllActionsForPage,
    getAllBooleanActionsForPage,
    pdfUrl, 
    showGrid, 
    gridSize, 
    gridEnabled,
    setCurrentPage: setStoreCurrentPage,
    setTotalPages,
    useUnifiedFields,
    unifiedFields,
    addUnifiedField
  } = useFieldStore();
  const { snapPosition } = useGridSnap(pageSize.height);
  const { isPickingPosition, pickingActionType, confirmPosition } = usePositionPickerStore();
  
  // Handle double-click on unified fields
  const handleUnifiedFieldDoubleClick = (field: UnifiedField) => {
    if (field.variant === 'options') {
      setEditingOptionsFieldId(field.id);
      setShowOptionsFieldDialog(true);
    } else {
      setUnifiedFieldForConfig(field);
      setShowUnifiedFieldConfig(true);
    }
  };

  // Handle field drops from sidebar
  const handleFieldDrop = (fieldType: FieldType, position: { x: number; y: number }, page: number) => {
    if (!useUnifiedFields) return;

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


  const handleZoomIn = () => setScale(Math.min(scale + 0.25, 3));
  const handleZoomOut = () => setScale(Math.max(scale - 0.25, 0.5));
  
  const handleFitToWidth = () => {
    if (containerRef.current && pageSize.width) {
      const containerWidth = containerRef.current.clientWidth - 64;
      const newScale = containerWidth / pageSize.width;
      setScale(Math.min(newScale, 2));
    }
  };

  const handleFitToPage = () => {
    if (containerRef.current && pageSize.width && pageSize.height) {
      const containerWidth = containerRef.current.clientWidth - 64;
      const containerHeight = containerRef.current.clientHeight - 64;
      const scaleX = containerWidth / pageSize.width;
      const scaleY = containerHeight / pageSize.height;
      setScale(Math.min(scaleX, scaleY, 2));
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setTotalPages(numPages);
  };

  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    const { width, height } = page;
    setPageSize({ width, height });
  };

  const currentPageActions = getAllActionsForPage(currentPage);
  const currentPageBooleanActions = getAllBooleanActionsForPage(currentPage);


  return (
    <>
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        <PdfNavigationBar
          currentPage={currentPage}
          numPages={numPages}
          scale={scale}
          onPageChange={setCurrentPage}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToWidth={handleFitToWidth}
          onFitToPage={handleFitToPage}
        />
        
        <div 
          ref={containerRef} 
          className={cn(
            "flex-1 overflow-auto bg-muted/30 transition-colors"
          )}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          {pdfUrl && (
            <div 
              ref={pdfRef}
              className="relative bg-white shadow-lg"
              style={{ minHeight: 'min-content' }}
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
                pageWidth={pageSize.width}
                pageHeight={pageSize.height}
                onFieldDrop={handleFieldDrop}
                className="absolute inset-0"
              >
                <GridOverlay
                  show={showGrid}
                  enabled={gridEnabled}
                  pageWidth={pageSize.width}
                  pageHeight={pageSize.height}
                  scale={scale}
                  gridSize={gridSize}
                />
                
                {useUnifiedFields ? (
                  <UnifiedFieldOverlay
                    fields={unifiedFields}
                    selectedFieldId={selectedFieldKey}
                    currentPage={currentPage}
                    scale={scale}
                    pageWidth={pageSize.width}
                    pageHeight={pageSize.height}
                    onFieldDoubleClick={handleUnifiedFieldDoubleClick}
                  />
                ) : (
                  <FieldOverlay
                    fields={fields}
                    actions={currentPageActions}
                    booleanActions={currentPageBooleanActions}
                    selectedFieldKey={selectedFieldKey}
                    currentPage={currentPage}
                    scale={scale}
                    pageWidth={pageSize.width}
                    pageHeight={pageSize.height}
                  />
                )}

                
                {isPickingPosition && (
                  <PositionPickerOverlay
                    pageWidth={pageSize.width}
                    pageHeight={pageSize.height}
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
                      
                      // Convert screen coordinates to PDF coordinates (Y-axis is inverted)
                      // Now storing Y as distance from PDF bottom to field's TOP edge
                      const pdfX = centeredScreenX;
                      const pdfY = pageSize.height - centeredScreenY; // Top edge position
                      
                      // Apply grid snapping if enabled (pass field size for proper Y conversion)
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

      {newFieldForConfig && (
        <FieldPropertiesDialog
          field={newFieldForConfig}
          open={showFieldConfig}
          onOpenChange={(open) => {
            setShowFieldConfig(open);
            if (!open) {
              setNewFieldForConfig(null);
            }
          }}
        />
      )}
      
      <LogicFieldDialog
        open={showLogicFieldDialog}
        onOpenChange={(open) => {
          setShowLogicFieldDialog(open);
          if (!open) {
            setEditingLogicField(null);
          }
        }}
        logicField={editingLogicField}
      />
      
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
    </>
  );
}