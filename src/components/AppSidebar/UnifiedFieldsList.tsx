import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  CheckSquare, 
  Image, 
  PenTool, 
  ChevronRight,
  ChevronDown,
  FileText,
  List,
  Settings,
  Braces,
  Lock,
  LockOpen,
  Database,
  GitBranch
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
import type { UnifiedField } from '@/types/unifiedField.types';
import { cn } from '@/lib/utils';

interface UnifiedFieldsListProps {
  onFieldClick?: (fieldId: string) => void;
}

export function UnifiedFieldsList({ onFieldClick }: UnifiedFieldsListProps) {
  const { unifiedFields, totalPages, pdfUrl, toggleUnifiedFieldLock, selectUnifiedField, deselectUnifiedField, setCurrentPage, currentPage } = useFieldStore();
  const enabledFields = unifiedFields.filter(f => f.enabled);
  
  // Separate data fields (no position) from placed fields (with position)
  const dataFields = enabledFields.filter(f => !f.position);
  const placedFields = enabledFields.filter(f => f.position);
  
  // State for managing collapsed pages - start with all expanded
  const [collapsedPages, setCollapsedPages] = useState<Set<number>>(new Set());
  const [dataFieldsCollapsed, setDataFieldsCollapsed] = useState(false);

  // Group placed fields by page number
  const fieldsByPage = placedFields.reduce((acc, field) => {
    if (!acc[field.page]) {
      acc[field.page] = [];
    }
    acc[field.page].push(field);
    return acc;
  }, {} as Record<number, UnifiedField[]>);

  // Get sorted page numbers
  const sortedPages = totalPages > 0 
    ? Array.from({ length: totalPages }, (_, i) => i + 1)
    : Object.keys(fieldsByPage)
        .map(Number)
        .sort((a, b) => a - b);

  // Get icon for field type/variant
  const getFieldIcon = (field: UnifiedField) => {
    // For conditional fields
    if (field.type === 'conditional') return GitBranch;
    
    // For data-only fields (no position)
    if (!field.position) return Database;
    
    // For composite fields
    if (field.type === 'composite-text') return Braces;
    
    // For option fields, use icon based on renderType
    if (field.variant === 'options') {
      if (field.renderType === 'checkmark' || field.type === 'checkbox') return CheckSquare;
      return List; // For text/custom options
    }
    if (field.type === 'checkbox') return CheckSquare;
    if (field.type === 'image') return Image;
    if (field.type === 'signature') return PenTool;
    return Type;
  };

  // Get variant badge
  const getVariantBadge = (field: UnifiedField) => {
    if (field.variant === 'single') return null;
    
    if (field.variant === 'options') {
      const count = field.optionMappings?.length || field.placementCount || 0;
      if (count > 0) {
        return (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">
            {field.multiSelect ? 'multi' : 'single'} ×{count}
          </Badge>
        );
      }
    }
    
    return null;
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
  
  // Handle field click
  const handleFieldClick = (fieldId: string) => {
    onFieldClick?.(fieldId);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        Existing Fields {enabledFields.length > 0 && `(${enabledFields.length})`}
      </SidebarGroupLabel>
      
      <SidebarGroupContent>
        {(enabledFields.length > 0 || totalPages > 0 || pdfUrl) ? (
          <div className="space-y-2">
            {/* Data Fields Section */}
            {dataFields.length > 0 && (
              <Collapsible
                open={!dataFieldsCollapsed}
                onOpenChange={() => setDataFieldsCollapsed(!dataFieldsCollapsed)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full px-2 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors">
                    <div className="flex items-center gap-2">
                      {dataFieldsCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      <Database className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">
                        Data Fields (Invisible)
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-100">
                      {dataFields.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <SidebarMenu>
                    {dataFields.map((field) => {
                      return (
                        <SidebarMenuItem key={field.id}>
                          <SidebarMenuButton
                            onClick={() => handleFieldClick(field.id)}
                            className={cn(
                              "flex items-center gap-2 w-full text-xs py-1.5 px-2",
                              "hover:bg-accent hover:text-accent-foreground",
                              "data-[state=selected]:bg-accent data-[state=selected]:text-accent-foreground"
                            )}
                          >
                            <Database className="h-3 w-3 flex-shrink-0 text-blue-600" />
                            <span className="truncate flex-1 text-left">
                              {field.key}
                            </span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                              data
                            </Badge>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Placed Fields Section - Separator if we have data fields */}
            {dataFields.length > 0 && placedFields.length > 0 && (
              <div className="text-[10px] text-muted-foreground px-2 py-1">Placed Fields</div>
            )}
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
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {pageFields.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <SidebarMenu>
                      {pageFields.map((field) => {
                        const Icon = getFieldIcon(field);
                        const variantBadge = getVariantBadge(field);
                        
                        return (
                          <SidebarMenuItem key={field.id}>
                            <SidebarMenuButton 
                              asChild
                              className={cn(
                                "cursor-pointer",
                                field.locked && "bg-muted/50"
                              )}
                            >
                              <div 
                                className="flex items-center justify-between gap-2 px-3 py-1.5"
                                onClick={() => handleFieldClick(field.id)}
                                onMouseEnter={() => {
                                  // Only select if field has a position (is visible on PDF)
                                  if (field.position) {
                                    selectUnifiedField(field.id);
                                    // Navigate to the field's page if not already there
                                    if (field.page !== currentPage) {
                                      setCurrentPage(field.page);
                                    }
                                  }
                                }}
                                onMouseLeave={() => deselectUnifiedField()}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs font-mono truncate">
                                    {field.key}
                                  </span>
                                  {!field.position && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3">
                                      data
                                    </Badge>
                                  )}
                                  {field.locked && (
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  {field.variant === 'options' && (
                                    <Settings className="h-3 w-3 text-muted-foreground opacity-50" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {variantBadge}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 hover:bg-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleUnifiedFieldLock(field.id);
                                    }}
                                    title={field.locked ? "Unlock field" : "Lock field"}
                                  >
                                    {field.locked ? (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <LockOpen className="h-3 w-3 text-muted-foreground opacity-50 hover:opacity-100" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-4">
            No fields added yet
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}