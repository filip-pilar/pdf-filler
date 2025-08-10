import { useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { pdfjs } from 'react-pdf';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { PdfNavigationBar } from './PdfNavigationBar';
import { PdfCanvas } from './PdfCanvas';
import { GridOverlay } from './GridOverlay';
import { FieldOverlay } from './FieldOverlay';
import { UnifiedFieldOverlay } from './UnifiedFieldOverlay';
import { DragPreview } from './DragPreview';
import { FieldPropertiesDialog } from '@/components/FieldPropertiesDialog/FieldPropertiesDialog';
import { LogicFieldDialog } from '@/components/LogicFieldDialog/LogicFieldDialog';
import { PositionPickerOverlay } from '@/components/PositionPicker/PositionPickerOverlay';
import { cn } from '@/lib/utils';
import type { Field, FieldType } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { DragItem } from '@/components/AppSidebar/DraggableFieldItem';

// Set worker URL
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Helper function to get field size based on type
const getFieldSize = (type: FieldType | 'logic') => {
  switch(type) {
    case 'checkbox': return { width: 25, height: 25 };
    case 'signature': return { width: 150, height: 40 };
    case 'image': return { width: 150, height: 100 };
    case 'logic': return { width: 200, height: 30 };
    default: return { width: 200, height: 30 };
  }
};

export function PdfEditor() {
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
  const [dragPreview, setDragPreview] = useState<{
    type: FieldType | 'logic';
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  
  const { 
    fields, 
    selectedFieldKey, 
    addField,
    getAllActionsForPage,
    getAllBooleanActionsForPage,
    pdfUrl, 
    showGrid, 
    gridSize, 
    gridEnabled,
    setCurrentPage: setStoreCurrentPage,
    setTotalPages,
    useUnifiedFields,
    unifiedFields
  } = useFieldStore();
  const { snapPosition } = useGridSnap();
  const { isPickingPosition, pickingActionType, pickingContent, confirmPosition } = usePositionPickerStore();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['NEW_FIELD'],
    hover: (item: DragItem, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset || !pdfRef.current) {
        setDragPreview(null);
        return;
      }

      const pdfRect = pdfRef.current.getBoundingClientRect();
      const x = (clientOffset.x - pdfRect.left) / scale;
      const y = (clientOffset.y - pdfRect.top) / scale;
      
      const size = getFieldSize(item.fieldType);
      const snappedPos = gridEnabled ? snapPosition({ x, y }) : { x, y };
      
      setDragPreview({
        type: item.fieldType,
        x: snappedPos.x,
        y: snappedPos.y,
        width: size.width,
        height: size.height
      });
    },
    drop: (item: DragItem, monitor) => {
      setDragPreview(null);
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset || !pdfRef.current) return;

      const pdfRect = pdfRef.current.getBoundingClientRect();
      const x = (clientOffset.x - pdfRect.left) / scale;
      const y = (clientOffset.y - pdfRect.top) / scale;
      
      // Apply grid snapping if enabled
      const snappedPos = gridEnabled ? snapPosition({ x, y }) : { x, y };

      const newField = addField({
        type: item.fieldType,
        label: '',
        page: currentPage,
        position: { x: Math.max(0, snappedPos.x), y: Math.max(0, snappedPos.y) },
        size: getFieldSize(item.fieldType),
        properties: {},
      });

      setNewFieldForConfig(newField);
      setShowFieldConfig(true);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [fields, currentPage, scale, addField, gridEnabled, snapPosition]);

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

  // Attach drop ref to container
  drop(containerRef);

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
            "flex-1 overflow-auto bg-muted/30 transition-colors",
            isOver && canDrop && "bg-primary/5"
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

              {dragPreview && isOver && (
                <DragPreview
                  type={dragPreview.type}
                  x={dragPreview.x}
                  y={dragPreview.y}
                  width={dragPreview.width}
                  height={dragPreview.height}
                  scale={scale}
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
                    const pdfX = x / scale;
                    const pdfY = y / scale;
                    
                    // Center the field on the click position by subtracting half its size
                    const centeredX = pdfX - (fieldSize.width / 2);
                    const centeredY = pdfY - (fieldSize.height / 2);
                    
                    // Apply grid snapping if enabled
                    const finalPosition = gridEnabled 
                      ? snapPosition({ x: centeredX, y: centeredY })
                      : { x: centeredX, y: centeredY };
                    
                    // Place field centered on click position (matching the preview)
                    confirmPosition({ 
                      x: Math.max(0, finalPosition.x), 
                      y: Math.max(0, finalPosition.y), 
                      page: currentPage 
                    });
                  }}
                />
              )}
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
    </>
  );
}