# Old React-Draggable Implementation Analysis (Commit 9dd43e1)

This document provides a detailed technical analysis of the react-draggable implementation that was working before the migration to react-dnd unified fields.

## Core Dependencies

From `package.json`:
- **react-draggable**: ^4.5.0 - Primary drag functionality
- **react-resizable**: ^3.0.5 - Field resizing capabilities
- **react-dnd**: ^16.0.1 - Used for sidebar drag-to-create, NOT field movement
- **react-dnd-html5-backend**: ^16.0.1

## Architecture Overview

The old system used a **hybrid approach**:
- **react-dnd**: Only for dragging new fields from sidebar to PDF
- **react-draggable**: For moving existing fields within the PDF
- **react-resizable**: For resizing fields after placement

## Key Implementation Details

### 1. DraggableField.tsx - Main Field Component

#### Drag State Management
```typescript
const [isDragging, setIsDragging] = useState(false);
const [isHovered, setIsHovered] = useState(false);
```

#### Critical Draggable Configuration
```typescript
<Draggable
  nodeRef={nodeRef}
  position={{ x: field.position.x * scale, y: field.position.y * scale }}
  onStart={handleDragStart}
  onStop={handleDragStop}
  bounds={{
    left: 0,
    top: 0,
    right: (pageWidth - field.size.width) * scale,
    bottom: (pageHeight - field.size.height) * scale
  }}
  cancel=".no-drag, .react-resizable-handle"
  grid={isEnabled ? [gridSize * scale, gridSize * scale] : undefined}
>
```

**Key Points:**
- Position is scaled for zoom level: `field.position.x * scale`
- Bounds prevent dragging outside PDF boundaries
- Grid snapping applied directly to Draggable via `grid` prop
- `cancel` prevents dragging on controls and resize handles
- Uses `nodeRef` for React 18+ compatibility

#### Drag Event Handlers

**handleDragStart:**
```typescript
const handleDragStart = (_e: unknown, data: { x: number; y: number }) => {
  setIsDragging(true);
  // If grid is enabled and field isn't aligned, snap it immediately
  if (isEnabled) {
    const currentPos = { x: field.position.x, y: field.position.y };
    const snappedPos = snapPosition(currentPos);
    if (currentPos.x !== snappedPos.x || currentPos.y !== snappedPos.y) {
      // Update field position to snap to grid
      updateField(field.key, { position: snappedPos });
    }
  }
};
```

**handleDragStop:**
```typescript
const handleDragStop = (_e: unknown, data: { x: number; y: number }) => {
  setIsDragging(false);
  const position = {
    x: data.x / scale,  // Convert back from scaled coordinates
    y: data.y / scale,
  };
  const snappedPosition = snapPosition(position);
  updateField(field.key, {
    position: snappedPosition
  });
};
```

**Critical Implementation Detail:** The drag data coordinates are in scaled screen space, so they must be divided by scale to get back to PDF coordinate space.

#### Resizing Integration

```typescript
<ResizableBox
  width={field.size.width * scale}
  height={field.size.height * scale}
  onResize={handleResize}
  onResizeStop={handleResizeStop}
  // ... constraints ...
  resizeHandles={isSelected ? ['se', 'e', 's'] : []}
  lockAspectRatio={field.type === 'checkbox'}
  draggableOpts={{ grid: isEnabled ? [gridSize * scale, gridSize * scale] : undefined }}
>
```

**Key Points:**
- Resize handles only shown when field is selected
- Grid snapping applied to resize operations via `draggableOpts`
- Different constraints based on field type
- Checkbox fields maintain aspect ratio

### 2. useGridSnap.ts - Grid Snapping Logic

**Simple and Direct Implementation:**
```typescript
const snapX = useCallback((x: number) => {
  if (!enabled) return x;
  return Math.round(x / size) * size;
}, [enabled, size]);

const snapY = useCallback((y: number) => {
  if (!enabled) return y;
  return Math.round(y / size) * size;
}, [enabled, size]);

const snapPosition = useCallback((position: { x: number; y: number }) => {
  if (!enabled) return position;
  return {
    x: snapX(position.x),
    y: snapY(position.y),
  };
}, [enabled, snapX, snapY]);
```

**Key Difference from Current:** The old implementation was much simpler - no coordinate system conversion, just direct snapping. This worked because react-draggable handles coordinate systems internally.

### 3. FieldOverlay.tsx - Field Rendering Container

```typescript
export function FieldOverlay({
  fields,
  actions,
  booleanActions,
  selectedFieldKey,
  currentPage,
  scale,
  pageWidth,
  pageHeight
}: FieldOverlayProps) {
  const currentPageFields = fields.filter(field => field.page === currentPage);

  return (
    <div 
      className="absolute top-0 left-0"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {currentPageFields.map((field) => (
        <DraggableField
          key={field.key}
          field={field}
          scale={scale}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          isSelected={selectedFieldKey === field.key}
        />
      ))}
      // ... other field types
    </div>
  );
}
```

**Key Points:**
- Simple container with scaled dimensions
- Filters fields by current page
- Each field manages its own drag state independently

### 4. App.tsx - DndProvider Usage

```typescript
return (
  <DndProvider backend={HTML5Backend}>
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <FieldToolbox />
      <SidebarInset>
        // ... rest of app
      </SidebarInset>
    </SidebarProvider>
    // ... rest
  </DndProvider>
);
```

**Important:** DndProvider was only used for sidebar-to-PDF drag operations, NOT for moving existing fields.

## Critical Success Factors

### 1. Coordinate System Handling
- **Scaling**: All positions multiplied by scale for display, divided by scale for storage
- **Bounds**: Calculated considering field size to prevent overflow
- **Grid**: Applied at scaled level for visual consistency

### 2. Event Handling Pattern
- **Start**: Set dragging state, optionally snap to grid if misaligned
- **Stop**: Convert coordinates back to PDF space, apply snapping, update store

### 3. Grid Integration
- **Draggable**: Grid applied via `grid` prop
- **ResizableBox**: Grid applied via `draggableOpts.grid`
- **Snapping**: Simple round-to-nearest-grid-line algorithm

### 4. Performance Optimizations
- **nodeRef**: Prevents React warnings and improves performance
- **Cancel selectors**: Prevents dragging on interactive elements
- **Conditional rendering**: Grid only applied when enabled

## Key Differences from Current react-dnd Implementation

1. **No DndContext for field movement** - react-draggable handled everything
2. **Direct grid snapping** - No complex coordinate conversions
3. **Simpler state management** - Each field managed its own drag state
4. **Built-in bounds checking** - react-draggable handled PDF boundaries
5. **Automatic scale handling** - Position scaling was straightforward

## Migration Challenges

The current react-dnd implementation faces several challenges that the old system didn't have:

1. **Coordinate system complexity** - Manual PDF/screen coordinate conversion
2. **Grid snapping timing** - Must be handled in drop handlers vs built-in
3. **State management** - Central drag state vs per-field state
4. **Performance** - More complex event handling chain

## Recommendations for Recovery

1. **Consider hybrid approach** - Keep react-dnd for sidebar, use react-draggable for field movement
2. **If staying with react-dnd** - Simplify coordinate handling to match old grid snapping logic
3. **Grid snapping** - Apply at the visual level like the old implementation
4. **State management** - Consider per-field drag state instead of centralized

## Dependencies to Restore (if going back to react-draggable)

The old system had these key packages that would need to be restored:
- `react-draggable: ^4.5.0`
- `react-resizable: ^3.0.5`

And the corresponding type definitions:
- `@types/react-resizable: ^3.0.8`