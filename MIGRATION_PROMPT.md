# Migration Execution Prompt for AI Agent

## CRITICAL MISSION
You are tasked with migrating the PDF Filler application from a complex three-field-type system to a unified, simplified field model. This migration is described in detail in `migration.md`. The success of this migration is critical - the app must remain functional throughout, and the new system must be simpler while retaining all necessary functionality.

## CONTEXT
- **Current State**: App has 3 separate field types (Field, LogicField, BooleanField) with redundant labels and overcomplicated action systems
- **Target State**: Single UnifiedField type with smart variants, no labels, simplified positioning
- **Reference Implementation**: The `/dev` page has a working `FieldMappingTable` component that represents the target architecture

---

## MANDATORY DOs

### DO: Preserve Functionality
- ✅ DO ensure every existing feature still works after migration
- ✅ DO maintain backward compatibility during migration (parallel systems)
- ✅ DO test each phase before moving to the next
- ✅ DO keep the app runnable at every commit
- ✅ DO preserve all user data and field positions

### DO: Follow the Pattern
- ✅ DO study `/dev/FieldMappingTable.tsx` as the reference implementation
- ✅ DO use the exact field structure from the FieldMappingTable
- ✅ DO implement auto-flattening for objects (like in FieldMappingTable)
- ✅ DO use smart field type detection from sample values
- ✅ DO maintain the variant system: 'single' | 'text-multi' | 'checkbox-multi' | 'text-list'

### DO: Code Quality
- ✅ DO write TypeScript types FIRST before implementation
- ✅ DO create small, focused commits with clear messages
- ✅ DO add JSDoc comments for new interfaces and complex functions
- ✅ DO use consistent naming (key, not label)
- ✅ DO remove dead code as you go

### DO: Migration Safety
- ✅ DO create a feature flag: `useUnifiedFields` in the store
- ✅ DO implement new system alongside old (not replacing immediately)
- ✅ DO create migration functions to convert old fields to new
- ✅ DO test with complex nested data structures
- ✅ DO verify PDF export still works correctly

---

## CRITICAL DON'Ts

### DON'T: Break Things
- ❌ DON'T delete old code until new code is fully tested
- ❌ DON'T make changes that break the app at any point
- ❌ DON'T skip testing after each phase
- ❌ DON'T merge partially working code
- ❌ DON'T modify both systems simultaneously

### DON'T: Add Complexity
- ❌ DON'T add labels back into the data model
- ❌ DON'T create multiple actions per field/option
- ❌ DON'T add new field types during migration
- ❌ DON'T over-engineer the solution
- ❌ DON'T add features not in the migration plan

### DON'T: Ignore Patterns
- ❌ DON'T deviate from the FieldMappingTable structure
- ❌ DON'T use different naming conventions
- ❌ DON'T skip the auto-flattening of objects
- ❌ DON'T ignore TypeScript errors
- ❌ DON'T create new abstraction layers

---

## PHASE-BY-PHASE EXECUTION

### Phase 1: Type Definitions [START HERE]
```typescript
// 1. Create new file: src/types/unifiedField.types.ts
// 2. Copy the exact field structure from FieldMappingTable
// 3. Add the UnifiedField interface
// 4. Do NOT delete old types yet
```
**Validation**: New types compile without errors

### Phase 2: Update Store [CRITICAL]
```typescript
// 1. Add to fieldStore.ts:
//    - unifiedFields: UnifiedField[]
//    - useUnifiedFields: boolean (feature flag)
//    - addUnifiedField, updateUnifiedField, etc.
// 2. Add migration functions:
//    - convertFieldToUnified()
//    - convertLogicFieldToUnified()
//    - convertBooleanFieldToUnified()
```
**Validation**: Store methods work with mock data

### Phase 3: Integrate FieldMappingTable [EASIEST WIN]
```typescript
// 1. Copy FieldMappingTable from /dev to /components/ImportModal/
// 2. Update ImportModal to use FieldMappingTable
// 3. Remove old FieldMappingDialog
// 4. Wire up to create UnifiedFields when useUnifiedFields=true
```
**Validation**: Can import from SQL/JSON and create unified fields

### Phase 4: Update PdfViewer [MOST COMPLEX]
```typescript
// 1. Create UnifiedFieldOverlay component
// 2. Add switch in PdfViewer:
//    if (useUnifiedFields) return <UnifiedFieldOverlay />
//    else return <FieldOverlay />
// 3. Create DraggableUnifiedField component
// 4. Handle all variants properly
```
**Validation**: Fields display correctly on PDF

