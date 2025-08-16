import { useState } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import { DraggableFieldsList } from './DraggableFieldsList';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { ClickToOpenFields } from './ClickToOpenFields';
import { OptionsFieldDialog } from '@/components/OptionsFieldDialog/OptionsFieldDialog';
import { FieldConfigDialog } from '@/components/FieldConfigDialog/FieldConfigDialog';
import { CompositeFieldDialog } from '@/components/CompositeFieldDialog/CompositeFieldDialog';
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
      } else {
        // Open field config dialog for regular fields
        setUnifiedFieldForConfig(field);
        setShowUnifiedFieldConfig(true);
      }
    }
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
    </>
  );
}