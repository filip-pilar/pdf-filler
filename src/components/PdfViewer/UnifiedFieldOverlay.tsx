import { DraggableUnifiedField } from './DraggableUnifiedField';
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
        pointerEvents: 'none', // Let individual fields handle events
      }}
    >
      {/* Render main fields and option fields */}
      {currentPageFields.map(field => {
        if (field.variant === 'options' && field.optionMappings) {
          // Render each option as a separate draggable field
          return field.optionMappings.map(mapping => (
            <div key={`${field.id}-${mapping.key}`} style={{ pointerEvents: 'auto' }}>
              <DraggableUnifiedField
                field={{
                  ...field,
                  position: mapping.position,
                  size: mapping.size || field.size,
                }}
                scale={scale}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                isSelected={selectedFieldId === field.id}
                optionKey={mapping.key}
                renderType={mapping.renderType}
                onDoubleClick={() => onFieldDoubleClick?.(field)}
              />
            </div>
          ));
        }
        
        // Render regular field
        return (
          <div key={field.id} style={{ pointerEvents: 'auto' }}>
            <DraggableUnifiedField
              field={field}
              scale={scale}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              isSelected={selectedFieldId === field.id}
              onDoubleClick={() => onFieldDoubleClick?.(field)}
            />
          </div>
        );
      })}
    </div>
  );
}