import { Button } from '@/components/ui/button';
import { List, Database, Layers } from 'lucide-react';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar';
import { useState } from 'react';
import { CompositeFieldDialog } from '@/components/CompositeFieldDialog/CompositeFieldDialog';
import { DataFieldDialog } from '@/components/DataFieldDialog/DataFieldDialog';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';

interface ClickToOpenFieldsProps {
  onAddOptionsField: () => void;
}

export function ClickToOpenFields({ onAddOptionsField }: ClickToOpenFieldsProps) {
  const [showCompositeDialog, setShowCompositeDialog] = useState(false);
  const [showDataFieldDialog, setShowDataFieldDialog] = useState(false);
  const { startPicking } = usePositionPickerStore();
  const { updateUnifiedField } = useFieldStore();
  
  const handleCompositeFieldSave = (field: UnifiedField) => {
    // Close dialog
    setShowCompositeDialog(false);
    
    // Only start position picking if the field has a template defined
    if (field.template && field.template.trim()) {
      // Start position picking for the composite field
      startPicking({
        actionId: `composite-field-${field.id}`,
        content: field.sampleValue || field.template || 'Composite',
        optionLabel: field.key,
        actionType: 'text',
        onComplete: (position) => {
          // Update the field with the selected position
          updateUnifiedField(field.id, {
            position: position,
            page: position.page,
            positionVersion: 'top-edge'
          });
        },
        onCancel: () => {
          // Field is already created, just no position set
          // Don't reopen dialog on cancel
        }
      });
    }
    // If no template, the field is created but not placed (user can place it later from the fields list)
  };
  
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          Add Special Fields
        </SidebarGroupLabel>
        <SidebarGroupContent className="px-2 space-y-1">
          <Button
            onClick={() => setShowDataFieldDialog(true)}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            title="Add a data-only field for export"
          >
            <Database className="mr-2 h-4 w-4" />
            Data Field
          </Button>
          
          <Button
            onClick={() => setShowCompositeDialog(true)}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            title="Combine multiple fields into one"
          >
            <Layers className="mr-2 h-4 w-4" />
            Composite Field
          </Button>
          
          <Button
            onClick={onAddOptionsField}
            variant="outline"
            size="sm"
            className="w-full justify-start"
            title="Add field with multiple options"
          >
            <List className="mr-2 h-4 w-4" />
            Field with Options
          </Button>
        </SidebarGroupContent>
      </SidebarGroup>
      
      <CompositeFieldDialog
        isOpen={showCompositeDialog}
        onClose={() => setShowCompositeDialog(false)}
        onSave={handleCompositeFieldSave}
      />
      
      <DataFieldDialog
        isOpen={showDataFieldDialog}
        onClose={() => setShowDataFieldDialog(false)}
      />
    </>
  );
}