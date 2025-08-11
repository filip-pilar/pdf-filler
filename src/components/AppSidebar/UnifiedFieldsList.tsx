import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  CheckSquare, 
  Image, 
  PenTool, 
  ChevronRight,
  ChevronDown,
  FileText,
  List,
  Settings
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

interface UnifiedFieldsListProps {
  onFieldClick?: (fieldId: string) => void;
}

export function UnifiedFieldsList({ onFieldClick }: UnifiedFieldsListProps) {
  const { unifiedFields, totalPages, pdfUrl } = useFieldStore();
  const enabledFields = unifiedFields.filter(f => f.enabled);
  
  // State for managing collapsed pages - start with all expanded
  const [collapsedPages, setCollapsedPages] = useState<Set<number>>(new Set());

  // Group fields by page number
  const fieldsByPage = enabledFields.reduce((acc, field) => {
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

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Fields ({enabledFields.length})</span>
      </SidebarGroupLabel>
      
      <SidebarGroupContent>
        {(enabledFields.length > 0 || totalPages > 0 || pdfUrl) ? (
          <div className="space-y-1">
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
                              className="cursor-pointer"
                              onClick={() => onFieldClick?.(field.id)}
                            >
                              <div className="flex items-center justify-between gap-2 px-3 py-1.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="text-xs font-mono truncate">
                                    {field.key}
                                  </span>
                                  {field.variant === 'options' && (
                                    <Settings className="h-3 w-3 text-muted-foreground opacity-50" />
                                  )}
                                </div>
                                {variantBadge}
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