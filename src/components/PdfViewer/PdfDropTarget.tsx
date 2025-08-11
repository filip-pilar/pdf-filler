import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import type { DragItem } from '@/components/AppSidebar/DraggableFieldItem';
import type { FieldType } from '@/types/field.types';
import { cn } from '@/lib/utils';

interface PdfDropTargetProps {
  /** Current page number */
  currentPage: number;
  /** Scale factor for the PDF */
  scale: number;
  /** PDF page dimensions */
  pageWidth: number;
  pageHeight: number;
  /** Callback when a field is dropped */
  onFieldDrop: (fieldType: FieldType, position: { x: number; y: number }, page: number) => void;
  /** Children to render inside the drop target */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function PdfDropTarget({
  currentPage,
  scale,
  pageWidth,
  pageHeight,
  onFieldDrop,
  children,
  className
}: PdfDropTargetProps) {
  const dropRef = useRef<HTMLDivElement>(null);
  const { gridEnabled } = useFieldStore();
  const { snapPosition } = useGridSnap(pageHeight);

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'NEW_FIELD',
    drop: (item: DragItem, monitor) => {
      if (!dropRef.current || !canDrop) return;

      // Get the drop position relative to the PDF canvas
      const clientOffset = monitor.getClientOffset();
      const dropTargetRect = dropRef.current.getBoundingClientRect();
      
      if (!clientOffset || !dropTargetRect) return;

      // Calculate position relative to the PDF canvas
      const relativeX = clientOffset.x - dropTargetRect.left;
      const relativeY = clientOffset.y - dropTargetRect.top;

      // Convert screen coordinates to PDF coordinates
      const screenX = relativeX / scale;
      const screenY = relativeY / scale;

      // Get field size for centering (similar to position picker logic)
      const getFieldSize = (fieldType: FieldType) => {
        switch (fieldType) {
          case 'checkbox':
            return { width: 25, height: 25 };
          case 'signature':
            return { width: 200, height: 60 };
          case 'image':
            return { width: 100, height: 100 };
          default:
            return { width: 100, height: 30 };
        }
      };

      const fieldSize = getFieldSize(item.fieldType);

      // Center the field on the drop position
      const centeredScreenX = screenX - (fieldSize.width / 2);
      const centeredScreenY = screenY - (fieldSize.height / 2);

      // Convert screen coordinates to PDF coordinates (Y-axis is inverted) 
      // Store Y as distance from PDF bottom to field's TOP edge
      // NOTE: pageHeight here should be the NATURAL page height, not scaled
      const pdfX = centeredScreenX;
      const pdfY = pageHeight - centeredScreenY; // Top edge position

      // Apply grid snapping if enabled
      const finalPosition = gridEnabled 
        ? snapPosition({ x: pdfX, y: pdfY })
        : { x: pdfX, y: pdfY };

      // Ensure the field stays within bounds
      const boundedPosition = {
        x: Math.max(0, Math.min(finalPosition.x, pageWidth - fieldSize.width)),
        y: Math.max(0, Math.min(finalPosition.y, pageHeight - fieldSize.height))
      };

      onFieldDrop(item.fieldType, boundedPosition, currentPage);
    },
    canDrop: () => {
      // Can only drop if we have a PDF loaded and valid dimensions
      return pageWidth > 0 && pageHeight > 0;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Combine refs for both drop functionality and forwarding
  const combinedRef = (node: HTMLDivElement | null) => {
    dropRef.current = node;
    drop(node);
  };

  return (
    <div
      ref={combinedRef}
      className={cn(
        "relative",
        // Show visual feedback when hovering with a draggable item
        isOver && canDrop && [
          "after:absolute after:inset-0 after:pointer-events-none",
          "after:bg-blue-500/10 after:border-2 after:border-blue-500 after:border-dashed",
          "after:rounded-sm"
        ],
        // Indicate when drop is not allowed
        isOver && !canDrop && [
          "after:absolute after:inset-0 after:pointer-events-none",
          "after:bg-red-500/10 after:border-2 after:border-red-500 after:border-dashed",
          "after:rounded-sm"
        ],
        className
      )}
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {children}
    </div>
  );
}