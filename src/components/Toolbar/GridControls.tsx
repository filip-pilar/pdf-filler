import { Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useFieldStore, type GridSize } from '@/store/fieldStore';
import { cn } from '@/lib/utils';

export function GridControls() {
  const { 
    gridEnabled: enabled, 
    gridSize: size, 
    setGridSize: setSize, 
    setGridEnabled,
    setShowGrid
  } = useFieldStore();

  const handleGridOptionClick = (value: GridSize | 'off') => {
    if (value === 'off') {
      setGridEnabled(false);
      setShowGrid(false);
    } else {
      setGridEnabled(true);
      setSize(value);
      setShowGrid(true);
      // Note: Fields will snap to grid when user drags them, not automatically
    }
  };

  const currentLabel = enabled ? `${size}px Grid` : 'No Grid';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "min-w-[100px]",
            enabled && "border-primary bg-primary/10 hover:bg-primary/20"
          )}
        >
          <Grid3x3 className={cn("h-4 w-4 mr-2", enabled && "text-primary")} />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleGridOptionClick('off')}
          className={cn(
            "cursor-pointer pl-3",
            !enabled && "bg-accent"
          )}
        >
          No Grid
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleGridOptionClick(10)}
          className={cn(
            "cursor-pointer pl-3",
            enabled && size === 10 && "bg-accent"
          )}
        >
          10px Grid
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleGridOptionClick(25)}
          className={cn(
            "cursor-pointer pl-3",
            enabled && size === 25 && "bg-accent"
          )}
        >
          25px Grid
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleGridOptionClick(50)}
          className={cn(
            "cursor-pointer pl-3",
            enabled && size === 50 && "bg-accent"
          )}
        >
          50px Grid
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleGridOptionClick(100)}
          className={cn(
            "cursor-pointer pl-3",
            enabled && size === 100 && "bg-accent"
          )}
        >
          100px Grid
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}