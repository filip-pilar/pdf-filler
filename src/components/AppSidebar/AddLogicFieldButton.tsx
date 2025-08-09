import { Plus, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFieldStore } from '@/store/fieldStore';
import { cn } from '@/lib/utils';

interface AddLogicFieldButtonProps {
  onClick: () => void;
  className?: string;
}

export function AddLogicFieldButton({ onClick, className }: AddLogicFieldButtonProps) {
  const { pdfUrl } = useFieldStore();
  const isDisabled = !pdfUrl;

  return (
    <Button
      onClick={onClick}
      variant="outline"
      disabled={isDisabled}
      className={cn(
        "w-full justify-start gap-2",
        !isDisabled && "hover:bg-accent hover:text-accent-foreground",
        "border-dashed border-2",
        isDisabled && "opacity-50 cursor-not-allowed",
        className
      )}
      title={isDisabled ? "Load a PDF first to add logic fields" : "Add a new logic field"}
    >
      <div className="flex items-center gap-2 flex-1">
        <Workflow className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Add Logic Field</span>
      </div>
      <Plus className="h-3 w-3 text-muted-foreground" />
    </Button>
  );
}