### Phase 5: Update Exporters [SYSTEMATIC]
```typescript
// For each exporter:
// 1. Add unified field support
// 2. Keep old field support
// 3. Switch based on useUnifiedFields flag
// 4. Test with sample data
```
**Validation**: Exports generate valid, working code

### Phase 6: Cleanup [ONLY AFTER FULL VALIDATION]
```typescript
// 1. Set useUnifiedFields=true by default
// 2. Run full test suite
// 3. Remove old field types (one by one)
// 4. Remove old components
// 5. Remove feature flag
```
**Validation**: App works without old system

---

## TESTING CHECKLIST

### After Each Phase
- [ ] App starts without errors
- [ ] Can create new fields
- [ ] Can import from SQL/JSON/TypeScript
- [ ] Can export to all formats
- [ ] PDF rendering works
- [ ] Field dragging works
- [ ] No TypeScript errors
- [ ] No console errors

### Integration Tests
- [ ] Import complex nested JSON with objects and arrays
- [ ] Import SQL with 20+ fields
- [ ] Create fields on multiple pages
- [ ] Export and verify the code runs
- [ ] Test with actual PDF file

---

## ERROR HANDLING

### If Something Breaks
1. **STOP immediately** - don't try to fix forward
2. **Git stash or reset** to last working state
3. **Identify** what went wrong
4. **Fix** in isolation
5. **Test** thoroughly before continuing

### Common Pitfalls to Avoid
- Forgetting to handle page numbers
- Not converting coordinates properly (PDF vs screen)
- Breaking drag-and-drop functionality
- Losing field positions during migration
- Not handling empty/null values

---

## CODE PATTERNS TO FOLLOW

### From FieldMappingTable (COPY THESE PATTERNS)
```typescript
// Auto-flattening objects
if (field.structure === 'object' && field.nestedKeys) {
  field.nestedKeys.forEach(nestedKey => {
    // Create separate field for each nested key
  });
}

// Smart type detection
if (fieldName.includes('image') || fieldName.includes('photo')) {
  return { type: 'image', variant: 'single' };
}

// Variant handling
if (mapping.fieldVariant === 'text-multi') {
  // Multiple placements
} else if (mapping.fieldVariant === 'text-list') {
  // Single placement, combined values
}
```

### Naming Conventions (STRICT)
- `key` not `name` or `id` for data keys
- `variant` not `subType` or `mode`
- `placementCount` not `positions` or `locations`
- `enabled` not `active` or `included`

---

## COMMIT MESSAGE FORMAT
```
feat(migration): [Phase X] <specific change>

- What was changed
- Why it was changed
- What still works
```

Example:
```
feat(migration): [Phase 1] Add UnifiedField type definitions

- Created new unifiedField.types.ts with single field model
- Added variants for array handling
- Old types remain untouched for backward compatibility
```

---

## PROGRESS TRACKING

### Use TodoWrite Tool
Create todos for each phase and mark them as you progress:
```typescript
[
  { id: "1", content: "Phase 1: Create UnifiedField types", status: "in_progress" },
  { id: "2", content: "Phase 2: Update field store", status: "pending" },
  // ... etc
]
```

### Report Status
After each phase, report:
1. What was completed
2. What's working
3. Any issues encountered
4. Next phase plan

---

## FINAL VALIDATION

Before declaring migration complete:
1. Delete `node_modules` and reinstall
2. Clear browser cache
3. Test full user journey:
   - Start fresh
   - Upload PDF
   - Import fields from JSON
   - Drag fields around
   - Export to JavaScript
   - Verify exported code works
4. Check bundle size didn't increase significantly
5. Verify no console errors or warnings

---

## SUCCESS CRITERIA

The migration is successful when:
- ✅ All old features work with new system
- ✅ Code is 30%+ smaller
- ✅ Import/export is simpler and more predictable
- ✅ No more labels in data model
- ✅ Single field type handles all cases
- ✅ Objects auto-flatten correctly
- ✅ Arrays have proper variants
- ✅ All TypeScript types are correct
- ✅ No runtime errors
- ✅ Performance is same or better

---

## EMERGENCY ROLLBACK

If things go badly wrong:
```bash
git stash
git checkout main
git checkout -b migration-attempt-2
# Start over with lessons learned
```

---

## REMEMBER

You are migrating a working application to a better architecture. The app must NEVER be broken, even temporarily. Take it slow, test everything, and follow the patterns from the FieldMappingTable component religiously. The goal is SIMPLIFICATION, not adding features.

**Your mantra**: "Make it simpler, keep it working, test everything."

Good luck! You've got this! 🚀