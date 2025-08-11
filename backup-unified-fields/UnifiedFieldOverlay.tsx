import { useState, useRef, useEffect } from 'react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';
import { DraggableUnifiedField } from './DraggableUnifiedField';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import type { UnifiedField } from '@/types/unifiedField.types';

interface UnifiedFieldOverlayProps {
  fields: UnifiedField[];
  selectedFieldId: string | null;
  currentPage: number;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  onFieldDoubleClick?: (field: UnifiedField) => void;
}


export function UnifiedFieldOverlay({
  fields,
  selectedFieldId,
  currentPage,
  scale,
  pageWidth,
  pageHeight,
  onFieldDoubleClick,
}: UnifiedFieldOverlayProps) {
  const { gridEnabled, gridSize } = useFieldStore();
  const { snapPosition } = useGridSnap(pageHeight);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Filter fields for current page and enabled status
  const currentPageFields = fields.filter(
    field => field.page === currentPage && field.enabled
  );
  
  // Create custom drop zone that calculates position on drop
  const { setNodeRef, isOver, active, over } = useDroppable({
    id: 'pdf-drop-zone',
    data: {
      onDrop: (event: any) => {
        if (!dropZoneRef.current) return null;
        
        // Get the final pointer position
        const rect = dropZoneRef.current.getBoundingClientRect();
        
        // Get mouse position from the event
        // We need to find the current mouse position at drop time
        const pointerEvent = event.activatorEvent as MouseEvent;
        const currentX = pointerEvent.clientX + event.delta.x;
        const currentY = pointerEvent.clientY + event.delta.y;
        
        // Calculate position relative to PDF
        const relativeX = (currentX - rect.left) / scale;
        const relativeY = (currentY - rect.top) / scale;
        
        // Get field size for centering
        let fieldWidth = 200;
        let fieldHeight = 30;
        
        if (event.active.data.current?.field) {
          const field = event.active.data.current.field as UnifiedField;
          fieldWidth = field.size?.width || 200;
          fieldHeight = field.size?.height || 30;
        } else if (event.active.data.current?.fieldType) {
          const type = event.active.data.current.fieldType;
          if (type === 'checkbox') {
            fieldWidth = 25;
            fieldHeight = 25;
          } else if (type === 'image' || type === 'signature') {
            fieldWidth = 200;
            fieldHeight = 100;
          }
        }
        
        // Center field under cursor
        let pdfX = relativeX - fieldWidth / 2;
        // Convert screen Y to PDF Y (PDF uses bottom-left origin)
        // In PDF: position.y is distance from bottom to field's TOP edge
        let screenY = relativeY - fieldHeight / 2; // Center vertically under cursor
        let pdfY = pageHeight - screenY; // Convert to PDF coordinates (flip Y axis)
        
        // Apply boundary constraints
        pdfX = Math.max(0, Math.min(pdfX, pageWidth - fieldWidth));
        pdfY = Math.max(fieldHeight, Math.min(pdfY, pageHeight));
        
        // Apply grid snapping
        const snapped = gridEnabled ? snapPosition({ x: pdfX, y: pdfY }) : { x: pdfX, y: pdfY };
        return snapped;
      }
    }
  });
  
  // Track preview position during drag
  useDndMonitor({
    onDragMove(event) {
      if (!dropZoneRef.current || !isOver) {
        setPreviewPosition(null);
        return;
      }
      
      const rect = dropZoneRef.current.getBoundingClientRect();
      const pointerEvent = event.activatorEvent as any;
      
      if (!pointerEvent || !('clientX' in pointerEvent)) {
        return;
      }
      
      const currentX = pointerEvent.clientX + event.delta.x;
      const currentY = pointerEvent.clientY + event.delta.y;
      
      const relativeX = (currentX - rect.left) / scale;
      const relativeY = (currentY - rect.top) / scale;
      
      // Simple preview position (not centered)
      setPreviewPosition({ x: relativeX, y: relativeY });
    },
    onDragEnd() {
      setPreviewPosition(null);
    },
  });
  
  // Combine refs
  useEffect(() => {
    if (dropZoneRef.current) {
      setNodeRef(dropZoneRef.current);
    }
  }, [setNodeRef]);

  // Remove ALL preview rendering code - DragOverlay handles it

  return (
    <div 
      ref={dropZoneRef}
      className="absolute top-0 left-0 unified-field-drop-zone"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {/* Visual feedback when dragging over */}
      {isOver && previewPosition && (
        <>
          {/* Drop zone indicator */}
          <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
          
          {/* Cursor position indicator */}
          <div
            className="absolute w-1 h-1 bg-primary rounded-full pointer-events-none z-50"
            style={{
              left: previewPosition.x * scale - 2,
              top: previewPosition.y * scale - 2,
            }}
          />
        </>
      )}
      
      {/* Grid lines when dragging */}
      {isOver && gridEnabled && (
        <>
          {/* Show grid pattern */}
          {Array.from({ length: Math.ceil(pageWidth / gridSize) + 1 }).map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute top-0 bottom-0 w-px bg-gray-300 opacity-30 pointer-events-none"
              style={{ left: i * gridSize * scale }}
            />
          ))}
          {Array.from({ length: Math.ceil(pageHeight / gridSize) + 1 }).map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute left-0 right-0 h-px bg-gray-300 opacity-30 pointer-events-none"
              style={{ top: i * gridSize * scale }}
            />
          ))}
        </>
      )}
      
      {/* Existing fields */}
      {currentPageFields.map((field) => {
        // For option fields, show all mappings in edit mode (preview)
        // At generation time, only selected values would be rendered
        if (field.variant === 'options' && field.optionMappings) {
          return field.optionMappings.map((mapping, idx) => (
            <DraggableUnifiedField
              key={`${field.id}_${mapping.key}_${idx}`}
              field={{
                ...field,
                position: mapping.position,
                size: mapping.size || field.size,
                // Show the option key as preview
                sampleValue: mapping.customText || mapping.key
              }}
              scale={scale}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              isSelected={selectedFieldId === field.id}
              optionKey={mapping.key}
              isPreview={true}
              renderType={field.renderType}
              onDoubleClick={() => onFieldDoubleClick?.(field)}
            />
          ));
        }
        
        // Regular field without options
        return (
          <DraggableUnifiedField
            key={field.id}
            field={field}
            scale={scale}
            pageWidth={pageWidth}
            pageHeight={pageHeight}
            isSelected={selectedFieldId === field.id}
            onDoubleClick={() => onFieldDoubleClick?.(field)}
          />
        );
      })}
      
      {/* Render existing fields */}
    </div>
  );
}