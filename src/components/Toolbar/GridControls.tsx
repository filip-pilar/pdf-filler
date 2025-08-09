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
  const { gridEnabled: enabled, gridSize: size, showGrid, setGridSize: setSize, setShowGrid, setGridEnabled } = useFieldStore();

  const handleGridOptionClick = (value: GridSize | 'off') => {
    if (value === 'off') {
      setGridEnabled(false);
    } else {
      setGridEnabled(true);
      setSize(value);
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
          onClick={() => handleGridOptionClick(5)}
          className={cn(
            "cursor-pointer pl-3",
            enabled && size === 5 && "bg-accent"
          )}
        >
          5px Grid
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setShowGrid(!showGrid)}
          className="cursor-pointer pl-3"
          disabled={!enabled}
        >
          <div className="flex items-center justify-between w-full">
            <span className={cn(!enabled && "text-muted-foreground")}>Show Grid Lines</span>
            {showGrid && enabled && <span className="text-xs">✓</span>}
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}