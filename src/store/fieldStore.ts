import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Field, FieldType } from '../types/field.types';
// Legacy types - temporarily defined here
type LogicField = any;
type FieldOption = any;
type FieldAction = any;
type BooleanField = any;
type BooleanFieldAction = any;
import type { UnifiedField, FieldMigrationResult } from '../types/unifiedField.types';
import { TemplateEngine } from '../utils/templateEngine';
import { 
  saveFieldsToStorage, 
  saveGridSettings, 
  savePdfMetadata,
  loadFieldsFromStorage,
  loadGridSettings,
  loadPdfMetadata,
  clearStoredData
} from '../utils/localStorage';

export type GridSize = 10 | 25 | 50 | 100;

interface FieldState {
  // Feature flag for unified fields
  useUnifiedFields: boolean;
  
  // Unified fields (new system)
  unifiedFields: UnifiedField[];
  selectedUnifiedFieldId: string | null;
  
  // Regular fields (legacy)
  fields: Field[];
  selectedFieldKey: string | null;
  isDragging: boolean;
  
  // Logic fields (legacy)
  logicFields: LogicField[];
  
  // Boolean fields (legacy)
  booleanFields: BooleanField[];
  
  // PDF data
  pdfFile: File | null;
  pdfUrl: string | null;
  currentPage: number;
  totalPages: number;
  
  // Grid settings
  gridEnabled: boolean;
  gridSize: GridSize;
  showGrid: boolean;
  
  // Regular field operations
  addField: (field: Partial<Field>) => Field;
  updateField: (key: string, updates: Partial<Field>) => void;
  deleteField: (key: string) => void;
  selectField: (key: string | null) => void;
  deselectField: () => void;
  setFields: (fields: Field[]) => void;
  setDragging: (isDragging: boolean) => void;
  duplicateField: (key: string) => void;
  clearFields: () => void;
  
  // Logic field operations
  addLogicField: (field: LogicField) => LogicField;
  updateLogicField: (key: string, updates: Partial<LogicField>) => void;
  deleteLogicField: (key: string) => void;
  
  // Boolean field operations
  addBooleanField: (field: BooleanField) => BooleanField;
  updateBooleanField: (key: string, updates: Partial<BooleanField>) => void;
  deleteBooleanField: (key: string) => void;
  
  // Boolean action operations
  addBooleanAction: (fieldKey: string, isTrue: boolean, action: Omit<BooleanFieldAction, 'id'>) => void;
  updateBooleanAction: (fieldKey: string, isTrue: boolean, actionId: string, updates: Partial<BooleanFieldAction>) => void;
  deleteBooleanAction: (fieldKey: string, isTrue: boolean, actionId: string) => void;
  duplicateBooleanAction: (fieldKey: string, isTrue: boolean, actionId: string) => void;
  updateBooleanActionPosition: (fieldKey: string, isTrue: boolean, actionId: string, position: { x: number; y: number; page: number }) => void;
  
  // Option operations
  addOption: (fieldKey: string, option: FieldOption) => void;
  updateOption: (fieldKey: string, optionValue: string, updates: Partial<FieldOption>) => void;
  deleteOption: (fieldKey: string, optionValue: string) => void;
  
  // Action operations
  addAction: (fieldKey: string, optionValue: string, action: Omit<FieldAction, 'id'>) => void;
  updateAction: (fieldKey: string, optionValue: string, actionId: string, updates: Partial<FieldAction>) => void;
  deleteAction: (fieldKey: string, optionValue: string, actionId: string) => void;
  clearActionsForOption: (fieldKey: string, optionValue: string) => void;
  duplicateAction: (fieldKey: string, optionValue: string, actionId: string) => void;
  updateActionPosition: (fieldKey: string, optionValue: string, actionId: string, position: { x: number; y: number; page: number }) => void;
  
  // Query operations
  getLogicFieldByKey: (key: string) => LogicField | undefined;
  getAllActionsForPage: (pageNumber: number) => Array<{
    action: FieldAction;
    option: FieldOption;
    logicField: LogicField;
  }>;
  getAllBooleanActionsForPage: (pageNumber: number) => Array<{
    action: BooleanFieldAction;
    isTrue: boolean;
    booleanField: BooleanField;
  }>;
  validateAction: (action: FieldAction, targetFieldType?: string) => boolean;
  
