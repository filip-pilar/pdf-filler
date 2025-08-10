# PDF Filler Migration Plan
## Simplifying Field System for Data Import Compatibility

### Executive Summary
The current app has an overcomplicated field system with three separate field types (regular, logic, boolean), redundant label/key pairs, and multiple actions per option. We need to migrate to a unified, simplified system that aligns with the clean data import approach developed on the `/dev` page.

---

## Current Issues

### 1. Three Separate Field Systems
- **Regular Fields** (`Field[]`): Text, checkbox, image, signature
- **Logic Fields** (`LogicField[]`): Dropdowns with options and actions
- **Boolean Fields** (`BooleanField[]`): True/false fields with separate action sets

**Problem**: This creates unnecessary complexity and separate code paths for similar functionality.

### 2. Redundant Label/Key Pairs
- Fields have both `key` (e.g., "user_name") and `label` (e.g., "User Name")
- Options have both `key` (e.g., "male") and `label` (e.g., "Male")

**Problem**: Labels are display concerns that shouldn't be in the data model. Keys should be the single source of truth.

### 3. Multiple Actions Per Option
- Each option can have unlimited actions (fillLabel, fillCustom, checkmark)
- Each action has its own position, size, and properties

**Problem**: Overengineered for the actual use case of placing values at PDF coordinates.

### 4. Complex Import Flow
- Current `FieldMappingDialog` doesn't handle arrays or objects properly
- No auto-flattening of nested structures
- Poor detection of field types from sample data

---

## Target Architecture

### Unified Field Model
```typescript
interface UnifiedField {
  id: string;           // Unique identifier for React
  key: string;          // Data key (e.g., "user_name")
  type: 'text' | 'checkbox' | 'image' | 'signature';
  variant: 'single' | 'text-multi' | 'checkbox-multi' | 'text-list';
  page: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  
  // For arrays/options
  options?: string[];   // Simple array of values
  placementCount: number;
  
  // Metadata
  enabled: boolean;
  structure: 'simple' | 'array' | 'object';
  sampleValue?: any;
}
```

### Key Principles
1. **Single field type** - Everything is a UnifiedField
2. **Keys only** - No labels in the data model
3. **Single placement** - One position per field/option
4. **Auto-flattening** - Objects automatically become multiple fields
5. **Smart detection** - Infer field types from sample data

---

## Migration Tasks

### Phase 1: Update Type Definitions
- [ ] Create new `UnifiedField` type
- [ ] Deprecate `LogicField` and `BooleanField` types
- [ ] Update `FieldAction` to be simpler (just position, no multiple types)

### Phase 2: Simplify Field Store
- [ ] Merge three field arrays into single `fields: UnifiedField[]`
- [ ] Remove all label-related operations
- [ ] Simplify action operations to single placement
- [ ] Remove option management complexity
- [ ] Update all getters/setters for unified model

### Phase 3: Update Import Flow
- [ ] Replace `FieldMappingDialog` with new `FieldMappingTable`
- [ ] Implement auto-flattening for objects
- [ ] Add smart field type detection
- [ ] Support array variants (text-list, text-multi, checkbox-multi)

### Phase 4: Update PdfViewer Components
- [ ] Update `FieldOverlay` to work with unified fields
- [ ] Merge `DraggableActionField` and `DraggableBooleanAction` into single component
- [ ] Simplify field rendering logic
- [ ] Remove label display code

### Phase 5: Update Exporters
- [ ] Update JavaScript exporter for unified fields
- [ ] Update JSON exporter for simplified structure
- [ ] Update Next.js API exporter
- [ ] Update PDF exporter to handle variants properly

### Phase 6: Update UI Components
- [ ] Simplify Toolbar field creation
- [ ] Update Properties panel for unified fields
- [ ] Remove label input fields throughout
- [ ] Update field selection UI

---

## Migration Strategy

