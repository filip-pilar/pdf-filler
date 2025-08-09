import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Workflow, 
  Type, 
  CheckSquare, 
  Image, 
  PenTool, 
  Zap, 
  AlertCircle, 
  ChevronRight,
  ChevronDown,
  FileText,
  ToggleLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useFieldStore } from '@/store/fieldStore';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { BooleanField } from '@/types/booleanField.types';

interface PdfFieldsListProps {
  fields: Field[];
  logicFields: LogicField[];
  booleanFields: BooleanField[];
  onFieldClick: (fieldKey: string) => void;
  onLogicFieldClick: (field: LogicField) => void;
  onBooleanFieldClick: (field: BooleanField) => void;
}

type CombinedField = 
  | (Field & { fieldType: 'regular' })
  | (LogicField & { fieldType: 'logic' })
  | (BooleanField & { fieldType: 'boolean' });

export function PdfFieldsList({ 
  fields, 
  logicFields,
  booleanFields,
  onFieldClick, 
  onLogicFieldClick,
  onBooleanFieldClick 
}: PdfFieldsListProps) {
  const { totalPages, pdfUrl } = useFieldStore();
  const totalItems = fields.length + logicFields.length + booleanFields.length;
  
  // State for managing collapsed pages - start with all expanded
  const [collapsedPages, setCollapsedPages] = useState<Set<number>>(new Set());

  // Combine all field types, marking their type
  const allFields: CombinedField[] = [
    ...fields.map(f => ({ ...f, fieldType: 'regular' as const })),
    ...logicFields.map(f => ({ 
      ...f, 
      fieldType: 'logic' as const,
      page: f.page || 1  // Default to page 1 for backward compatibility
    })),
    ...booleanFields.map(f => ({ 
      ...f, 
      fieldType: 'boolean' as const,
      page: f.page || 1  // Default to page 1 for backward compatibility
    }))
  ];

  // Group all fields by page number
  const fieldsByPage = allFields.reduce((acc, field) => {
    // For logic/boolean fields, use the page property or default to 1
    // For regular fields, they always have a page property
    const pageNum = field.fieldType === 'regular' ? field.page : (field.page || 1);
    if (!acc[pageNum]) {
      acc[pageNum] = [];
    }
    acc[pageNum].push(field);
    return acc;
  }, {} as Record<number, CombinedField[]>);

  // Get sorted page numbers - use totalPages if available, otherwise use pages with fields
  const sortedPages = totalPages > 0 
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : Object.keys(fieldsByPage)
        .map(Number)
        .sort((a, b) => a - b);

  // Get icon for field type
  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return Type;
      case 'checkbox': return CheckSquare;
      case 'image': return Image;
      case 'signature': return PenTool;
      default: return Type;
    }
  };

  // Toggle page collapsed state
  const togglePage = (pageNum: number) => {
    const newCollapsed = new Set(collapsedPages);
    if (newCollapsed.has(pageNum)) {
      newCollapsed.delete(pageNum);
    } else {
      newCollapsed.add(pageNum);
    }
    setCollapsedPages(newCollapsed);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>PDF Fields ({totalItems})</span>
      </SidebarGroupLabel>
      
      <SidebarGroupContent>
        {(totalItems > 0 || totalPages > 0 || pdfUrl) ? (
          <div className="space-y-1">
            {/* Page sections */}
            {sortedPages.map((pageNum) => {
              const pageFields = fieldsByPage[pageNum] || [];
              const isCollapsed = collapsedPages.has(pageNum);
              
              return (
                <Collapsible
                  key={`page-${pageNum}`}
                  open={!isCollapsed}
                  onOpenChange={() => togglePage(pageNum)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          Page {pageNum}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1 h-4">
                          {pageFields.length} {pageFields.length === 1 ? 'field' : 'fields'}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <SidebarMenu className="ml-3 pr-3">
                      {pageFields.map((field) => {
                        if (field.fieldType === 'logic') {
                          // Render logic field
                          return (
                            <SidebarMenuItem key={field.key}>
                              <SidebarMenuButton
                                onClick={() => onLogicFieldClick(field)}
                                className="text-xs pl-6"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <Workflow className="h-3 w-3 text-primary flex-shrink-0" />
                                    <div className="flex flex-col items-start min-w-0">
                                      <span className="font-mono font-medium truncate">
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
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {field.options.some(opt => opt.actions.length === 0) && (
                                      <div title="Some options are missing actions">
                                        <AlertCircle className="h-3 w-3 text-amber-600" />
                                      </div>
                                    )}
                                    {field.options.some(opt => opt.actions.length > 0) && (
                                      <Zap className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                </div>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        } else if (field.fieldType === 'boolean') {
                          // Render boolean field
                          const totalActions = field.trueActions.length + field.falseActions.length;
                          const needsTrueActions = field.trueActions.length === 0;
                          const needsFalseActions = field.falseActions.length === 0;
                          
                          return (
                            <SidebarMenuItem key={field.key}>
                              <SidebarMenuButton
                                onClick={() => onBooleanFieldClick(field)}
                                className="text-xs pl-6"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <ToggleLeft className="h-3 w-3 text-primary flex-shrink-0" />
                                    <div className="flex flex-col items-start min-w-0">
                                      <span className="font-mono font-medium truncate">
                                        {field.key}
                                      </span>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-0.5">
                                          <CheckCircle className="h-2.5 w-2.5" />
                                          {field.trueActions.length}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                          <XCircle className="h-2.5 w-2.5" />
                                          {field.falseActions.length}
                                        </span>
                                        {totalActions > 0 && (
                                          <span>• {totalActions} actions</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
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
                                  </div>
                                </div>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        } else {
                          // Render regular field
                          const Icon = getFieldIcon(field.type);
                          return (
                            <SidebarMenuItem key={field.key}>
                              <SidebarMenuButton
                                onClick={() => onFieldClick(field.key)}
                                className="text-xs pl-6"
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="font-mono font-medium truncate">
                                    {field.key}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] ml-auto">
                                    {field.type}
                                  </Badge>
                                </div>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        }
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : !pdfUrl ? (
          <div className="text-center py-3 text-xs text-muted-foreground">
            <p>No PDF loaded</p>
            <p className="text-[10px] mt-1">Upload a PDF to start adding fields</p>
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-muted-foreground">
            <p>Loading PDF pages...</p>
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}