  // Unified field operations
  setUseUnifiedFields: (use: boolean) => void;
  addUnifiedField: (field: Partial<UnifiedField>) => UnifiedField;
  updateUnifiedField: (id: string, updates: Partial<UnifiedField>) => void;
  deleteUnifiedField: (id: string) => void;
  setUnifiedFields: (fields: UnifiedField[]) => void;
  clearUnifiedFields: () => void;
  duplicateUnifiedField: (id: string) => void;
  getUnifiedFieldById: (id: string) => UnifiedField | undefined;
  getUnifiedFieldByKey: (key: string) => UnifiedField | undefined;
  getUnifiedFieldsForPage: (page: number) => UnifiedField[];
  selectUnifiedField: (id: string | null) => void;
  deselectUnifiedField: () => void;
  
  // Migration operations
  convertFieldToUnified: (field: Field) => UnifiedField;
  convertLogicFieldToUnified: (logicField: LogicField) => UnifiedField[];
  convertBooleanFieldToUnified: (booleanField: BooleanField) => UnifiedField[];
  migrateAllToUnified: () => FieldMigrationResult;
  
  // Composite field operations
  createCompositeField: (template: string, position: { x: number; y: number }, page: number) => UnifiedField;
  updateCompositeTemplate: (id: string, template: string) => void;
  validateCompositeTemplate: (template: string) => { isValid: boolean; dependencies: string[]; errors: string[] };
  getCompositeFieldDependencies: (id: string) => string[];
  getAvailableFieldKeys: () => string[];
  
  // Clear all
  clearAll: () => void;
  
  // Persistence operations
  loadFromStorage: () => void;
  clearStorage: () => void;
  
  // PDF operations
  setPdfFile: (file: File) => void;
  setPdfUrl: (url: string) => void;
  clearPdf: () => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  
  // Grid operations
  setGridEnabled: (enabled: boolean) => void;
  setGridSize: (size: GridSize) => void;
  setShowGrid: (show: boolean) => void;
  toggleGrid: () => void;
}

