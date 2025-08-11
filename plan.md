# Field Resizing and Controls Implementation Plan

## Overview
Port the proven DraggableField resizing and control system to our current UnifiedField architecture. The old system had working resize handles, floating controls, content-specific UI, and type-aware sizing that we need to integrate.

## Current State Analysis

### ✅ What Works Now
- Basic field placement and positioning
- Zoom-independent coordinate system (just fixed)
- Field double-click for config dialog
- Drag-and-drop functionality
- Grid snapping system

### ❌ What's Missing/Broken
- No visible resize handles (even when selected)
- No floating control bar
- No content-specific controls (font size, fit modes)
- No type-specific sizing logic
- All fields default to 200x30 regardless of type
- Images/signatures get squished to text field dimensions

## Implementation Phases

## PHASE 1: Restore Basic Resizing System ⭐ HIGH PRIORITY

### 1.1 Fix ResizableBox Visibility
- **Current Issue**: `resizeHandles={isSelected ? ['se', 'e', 's'] : []}` shows empty array when not selected
- **Target**: Show resize handles when field is selected
- **Files**: `src/components/PdfViewer/DraggableUnifiedField.tsx`
- **Test**: Click field → should see corner/edge resize handles

### 1.2 Port Resize Event Handlers
- **From**: Old `handleResize` and `handleResizeStop` functions in DraggableField.tsx
- **To**: Current DraggableUnifiedField.tsx (already exists but may need fixes)
- **Features**:
  - Live resize preview during drag
  - Store update on resize stop
  - Grid snapping integration
- **Test**: Drag resize handle → field should change size in real-time

### 1.3 Implement Type-Specific Size Constraints
- **Text**: min: 50x20, max: 400x200
- **Image**: min: 50x50, max: 600x600 
- **Signature**: min: 100x40, max: 400x150
- **Checkbox**: min: 20x20, max: 50x50, locked aspect ratio
- **Test**: Try to resize beyond limits → should be constrained

### 1.4 Add Type-Specific Default Sizes
- **Update**: `addUnifiedField` in `fieldStore.ts`
- **Sizes**:
  ```typescript
  const getDefaultFieldSize = (type: FieldType) => {
    switch (type) {
      case 'text': return { width: 120, height: 32 };
      case 'image': return { width: 100, height: 100 };
      case 'signature': return { width: 200, height: 60 };
      case 'checkbox': return { width: 20, height: 20 };
      default: return { width: 120, height: 32 };
    }
  };
  ```
- **Test**: Create new fields → each type should have appropriate size

## PHASE 2: Floating Control Bar System ⭐ HIGH PRIORITY

### 2.1 Port Hover State Management
- **Add**: `isHovered` state to DraggableUnifiedField
- **Events**: `onMouseEnter`, `onMouseLeave`
- **Test**: Hover field → state should change

### 2.2 Create Floating Control Bar
- **Position**: Above field (`-top-7 left-0`)
- **Visibility**: `opacity-100` when `isHovered || isDragging || isSelected`
- **Components**:
  - Drag handle with field key
  - Settings button
  - Placeholder for content-specific controls
- **Test**: Hover field → control bar should appear above

### 2.3 Style Control Bar
- **Design**: Blue background with backdrop blur
- **Handle**: Show Move icon + field key
- **States**: Different colors for selected/dragging
- **Test**: Control bar should look professional and match old design

### 2.4 Wire Settings Button
- **Action**: Open field config dialog (already exists)
- **Click**: Should not trigger field selection
- **Classes**: `no-drag` to prevent drag conflicts
- **Test**: Click settings → dialog opens, field doesn't move

## PHASE 3: Content-Specific Controls ⭐ MEDIUM PRIORITY

### 3.1 Text Field Font Size Controls
- **UI**: +/- buttons, size display, slider
- **Range**: 8px - 48px
- **Storage**: `field.properties.fontSize`
- **Effect**: Should change text display size
- **Test**: Adjust font size → text in field should change size

### 3.2 Image/Signature Fit Mode Controls
- **UI**: Toggle group with "Fit" / "Fill" options
- **Storage**: `field.properties.fitMode`
- **Effect**: Changes image display behavior
- **Test**: Toggle fit mode → image display should change

### 3.3 Checkbox Size Controls
- **UI**: +/- buttons, size display, slider
- **Range**: 20px - 50px
- **Storage**: `field.properties.checkboxSize`
- **Effect**: Changes both field size AND checkmark size
- **Test**: Adjust size → checkbox and checkmark should scale together

### 3.4 Control Visibility Logic
- **Show When**: `(isHovered || isSelected)`
- **Type-Specific**: Only show relevant controls per field type
- **Animation**: Smooth opacity transitions
- **Test**: Controls should only appear for appropriate field types

## PHASE 4: Enhanced Content Rendering ⭐ MEDIUM PRIORITY

### 4.1 Port Advanced Content Rendering
- **Function**: `renderFieldContent()` from old DraggableField
- **Features**:
  - Type-specific display logic
  - Font size integration for text
  - Fit mode integration for images/signatures
  - Proper checkbox checkmark scaling
- **Test**: Each field type should render content correctly

### 4.2 Image Fit Mode Implementation
- **Fit Mode**: `object-fit: contain` with max dimensions
- **Fill Mode**: `object-fit: fill` with exact dimensions
- **Placeholder**: Show icon + text when no image
- **Test**: Upload image → try both fit modes → should behave differently

