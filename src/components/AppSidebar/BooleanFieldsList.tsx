import { ToggleLeft, Settings, Zap, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { BooleanField } from '@/types/booleanField.types';

interface BooleanFieldsListProps {
  booleanFields: BooleanField[];
  onFieldClick: (field: BooleanField) => void;
}

export function BooleanFieldsList({ booleanFields, onFieldClick }: BooleanFieldsListProps) {
  if (booleanFields.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <ToggleLeft className="h-4 w-4" />
        Boolean Fields
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {booleanFields.map((field) => {
            const totalActions = field.trueActions.length + field.falseActions.length;
            const needsTrueActions = field.trueActions.length === 0;
            const needsFalseActions = field.falseActions.length === 0;
            
            return (
              <SidebarMenuItem key={field.key}>
                <SidebarMenuButton
                  onClick={() => onFieldClick(field)}
                  className="text-xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <ToggleLeft className="h-3 w-3 text-primary" />
                      <div className="flex flex-col items-start">
                        <span className="font-mono font-medium">
                          {field.key}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-2.5 w-2.5" />
                            {field.trueActions.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="h-2.5 w-2.5" />
                            {field.falseActions.length}
                          </span>
                          {totalActions > 0 && (
                            <span>• {totalActions} actions</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(needsTrueActions || needsFalseActions) && (
                        <div title={
                          needsTrueActions && needsFalseActions 
                            ? "Both values need actions"
                            : needsTrueActions 
                            ? "TRUE value needs actions"
                            : "FALSE value needs actions"
                        }>
                          <AlertCircle className="h-3 w-3 text-amber-600" />
                        </div>
                      )}
                      {totalActions > 0 && (
                        <Zap className="h-3 w-3 text-green-600" />
                      )}
                      <Settings className="h-3 w-3 opacity-50" />
                    </div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}