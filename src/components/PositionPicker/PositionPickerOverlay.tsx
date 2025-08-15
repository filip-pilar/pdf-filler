/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePositionPickerStore } from '@/store/positionPickerStore';
import { useFieldStore } from '@/store/fieldStore';
import { useGridSnap } from '@/hooks/useGridSnap';
import { Crosshair } from 'lucide-react';

interface PositionPickerOverlayProps {
  onPositionClick: (x: number, y: number) => void;
  pageWidth: number;
  pageHeight: number;
  scale: number;
}

export function PositionPickerOverlay({ onPositionClick, pageWidth, pageHeight, scale }: PositionPickerOverlayProps) {
  const { pickingContent, pickingOptionLabel, pickingActionType, cancelPicking } = usePositionPickerStore();
  const { gridEnabled, gridSize } = useFieldStore();
  const { snapX, snapY } = useGridSnap();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [snappedPosition, setSnappedPosition] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelPicking();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLElement;
      if (target && target.getBoundingClientRect) {
        const rect = target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        setMousePosition({ x, y });
        
        // Calculate snapped position for preview
        if (gridEnabled) {
          // Get the field size for proper centering
          const fieldSize = pickingActionType === 'checkmark' 
            ? { width: 25, height: 25 }
            : { width: 100, height: 30 };
          
          // Convert to PDF coordinates and center
          const pdfX = x / scale - (fieldSize.width / 2);
          const pdfY = y / scale - (fieldSize.height / 2);
          
          // Snap the position
          const snappedX = snapX(pdfX);
          const snappedY = snapY(pdfY);
          
          // Convert back to screen coordinates for display
          setSnappedPosition({
            x: snappedX * scale,
            y: snappedY * scale
          });
        } else {
          // If grid is not enabled, use the mouse position adjusted for centering
          const fieldSize = pickingActionType === 'checkmark' 
            ? { width: 25, height: 25 }
            : { width: 100, height: 30 };
          
          setSnappedPosition({
            x: x - (fieldSize.width * scale / 2),
            y: y - (fieldSize.height * scale / 2)
          });
        }
        
        setShowPreview(true);
      }
    };

    const handleMouseLeave = () => {
      setShowPreview(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    const overlay = document.getElementById('position-picker-overlay');
    if (overlay) {
      overlay.addEventListener('mousemove', handleMouseMove);
      overlay.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (overlay) {
        overlay.removeEventListener('mousemove', handleMouseMove);
        overlay.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [cancelPicking]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Get coordinates relative to the overlay itself
    // The overlay is positioned absolute inside the PDF container
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    
    onPositionClick(x, y);
  };


  return (
    <div
      id="position-picker-overlay"
      className="absolute top-0 left-0 z-50 cursor-crosshair"
      onClick={handleClick}
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.4))',
      }}
    >
      {/* Instructions */}
      <Card className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 bg-white/95 shadow-lg">
        <div className="flex items-center gap-3">
          <Crosshair className="h-5 w-5 text-primary" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Click to place:</span>
              <Badge variant="secondary">{pickingContent}</Badge>
              <span className="text-sm text-muted-foreground">for "{pickingOptionLabel}"</span>
            </div>
            <span className="text-xs text-muted-foreground">Press ESC to cancel</span>
          </div>
        </div>
      </Card>

      {/* Grid overlay pattern - show if grid is enabled */}
      {gridEnabled && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
          }}
        />
      )}
      
      {/* Additional grid hint around cursor */}
      {gridEnabled && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
            maskImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, black 100px, transparent 200px)`,
            WebkitMaskImage: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, black 100px, transparent 200px)`,
          }}
        />
      )}

      {/* Mouse preview - shows at snapped position when grid is enabled */}
      {showPreview && (
        <div
          className="absolute pointer-events-none select-none z-50"
          style={{
            left: gridEnabled ? snappedPosition.x : mousePosition.x,
            top: gridEnabled ? snappedPosition.y : mousePosition.y,
            transform: gridEnabled ? 'none' : 'translate(-50%, -50%)',
          }}
        >
          <div className="relative">
            {/* Field preview - matches actual field appearance */}
            <div 
              className="pointer-events-none"
              style={{
                width: pickingActionType === 'checkmark' ? `${25 * scale}px` : `${100 * scale}px`,
                height: pickingActionType === 'checkmark' ? `${25 * scale}px` : `${30 * scale}px`,
              }}
            >
              <div className={`w-full h-full border-2 ${gridEnabled ? 'border-green-500' : 'border-purple-400'} ${gridEnabled ? 'bg-green-50/80' : 'bg-purple-50/60'} rounded-sm shadow-lg flex items-center justify-center transition-all duration-75`}>
                {pickingActionType === 'checkmark' ? (
                  <span className={`font-bold ${gridEnabled ? 'text-green-700' : 'text-purple-700'}`} style={{ fontSize: `${18 * scale}px` }}>✓</span>
                ) : (
                  <span className={`text-purple-700 truncate px-1`} style={{ fontSize: `${14 * scale}px` }}>
                    {pickingContent}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}