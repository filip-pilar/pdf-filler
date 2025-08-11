import { cn } from '@/lib/utils';
import type { UnifiedField } from '@/types/unifiedField.types';

export function FieldDragPreview({ field }: { field: UnifiedField }) {
  const isImage = field.type === 'image';
  const isSignature = field.type === 'signature';
  const hasImageData = (isImage || isSignature) && 
    field.sampleValue && 
    typeof field.sampleValue === 'string' && 
    field.sampleValue.startsWith('data:');
  
  const isCheckbox = field.type === 'checkbox';
  
  // CRITICAL: Style must match original field EXACTLY to prevent visual jump
  return (
    <div
      className={cn(
        "border rounded overflow-hidden cursor-grabbing",
        "border-border/50 bg-background/90 shadow-xl", // Slightly more visible during drag
      )}
      style={{
        width: field.size?.width || 200,
        height: field.size?.height || 30,
        fontSize: 12,
      }}
    >
      {hasImageData ? (
        <img 
          src={field.sampleValue as string}
          alt={field.type}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="flex items-center gap-1 p-1 h-full">
          <span className="text-xs font-mono truncate">
            {isCheckbox && field.sampleValue ? '✓' : field.key}
          </span>
        </div>
      )}
    </div>
  );
}