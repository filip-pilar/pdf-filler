import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PdfNavigationBarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToWidth: () => void;
  onZoomChange?: (scale: number) => void;
}

export function PdfNavigationBar({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onZoomChange
}: PdfNavigationBarProps) {
  const [zoomInput, setZoomInput] = useState(`${Math.round(scale * 100)}`);

  useEffect(() => {
    setZoomInput(`${Math.round(scale * 100)}`);
  }, [scale]);

  const handleZoomInputChange = (value: string) => {
    // Allow only numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setZoomInput(numericValue);
  };

  const handleZoomInputSubmit = () => {
    const zoomValue = parseInt(zoomInput, 10);
    if (!isNaN(zoomValue) && zoomValue >= 25 && zoomValue <= 400) {
      onZoomChange?.(zoomValue / 100);
    } else {
      // Reset to current scale if invalid
      setZoomInput(`${Math.round(scale * 100)}`);
    }
  };

  const handleZoomInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleZoomInputSubmit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setZoomInput(`${Math.round(scale * 100)}`);
      (e.target as HTMLInputElement).blur();
    }
  };
  return (
    <Card className="bg-background/95 backdrop-blur-xl shadow-lg border">
      <div className="flex items-center justify-center px-3 py-1.5">
        <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm px-2 min-w-[100px] text-center">
          Page {currentPage} of {numPages}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPageChange(Math.min(currentPage + 1, numPages))}
          disabled={currentPage >= numPages}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="h-8 w-8"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center">
          <Input
            type="text"
            value={zoomInput}
            onChange={(e) => handleZoomInputChange(e.target.value)}
            onBlur={handleZoomInputSubmit}
            onKeyDown={handleZoomInputKeyDown}
            className="h-8 w-16 text-center text-sm border-0 focus-visible:ring-1 focus-visible:ring-offset-0"
            title="Enter zoom percentage (25-400)"
          />
          <span className="text-sm">%</span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        </div>
      </div>
    </Card>
  );
}