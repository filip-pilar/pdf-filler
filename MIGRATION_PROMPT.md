# AI Agent Migration Task: React-DnD → @dnd-kit

## CRITICAL CONTEXT
You are migrating a PDF form builder's drag-and-drop system from react-dnd to @dnd-kit. The application allows users to drag fields (text, checkbox, image, signature) onto a PDF and reposition them. Currently, react-dnd has THREE CRITICAL ISSUES that MUST be solved:

1. **FLICKER BUG**: When dragging starts, there's a 1-2 frame gap where NOTHING is visible (original disappears before preview appears)
2. **CURSOR JUMP**: Fields jump to center under cursor instead of maintaining grab position
3. **DOUBLE RENDER**: Sometimes shows both original field and preview during drag

## YOUR MISSION
Completely replace react-dnd with @dnd-kit to achieve FLICKER-FREE, SMOOTH, PROFESSIONAL drag-and-drop that matches Figma/Notion quality.

## CURRENT ARCHITECTURE TO UNDERSTAND

### Key Components:
1. **DraggableUnifiedField.tsx** - Makes fields draggable (currently uses `useDrag`)
2. **UnifiedFieldOverlay.tsx** - Drop zone on PDF (currently uses `useDrop`)
3. **PdfEditor.tsx** - Main editor containing the PDF viewer
4. **App.tsx** - Root with DndProvider
5. **CustomDragLayer.tsx** - Attempted fix for flicker (can be deleted)

### Current Flow:
```
User clicks field → useDrag activates → opacity-0 on original → Preview mounts (FLICKER!) → Drag → Drop → Field moves
```

### Desired Flow:
```
User clicks field → DragOverlay instantly shows → Original hidden → Smooth drag → Drop → Field moves
```

## STEP-BY-STEP IMPLEMENTATION

### STEP 1: Package Management
```bash
# Remove old packages
npm uninstall react-dnd react-dnd-html5-backend

# Install @dnd-kit (already installed but verify)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers
```

### STEP 2: Transform App.tsx

**DELETE** the entire current DndProvider setup.

**REPLACE** with this EXACT structure:

```typescript
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToWindowEdges,
  restrictToParentElement,
} from '@dnd-kit/modifiers';

function App() {
  const [activeField, setActiveField] = useState<UnifiedField | null>(null);
  const [isDraggingField, setIsDraggingField] = useState(false);
  
  // CRITICAL: PointerSensor with distance constraint prevents accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must drag 8px to activate
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const field = active.data.current?.field;
    
    if (field) {
      setActiveField(field);
      setIsDraggingField(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // This is where field repositioning happens
    if (over && over.id === 'pdf-drop-zone') {
      const field = active.data.current?.field;
      const newPosition = active.data.current?.newPosition;
      
      if (field && newPosition) {
        // Update field position in store
        useFieldStore.getState().updateUnifiedField(field.id, {
          position: newPosition
        });
      }
    }
    
    setActiveField(null);
    setIsDraggingField(false);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn(isDraggingField && "dragging-active")}>
        {/* Existing app content */}
      </div>
      
      {/* CRITICAL: DragOverlay must be at ROOT level */}
      <DragOverlay dropAnimation={null}>
        {activeField ? (
          <FieldDragPreview field={activeField} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### STEP 3: Create FieldDragPreview Component

**CREATE NEW FILE**: `/src/components/PdfViewer/FieldDragPreview.tsx`

```typescript
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
```

### STEP 4: Transform DraggableUnifiedField.tsx

**CRITICAL CHANGES**:
1. Remove ALL react-dnd imports
2. Remove getEmptyImage hack
3. Use CSS transform for movement

```typescript
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export function DraggableUnifiedField({ field, scale, pageHeight, ... }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: field.id,
    data: {
      current: {
        field,
        type: 'unified-field',
      }
    }
  });

  // CRITICAL: Transform handles movement, opacity hides original
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1, // Hide original when dragging
    transition: 'opacity 0.2s', // Smooth fade
    left: field.position.x * scale,
    top: screenY * scale,
    width: (field.size?.width || 200) * scale,
    height: (field.size?.height || 30) * scale,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "absolute border rounded cursor-move overflow-hidden",
        // Remove ALL isDragging-based opacity/pointer-events changes
        isSelected ? "border-primary bg-primary/5" : "border-border/50 bg-background/20"
      )}
      onContextMenu={handleContextMenu}
      onDoubleClick={onDoubleClick}
    >
      {/* Field content remains the same */}
    </div>
  );
}
```

### STEP 5: Transform UnifiedFieldOverlay.tsx

**REPLACE** useDrop with useDroppable:

```typescript
import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';

