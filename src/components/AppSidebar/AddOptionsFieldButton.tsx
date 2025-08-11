import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';

interface AddOptionsFieldButtonProps {
  onClick: () => void;
}

export function AddOptionsFieldButton({ onClick }: AddOptionsFieldButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      className="w-full justify-start"
    >
      <List className="mr-2 h-4 w-4" />
      Add Field with Options
    </Button>
  );
}