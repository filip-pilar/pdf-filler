import { useState } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import { DraggableFieldsList } from './DraggableFieldsList';
import { PdfFieldsList } from './PdfFieldsList';
import { AddLogicFieldButton } from './AddLogicFieldButton';
import { AddBooleanFieldButton } from './AddBooleanFieldButton';
import { FieldPropertiesDialog } from '@/components/FieldPropertiesDialog/FieldPropertiesDialog';
import { LogicFieldDialog } from '@/components/LogicFieldDialog/LogicFieldDialog';
import { BooleanFieldDialog } from '@/components/BooleanFieldDialog/BooleanFieldDialog';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { BooleanField } from '@/types/booleanField.types';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FieldToolbox() {
  const { fields, selectField, logicFields, addLogicField, booleanFields, addBooleanField, currentPage } = useFieldStore();
  const [fieldForDialog, setFieldForDialog] = useState<Field | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showLogicFieldDialog, setShowLogicFieldDialog] = useState(false);
  const [selectedLogicField, setSelectedLogicField] = useState<LogicField | null>(null);
  const [showBooleanFieldDialog, setShowBooleanFieldDialog] = useState(false);
  const [selectedBooleanFieldKey, setSelectedBooleanFieldKey] = useState<string | null>(null);

  const handleFieldClick = (fieldKey: string) => {
    selectField(fieldKey);
    const field = fields.find(f => f.key === fieldKey);
    if (field) {
      setFieldForDialog(field);
      setShowDialog(true);
    }
  };

  const handleLogicFieldClick = (logicField: LogicField) => {
    setSelectedLogicField(logicField);
    setShowLogicFieldDialog(true);
  };

  const handleAddLogicField = () => {
    // Open dialog in create mode without adding to store yet
    // The field will only be created when the first action is placed
    setSelectedLogicField(null);
    setShowLogicFieldDialog(true);
  };

  const handleAddBooleanField = () => {
    // Open dialog in create mode without adding to store yet
    // The field will only be created when actions are added
    setSelectedBooleanFieldKey(null);
    setShowBooleanFieldDialog(true);
  };

  const handleBooleanFieldClick = (booleanField: BooleanField) => {
    setSelectedBooleanFieldKey(booleanField.key);
    setShowBooleanFieldDialog(true);
  };

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex h-16 items-center justify-between px-4">
            <h2 className="text-sm font-semibold">Field Palette</h2>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <ScrollArea className="h-full">
            <div className="pb-8 pr-2">
              <DraggableFieldsList />
              
              <SidebarSeparator />
              
              <SidebarGroup>
                <SidebarGroupContent className="px-2 space-y-2">
                  <AddLogicFieldButton onClick={handleAddLogicField} />
                  <AddBooleanFieldButton onClick={handleAddBooleanField} />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />
              
              <PdfFieldsList 
                fields={fields}
                logicFields={logicFields}
                booleanFields={booleanFields}
                onFieldClick={handleFieldClick}
                onLogicFieldClick={handleLogicFieldClick}
                onBooleanFieldClick={handleBooleanFieldClick}
              />
            </div>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>

      {/* Dialogs */}
      {fieldForDialog && (
        <FieldPropertiesDialog
          field={fieldForDialog}
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setFieldForDialog(null);
            }
          }}
        />
      )}

      <LogicFieldDialog
        open={showLogicFieldDialog}
        onOpenChange={(open) => {
          setShowLogicFieldDialog(open);
          if (!open) {
            setSelectedLogicField(null);
          }
        }}
        logicField={selectedLogicField}
      />

      <BooleanFieldDialog
        open={showBooleanFieldDialog}
        onOpenChange={(open) => {
          setShowBooleanFieldDialog(open);
          if (!open) {
            setSelectedBooleanFieldKey(null);
          }
        }}
        booleanField={selectedBooleanFieldKey ? booleanFields.find(f => f.key === selectedBooleanFieldKey) || null : null}
      />
    </>
  );
}