### 4.3 Signature Rendering
- **Same as images** but with signature-specific placeholder
- **Icon**: PenTool icon
- **Text**: "Your signature here"
- **Test**: Should show placeholder until signature drawn

### 4.4 Checkbox Enhancement
- **Checkmark**: Scale with checkbox size
- **Formula**: `fontSize: ${checkboxSize * 0.7}px`
- **Centering**: Proper alignment within field bounds
- **Test**: Resize checkbox → checkmark should scale proportionally

## PHASE 5: Integration Testing & Polish ⭐ LOW PRIORITY

### 5.1 Cross-Feature Testing
- **Zoom**: Resize should work at all zoom levels
- **Grid**: Resize should respect grid snapping
- **Selection**: Controls should show/hide correctly
- **Dragging**: Resize handles shouldn't interfere with drag
- **Test**: All combinations should work smoothly

### 5.2 Performance Optimization
- **Resize Preview**: Should be smooth during drag
- **Control Animations**: Should not cause lag
- **Memory**: No memory leaks from event listeners
- **Test**: Performance should feel snappy

### 5.3 UI/UX Polish
- **Visual States**: Clear feedback for all interactions
- **Cursor**: Appropriate cursors for resize/drag
- **Animations**: Smooth transitions
- **Test**: Should feel professional and polished

## Implementation Checklist

### Before Starting
- [ ] Create backup branch
- [ ] Verify current zoom fix still works
- [ ] Document any edge cases discovered

### Phase 1 - Basic Resizing
- [ ] Fix ResizableBox handle visibility when selected
- [ ] Test resize handles appear on field selection
- [ ] Verify resize preview works during drag
- [ ] Implement type-specific size constraints
- [ ] Add type-specific default sizes to fieldStore
- [ ] Test all field types get appropriate default sizes
- [ ] Test resize constraints work for each type

### Phase 2 - Floating Controls
- [ ] Add hover state management
- [ ] Create floating control bar component
- [ ] Position control bar correctly above fields
- [ ] Add drag handle with field key display
- [ ] Add settings button
- [ ] Wire settings button to field config dialog
- [ ] Test control bar visibility logic
- [ ] Test settings button doesn't interfere with drag

### Phase 3 - Content Controls
- [ ] Implement text field font size controls
- [ ] Add font size storage to field properties
- [ ] Implement image/signature fit mode controls
- [ ] Add fit mode storage to field properties
- [ ] Implement checkbox size controls
- [ ] Test all content-specific controls work
- [ ] Test controls only show for appropriate field types

### Phase 4 - Content Rendering
- [ ] Port renderFieldContent function
- [ ] Implement image fit mode rendering
- [ ] Implement signature rendering with placeholders
- [ ] Implement checkbox scaling with checkmark
- [ ] Test all content types render correctly
- [ ] Test font size affects text display
- [ ] Test fit modes affect image display
- [ ] Test checkbox size affects checkmark

### Phase 5 - Polish
- [ ] Test all features work together
- [ ] Test performance at different zoom levels
- [ ] Test with grid snapping enabled/disabled
- [ ] Fix any visual glitches
- [ ] Ensure smooth animations
- [ ] Test keyboard accessibility
- [ ] Test with different field types simultaneously

## Files to Modify

### Primary Files
- `src/components/PdfViewer/DraggableUnifiedField.tsx` - Main implementation
- `src/store/fieldStore.ts` - Default sizes and properties storage
- `src/types/unifiedField.types.ts` - Type definitions for new properties

### Supporting Files
- `src/components/ui/*` - May need additional UI components
- `package.json` - Ensure react-resizable is installed

### Reference Files
- `src/components/PdfViewer/DraggableField.tsx` (from main branch) - Source of working implementation

## Risk Mitigation

### High Risk Areas
- **Coordinate System**: Don't break the zoom-independent positioning we just fixed
- **Drag Performance**: ResizableBox must not interfere with Draggable
- **State Management**: Multiple state updates during resize could cause issues

### Testing Strategy
- Test each phase thoroughly before moving to next
- Test at multiple zoom levels after each change
- Test field creation, editing, and deletion workflows
- Test with different field types simultaneously

### Rollback Plan
- Keep working backup branch
- Implement features in small, reversible commits
- Document any breaking changes
- Have plan to revert to current working state

## Success Criteria

### Phase 1 Success
- All field types have appropriate default sizes
- Resize handles visible when field selected
- Can resize fields with mouse drag
- Size constraints prevent invalid dimensions

### Phase 2 Success
- Control bar appears on field hover
- Settings button opens field config
- Control bar doesn't interfere with field interaction
- Visual design matches old implementation quality

### Phase 3 Success
- Text fields have working font size controls
- Images/signatures have fit mode toggles
- Checkboxes have size controls
- All controls only show for appropriate field types

### Phase 4 Success
- Font size visually affects text display
- Image fit modes change display behavior
- Checkbox size affects checkmark size
- All field types render content appropriately

### Final Success
- Field system is as functional as the original DraggableField
- No regressions in existing functionality
- Performance is smooth and responsive
- UI feels professional and polished

## Notes
- This plan ports proven, working functionality rather than inventing new approaches
- Each phase builds on the previous, allowing for incremental progress
- Focus on getting basic resizing working first, then add polish features
- Maintain backwards compatibility with existing fields in store