const generateFieldKey = (type: string, existingFields: Field[]): string => {
  // Extract numbers from existing keys for this type
  const sameTypeKeys = existingFields
    .filter(f => f.type === type)
    .map(f => {
      // Use \\d in template literal to get \d in regex
      const match = f.key.match(new RegExp(`^${type}_(\\d+)$`));
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0); // Only consider valid numbers
  
  // Find the next available number
  const maxNumber = sameTypeKeys.length > 0 ? Math.max(...sameTypeKeys) : 0;
  const nextNumber = maxNumber + 1;
  
  return `${type}_${nextNumber}`;
};

// Generate simple field IDs for unified fields
const generateUnifiedFieldKey = (type: string, existingFields: UnifiedField[]): string => {
  // Extract numbers from existing keys for this type
  const sameTypeKeys = existingFields
    .filter(f => f.type === type)
    .map(f => {
      // Use \\d in template literal to get \d in regex
      const match = f.key.match(new RegExp(`^${type}_(\\d+)$`));
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0); // Only consider valid numbers
  
  // Find the next available number
  const maxNumber = sameTypeKeys.length > 0 ? Math.max(...sameTypeKeys) : 0;
  const nextNumber = maxNumber + 1;
  
  return `${type}_${nextNumber}`;
};

// Get default field size based on type
const getDefaultFieldSize = (type: FieldType) => {
  switch (type) {
    case 'text': return { width: 120, height: 32 };
    case 'image': return { width: 100, height: 100 };
    case 'signature': return { width: 200, height: 60 };
    case 'checkbox': return { width: 20, height: 20 };
    default: return { width: 120, height: 32 };
  }
};


export const useFieldStore = create<FieldState>()(
  subscribeWithSelector((set, get) => ({
  // Feature flag
  useUnifiedFields: true, // Migration enabled!
  
  // Unified fields (new system)
  unifiedFields: [],
  selectedUnifiedFieldId: null,
  
  // Regular fields (legacy)
  fields: [],
  selectedFieldKey: null,
  isDragging: false,
  
  // Logic fields (legacy)
  logicFields: [],
  
  // Boolean fields (legacy)
  booleanFields: [],
  
  // PDF data
  pdfFile: null,
  pdfUrl: null,
  currentPage: 1,
  totalPages: 0,
  
  // Grid settings
  gridEnabled: false,
  gridSize: 10,
  showGrid: false,
  
  addField: (fieldData) => {
    const existingFields = get().fields;
    const fieldType = fieldData.type || 'text';
    const generatedKey = generateFieldKey(fieldType, existingFields);
    const key = fieldData.key || generatedKey;
    
    // Set default sample values based on field type
    const defaultSampleValue = (() => {
      switch(fieldType) {
        case 'text': return 'Your text here';
        case 'checkbox': return false;
        case 'image': return null;
        case 'signature': return null;
        default: return 'Your text here';
      }
    })();
    
    const newField: Field = {
      type: fieldType,
      name: generatedKey,
      page: 1,
      position: { x: 0, y: 0 },
      size: { width: 200, height: 30 },
      properties: {
        defaultValue: defaultSampleValue
      },
      sampleValue: fieldData.sampleValue ?? defaultSampleValue,
      ...fieldData,
      key: key,
    };
    set((state) => ({
      fields: [...state.fields, newField],
      selectedFieldKey: newField.key,
    }));
    return newField;
  },
  
  updateField: (key, updates) => {
    set((state) => ({
      fields: state.fields.map((field) =>
        field.key === key ? { ...field, ...updates } : field
      ),
    }));
  },
  
  deleteField: (key) => {
    set((state) => ({
      fields: state.fields.filter((field) => field.key !== key),
      selectedFieldKey: state.selectedFieldKey === key ? null : state.selectedFieldKey,
    }));
  },
  
  selectField: (key) => {
    set({ selectedFieldKey: key });
  },
  
  deselectField: () => {
    set({ selectedFieldKey: null });
  },
  
  setFields: (fields) => {
    set({ fields });
  },
  
  setDragging: (isDragging) => {
    set({ isDragging });
  },
  
  duplicateField: (key) => {
    const field = get().fields.find((f) => f.key === key);
    if (field) {
      const existingFields = get().fields;
      const newKey = generateFieldKey(field.type, existingFields);
      const newField: Field = {
        ...field,
        position: {
          x: field.position.x + 20,
          y: field.position.y + 20,
        },
        name: newKey,
        key: newKey,
        displayName: field.displayName ? `${field.displayName} (Copy)` : undefined,
      };
      set((state) => ({
        fields: [...state.fields, newField],
        selectedFieldKey: newField.key,
      }));
    }
  },
  
  clearFields: () => {
    set({ fields: [], selectedFieldKey: null });
  },

  // Logic field operations
  addLogicField: (field) => {
    set((state) => ({
      logicFields: [...state.logicFields, field]
    }));
    return field;
  },
  
  updateLogicField: (key, updates) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === key ? { ...f, ...updates } : f
    )
  })),
  
  deleteLogicField: (key) => set((state) => ({
    logicFields: state.logicFields.filter(f => f.key !== key)
  })),
  
  
  // Option operations
  addOption: (fieldKey, option) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? { ...f, options: [...f.options, option] }
        : f
    )
  })),
  
  updateOption: (fieldKey, optionValue, updates) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? {
            ...f, 
            options: f.options.map((o: any) => 
              o.key === optionValue ? { ...o, ...updates } : o
            )
          }
        : f
    )
  })),
  
  deleteOption: (fieldKey, optionValue) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? { ...f, options: f.options.filter((o: any) => o.key !== optionValue) }
        : f
    )
  })),
  
  // Action operations
  addAction: (fieldKey, optionValue, action) => {
    const newAction: FieldAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    set((state) => ({
      logicFields: state.logicFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              options: f.options.map((o: any) => 
                o.key === optionValue 
                  ? { ...o, actions: [...o.actions, newAction] }
                  : o
              )
            }
          : f
      )
    }));
  },
  
  updateAction: (fieldKey, optionValue, actionId, updates) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? {
            ...f,
            options: f.options.map((o: any) => 
              o.key === optionValue 
                ? {
                    ...o,
                    actions: o.actions.map((a: any) => 
                      a.id === actionId ? { ...a, ...updates } : a
                    )
                  }
                : o
            )
          }
        : f
    )
  })),
  
  deleteAction: (fieldKey, optionValue, actionId) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? {
            ...f,
            options: f.options.map((o: any) => 
              o.key === optionValue 
                ? { ...o, actions: o.actions.filter((a: any) => a.id !== actionId) }
                : o
            )
          }
        : f
    )
  })),
  
  clearActionsForOption: (fieldKey, optionValue) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? {
            ...f,
            options: f.options.map((o: any) => 
              o.key === optionValue 
                ? { ...o, actions: [] }
                : o
            )
          }
        : f
    )
  })),
  
  duplicateAction: (fieldKey, optionValue, actionId) => {
    const state = get();
    const field = state.logicFields.find(f => f.key === fieldKey);
    if (!field) return;
    
    const option = field.options.find((o: any) => o.key === optionValue);
    if (!option) return;
    
    const action = option.actions.find((a: any) => a.id === actionId);
    if (!action) return;
    
    const newAction: FieldAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        ...action.position,
        x: action.position.x + 10,
        y: action.position.y + 10
      }
    };
    
    set((state) => ({
      logicFields: state.logicFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              options: f.options.map((o: any) => 
                o.key === optionValue 
                  ? { ...o, actions: [...o.actions, newAction] }
                  : o
              )
            }
          : f
      )
    }));
  },
  
  updateActionPosition: (fieldKey, optionValue, actionId, position) => {
    set((state) => ({
      logicFields: state.logicFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              options: f.options.map((o: any) => 
                o.key === optionValue 
                  ? {
                      ...o,
                      actions: o.actions.map((a: any) => 
                        a.id === actionId 
                          ? { ...a, position }
                          : a
                      )
                    }
                  : o
              )
            }
          : f
      )
    }));
  },
  
  // Query operations
  getLogicFieldByKey: (key) => {
    return get().logicFields.find(f => f.key === key);
  },
  
  getAllActionsForPage: (pageNumber) => {
    const results: Array<{
      action: FieldAction;
      option: FieldOption;
      logicField: LogicField;
    }> = [];
    
    const state = get();
    state.logicFields.forEach(field => {
      field.options.forEach((option: any) => {
        option.actions.forEach((action: any) => {
          if (action.position.page === pageNumber) {
            results.push({
              action,
              option,
              logicField: field
            });
          }
        });
      });
    });
    
    return results;
  },
  
  getAllBooleanActionsForPage: (pageNumber) => {
    const results: Array<{
      action: BooleanFieldAction;
      isTrue: boolean;
      booleanField: BooleanField;
    }> = [];
    
    const state = get();
    state.booleanFields.forEach(field => {
      // Add TRUE actions
      field.trueActions.forEach((action: any) => {
        if (action.position.page === pageNumber) {
          results.push({
            action,
            isTrue: true,
            booleanField: field
          });
        }
      });
      // Add FALSE actions
      field.falseActions.forEach((action: any) => {
        if (action.position.page === pageNumber) {
          results.push({
            action,
            isTrue: false,
            booleanField: field
          });
        }
      });
    });
    
    return results;
  },
  
  validateAction: (action, targetFieldType) => {
    // Basic validation for action types
    if (action.type === 'checkmark') {
      return true; // Checkmarks can go anywhere
    }
    
    if (action.type === 'fillLabel' || action.type === 'fillCustom') {
      // These need a text field target
      return !targetFieldType || targetFieldType === 'text';
    }
    
    return true;
  },
  
  // Clear all
  clearAll: () => {
    set({ 
      fields: [], 
      selectedFieldKey: null,
      logicFields: [],
      booleanFields: [],
      pdfFile: null,
      pdfUrl: null
    });
  },
  
  // Boolean field operations implementation
  addBooleanField: (field: BooleanField) => {
    set((state) => ({
      booleanFields: [...state.booleanFields, field]
    }));
    return field;
  },

  updateBooleanField: (key: string, updates: Partial<BooleanField>) => {
    set((state) => ({
      booleanFields: state.booleanFields.map((field) =>
        field.key === key ? { ...field, ...updates } : field
      )
    }));
  },

  deleteBooleanField: (key: string) => {
    set((state) => ({
      booleanFields: state.booleanFields.filter((field) => field.key !== key)
    }));
  },
  
  // Boolean action operations
  addBooleanAction: (fieldKey, isTrue, action) => {
    const newAction: BooleanFieldAction = {
      ...action,
      id: `bool_act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    set((state) => ({
      booleanFields: state.booleanFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              [isTrue ? 'trueActions' : 'falseActions']: [
                ...f[isTrue ? 'trueActions' : 'falseActions'],
                newAction
              ]
            }
          : f
      )
    }));
  },
  
  updateBooleanAction: (fieldKey, isTrue, actionId, updates) => {
    set((state) => ({
      booleanFields: state.booleanFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              [isTrue ? 'trueActions' : 'falseActions']: f[isTrue ? 'trueActions' : 'falseActions'].map((a: any) => 
                a.id === actionId ? { ...a, ...updates } : a
              )
            }
          : f
      )
    }));
  },
  
  deleteBooleanAction: (fieldKey, isTrue, actionId) => {
    set((state) => ({
      booleanFields: state.booleanFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              [isTrue ? 'trueActions' : 'falseActions']: f[isTrue ? 'trueActions' : 'falseActions'].filter((a: any) => 
                a.id !== actionId
              )
            }
          : f
      )
    }));
  },
  
  duplicateBooleanAction: (fieldKey, isTrue, actionId) => {
    const state = get();
    const field = state.booleanFields.find(f => f.key === fieldKey);
    if (!field) return;
    
    const actions = isTrue ? field.trueActions : field.falseActions;
    const action = actions.find((a: any) => a.id === actionId);
    if (!action) return;
    
    const newAction: BooleanFieldAction = {
      ...action,
      id: `bool_act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        ...action.position,
        x: action.position.x + 10,
        y: action.position.y + 10
      }
    };
    
    set((state) => ({
      booleanFields: state.booleanFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              [isTrue ? 'trueActions' : 'falseActions']: [
                ...f[isTrue ? 'trueActions' : 'falseActions'],
                newAction
              ]
            }
          : f
      )
    }));
  },
  
  updateBooleanActionPosition: (fieldKey, isTrue, actionId, position) => {
    set((state) => ({
      booleanFields: state.booleanFields.map(f => 
        f.key === fieldKey 
          ? {
              ...f,
              [isTrue ? 'trueActions' : 'falseActions']: f[isTrue ? 'trueActions' : 'falseActions'].map((a: any) => 
                a.id === actionId ? { ...a, position } : a
              )
            }
          : f
      )
    }));
  },
  
  // Unified field operations
  setUseUnifiedFields: (use) => set({ useUnifiedFields: use }),
  
  addUnifiedField: (fieldData) => {
    const id = `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fieldType = fieldData.type || 'text';
    const existingFields = get().unifiedFields;
    
    // Generate unique key - generateUnifiedFieldKey already handles incrementing properly
    const generatedKey = generateUnifiedFieldKey(fieldType, existingFields);
    
    // Set default sample value based on field type
    const defaultSampleValue = (() => {
      if (fieldData.sampleValue !== undefined) return fieldData.sampleValue;
      switch(fieldType) {
        case 'text': return 'Your text here';
        case 'checkbox': return true;  // Default to checked
        case 'image': return null;
        case 'signature': return null;
        default: return 'Your text here';
      }
    })();
    
    // Set default properties based on field type
    const defaultProperties = {
      fontSize: fieldType === 'text' ? 12 : undefined,
      checkboxSize: fieldType === 'checkbox' ? 20 : undefined,
      fitMode: (fieldType === 'image' || fieldType === 'signature') ? 'fit' as const : undefined,
      textAlign: 'left' as const,
    };
    
    // Properly merge field data with defaults
    // First spread fieldData (excluding properties), then override with our defaults
    const { properties: userProperties, ...fieldDataWithoutProperties } = fieldData;
    
    // Use the generated key or provided key
    const finalKey = fieldData.key || generatedKey;
    
    // Check for duplicate keys
    const existingFieldWithKey = existingFields.find(f => f.key === finalKey);
    if (existingFieldWithKey) {
      console.warn(`Duplicate key detected: "${finalKey}". This will cause issues with field generation!`);
      // Force a unique key by appending timestamp
      const uniqueKey = `${finalKey}_${Date.now()}`;
      console.warn(`Using unique key instead: "${uniqueKey}"`);
    }
    
    const newField: UnifiedField = {
      // 1. First apply user data (except properties)
      ...fieldDataWithoutProperties,
      // 2. Then set required fields with proper defaults
      id,
      key: existingFieldWithKey ? `${finalKey}_${Date.now()}` : finalKey,
      type: fieldType,
      variant: fieldData.variant || 'single',
      page: fieldData.page || 1,
      position: fieldData.position || { x: 100, y: 100 },
      size: fieldData.size || (fieldType === 'logic' ? { width: 120, height: 32 } : getDefaultFieldSize(fieldType)),
      enabled: fieldData.enabled !== false, // Default true unless explicitly false
      structure: fieldData.structure || 'simple',
      placementCount: fieldData.placementCount || 1,
      positionVersion: fieldData.positionVersion || 'top-edge',
      sampleValue: defaultSampleValue,
      // 3. Deep merge properties - defaults first, then user overrides
      properties: {
        ...defaultProperties,
        ...userProperties
      }
    };
    
    set((state) => ({
      unifiedFields: [...state.unifiedFields, newField]
    }));
    return newField;
  },
  
  updateUnifiedField: (id, updates) => {
    set((state) => ({
      unifiedFields: state.unifiedFields.map(f => {
        if (f.id !== id) return f;
        
        // Handle properties updates specially - deep merge
        if (updates.properties) {
          const { properties: updateProperties, ...otherUpdates } = updates;
          return {
            ...f,
            ...otherUpdates,
            properties: {
              ...f.properties,
              ...updateProperties
            }
          };
        }
        
        // No properties update, simple merge
        return { ...f, ...updates };
      })
    }));
  },
  
  deleteUnifiedField: (id) => {
    set((state) => ({
      unifiedFields: state.unifiedFields.filter(f => f.id !== id),
      selectedUnifiedFieldId: state.selectedUnifiedFieldId === id ? null : state.selectedUnifiedFieldId
    }));
  },
  
  setUnifiedFields: (fields) => {
    // Migrate legacy fields to top-edge positioning
    const migratedFields = fields.map(field => {
      if (!field.positionVersion) {
        // Legacy field - convert from bottom-edge to top-edge
        const fieldHeight = field.size?.height || 30;
        return {
          ...field,
          position: {
            ...field.position,
            y: field.position.y + fieldHeight // Convert to top edge
          },
          positionVersion: 'top-edge' as const
        };
      }
      return field;
    });
    set({ unifiedFields: migratedFields });
  },
  
  clearUnifiedFields: () => set({ unifiedFields: [], selectedUnifiedFieldId: null }),
  
  duplicateUnifiedField: (id) => {
    const field = get().unifiedFields.find(f => f.id === id);
    if (field) {
      const existingFields = get().unifiedFields;
      // Generate a new key based on the field type
      const generatedKey = generateUnifiedFieldKey(field.type, existingFields);
      const newField: UnifiedField = {
        ...field,
        id: `unified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        key: generatedKey,
        position: {
          x: field.position.x + 20,
          y: field.position.y + 20
        },
        positionVersion: 'top-edge' // Ensure duplicated fields use top-edge
      };
      set((state) => ({
        unifiedFields: [...state.unifiedFields, newField]
      }));
    }
  },
  
  getUnifiedFieldById: (id) => get().unifiedFields.find(f => f.id === id),
  
  getUnifiedFieldByKey: (key) => get().unifiedFields.find(f => f.key === key),
  
  getUnifiedFieldsForPage: (page) => get().unifiedFields.filter(f => f.page === page),
  
  selectUnifiedField: (id) => {
    set({ selectedUnifiedFieldId: id });
  },
  
  deselectUnifiedField: () => {
    set({ selectedUnifiedFieldId: null });
  },
  
  // Migration operations
  convertFieldToUnified: (field) => {
    // Convert legacy bottom-edge Y to top-edge Y
    const fieldHeight = field.size?.height || 30;
    return {
      id: `unified_${field.key}`,
      key: field.key,
      type: field.type,
      variant: 'single',
      page: field.page,
      position: {
        x: field.position.x,
        y: field.position.y + fieldHeight // Convert to top edge
      },
      size: field.size,
      enabled: true,
      structure: 'simple',
      placementCount: 1,
      sampleValue: field.sampleValue,
      source: field.source,
      positionVersion: 'top-edge' as const
    };
  },
  
  convertLogicFieldToUnified: (logicField) => {
    // Convert each option to a unified field
    return logicField.options.map((option: any) => {
      const firstAction = option.actions[0];
      const actionHeight = firstAction?.size?.height || 30;
      const position = firstAction?.position || { x: 100, y: 100 };
      return {
        id: `unified_${logicField.key}_${option.key}`,
        key: `${logicField.key}_${option.key}`,
        type: 'text' as const,
        variant: 'single' as const,
        page: firstAction?.position.page || logicField.page || 1,
        position: {
          x: position.x,
          y: position.y + actionHeight // Convert to top edge
        },
        size: firstAction?.size,
        enabled: true,
        structure: 'simple' as const,
        placementCount: 1,
        sampleValue: option.label,
        positionVersion: 'top-edge' as const
      };
    });
  },
  
  convertBooleanFieldToUnified: (booleanField) => {
    const fields: UnifiedField[] = [];
    
    // Convert true actions
    if (booleanField.trueActions.length > 0) {
      const firstAction = booleanField.trueActions[0];
      const actionHeight = firstAction.size?.height || 30;
      fields.push({
        id: `unified_${booleanField.key}_true`,
        key: `${booleanField.key}_true`,
        type: firstAction.type === 'checkmark' ? 'checkbox' : 'text',
        variant: 'single',
        page: firstAction.position.page,
        position: {
          x: firstAction.position.x,
          y: firstAction.position.y + actionHeight // Convert to top edge
        },
        size: firstAction.size,
        enabled: true,
        structure: 'simple',
        placementCount: 1,
        sampleValue: firstAction.type === 'checkmark' ? true : firstAction.customText,
        positionVersion: 'top-edge' as const
      });
    }
    
    // Convert false actions
    if (booleanField.falseActions.length > 0) {
      const firstAction = booleanField.falseActions[0];
      const actionHeight = firstAction.size?.height || 30;
      fields.push({
        id: `unified_${booleanField.key}_false`,
        key: `${booleanField.key}_false`,
        type: firstAction.type === 'checkmark' ? 'checkbox' : 'text',
        variant: 'single',
        page: firstAction.position.page,
        position: {
          x: firstAction.position.x,
          y: firstAction.position.y + actionHeight // Convert to top edge
        },
        size: firstAction.size,
        enabled: true,
        structure: 'simple',
        placementCount: 1,
        sampleValue: firstAction.type === 'checkmark' ? false : firstAction.customText,
        positionVersion: 'top-edge' as const
      });
    }
    
    return fields;
  },
  
  migrateAllToUnified: () => {
    const state = get();
    const unifiedFields: UnifiedField[] = [];
    const warnings: string[] = [];
    
    // Convert regular fields
    state.fields.forEach(field => {
      unifiedFields.push(get().convertFieldToUnified(field));
    });
    
    // Convert logic fields
    state.logicFields.forEach(logicField => {
      const converted = get().convertLogicFieldToUnified(logicField);
      unifiedFields.push(...converted);
      if (logicField.options.some((o: any) => o.actions.length > 1)) {
        warnings.push(`Logic field "${logicField.key}" had multiple actions per option. Only first action was migrated.`);
      }
    });
    
    // Convert boolean fields
    state.booleanFields.forEach(booleanField => {
      const converted = get().convertBooleanFieldToUnified(booleanField);
      unifiedFields.push(...converted);
      if (booleanField.trueActions.length > 1 || booleanField.falseActions.length > 1) {
        warnings.push(`Boolean field "${booleanField.key}" had multiple actions. Only first action was migrated.`);
      }
    });
    
    set({ unifiedFields, useUnifiedFields: true });
    
    return { fields: unifiedFields, warnings };
  },
  
  // Composite field operations
  createCompositeField: (template, position, page) => {
    const state = get();
    const dependencies = TemplateEngine.extractDependencies(template);
    
    const newField: Partial<UnifiedField> = {
      type: 'composite-text',
      variant: 'single',
      template,
      dependencies,
      position,
      page,
      size: { width: 200, height: 32 },
      enabled: true,
      structure: 'simple',
      placementCount: 1,
      compositeFormatting: {
        emptyValueBehavior: 'skip',
        separatorHandling: 'smart',
        whitespaceHandling: 'normalize'
      }
    };
    
    return state.addUnifiedField(newField);
  },
  
  updateCompositeTemplate: (id, template) => {
    const dependencies = TemplateEngine.extractDependencies(template);
    get().updateUnifiedField(id, { template, dependencies });
  },
  
  validateCompositeTemplate: (template) => {
    const state = get();
    const availableKeys = state.getAvailableFieldKeys();
    const validation = TemplateEngine.validate(template, availableKeys);
    
    return {
      isValid: validation.isValid,
      dependencies: validation.dependencies,
      errors: validation.errors.map(e => e.message)
    };
  },
  
  getCompositeFieldDependencies: (id) => {
    const field = get().getUnifiedFieldById(id);
    return field?.dependencies || [];
  },
  
  getAvailableFieldKeys: () => {
    const state = get();
    const keys = new Set<string>();
    
    // Add unified field keys
    state.unifiedFields.forEach(field => {
      if (field.type !== 'composite-text') {
        keys.add(field.key);
        
        // If the key contains dots (nested structure), also add parent paths
        // e.g., for "personal_data.firstName", add "personal_data.firstName"
        // This helps with template completion
        if (field.key.includes('.')) {
          const parts = field.key.split('.');
          let path = '';
          for (const part of parts) {
            path = path ? `${path}.${part}` : part;
            keys.add(path);
          }
        }
      }
    });
    
    // Add option mappings as nested keys
    state.unifiedFields.forEach(field => {
      if (field.variant === 'options' && field.optionMappings) {
        field.optionMappings.forEach(option => {
          keys.add(`${field.key}.${option.key}`);
        });
      }
    });
    
    return Array.from(keys).sort();
  },
  
  // PDF operations
  setPdfFile: (file) => set({ pdfFile: file }),
  setPdfUrl: (url) => set({ pdfUrl: url }),
  clearPdf: () => set({ pdfFile: null, pdfUrl: null, totalPages: 0 }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (pages) => set({ totalPages: pages }),
  
  // Grid operations
  setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
  setGridSize: (size) => set({ gridSize: size }),
  setShowGrid: (show) => set({ showGrid: show }),
  toggleGrid: () => set((state) => ({ 
    gridEnabled: !state.gridEnabled, 
    showGrid: !state.gridEnabled 
  })),
  
  // Persistence operations
  loadFromStorage: () => {
    const fields = loadFieldsFromStorage();
    const gridSettings = loadGridSettings();
    const pdfMetadata = loadPdfMetadata();
    
    if (fields && fields.length > 0) {
      set({ unifiedFields: fields });
    }
    
    if (gridSettings) {
      set({
        gridEnabled: gridSettings.gridEnabled,
        gridSize: gridSettings.gridSize as GridSize,
        showGrid: gridSettings.showGrid,
      });
    }
    
    if (pdfMetadata) {
      set({ totalPages: pdfMetadata.totalPages });
    }
  },
  
  clearStorage: () => {
    clearStoredData();
    set({
      unifiedFields: [],
      selectedUnifiedFieldId: null,
      fields: [],
      selectedFieldKey: null,
      logicFields: [],
      booleanFields: [],
    });
  },
})));

// Auto-save subscriptions
// Save unified fields whenever they change
useFieldStore.subscribe(
  (state) => state.unifiedFields,
  (fields) => {
    saveFieldsToStorage(fields);
  }
);

// Save grid settings whenever they change
useFieldStore.subscribe(
  (state) => ({
    gridEnabled: state.gridEnabled,
    gridSize: state.gridSize,
    showGrid: state.showGrid,
  }),
  (settings) => {
    saveGridSettings(settings);
  }
);

// Save PDF metadata when it changes
useFieldStore.subscribe(
  (state) => ({
    fileName: state.pdfFile?.name,
    fileSize: state.pdfFile?.size,
    totalPages: state.totalPages,
    lastModified: state.pdfFile?.lastModified,
  }),
  (metadata) => {
    if (metadata.totalPages > 0) {
      savePdfMetadata({
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        totalPages: metadata.totalPages,
        lastModified: metadata.lastModified,
      });
    }
  }
);