import { useState } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import { DraggableFieldsList } from './DraggableFieldsList';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { ClickToOpenFields } from './ClickToOpenFields';
import { OptionsFieldDialog } from '@/components/OptionsFieldDialog/OptionsFieldDialog';
import { FieldConfigDialog } from '@/components/FieldConfigDialog/FieldConfigDialog';
import { CompositeFieldDialog } from '@/components/CompositeFieldDialog/CompositeFieldDialog';
import { ConditionalFieldDialog } from '@/components/ConditionalFieldDialog/ConditionalFieldDialog';
import type { UnifiedField } from '@/types/unifiedField.types';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

export function FieldToolbox() {
  const [showOptionsFieldDialog, setShowOptionsFieldDialog] = useState(false);
  const [editingOptionsFieldId, setEditingOptionsFieldId] = useState<string | undefined>();
  const [showUnifiedFieldConfig, setShowUnifiedFieldConfig] = useState(false);
  const [unifiedFieldForConfig, setUnifiedFieldForConfig] = useState<UnifiedField | null>(null);
  const [showCompositeFieldDialog, setShowCompositeFieldDialog] = useState(false);
  const [editingCompositeField, setEditingCompositeField] = useState<UnifiedField | undefined>();
  const [showConditionalDialog, setShowConditionalDialog] = useState(false);
  const [editingConditionalField, setEditingConditionalField] = useState<UnifiedField | null>(null);

  const handleAddOptionsField = () => {
    setEditingOptionsFieldId(undefined);
    setShowOptionsFieldDialog(true);
  };
  
  const handleUnifiedFieldClick = (fieldId: string) => {
    const field = useFieldStore.getState().getUnifiedFieldById(fieldId);
    if (field) {
      if (field.variant === 'options') {
        setEditingOptionsFieldId(fieldId);
        setShowOptionsFieldDialog(true);
      } else if (field.type === 'composite-text') {
        // Open composite field dialog for composite fields
        setEditingCompositeField(field);
        setShowCompositeFieldDialog(true);
      } else if (field.type === 'conditional') {
        // Open conditional field dialog for conditional fields
        setEditingConditionalField(field);
        setShowConditionalDialog(true);
      } else {
        // Open field config dialog for regular fields
        setUnifiedFieldForConfig(field);
        setShowUnifiedFieldConfig(true);
      }
    }
  };
  
  const handleConditionalSave = (fieldData: Partial<UnifiedField>) => {
    const { updateUnifiedField, addUnifiedField } = useFieldStore.getState();
    
    if (editingConditionalField) {
      // Update existing field
      updateUnifiedField(editingConditionalField.id, fieldData);
    } else {
      // Create new field
      const fieldId = `field_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const newField: UnifiedField = {
        id: fieldId,
        key: fieldData.key || 'conditional_field',
        type: 'conditional',
        variant: 'single',
        page: fieldData.page || 1,
        position: fieldData.position,
        size: fieldData.size,
        enabled: true,
        structure: 'simple',
        placementCount: 0,
        conditionalBranches: fieldData.conditionalBranches || [],
        conditionalDefaultValue: fieldData.conditionalDefaultValue,
        conditionalRenderAs: fieldData.conditionalRenderAs || 'text',
        properties: fieldData.properties,
        positionVersion: 'top-edge',
      };
      addUnifiedField(newField);
    }
    
    setShowConditionalDialog(false);
    setEditingConditionalField(null);
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
            <div className="pb-8 pr-2 space-y-2">
              {/* Group 1: Draggable Fields */}
              <DraggableFieldsList />
              
              <SidebarSeparator />
              
              {/* Group 2: Click-to-open Fields */}
              <ClickToOpenFields onAddOptionsField={handleAddOptionsField} />
              
              <SidebarSeparator />
              
              {/* Group 3: Existing Fields by Page */}
              <UnifiedFieldsList onFieldClick={handleUnifiedFieldClick} />
            </div>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>

      {/* Dialogs */}
      <OptionsFieldDialog
        open={showOptionsFieldDialog}
        onOpenChange={setShowOptionsFieldDialog}
        editingFieldId={editingOptionsFieldId}
      />
      
      <FieldConfigDialog
        field={unifiedFieldForConfig}
        open={showUnifiedFieldConfig}
        onOpenChange={setShowUnifiedFieldConfig}
        isNew={false}
      />
      
      <CompositeFieldDialog
        isOpen={showCompositeFieldDialog}
        onClose={() => {
          setShowCompositeFieldDialog(false);
          setEditingCompositeField(undefined);
        }}
        editingField={editingCompositeField}
      />
      
      <ConditionalFieldDialog
        open={showConditionalDialog}
        onOpenChange={(open) => {
          setShowConditionalDialog(open);
          if (!open) setEditingConditionalField(null);
        }}
        field={editingConditionalField}
        onSave={handleConditionalSave}
      />
    </>
  );
}