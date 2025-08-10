# Field Mapping Table V2 - Comprehensive Implementation Plan

## Overview
This document outlines the implementation plan for enhancing the Field Mapping Table V2 with critical missing features, improved UX, and comprehensive edge case handling.

## Phase 1: Critical Core Features (Week 1)

### 1.1 Object Flattening Options
**Priority: CRITICAL**
**Estimated Time: 4 hours**

#### Problem
Objects currently only become logic fields, but users often need separate fields for each property.

#### Implementation
```typescript
// Add to FieldVariant type
type FieldVariant = ... | 'flatten-fields' | 'json-string';

// When detecting objects, offer choices:
if (structure === 'object') {
  return {
    variants: [
      { type: 'logic', label: 'Dropdown with keys as options' },
      { type: 'flatten-fields', label: 'Separate fields for each property' },
      { type: 'json-string', label: 'Store as JSON text' }
    ]
  };
}
```

#### UI Changes
```
address: {street, city, zip} detected

How to import?
○ Logic Field (3 options)
○ Flatten to Fields → Will create:
   • address_street (text)
   • address_city (text)  
   • address_zip (text)
○ JSON String → Single text field with JSON
```

#### Edge Cases
- Deep nesting: Limit to 2 levels or show warning
- Circular references: Detect and prevent
- Empty objects: Skip or create container

### 1.2 Checkbox Value Mapping
**Priority: CRITICAL**
**Estimated Time: 3 hours**

#### Problem
Boolean arrays like `['yes', 'no']` need custom true/false values when converted to checkbox.

#### Implementation
```typescript
interface CheckboxMapping {
  checkedValue: string;
  uncheckedValue: string;
  defaultChecked: boolean;
}

// When fieldVariant === 'single' && type === 'checkbox' && itemCount === 2
// Show configuration UI
```

#### UI Design
```
agreement: ['yes', 'no'] → Checkbox

Configure checkbox values:
When checked:   [yes     ] (from options)
When unchecked: [no      ] (from options)
Default state:  ○ Checked ● Unchecked
```

### 1.3 Multi-Select Checkbox Pattern
**Priority: CRITICAL**
**Estimated Time: 3 hours**

#### Problem
Arrays like `['read', 'write', 'delete']` should allow multiple selections, not just one.

#### Implementation
```typescript
// New detection logic
if (looksLikePermissions(field)) {
  // Suggest checkbox-set instead of radio-group
  return {
    type: 'checkbox',
    fieldVariant: 'checkbox-set', // New variant
    multiSelect: true
  };
}

// Detection patterns
const permissionPatterns = [
  'permissions', 'roles', 'features', 'capabilities',
  'access', 'privileges', 'scopes'
];
```

#### UI Behavior
```
permissions: ['read', 'write', 'delete', 'admin']

Suggested: Checkbox Set (multi-select)
☑ Read ☑ Write ☐ Delete ☐ Admin

Alternative: Radio Group (single-select)
```

### 1.4 Type Conversion Warnings
**Priority: HIGH**
**Estimated Time: 2 hours**

#### Implementation
```typescript
const getConversionWarning = (from: FieldVariant, to: FieldVariant): string | null => {
  if (from === 'dropdown' && to === 'text') {
    return `Converting dropdown to text will only use first option`;
  }
  if (from === 'multiple-fields' && to === 'single') {
    return `Converting ${count} fields to 1 will lose ${count-1} fields`;
  }
  // ... more cases
};
```

#### UI Dialog
```
⚠️ Type Change Warning

Changing from Dropdown (12 options) to Text Field

This will:
• Only keep the first option "Sales"
• Lose 11 other options

[Cancel] [Proceed Anyway]
```

## Phase 2: Field Enhancement Features (Week 1-2)

### 2.1 Smart Label Generation
**Priority: HIGH**
**Estimated Time: 2 hours**

#### Implementation
```typescript
const generateLabel = (key: string): string => {
  return key
    .replace(/_/g, ' ')           // snake_case
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase
    .replace(/\b[a-z]/g, l => l.toUpperCase())  // Title Case
    .replace(/\b(Url|Api|Id|Db)\b/gi, match => match.toUpperCase()); // Acronyms
};

// Examples:
// first_name → First Name
// lastName → Last Name  
// api_key → API Key
// profileURL → Profile URL
```

### 2.2 Default Values Configuration
**Priority: HIGH**
**Estimated Time: 3 hours**

