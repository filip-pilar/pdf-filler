import { DraggableUnifiedField } from './DraggableUnifiedField';
import type { UnifiedField } from '@/types/unifiedField.types';

interface UnifiedFieldOverlayProps {
  fields: UnifiedField[];
  selectedFieldId: string | null;
  currentPage: number;
  scale: number;
  pageWidth: number;
  pageHeight: number;
}

export function UnifiedFieldOverlay({
  fields,
  selectedFieldId,
  currentPage,
  scale,
  pageWidth,
  pageHeight
}: UnifiedFieldOverlayProps) {
  // Filter fields for current page and enabled status
  const currentPageFields = fields.filter(
    field => field.page === currentPage && field.enabled
  );

  return (
    <div 
      className="absolute top-0 left-0"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {currentPageFields.map((field) => (
        <DraggableUnifiedField
          key={field.id}
          field={field}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          isSelected={selectedFieldId === field.id}
        />
      ))}
    </div>
  );
}