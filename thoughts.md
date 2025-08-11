# Hybrid Rollback Recovery Plan - Option 2
## Date: 2025-08-11
## Objective: Keep unified fields system but restore react-draggable for drag-and-drop

---

## CURRENT STATE ANALYSIS

### What's Working
- ✅ Unified field system (UnifiedField type)
- ✅ Options field dialog and configuration
- ✅ Field configuration dialogs
- ✅ /dev page for import schema flow
- ✅ Field store with unified field methods

### What's Broken
- ❌ Drag and drop flickering
- ❌ Grid snap not working properly
- ❌ Field positioning issues
- ❌ Transform/opacity conflicts

### Root Cause
Migration from `react-draggable` to `@dnd-kit` library while simultaneously implementing unified fields.
The two libraries have fundamentally different approaches:
- **react-draggable**: Direct DOM manipulation, transform-based
- **@dnd-kit**: Virtual drag layer, requires DragOverlay

---

## RECOVERY STRATEGY

### Core Principle
Keep the NEW unified field system but restore the OLD drag-and-drop implementation.

### Files to KEEP (New Unified System)
```
✅ src/types/unifiedField.types.ts
✅ src/store/fieldStore.ts (unified field methods)
✅ src/components/FieldConfigDialog/
✅ src/components/OptionsFieldDialog/
✅ src/components/AppSidebar/UnifiedFieldsList.tsx
✅ src/components/AppSidebar/AddOptionsFieldButton.tsx
✅ src/components/PdfViewer/UnifiedFieldOverlay.tsx (modified)
✅ /dev page implementation
```

### Files to RESTORE (Old DnD System)
```
🔄 src/App.tsx (partial - restore react-draggable setup)
🔄 src/components/PdfViewer/DraggableField.tsx → DraggableUnifiedField.tsx
🔄 src/hooks/useGridSnap.ts (restore old implementation)
🔄 package.json (add back react-draggable)
```

### Files to REMOVE (@dnd-kit)
```
❌ src/utils/dndModifiers.ts
❌ src/components/PdfViewer/FieldDragPreview.tsx (replace with old DragPreview)
```

---

## IMPLEMENTATION PLAN

### Phase 1: Analysis & Backup
1. Document old react-draggable implementation details
2. Identify exact dependencies needed
3. Create backup of current unified field files

### Phase 2: Restore Dependencies
1. Add react-draggable and react-resizable back to package.json
2. Remove @dnd-kit dependencies
3. Run npm install

### Phase 3: Restore Core DnD Files
1. Get old DraggableField.tsx from previous commit
2. Adapt it to work with UnifiedField type instead of Field type
3. Restore the old grid snap implementation

### Phase 4: Integration
1. Update App.tsx to remove DndContext
2. Update PdfEditor.tsx to use the restored draggable system
3. Update UnifiedFieldOverlay.tsx to render DraggableUnifiedField

### Phase 5: Testing & Fixes
1. Test basic drag and drop
2. Test grid snapping
3. Test field creation from sidebar
4. Test option field placement
5. Fix any type errors or integration issues

---

## KEY DIFFERENCES TO HANDLE

### Old System (react-draggable)
- Direct position manipulation via transform
- Each field handles its own drag state
- Grid snap via position rounding
- No drag overlay needed

### New System (@dnd-kit)
- Centralized drag state
- DragOverlay for visual feedback
- Modifiers for grid snap
- Drop zones for positioning

### Adaptation Strategy
- Keep UnifiedField data model
- Use react-draggable's Draggable component
- Restore position-based updates (not transform)
- Keep the new field configuration dialogs

---

## CRITICAL FILES TO EXAMINE

### From Previous Commit (9dd43e1)
```bash
git show 9dd43e1:src/components/PdfViewer/DraggableField.tsx
git show 9dd43e1:src/hooks/useGridSnap.ts
git show 9dd43e1:package.json
git show 9dd43e1:src/App.tsx
```

---

## PROGRESS LOG

### Step 1: Documentation Created ✅
- Created this thoughts.md file
- Analyzed the problem thoroughly
- Developed recovery strategy

### Step 2: Analyzing Old Implementation ✅
- Used agent to analyze old react-draggable implementation
- Created detailed analysis in old-dnd-analysis.md
- Identified key differences between libraries

### Step 3: Hybrid Rollback Implementation ✅
- Backed up unified field system files
- Restored react-draggable for existing fields
- Kept react-dnd for sidebar drag-and-drop
- Created new DraggableUnifiedField using react-draggable
- Updated UnifiedFieldOverlay to use new draggable component
- Created PdfDropTarget for handling sidebar drops
- Restored grid snapping functionality

### Step 4: Testing & Verification ✅
- Dev server running successfully (port 5180)
- No TypeScript errors
- Hybrid system working:
  - react-dnd: Sidebar to PDF dragging
  - react-draggable: Field movement and resizing
  - Grid snapping functional
  - No flickering or transform issues

---

## FINAL STATUS - RECOVERY COMPLETE ✅

### What We Accomplished
1. **Preserved all new features**: Unified fields, options fields, dialogs, /dev page
2. **Fixed drag-and-drop issues**: No more flickering, grid snap works, smooth dragging
3. **Hybrid solution**: Best of both libraries
   - react-dnd for sidebar → PDF (simple, clean)  
   - react-draggable for field manipulation (proven, stable)
4. **Zero data loss**: All work preserved, nothing reverted

### Key Files Changed
- `DraggableUnifiedField.tsx`: Now uses react-draggable
- `UnifiedFieldOverlay.tsx`: Simplified, no drop zones
- `App.tsx`: DndProvider instead of DndContext
- `DraggableFieldItem.tsx`: Uses react-dnd
- `PdfDropTarget.tsx`: New component for sidebar drops
- `PdfEditor.tsx`: Integrated drop target

### Testing Checklist
- [x] Fields drag from sidebar to PDF
- [x] Fields move smoothly on PDF (fixed lag issue)
- [x] Grid snapping works (properly scaled)
- [x] Field resizing works (fixed handler signature)
- [x] No flickering or opacity issues
- [x] Options fields work correctly
- [x] Field dialogs open on double-click
- [x] TypeScript compilation passes

### Additional Fixes (Post-Recovery)
- Fixed resize handler signature: `data: { size: { width, height } }`
- Scaled grid properly: `[gridSize * scale, gridSize * scale]`
- Fixed bounds calculation: `(pageWidth - fieldWidth) * scale`
- Added `cancel=".react-resizable-handle"` to prevent drag conflicts
- Added `handleResize` for real-time visual feedback
- Fixed wrapper div structure with explicit dimensions

## NOTES FOR RESUMPTION
Recovery complete. System is now stable with hybrid drag-and-drop.
Current branch: `unified-fields-recovery`
Previous working commit (before issues): `9dd43e1`
Recovery commit: Current HEAD