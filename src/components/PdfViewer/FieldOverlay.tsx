import { DraggableField } from './DraggableField';
import { DraggableActionField } from './DraggableActionField';
import { DraggableBooleanAction } from './DraggableBooleanAction';
import type { Field } from '@/types/field.types';
import type { FieldAction, FieldOption, LogicField } from '@/types/logicField.types';
import type { BooleanFieldAction, BooleanField } from '@/types/booleanField.types';

interface FieldOverlayProps {
  fields: Field[];
  actions: Array<{
    action: FieldAction;
    option: FieldOption;
    logicField: LogicField;
  }>;
  booleanActions: Array<{
    action: BooleanFieldAction;
    isTrue: boolean;
    booleanField: BooleanField;
  }>;
  selectedFieldKey: string | null;
  currentPage: number;
  scale: number;
  pageWidth: number;
  pageHeight: number;
}

export function FieldOverlay({
  fields,
  actions,
  booleanActions,
  selectedFieldKey,
  currentPage,
  scale,
  pageWidth,
  pageHeight
}: FieldOverlayProps) {
  const currentPageFields = fields.filter(field => field.page === currentPage);

  return (
    <div 
      className="absolute top-0 left-0"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {/* Regular fields */}
      {currentPageFields.map((field) => (
        <DraggableField
          key={field.key}
          field={field}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          isSelected={selectedFieldKey === field.key}
        />
      ))}
      
      {/* Logic field actions */}
      {actions.map(({ action, option, logicField }) => (
        <DraggableActionField
          key={`${logicField.key}-${option.key}-${action.id}`}
          action={action}
          option={option}
          logicField={logicField}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          currentPage={currentPage}
        />
      ))}
      
      {/* Boolean field actions */}
      {booleanActions.map(({ action, isTrue, booleanField }) => (
        <DraggableBooleanAction
          key={`${booleanField.key}-${isTrue ? 'true' : 'false'}-${action.id}`}
          action={action}
          isTrue={isTrue}
          booleanField={booleanField}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          currentPage={currentPage}
        />
      ))}
    </div>
  );
}