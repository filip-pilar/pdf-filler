import { create } from 'zustand';
import type { Field } from '../types/field.types';
import type { LogicField, FieldOption, FieldAction } from '../types/logicField.types';
import type { BooleanField, BooleanFieldAction } from '../types/booleanField.types';

export type GridSize = 5 | 10 | 25;

interface FieldState {
  // Regular fields
  fields: Field[];
  selectedFieldKey: string | null;
  isDragging: boolean;
  
  // Logic fields
  logicFields: LogicField[];
  
  // Boolean fields
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
  
  // Clear all
  clearAll: () => void;
  
  // PDF operations
  setPdfFile: (file: File) => void;
  setPdfUrl: (url: string) => void;
  clearPdf: () => void;
  setCurrentPage: (page: number) => void;
  
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
      const match = f.key.match(new RegExp(`^${type}_key_([0-9]+)$`));
      return match ? parseInt(match[1]) : 0;
    });
  
  // Find the next available number
  const maxNumber = sameTypeKeys.length > 0 ? Math.max(...sameTypeKeys) : 0;
  const nextNumber = maxNumber + 1;
  
  return `${type}_key_${nextNumber}`;
};


export const useFieldStore = create<FieldState>((set, get) => ({
  // Regular fields
  fields: [],
  selectedFieldKey: null,
  isDragging: false,
  
  // Logic fields
  logicFields: [],
  
  // Boolean fields
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
            options: f.options.map(o => 
              o.key === optionValue ? { ...o, ...updates } : o
            )
          }
        : f
    )
  })),
  
  deleteOption: (fieldKey, optionValue) => set((state) => ({
    logicFields: state.logicFields.map(f => 
      f.key === fieldKey 
        ? { ...f, options: f.options.filter(o => o.key !== optionValue) }
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
              options: f.options.map(o => 
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
            options: f.options.map(o => 
              o.key === optionValue 
                ? {
                    ...o,
                    actions: o.actions.map(a => 
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
            options: f.options.map(o => 
              o.key === optionValue 
                ? { ...o, actions: o.actions.filter(a => a.id !== actionId) }
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
            options: f.options.map(o => 
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
    
    const option = field.options.find(o => o.key === optionValue);
    if (!option) return;
    
    const action = option.actions.find(a => a.id === actionId);
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
              options: f.options.map(o => 
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
              options: f.options.map(o => 
                o.key === optionValue 
                  ? {
                      ...o,
                      actions: o.actions.map(a => 
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
      field.options.forEach(option => {
        option.actions.forEach(action => {
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
      field.trueActions.forEach(action => {
        if (action.position.page === pageNumber) {
          results.push({
            action,
            isTrue: true,
            booleanField: field
          });
        }
      });
      // Add FALSE actions
      field.falseActions.forEach(action => {
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
              [isTrue ? 'trueActions' : 'falseActions']: f[isTrue ? 'trueActions' : 'falseActions'].map(a => 
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
              [isTrue ? 'trueActions' : 'falseActions']: f[isTrue ? 'trueActions' : 'falseActions'].filter(a => 
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
    const action = actions.find(a => a.id === actionId);
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
              [isTrue ? 'trueActions' : 'falseActions']: f[isTrue ? 'trueActions' : 'falseActions'].map(a => 
                a.id === actionId ? { ...a, position } : a
              )
            }
          : f
      )
    }));
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
}));