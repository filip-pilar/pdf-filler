import { useState } from 'react';
import { ChevronRight, ChevronDown, Trash2, FileText, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';
import { QueuedFieldItem } from './QueuedFieldItem';
import { cn } from '@/lib/utils';

interface FieldQueueSidebarProps {
  isOpen: boolean;
}

export function FieldQueueSidebar({ isOpen }: FieldQueueSidebarProps) {
  const { 
    queuedFields, 
    clearQueue 
  } = useFieldStore();
  
  const [collapsedPages, setCollapsedPages] = useState<Set<number>>(new Set());

  // Group fields by page
  const fieldsByPage = queuedFields.reduce((acc, field) => {
    if (!acc[field.page]) {
      acc[field.page] = [];
    }
    acc[field.page].push(field);
    return acc;
  }, {} as Record<number, UnifiedField[]>);

  // Get sorted page numbers
  const sortedPages = Object.keys(fieldsByPage)
    .map(Number)
    .sort((a, b) => a - b);

  const togglePage = (pageNum: number) => {
    const newCollapsed = new Set(collapsedPages);
    if (newCollapsed.has(pageNum)) {
      newCollapsed.delete(pageNum);
    } else {
      newCollapsed.add(pageNum);
    }
    setCollapsedPages(newCollapsed);
  };

  const handleClearQueue = () => {
    if (queuedFields.length === 0) return;
    if (confirm(`Clear all ${queuedFields.length} fields from the queue?`)) {
      clearQueue();
    }
  };

  return (
    <div 
      className={cn(
        "relative flex h-full transition-all duration-300 ease-in-out",
        isOpen ? "w-80" : "w-0"
      )}
    >
      {/* Sidebar Content */}
      <div className={cn(
        "flex flex-col h-full border-l bg-sidebar transition-all duration-300",
        isOpen ? "w-80 opacity-100" : "w-0 opacity-0 overflow-hidden"
      )}>
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Import Queue</h2>
          </div>
          {queuedFields.length > 0 && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleClearQueue}
              title="Clear all fields"
              className="h-6 w-6"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {queuedFields.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No fields in queue</p>
                <p className="text-xs mt-2">
                  Import fields to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedPages.map((pageNum) => {
                  const pageFields = fieldsByPage[pageNum];
                  const isCollapsed = collapsedPages.has(pageNum);

                  return (
                    <div key={`queue-page-${pageNum}`} className="space-y-1">
                      <Collapsible
                        open={!isCollapsed}
                        onOpenChange={() => togglePage(pageNum)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between w-full hover:bg-accent hover:text-accent-foreground transition-colors rounded-md px-2 py-1.5">
                            <div className="flex items-center gap-2">
                              {isCollapsed ? (
                                <ChevronRight className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              <FileText className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                Page {pageNum}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {pageFields.length}
                            </Badge>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="space-y-1 pl-2">
                            {pageFields.map((field) => (
                              <QueuedFieldItem key={field.id} field={field} />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {queuedFields.length > 0 && (
          <div className="border-t px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              {queuedFields.length} field{queuedFields.length !== 1 ? 's' : ''} waiting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}