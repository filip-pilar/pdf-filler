import { Plus, ToggleLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFieldStore } from '@/store/fieldStore';
import { cn } from '@/lib/utils';

interface AddBooleanFieldButtonProps {
  onClick: () => void;
  className?: string;
}

export function AddBooleanFieldButton({ onClick, className }: AddBooleanFieldButtonProps) {
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
      title={isDisabled ? "Load a PDF first to add boolean fields" : "Add a new boolean field"}
    >
      <div className="flex items-center gap-2 flex-1">
        <ToggleLeft className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Add Boolean Field</span>
      </div>
      <Plus className="h-3 w-3 text-muted-foreground" />
    </Button>
  );
}