export function UnifiedFieldOverlay({ fields, ... }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'pdf-drop-zone',
    data: {
      accepts: ['unified-field'],
    }
  });

  // Remove ALL preview rendering code - DragOverlay handles it
  
  return (
    <div 
      ref={setNodeRef}
      className="absolute top-0 left-0"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {/* Grid alignment guides when isOver */}
      {isOver && gridEnabled && (
        <>
          {/* Keep existing grid guides */}
        </>
      )}
      
      {/* Render existing fields */}
      {currentPageFields.map((field) => (
        <DraggableUnifiedField
          key={field.id}
          field={field}
          scale={scale}
          pageHeight={pageHeight}
          onDoubleClick={() => onFieldDoubleClick?.(field)}
        />
      ))}
    </div>
  );
}
```

### STEP 6: Handle Field Repositioning

In the DndContext's `handleDragEnd`, calculate the new position:

```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over, delta } = event;
  
  if (over?.id === 'pdf-drop-zone' && active.data.current?.field) {
    const field = active.data.current.field as UnifiedField;
    
    // Calculate new position based on delta movement
    const newPosition = {
      x: field.position.x + (delta.x / scale),
      y: field.position.y - (delta.y / scale), // Invert Y for PDF coordinates
    };
    
    // Apply grid snapping if enabled
    const snappedPosition = gridEnabled 
      ? snapPosition(newPosition)
      : newPosition;
    
    // Apply boundary constraints
    const constrainedPosition = {
      x: Math.max(0, Math.min(snappedPosition.x, pageWidth - field.size.width)),
      y: Math.max(field.size.height, Math.min(snappedPosition.y, pageHeight)),
    };
    
    // Update field in store
    useFieldStore.getState().updateUnifiedField(field.id, {
      position: constrainedPosition
    });
  }
};
```

### STEP 7: Grid Snapping Modifier

**CREATE**: `/src/utils/dndModifiers.ts`

```typescript
import { Modifier } from '@dnd-kit/core';

export const createGridSnapModifier = (gridSize: number): Modifier => {
  return ({ transform }) => {
    return {
      ...transform,
      x: Math.round(transform.x / gridSize) * gridSize,
      y: Math.round(transform.y / gridSize) * gridSize,
    };
  };
};
```

Use in DndContext:
```typescript
const modifiers = [
  restrictToWindowEdges,
  gridEnabled ? createGridSnapModifier(gridSize) : null,
].filter(Boolean);
```

## CRITICAL SUCCESS CRITERIA

### ✅ MUST ACHIEVE:
1. **ZERO FLICKER** - Not even 1 frame of emptiness when drag starts
2. **MAINTAIN CURSOR OFFSET** - Field stays exactly where grabbed, no jumping
3. **SMOOTH 60 FPS** - Use transform, not position changes
4. **INSTANT PREVIEW** - DragOverlay appears immediately
5. **GRID SNAPPING** - Visual guides and snapping work
6. **BOUNDARY CONSTRAINTS** - Fields stay within PDF bounds

### ❌ MUST AVOID:
1. **NO opacity-0 + pointer-events-none** - This breaks dragging
2. **NO mounting delay** - DragOverlay is always mounted
3. **NO position jumping** - Maintain exact grab offset
4. **NO double visibility** - Original hidden, only preview shows

## TESTING CHECKLIST

After implementation, test EVERY scenario:

```typescript
// Test 1: No flicker
console.time('drag-start');
// Start dragging
console.timeEnd('drag-start'); // Should be < 16ms (1 frame)

// Test 2: Cursor offset
// Grab field at corner - should stay at corner
// Grab field at center - should stay at center

// Test 3: Performance
// Add 50 fields, drag one, check FPS stays at 60

// Test 4: Grid snapping
// Enable grid, drag field, verify snaps to grid

// Test 5: Boundaries
// Drag to edge, verify stops at boundary
```

## EDGE CASES TO HANDLE

1. **Dragging from sidebar palette** - New field creation
2. **Options fields** - Multiple mappings
3. **Different field sizes** - Checkbox (25x25) vs Text (200x30)
4. **Zoom/scale** - Ensure calculations account for scale
5. **Page switching** - Don't lose drag state

## FILES TO DELETE

After migration works:
1. `CustomDragLayer.tsx` - Replaced by DragOverlay
2. `DragPreview.tsx` - No longer needed
3. All react-dnd imports

## FINAL VALIDATION

The migration is ONLY complete when:
1. Start drag → No flicker (test 100 times)
2. Grab anywhere → Maintains position
3. Drag performance → Smooth 60 FPS
4. User feedback → "Feels like Figma"

## COMMON PITFALLS TO AVOID

1. **DON'T** use `isDragging && "opacity-0 pointer-events-none"` - Breaks everything
2. **DON'T** forget to set dropAnimation={null} on DragOverlay - Causes jump
3. **DON'T** calculate position in pixels - Always account for scale
4. **DON'T** render preview conditionally - Keep it always mounted

## EMERGENCY FALLBACK

If ANY issues arise:
```bash
git stash
git checkout main
npm install react-dnd react-dnd-html5-backend
```

But this should NOT be needed if you follow this guide exactly.

## YOUR SUCCESS METRIC

When complete, dragging should feel EXACTLY like:
- Figma layers
- Notion blocks  
- Trello cards

Smooth, instant, professional. No compromises.

---

**REMEMBER**: The entire point is to eliminate flicker and jumping. Every line of code should serve this goal. Test obsessively. The user should feel like they're moving a physical object - instant response, no lag, no flicker, perfect tracking.