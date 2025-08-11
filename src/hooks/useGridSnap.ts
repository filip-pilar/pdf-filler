import { useCallback } from 'react';
import { useFieldStore } from '@/store/fieldStore';

export function useGridSnap(pageHeight?: number) {
  const { gridEnabled: enabled, gridSize: size } = useFieldStore();
  
  const snapX = useCallback((x: number) => {
    if (!enabled) return x;
    // Snap to nearest grid line (aligns top-left corner to grid)
    return Math.round(x / size) * size;
  }, [enabled, size]);
  
  const snapY = useCallback((pdfY: number) => {
    if (!enabled || !pageHeight) return pdfY;
    
    // With Y now representing top edge, we can directly snap!
    // Convert PDF Y (top edge) to screen Y for visual snapping
    const screenY = pageHeight - pdfY;
    
    // Snap in screen coordinates (where the grid is visually drawn)
    const snappedScreenY = Math.round(screenY / size) * size;
    
    // Convert back to PDF Y (still top edge)
    return pageHeight - snappedScreenY;
  }, [enabled, size, pageHeight]);
  
  const snapPosition = useCallback((position: { x: number; y: number }) => {
    if (!enabled) return position;
    // fieldSize is no longer needed for Y snapping!
    return {
      x: snapX(position.x),
      y: pageHeight ? snapY(position.y) : position.y,
    };
  }, [enabled, snapX, snapY, pageHeight]);
  
  const snapSize = useCallback((dimensions: { width: number; height: number }) => {
    if (!enabled) return dimensions;
    return {
      width: Math.round(dimensions.width / size) * size,
      height: Math.round(dimensions.height / size) * size,
    };
  }, [enabled, size]);
  
  return {
    snapX,
    snapY,
    snapPosition,
    snapSize,
    gridSize: size,
    isEnabled: enabled,
  };
}