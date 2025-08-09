import { Type, CheckSquare, Image, PenTool, GripVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DraggableFieldItem } from './DraggableFieldItem';
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar';
import type { FieldType } from '@/types/field.types';

const fieldTypes: { type: FieldType; label: string; icon: LucideIcon }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'image', label: 'Image', icon: Image },
  { type: 'signature', label: 'Signature', icon: PenTool },
];

export function DraggableFieldsList() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <GripVertical className="h-4 w-4" />
        Drag to Add
      </SidebarGroupLabel>
      <SidebarGroupContent className="px-2">
        <div className="space-y-1">
          {fieldTypes.map((field) => (
            <DraggableFieldItem
              key={field.type}
              type={field.type}
              label={field.label}
              icon={field.icon}
            />
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}