# Conditional Fields - Option 3 Implementation Plan

## Overview
Add support for rendering conditional fields as checkboxes (not just text) using a field-level `renderAs` property.

## Core Concept
A conditional field has ONE `renderAs` type that determines how ALL branches render their values.

## 1. Data Structure Updates

```typescript
interface UnifiedField {
  // ... existing properties ...
  
  // For conditional fields only
  conditionalRenderAs?: 'text' | 'checkbox';  // Default: 'text'
  conditionalBranches?: SimplifiedConditionalBranch[];
  conditionalDefaultValue?: string;
}

// Branch stays the same - just renderValue
interface SimplifiedConditionalBranch {
  id: string;
  condition: SimplifiedConditionalCondition;
  renderValue: string;  // Interpretation depends on renderAs
}
```

## 2. Value Interpretation Rules

**When `renderAs: 'text'`** (default):
- `renderValue` is displayed as-is
- Empty string = show nothing

**When `renderAs: 'checkbox'`**:
- `renderValue: "true"` or `"checked"` or `"yes"` or `"1"` = show ✓
- Any other value (including empty) = show nothing
- Size automatically adjusts to checkbox dimensions

## 3. UI Dialog Updates

```
Field Configuration:
- Field Key: [___________]
- Render As: [Dropdown: Text | Checkbox]  <-- NEW
- Position: [X] [Y] [Pick Position]
- Font Size: [___] (hidden when checkbox selected)

Conditions:
IF [field] [operator] [value]
THEN SHOW [input based on renderAs]:
  - If Text: "Text to display"
  - If Checkbox: [Dropdown: Checked | Unchecked]

Default: [Same as above based on renderAs]
```

## 4. Rendering Logic

```javascript
// In PDF exporter
function evaluateConditionalField(field, data) {
  // Get the text value as before
  const value = /* evaluate branches */;
  
  if (field.conditionalRenderAs === 'checkbox') {
    // Convert to boolean for checkbox rendering
    return ['true', 'checked', 'yes', '1'].includes(value.toLowerCase());
  }
  
  return value; // Text as-is
}

// In render function
if (field.type === 'conditional') {
  const value = evaluateConditionalField(field, fieldValues);
  
  if (field.conditionalRenderAs === 'checkbox') {
    if (value === true) {
      // Render checkmark at field position
      const checkSize = field.properties?.checkboxSize || 20;
      page.drawText('✓', {
        x: field.position.x,
        y: position.y,
        size: checkSize,
        font: font,
        color: getColor(field.properties?.textColor)
      });
    }
    // If false, render nothing
  } else {
    // Render as text (existing logic)
    if (value) {
      page.drawText(String(value), /* existing params */);
    }
  }
}
```

## 5. Implementation Steps

### Step 1: Update Types (~5 min)
- [ ] Add `conditionalRenderAs?: 'text' | 'checkbox'` to UnifiedField in `/src/types/unifiedField.types.ts`

### Step 2: Update Dialog (~20 min)
File: `/src/components/ConditionalFieldDialog/ConditionalFieldDialog.tsx`
- [ ] Add state for `renderAs` (default: 'text')
- [ ] Add "Render As" dropdown below Field Key
- [ ] Change "THEN SHOW" input based on renderAs selection:
  - Text: free text input (existing)
  - Checkbox: dropdown with "Checked" / "Unchecked" options
- [ ] Hide/show font size based on renderAs
- [ ] Adjust default size: text = 200x30, checkbox = 20x20
- [ ] Update handleSave to include `conditionalRenderAs`

### Step 3: Update Evaluation Logic (~15 min)
File: `/src/exporters/unifiedPdfExporter.ts`
- [ ] Modify `evaluateConditionalField` to handle checkbox mode:
  ```javascript
  function evaluateConditionalField(field, fieldValues) {
    // ... existing branch evaluation ...
    
    if (field.conditionalRenderAs === 'checkbox') {
      const textValue = /* result from branches */;
      return ['true', 'checked', 'yes', '1'].includes(textValue?.toLowerCase());
    }
    
    return /* existing text return */;
  }
  ```

### Step 4: Update PDF Rendering (~15 min)
File: `/src/exporters/unifiedPdfExporter.ts`
- [ ] In main render loop, handle conditional checkbox rendering:
  ```javascript
  if (field.type === 'conditional') {
    const value = evaluateConditionalField(field, fieldValues);
    
    if (field.conditionalRenderAs === 'checkbox') {
      if (value === true) {
        // Render checkmark
      }
    } else {
      // Existing text rendering
    }
  }
  ```

### Step 5: Update JavaScript Exporter (~10 min)
File: `/src/exporters/unifiedJavaScriptExporter.ts`
- [ ] Add same checkbox logic to evaluateConditionalField
- [ ] Add checkbox rendering in main loop

### Step 6: Update Next.js Exporter (~10 min)
File: `/src/exporters/unifiedNextJsExporter.ts`
- [ ] Add same checkbox logic to evaluateConditionalField
- [ ] Add checkbox rendering in main loop

### Step 7: Update Preview (~10 min)
File: `/src/components/PdfViewer/DraggableUnifiedField.tsx`
- [ ] Update `getDisplayValue()` to show checkbox preview:
  ```javascript
  if (field.type === 'conditional') {
    if (field.conditionalRenderAs === 'checkbox') {
      return '[✓/✗]';
    }
    // ... existing conditional preview
  }
  ```
- [ ] Update `getDefaultSize()` to return checkbox size when appropriate

### Step 8: Update Sidebar Handlers (~5 min)
File: `/src/components/AppSidebar/ClickToOpenFields.tsx`
- [ ] Ensure `conditionalRenderAs` is preserved in handleConditionalFieldSave

File: `/src/components/AppSidebar/FieldToolbox.tsx`
- [ ] Ensure `conditionalRenderAs` is preserved in handleConditionalSave

## 6. Testing Checklist

- [ ] Create conditional field with renderAs: text (default)
- [ ] Create conditional field with renderAs: checkbox
- [ ] Test checkbox with "checked" value → shows ✓
- [ ] Test checkbox with "unchecked" value → shows nothing
- [ ] Test checkbox with other values → shows nothing
- [ ] Switch between text and checkbox modes in dialog
- [ ] Export PDF with both types
- [ ] Export JavaScript with both types
- [ ] Edit existing conditional field, change renderAs

## 7. Example Test Cases

### Boolean Field as Checkbox:
```javascript
{
  key: 'insurance_check',
  conditionalRenderAs: 'checkbox',
  position: { x: 450, y: 200 },
  conditionalBranches: [
    { 
      condition: { field: "has_insurance", operator: "equals", value: true },
      renderValue: "checked"
    },
    { 
      condition: { field: "has_insurance", operator: "equals", value: false },
      renderValue: "unchecked"
    }
  ]
}
```

### Status with Checkbox:
```javascript
{
  key: 'approval_indicator',
  conditionalRenderAs: 'checkbox',
  position: { x: 300, y: 150 },
  conditionalBranches: [
    { 
      condition: { field: "status", operator: "equals", value: "approved" },
      renderValue: "checked"
    }
  ],
  conditionalDefaultValue: "unchecked"
}
```

## Total Estimate: ~1 hour 15 minutes

## Notes for Implementation
- Keep the UI simple - just one dropdown for renderAs
- Checkbox size should use field.properties.checkboxSize or default to 20
- Empty/null values in checkbox mode should render nothing (not an empty box)
- The position picker should work the same for both modes
- Consider adding visual indicator in field preview to show if it's checkbox mode