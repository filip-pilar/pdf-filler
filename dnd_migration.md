# Migration Plan: React-DnD to @dnd-kit

## Executive Summary
This document outlines the comprehensive plan for migrating from React-DnD to @dnd-kit to resolve persistent drag-and-drop issues including flicker, offset problems, and general UX improvements.

## Current Issues with React-DnD

### 1. Flicker Problem
- **Issue**: 1-2 frame gap between original element hiding and preview appearing
- **Root Cause**: Preview component needs to mount/render after drag starts
- **Attempted Fixes**: 
  - DragLayer API (helped but not perfect)
  - Opacity adjustments (created duplicate visibility)
  - Custom preview systems (still has mounting delay)

### 2. Cursor Offset Issues
- **Issue**: Field jumps to center under cursor when drag starts
- **Root Cause**: Complex offset calculations with `getInitialClientOffset()`
- **Current State**: Partially fixed but still inconsistent

### 3. Native HTML5 Drag Ghost
- **Issue**: Browser's native ghost image interferes with custom preview
- **Workaround**: Using `getEmptyImage()` but adds complexity

### 4. Performance
- **Issue**: Multiple re-renders during drag
- **Impact**: Noticeable lag with many fields on page

## Why @dnd-kit is Better

### 1. Modern Architecture
- Built from ground up for React (not a wrapper around HTML5 DnD)
- Uses pointer events instead of drag events
- No native ghost image to fight with

### 2. Built-in Features
- **Auto-scroll**: Automatic scrolling at container edges
- **Keyboard support**: Accessibility out of the box
- **Touch support**: Works on mobile without additional backend
- **Animations**: Smooth transitions built-in

### 3. Performance
- Uses CSS transforms for movement (GPU accelerated)
- Minimal re-renders
- Virtual scrolling support

### 4. Developer Experience
- Better TypeScript support
- Cleaner API
- Extensive documentation
- Active maintenance

## Migration Strategy

### Phase 1: Setup & Basic Infrastructure
**Estimated Time**: 2 hours

#### 1.1 Install Dependencies
```bash
npm uninstall react-dnd react-dnd-html5-backend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @dnd-kit/modifiers
```

#### 1.2 Create New Provider Structure
Replace `DndProvider` with `DndContext` in App.tsx:
```typescript
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
```

#### 1.3 Setup Sensors
Configure mouse, touch, and keyboard sensors:
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Prevent accidental drags
    },
  }),
  useSensor(KeyboardSensor)
);
```

### Phase 2: Convert Draggable Components
**Estimated Time**: 3 hours

#### 2.1 Convert DraggableUnifiedField
**Current (react-dnd)**:
```typescript
const [{ isDragging }, drag] = useDrag({
  type: 'unified-field',
  item: () => ({...}),
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  })
});
```

**New (@dnd-kit)**:
```typescript
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  isDragging
} = useDraggable({
  id: field.id,
  data: {
    field,
    type: 'unified-field'
  }
});

const style = {
  transform: CSS.Transform.toString(transform),
};
```

#### 2.2 Key Changes in Field Component
- No more `ref={drag}`, use `ref={setNodeRef}`
- Spread `{...listeners} {...attributes}` on draggable element
- Use CSS transforms instead of opacity changes
- No need for `getEmptyImage()` hack

### Phase 3: Convert Drop Zones
**Estimated Time**: 2 hours

#### 3.1 Convert UnifiedFieldOverlay Drop Zone
**Current (react-dnd)**:
```typescript
const [{ isOver }, drop] = useDrop({
  accept: 'unified-field',
  hover: (item, monitor) => {...},
  drop: (item, monitor) => {...}
});
```

**New (@dnd-kit)**:
```typescript
const { setNodeRef, isOver } = useDroppable({
  id: 'pdf-drop-zone',
  data: {
    accepts: ['unified-field']
  }
});
```

#### 3.2 Handle Drop Logic
Move drop logic to DndContext's `onDragEnd`:
```typescript
<DndContext
  sensors={sensors}
  modifiers={[restrictToWindowEdges]}
  onDragStart={handleDragStart}
  onDragMove={handleDragMove}
  onDragEnd={handleDragEnd}
>
```

### Phase 4: Implement Custom Drag Overlay
**Estimated Time**: 2 hours

#### 4.1 Create DragOverlay Component
```typescript
<DragOverlay>
  {activeId ? (
    <DraggingFieldPreview field={getFieldById(activeId)} />
  ) : null}
