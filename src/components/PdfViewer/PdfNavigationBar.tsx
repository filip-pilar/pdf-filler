import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, Move } from 'lucide-react';

interface PdfNavigationBarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToWidth: () => void;
  onFitToPage: () => void;
}

export function PdfNavigationBar({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onFitToWidth,
  onFitToPage
}: PdfNavigationBarProps) {
  return (
    <Card className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 px-2 py-1">
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
        
        <span className="text-sm px-2 min-w-[60px] text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="h-8 w-8"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onFitToWidth}
          className="h-8 w-8"
          title="Fit to Width"
        >
          <Move className="h-4 w-4 rotate-90" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onFitToPage}
          className="h-8 w-8"
          title="Fit to Page"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}