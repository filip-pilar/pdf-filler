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
    if (!enabled) return pdfY;
    
    // For top-edge positioning, Y coordinates are already in screen space
    // (Y=0 at top, increasing downward), so we can directly snap!
    return Math.round(pdfY / size) * size;
  }, [enabled, size]);
  
  const snapPosition = useCallback((position: { x: number; y: number }) => {
    if (!enabled) return position;
    return {
      x: snapX(position.x),
      y: snapY(position.y),
    };
  }, [enabled, snapX, snapY]);
  
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