#### Implementation
```typescript
interface FieldMapping {
  // ... existing
  defaultValue?: any;
  sqlDefault?: string; // From SQL DEFAULT clause
  required?: boolean;  // From NOT NULL
}
```

#### UI Section (in expanded row)
```
Default Configuration:
☑ Required field (NOT NULL)
Default value: [_________]
☐ Pre-checked (for checkboxes)
Initial selection: [First option ▼] (for dropdowns)
```

### 2.3 Duplicate Field Name Prevention
**Priority: MEDIUM**
**Estimated Time: 2 hours**

#### Implementation
```typescript
const ensureUniqueFieldNames = (mappings: FieldMapping[]): FieldMapping[] => {
  const nameCount = new Map<string, number>();
  
  return mappings.map(field => {
    let finalName = field.key;
    
    if (nameCount.has(finalName)) {
      const count = nameCount.get(finalName)! + 1;
      nameCount.set(finalName, count);
      finalName = `${finalName}_${count}`;
    } else {
      nameCount.set(finalName, 1);
    }
    
    return { ...field, key: finalName };
  });
};
```

### 2.4 Required Field Indicators
**Priority: MEDIUM**
**Estimated Time: 1 hour**

#### UI Changes
```
Field Name              Type        Required
─────────────────────────────────────────────
email *                 Text        ✓
phone                   Text        
password *              Text        ✓

* Required fields
```

## Phase 3: Visual & UX Improvements (Week 2)

### 3.1 Visual Field Preview
**Priority: MEDIUM**
**Estimated Time: 4 hours**

#### Implementation
Create preview components for each field type:

```typescript
const FieldPreview: React.FC<{mapping: FieldMapping}> = ({ mapping }) => {
  switch(mapping.fieldVariant) {
    case 'dropdown':
      return (
        <div className="border rounded p-2">
          <select className="w-full">
            {mapping.options?.map(opt => 
              <option key={opt.value}>{opt.label}</option>
            )}
          </select>
        </div>
      );
    case 'radio-group':
      return (
        <div className={`flex ${mapping.layoutDirection}`}>
          {mapping.options?.map(opt => (
            <label key={opt.value}>
              <input type="radio" name={mapping.key} />
              {opt.label}
            </label>
          ))}
        </div>
      );
    // ... more cases
  }
};
```

#### UI Integration
Add preview column or expandable preview section:
```
[Show Preview] → Opens popover with visual representation
```

### 3.2 Grid Configuration
**Priority: MEDIUM**
**Estimated Time: 2 hours**

#### Implementation
```typescript
interface GridConfig {
  columns: 2 | 3 | 4;
  gap: number;
}

// When layoutDirection === 'grid'
// Show additional config
```

#### UI Design
```
Layout: [Grid ▼]
Grid columns: [2 ▼] [3] [4]
Gap: [10px]
```

### 3.3 Search & Filter
**Priority: HIGH**
**Estimated Time: 3 hours**

#### Implementation
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [filterType, setFilterType] = useState<'all' | 'configured' | 'unconfigured'>('all');

const filteredMappings = mappings.filter(m => {
  const matchesSearch = m.key.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesFilter = 
    filterType === 'all' ||
    (filterType === 'configured' && m.type !== detectFieldType(m)) ||
    (filterType === 'unconfigured' && m.type === detectFieldType(m));
  
  return matchesSearch && matchesFilter;
});
```

#### UI Header
```
[🔍 Search fields...] [All ▼] [Configured] [Needs Review]
                      
Showing 15 of 127 fields
```

### 3.4 Undo/Reset System
**Priority: MEDIUM**
**Estimated Time: 3 hours**

#### Implementation
```typescript
const [history, setHistory] = useState<FieldMapping[][]>([]);
const [historyIndex, setHistoryIndex] = useState(0);

const pushHistory = (newState: FieldMapping[]) => {
  setHistory([...history.slice(0, historyIndex + 1), newState]);
  setHistoryIndex(historyIndex + 1);
};

const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(historyIndex - 1);
    setMappings(history[historyIndex - 1]);
  }
};

const reset = () => {
  setMappings(initialMappings);
  pushHistory(initialMappings);
};
```

#### UI Controls
```
[↶ Undo] [↷ Redo] [Reset to Defaults]
```

## Phase 4: Advanced Features (Week 3)

### 4.1 Field Dependencies
**Priority: LOW**
**Estimated Time: 6 hours**

#### Implementation
```typescript
interface FieldDependency {
  showWhen: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}

