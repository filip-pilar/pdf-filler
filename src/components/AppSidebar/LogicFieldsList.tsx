import { Workflow, Settings, Zap, AlertCircle } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { LogicField } from '@/types/logicField.types';

interface LogicFieldsListProps {
  logicFields: LogicField[];
  onFieldClick: (field: LogicField) => void;
}

export function LogicFieldsList({ logicFields, onFieldClick }: LogicFieldsListProps) {
  if (logicFields.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <Workflow className="h-4 w-4" />
        Logic Fields
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {logicFields.map((field) => (
            <SidebarMenuItem key={field.key}>
              <SidebarMenuButton
                onClick={() => onFieldClick(field)}
                className="text-xs"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-3 w-3 text-primary" />
                    <div className="flex flex-col items-start">
                      <span className="font-mono font-medium">
                        {field.key}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {field.options.length} options
                        {field.options.reduce((acc, opt) => acc + opt.actions.length, 0) > 0 && 
                          ` • ${field.options.reduce((acc, opt) => acc + opt.actions.length, 0)} actions`
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {field.options.some(opt => opt.actions.length === 0) && (
                      <div title="Some options are missing actions">
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                      </div>
                    )}
                    {field.options.some(opt => opt.actions.length > 0) && (
                      <Zap className="h-3 w-3 text-green-600" />
                    )}
                    <Settings className="h-3 w-3 opacity-50" />
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}