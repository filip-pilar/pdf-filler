import type { Modifier } from '@dnd-kit/core';

export const createGridSnapModifier = (gridSize: number): Modifier => {
  return ({ transform }) => {
    return {
      ...transform,
      x: Math.round(transform.x / gridSize) * gridSize,
      y: Math.round(transform.y / gridSize) * gridSize,
    };
  };
};