// Example:
// spouse_name.showWhen = { field: 'has_spouse', operator: 'equals', value: true }
```

#### UI Configuration
```
Conditional Visibility:
☑ Only show when another field has specific value
Field: [has_spouse ▼]
Condition: [equals ▼]
Value: [true]
```

### 4.2 Section Grouping
**Priority: LOW**
**Estimated Time: 4 hours**

#### Implementation
```typescript
interface FieldSection {
  id: string;
  title: string;
  fields: string[]; // field keys
  collapsed: boolean;
}

// Auto-detect sections by prefix
const detectSections = (fields: FieldMapping[]): FieldSection[] => {
  // Group by common prefixes: user_, address_, settings_
};
```

#### UI Grouping
```
▼ User Information (5 fields)
  ☑ user_name
  ☑ user_email
  ☑ user_phone
  
▼ Address (3 fields)
  ☑ address_street
  ☑ address_city
  ☑ address_zip
```

### 4.3 Template System
**Priority: LOW**
**Estimated Time: 4 hours**

#### Implementation
```typescript
interface MappingTemplate {
  name: string;
  description: string;
  patterns: Array<{
    match: RegExp | string;
    type: FieldType;
    variant: FieldVariant;
  }>;
}

// Predefined templates
const templates = {
  'contact-form': {
    patterns: [
      { match: /email/i, type: 'text', variant: 'single' },
      { match: /phone/i, type: 'text', variant: 'single' },
      { match: /name/i, type: 'text', variant: 'single' },
    ]
  }
};
```

#### UI Template Selector
```
Apply Template: [None ▼] [Contact Form] [User Profile] [Survey]
                         [Save Current as Template]
```

## Phase 5: Edge Cases & Validation (Week 3-4)

### 5.1 Special Character Handling
```typescript
const sanitizeFieldName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace special chars
    .replace(/^[0-9]/, '_$&')         // Prefix number with _
    .replace(/__+/g, '_');            // Collapse multiple _
};
```

### 5.2 Long Value Truncation
```typescript
const truncateLabel = (label: string, maxLength = 50): string => {
  if (label.length <= maxLength) return label;
  return label.substring(0, maxLength - 3) + '...';
};
```

### 5.3 Performance Optimization
```typescript
// Virtual scrolling for 100+ fields
import { FixedSizeList } from 'react-window';

// Debounced search
const debouncedSearch = useMemo(
  () => debounce(setSearchTerm, 300),
  []
);
```

## Implementation Order

### Week 1: Critical Features
1. Object flattening (Day 1-2)
2. Checkbox value mapping (Day 2-3)
3. Multi-select pattern (Day 3-4)
4. Type conversion warnings (Day 4-5)
5. Testing & bug fixes (Day 5)

### Week 2: Enhancement & UX
1. Smart label generation (Day 1)
2. Default values (Day 1-2)
3. Search & filter (Day 2-3)
4. Visual preview (Day 3-4)
5. Undo/reset (Day 4-5)

### Week 3: Advanced & Polish
1. Grid configuration (Day 1)
2. Required fields (Day 1)
3. Section grouping (Day 2-3)
4. Field dependencies (Day 3-4)
5. Template system (Day 4-5)

### Week 4: Edge Cases & QA
1. Special character handling
2. Performance optimization
3. Long value handling
4. Comprehensive testing
5. Documentation

## Success Metrics
- ✅ All object structures can be flattened
- ✅ Boolean arrays properly map to checkboxes
- ✅ Multi-select patterns recognized
- ✅ No data loss without warning
- ✅ 100+ fields performant
- ✅ All edge cases handled gracefully
- ✅ Intuitive UX with visual feedback

## Technical Debt to Address
1. Extract detection logic to separate utilities
2. Create comprehensive test suite
3. Add TypeScript strict mode
4. Document all patterns and behaviors
5. Create Storybook stories for components

## Files to Modify
```
src/
├── components/Dev/
│   ├── FieldMappingTableV2.tsx (main component)
│   ├── FieldPreview.tsx (new - preview components)
│   ├── FieldDetection.ts (new - detection utilities)
│   ├── FieldConverters.ts (new - conversion logic)
│   └── FieldMappingTypes.ts (new - shared types)
├── types/
│   └── field.types.ts (update with new variants)
└── pages/
    └── DevPage.tsx (remove V1, enhance test data)
```

## Next Steps
1. Review plan with team
2. Create feature branches for each phase
3. Set up testing infrastructure
4. Begin Phase 1 implementation
5. Weekly progress reviews