</DragOverlay>
```

#### 4.2 Benefits
- Always mounted (no flicker!)
- Smooth animations built-in
- Maintains grab offset automatically
- No duplicate visibility issues

### Phase 5: Grid Snapping
**Estimated Time**: 1 hour

#### 5.1 Create Custom Modifier
```typescript
const gridSnapModifier = (args) => {
  const { transform, gridSize } = args;
  return {
    ...transform,
    x: Math.round(transform.x / gridSize) * gridSize,
    y: Math.round(transform.y / gridSize) * gridSize,
  };
};
```

### Phase 6: Testing & Refinement
**Estimated Time**: 2 hours

#### 6.1 Test Cases
- [ ] Drag from palette to PDF
- [ ] Reposition existing fields
- [ ] Grid snapping works
- [ ] Boundary constraints enforced
- [ ] No flicker on drag start
- [ ] Cursor offset maintained
- [ ] Touch/mobile support
- [ ] Keyboard navigation

#### 6.2 Performance Testing
- [ ] Test with 50+ fields
- [ ] Check CPU usage during drag
- [ ] Verify smooth 60fps animation

## File-by-File Changes

### Files to Modify
1. **App.tsx**
   - Remove `DndProvider` and `HTML5Backend`
   - Add `DndContext` with sensors
   - Add `DragOverlay` component

2. **DraggableUnifiedField.tsx**
   - Replace `useDrag` with `useDraggable`
   - Remove opacity changes
   - Add transform styles

3. **UnifiedFieldOverlay.tsx**
   - Replace `useDrop` with `useDroppable`
   - Move drop logic to parent
   - Remove custom preview code

4. **PdfEditor.tsx**
   - Add drag event handlers
   - Manage active drag state
   - Handle drop logic

### Files to Delete
1. **CustomDragLayer.tsx** - No longer needed
2. **DragPreview.tsx** - Replaced by DragOverlay

### Files to Create
1. **DragOverlay.tsx** - New overlay component
2. **dndModifiers.ts** - Custom modifiers for grid snap
3. **dndHelpers.ts** - Utility functions

## Implementation Code Snippets

### New App.tsx Structure
```typescript
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

function App() {
  const [activeId, setActiveId] = useState(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const {active, over} = event;
    
    if (over && active.id !== over.id) {
      // Handle field repositioning
      moveField(active.id, over.id);
    }
    
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* App content */}
      
      <DragOverlay>
        {activeId ? <FieldPreview id={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### New Draggable Field
```typescript
import {useDraggable} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';

export function DraggableUnifiedField({field}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: field.id,
    data: field,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      {/* Field content */}
    </div>
  );
}
```

## Benefits After Migration

### Immediate Benefits
1. **No flicker** - DragOverlay is always mounted
2. **Perfect offset** - Maintains grab position naturally
3. **Smooth animations** - GPU-accelerated transforms
4. **Better performance** - Fewer re-renders

### Long-term Benefits
1. **Mobile support** - Touch gestures work out of box
2. **Accessibility** - Keyboard navigation included
3. **Future features** - Auto-scroll, sort animations
4. **Maintainability** - Cleaner, more modern codebase

## Risk Assessment

### Low Risk
- Well-documented migration path
- Can be done incrementally
- Fallback to current implementation if issues

### Potential Challenges
1. **Learning curve** - New API patterns
2. **Testing time** - Need thorough testing
3. **Edge cases** - May discover new issues

## Timeline

### Estimated Total Time: 10-12 hours

**Day 1** (4 hours)
- Phase 1: Setup
- Phase 2: Convert draggables

**Day 2** (4 hours)
- Phase 3: Convert drop zones
- Phase 4: Custom overlay

**Day 3** (2-4 hours)
- Phase 5: Grid snapping
- Phase 6: Testing & refinement

## Rollback Plan

If migration causes issues:
1. Keep react-dnd branch available
2. Can revert with single git command
3. Document any edge cases discovered

## Success Criteria

Migration is successful when:
- [ ] Zero flicker on drag start
- [ ] Cursor offset maintained perfectly
- [ ] Smooth 60fps drag animation
- [ ] Grid snapping works reliably
- [ ] All existing features preserved
- [ ] Touch/mobile support added
- [ ] Keyboard navigation works

## Conclusion

Migrating to @dnd-kit will solve our current drag-and-drop issues while providing a more modern, performant, and maintainable solution. The migration can be completed in approximately 10-12 hours with minimal risk and significant long-term benefits.

The key improvements will be:
1. **Elimination of flicker** through always-mounted DragOverlay
2. **Natural cursor offset** without complex calculations
3. **Better performance** through CSS transforms
4. **Future-proofing** with modern, actively maintained library

Recommendation: **Proceed with migration** to provide users with a professional, smooth drag-and-drop experience that matches industry standards.