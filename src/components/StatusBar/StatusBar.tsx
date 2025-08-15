import { useFieldStore } from '@/store/fieldStore';
import { Badge } from '@/components/ui/badge';
import { FileText, Hash } from 'lucide-react';

export function StatusBar() {
  const { unifiedFields, pdfFile, currentPage, totalPages } = useFieldStore();

  return (
    <div className="status-bar fixed bottom-0 left-0 right-0 h-8 bg-background border-t flex items-center px-4 gap-4 text-xs text-muted-foreground z-50">
      {pdfFile && (
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>{pdfFile.name}</span>
        </div>
      )}
      
      <div className="flex items-center gap-1">
        <Hash className="h-3 w-3" />
        <span>{unifiedFields.length} fields</span>
      </div>
      
      {totalPages > 0 && (
        <Badge variant="outline" className="h-5 text-xs px-1.5">
          Page {currentPage} of {totalPages}
        </Badge>
      )}
      
      <div className="ml-auto flex items-center gap-2">
        <span className="text-muted-foreground/50">Ready</span>
      </div>
    </div>
  );
}