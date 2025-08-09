import { useCallback } from 'react';
import { useFieldStore } from '@/store/fieldStore';

export function useGridSnap() {
  const { gridEnabled: enabled, gridSize: size } = useFieldStore();
  
  const snapX = useCallback((x: number) => {
    if (!enabled) return x;
    // Snap to nearest grid line (aligns top-left corner to grid)
    return Math.round(x / size) * size;
  }, [enabled, size]);
  
  const snapY = useCallback((y: number) => {
    if (!enabled) return y;
    // Snap to nearest grid line (aligns top-left corner to grid)
    return Math.round(y / size) * size;
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