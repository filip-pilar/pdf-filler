import { cn } from '@/lib/utils';
import type { FieldType } from '@/types/field.types';

interface DragPreviewProps {
  type: FieldType | 'logic';
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export function DragPreview({ type, x, y, width, height, scale }: DragPreviewProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: x * scale,
        top: y * scale,
        width: width * scale,
        height: height * scale,
        zIndex: 100
      }}
    >
      <div className={cn(
        "w-full h-full border-2 border-dashed rounded-sm",
        "animate-pulse transition-all duration-150",
        type === 'logic' 
          ? "bg-purple-500/10 border-purple-500" 
          : "bg-blue-500/10 border-blue-500"
      )}>
        <div className={cn(
          "absolute -top-6 left-0 text-white text-xs px-1.5 py-0.5 rounded shadow-sm",
          type === 'logic' ? "bg-purple-600" : "bg-blue-600"
        )}>
          {type === 'logic' ? 'Logic Field' : type}
        </div>
      </div>
    </div>
  );
}