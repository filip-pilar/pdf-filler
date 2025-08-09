import { useFieldStore } from '@/store/fieldStore';
import { Badge } from '@/components/ui/badge';
import { FileText, Hash, Workflow, AlertCircle } from 'lucide-react';

export function StatusBar() {
  const { fields, logicFields, pdfFile } = useFieldStore();
  
  const totalActions = logicFields.reduce((sum, field) => 
    sum + field.options.reduce((optSum, opt) => optSum + opt.actions.length, 0), 0
  );
  
  const incompleteFields = logicFields.filter(f => 
    f.options.some(opt => opt.actions.length === 0)
  ).length;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-background border-t flex items-center px-4 gap-4 text-xs text-muted-foreground z-50">
      {pdfFile && (
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>{pdfFile.name}</span>
        </div>
      )}
      
      <div className="flex items-center gap-1">
        <Hash className="h-3 w-3" />
        <span>{fields.length} fields</span>
      </div>
      
      {logicFields.length > 0 && (
        <>
          <div className="flex items-center gap-1">
            <Workflow className="h-3 w-3" />
            <span>{logicFields.length} logic fields</span>
            <span className="text-muted-foreground/50">•</span>
            <span>{totalActions} actions</span>
          </div>
          
          {incompleteFields > 0 && (
            <Badge variant="outline" className="h-5 text-xs px-1.5">
              <AlertCircle className="h-3 w-3 mr-1" />
              {incompleteFields} incomplete
            </Badge>
          )}
        </>
      )}
      
      <div className="ml-auto flex items-center gap-2">
        <span className="text-muted-foreground/50">Ready</span>
      </div>
    </div>
  );
}