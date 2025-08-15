import { Button } from '@/components/ui/button';
import { List, Database, Layers } from 'lucide-react';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar';
import { useState } from 'react';
import { CompositeFieldDialog } from '@/components/CompositeFieldDialog/CompositeFieldDialog';
import { DataFieldDialog } from '@/components/DataFieldDialog/DataFieldDialog';

interface ClickToOpenFieldsProps {
  onAddOptionsField: () => void;
}

export function ClickToOpenFields({ onAddOptionsField }: ClickToOpenFieldsProps) {
  const [showCompositeDialog, setShowCompositeDialog] = useState(false);
  const [showDataFieldDialog, setShowDataFieldDialog] = useState(false);
  
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
      />
      
      <DataFieldDialog
        isOpen={showDataFieldDialog}
        onClose={() => setShowDataFieldDialog(false)}
      />
    </>
  );
}