import { useState } from 'react';
import { ChevronRight, ChevronDown, Trash2, FileText, Inbox, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';
import { QueuedFieldItem } from './QueuedFieldItem';

export function QueueSidebar() {
  const { 
    queuedFields, 
    clearQueue,
    isRightSidebarOpen,
    setRightSidebarOpen
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

  // Render as a fixed sidebar on the right, completely independent of zoom
  return (
    <aside 
      className={cn(
        "fixed right-0 top-0 h-screen bg-sidebar border-l transition-transform duration-300 z-40",
        "flex flex-col w-80",
        isRightSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4" />
          <h2 className="text-sm font-semibold">Import Queue</h2>
          <Badge variant="secondary" className="text-xs">
            {queuedFields.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setRightSidebarOpen(false)}
            title="Close queue"
            className="h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
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
                  <Collapsible
                    key={`queue-page-${pageNum}`}
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
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {queuedFields.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="text-xs text-muted-foreground text-center">
            Drag fields from queue to PDF canvas
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {queuedFields.length} field{queuedFields.length !== 1 ? 's' : ''} waiting
          </p>
        </div>
      )}
    </aside>
  );
}