### Step 1: Parallel Implementation (Safe)
1. Keep existing system intact
2. Add new unified system alongside
3. Add feature flag to toggle between systems
4. Test thoroughly with both systems

### Step 2: Gradual Migration
1. Start with import flow (lowest risk)
2. Migrate field creation next
3. Update exporters one by one
4. Finally migrate existing field editing

### Step 3: Cleanup
1. Remove old field types
2. Remove deprecated store methods
3. Clean up unused components
4. Update documentation

---

## Data Migration

### Converting Existing Fields
```javascript
// Regular field -> Unified field
{
  id: field.id,
  key: field.key,
  type: field.type,
  variant: 'single',
  page: field.page,
  position: field.position,
  size: field.size,
  placementCount: 1,
  enabled: true,
  structure: 'simple'
}

// Logic field -> Unified fields (one per option)
logicField.options.map(option => ({
  id: `${logicField.key}_${option.key}`,
  key: `${logicField.key}_${option.key}`,
  type: 'text',
  variant: 'single',
  page: option.actions[0]?.position.page || 1,
  position: option.actions[0]?.position || { x: 100, y: 100 },
  placementCount: 1,
  enabled: true,
  structure: 'simple',
  sampleValue: option.key
}))

// Boolean field -> Two unified fields
[
  {
    id: `${booleanField.key}_true`,
    key: `${booleanField.key}_true`,
    type: 'checkbox',
    variant: 'single',
    page: booleanField.trueActions[0]?.position.page || 1,
    position: booleanField.trueActions[0]?.position || { x: 100, y: 100 },
    placementCount: 1,
    enabled: true,
    structure: 'simple'
  },
  {
    id: `${booleanField.key}_false`,
    key: `${booleanField.key}_false`,
    type: 'checkbox',
    variant: 'single',
    page: booleanField.falseActions[0]?.position.page || 1,
    position: booleanField.falseActions[0]?.position || { x: 100, y: 200 },
    placementCount: 1,
    enabled: true,
    structure: 'simple'
  }
]
```

---

## Breaking Changes

### For End Users
- Existing projects with logic/boolean fields will need migration
- Export format will change (simpler, but incompatible)
- Field labels will be auto-generated from keys

### For Developers
- All field-related APIs will change
- Store methods will be different
- Component props will be updated

---

## Benefits After Migration

1. **Simpler Mental Model**: One field type to rule them all
2. **Better Import Experience**: Auto-detection and smart mapping
3. **Cleaner Exports**: Less nested, more predictable structure
4. **Easier Maintenance**: Less code, fewer edge cases
5. **Better Performance**: Single array to iterate vs three
6. **Future-Proof**: Easier to add new field types/variants

---

## Timeline Estimate

- **Phase 1-2**: 2-3 hours (Type definitions and store)
- **Phase 3**: 2-3 hours (Import flow integration)
- **Phase 4**: 3-4 hours (PdfViewer updates)
- **Phase 5**: 2-3 hours (Exporter updates)
- **Phase 6**: 2-3 hours (UI component updates)
- **Testing**: 2-3 hours
- **Total**: ~15-20 hours

---

## Risk Mitigation

1. **Create comprehensive tests** before starting migration
2. **Keep old system** until new one is fully validated
3. **Provide migration tool** for existing projects
4. **Document all breaking changes** clearly
5. **Version the export format** for backwards compatibility

---

## Success Metrics

- [ ] All field types work with single unified model
- [ ] Import from SQL/JSON/TypeScript works seamlessly
- [ ] Export generates clean, working code
- [ ] No loss of functionality from current system
- [ ] Codebase reduced by at least 30%
- [ ] User feedback positive on simplified approach

---

## Next Steps

1. Review and approve this migration plan
2. Create feature branch for migration work
3. Start with Phase 1 (type definitions)
4. Implement parallel system with feature flag
5. Test thoroughly before switching over
6. Document migration guide for users