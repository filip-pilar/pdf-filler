import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UnifiedField } from '../types/unifiedField.types';
import { TemplateEngine } from '../utils/templateEngine';
import { 
  saveFieldsToStorage, 
  saveGridSettings, 
  savePdfMetadata,
  loadFieldsFromStorage,
  loadGridSettings,
  clearStoredData,
  saveQueuedFields,
  loadQueuedFields,
  saveRightSidebarState,
  loadRightSidebarState
} from '../utils/localStorage';

export type GridSize = 10 | 25 | 50 | 100;

interface FieldState {
  // Unified fields
  unifiedFields: UnifiedField[];
  selectedUnifiedFieldId: string | null;
  
  // PDF data
  pdfFile: File | null;
  pdfUrl: string | null;
  currentPage: number;
  totalPages: number;
  
  // Grid settings
  gridEnabled: boolean;
  gridSize: GridSize;
  showGrid: boolean;
  
  // Import queue
  queuedFields: UnifiedField[];
  isRightSidebarOpen: boolean;
  
  // Queue operations
  addToQueue: (fields: UnifiedField[]) => void;
  removeFromQueue: (fieldId: string) => void;
  clearQueue: () => void;
  moveFromQueueToCanvas: (fieldId: string, position: { x: number; y: number }) => void;
  setRightSidebarOpen: (open: boolean) => void;
  
  // Unified field operations
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
  
  // Lock operations
  toggleUnifiedFieldLock: (id: string) => void;
  lockUnifiedField: (id: string) => void;
  unlockUnifiedField: (id: string) => void;
  
  // Composite field operations
  createCompositeField: (template: string, position: { x: number; y: number } | undefined, page: number) => UnifiedField;
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

// Generate simple field IDs for unified fields
const generateUnifiedFieldKey = (type: string, existingFields: UnifiedField[]): string => {
  // Extract numbers from existing keys for this type
  const sameTypeKeys = existingFields
    .filter(f => f.type === type)
    .map(f => {
      const match = f.key.match(new RegExp(`^${type}_(\\d+)$`));
      return match ? parseInt(match[1]) : 0;
    })
    .filter(num => num > 0);
  
  // Find the next available number
  const maxNumber = sameTypeKeys.length > 0 ? Math.max(...sameTypeKeys) : 0;
  const nextNumber = maxNumber + 1;
  
  return `${type}_${nextNumber}`;
};

// Get default size for field type
const getDefaultFieldSize = (type: string): { width: number; height: number } => {
  switch(type) {
    case 'image': return { width: 150, height: 150 };
    case 'signature': return { width: 200, height: 80 };
    case 'checkbox': return { width: 20, height: 20 };
    default: return { width: 120, height: 32 };
  }
};

export const useFieldStore = create<FieldState>()(
  subscribeWithSelector((set, get) => ({
  // Unified fields
  unifiedFields: [],
  selectedUnifiedFieldId: null,
  
  // PDF data
  pdfFile: null,
  pdfUrl: null,
  currentPage: 1,
  totalPages: 0,
  
  // Grid settings
  gridEnabled: false,
  gridSize: 10,
  showGrid: false,
  
  // Import queue
  queuedFields: [],
  isRightSidebarOpen: false,
  
  // Queue operations
  addToQueue: (fields) => {
    set((state) => ({
      queuedFields: [...state.queuedFields, ...fields],
      isRightSidebarOpen: true // Auto-open when fields are added
    }));
  },
  
  removeFromQueue: (fieldId) => {
    set((state) => ({
      queuedFields: state.queuedFields.filter(f => f.id !== fieldId)
    }));
  },
  
  clearQueue: () => {
    set({ queuedFields: [] });
  },
  
  moveFromQueueToCanvas: (fieldId, position) => {
    const field = get().queuedFields.find(f => f.id === fieldId);
    if (!field) return;
    
    // Add field to canvas with the new position
    const updatedField = { ...field, position };
    get().addUnifiedField(updatedField);
    
    // Remove from queue
    get().removeFromQueue(fieldId);
  },
  
  setRightSidebarOpen: (open) => {
    set({ isRightSidebarOpen: open });
  },
  
  // Unified field operations
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
      
      // 2. Then apply our required fields (these override anything from user)
      id,
      type: fieldType,
      key: finalKey,
      
      // 3. Apply defaults for missing values
      page: fieldData.page ?? 1,
      position: fieldData.position ?? { x: 100, y: 100 },
      size: fieldData.size ?? getDefaultFieldSize(fieldType),
      variant: fieldData.variant ?? 'single',
      structure: fieldData.structure ?? 'simple',
      enabled: fieldData.enabled ?? true,
      placementCount: fieldData.placementCount ?? 1,
      locked: fieldData.locked ?? false,
      
      // 4. Merge properties: user properties override defaults
      properties: {
        ...defaultProperties,
        ...userProperties,
      },
      
      // 5. Set sample value last (may reference the type)
      sampleValue: defaultSampleValue,
    };
    
    set((state) => ({
      unifiedFields: [...state.unifiedFields, newField],
      selectedUnifiedFieldId: newField.id,
    }));
    
    return newField;
  },
  
  updateUnifiedField: (id, updates) => {
    set((state) => ({
      unifiedFields: state.unifiedFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      ),
    }));
  },
  
  deleteUnifiedField: (id) => {
    set((state) => ({
      unifiedFields: state.unifiedFields.filter((field) => field.id !== id),
      selectedUnifiedFieldId: state.selectedUnifiedFieldId === id ? null : state.selectedUnifiedFieldId,
    }));
  },
  
  setUnifiedFields: (fields) => set({ unifiedFields: fields }),
  
  clearUnifiedFields: () => set({ unifiedFields: [], selectedUnifiedFieldId: null }),
  
  duplicateUnifiedField: (id) => {
    const field = get().unifiedFields.find(f => f.id === id);
    if (!field) return;
    
    // For data-only fields (no position), duplicate without position
    const newPosition = field.position ? {
      x: Math.min(field.position.x + 20, 500),
      y: Math.min(field.position.y + 20, 700),
    } : undefined;
    
    const duplicatedField = {
      ...field,
      position: newPosition,
      key: `${field.key}_copy`,
    };
    
    get().addUnifiedField(duplicatedField);
  },
  
  getUnifiedFieldById: (id) => get().unifiedFields.find(f => f.id === id),
  
  getUnifiedFieldByKey: (key) => get().unifiedFields.find(f => f.key === key),
  
  getUnifiedFieldsForPage: (page) => get().unifiedFields.filter(f => f.page === page),
  
  selectUnifiedField: (id) => set({ selectedUnifiedFieldId: id }),
  
  deselectUnifiedField: () => set({ selectedUnifiedFieldId: null }),
  
  // Lock operations
  toggleUnifiedFieldLock: (id) => {
    const field = get().unifiedFields.find(f => f.id === id);
    if (field) {
      get().updateUnifiedField(id, { locked: !field.locked });
    }
  },
  
  lockUnifiedField: (id) => {
    get().updateUnifiedField(id, { locked: true });
  },
  
  unlockUnifiedField: (id) => {
    get().updateUnifiedField(id, { locked: false });
  },
  
  // Composite field operations
  createCompositeField: (template, position, page) => {
    const state = get();
    const dependencies = TemplateEngine.extractDependencies(template);
    
    // Generate sample value for preview
    const sampleData: Record<string, unknown> = {};
    dependencies.forEach(dep => {
      // Check if this is an option field reference (fieldKey.optionKey)
      if (dep.includes('.')) {
        const [fieldKey, optionKey] = dep.split('.');
        const field = state.unifiedFields.find(f => f.key === fieldKey);
        if (field?.variant === 'options') {
          // For options fields, use the option key as the sample value
          sampleData[dep] = optionKey;
        } else {
          // For nested regular fields
          const field = state.unifiedFields.find(f => f.key === dep);
          sampleData[dep] = field?.sampleValue || `Sample ${dep}`;
        }
      } else {
        const field = state.unifiedFields.find(f => f.key === dep);
        sampleData[dep] = field?.sampleValue || `Sample ${dep}`;
      }
    });
    
    const sampleValue = TemplateEngine.evaluate(template, sampleData, {
      emptyValueBehavior: 'skip',
      separatorHandling: 'smart',
      whitespaceHandling: 'normalize'
    });
    
    const newField: Partial<UnifiedField> = {
      type: 'composite-text',
      variant: 'single',
      template,
      dependencies,
      position, // Can be undefined - will be set later via position picker
      page,
      size: { width: 200, height: 32 },
      enabled: true,
      structure: 'simple',
      placementCount: position ? 1 : 0, // 0 if not placed yet
      sampleValue,
      compositeFormatting: {
        emptyValueBehavior: 'skip',
        separatorHandling: 'smart',
        whitespaceHandling: 'normalize'
      },
      positionVersion: position ? 'top-edge' : undefined
    };
    
    return state.addUnifiedField(newField);
  },
  
  updateCompositeTemplate: (id, template) => {
    const state = get();
    const dependencies = TemplateEngine.extractDependencies(template);
    
    // Generate updated sample value
    const sampleData: Record<string, unknown> = {};
    dependencies.forEach(dep => {
      // Check if this is an option field reference (fieldKey.optionKey)
      if (dep.includes('.')) {
        const [fieldKey, optionKey] = dep.split('.');
        const field = state.unifiedFields.find(f => f.key === fieldKey);
        if (field?.variant === 'options') {
          // For options fields, use the option key as the sample value
          sampleData[dep] = optionKey;
        } else {
          // For nested regular fields
          const field = state.unifiedFields.find(f => f.key === dep);
          sampleData[dep] = field?.sampleValue || `Sample ${dep}`;
        }
      } else {
        const field = state.unifiedFields.find(f => f.key === dep);
        sampleData[dep] = field?.sampleValue || `Sample ${dep}`;
      }
    });
    
    const sampleValue = TemplateEngine.evaluate(template, sampleData, {
      emptyValueBehavior: 'skip',
      separatorHandling: 'smart',
      whitespaceHandling: 'normalize'
    });
    
    state.updateUnifiedField(id, { template, dependencies, sampleValue });
  },
  
  validateCompositeTemplate: (template) => {
    const state = get();
    const availableKeys = state.unifiedFields.map(f => f.key);
    const validation = TemplateEngine.validate(template, availableKeys);
    return {
      isValid: validation.isValid,
      dependencies: validation.dependencies,
      errors: validation.errors.map(e => e.message),
    };
  },
  
  getCompositeFieldDependencies: (id) => {
    const field = get().unifiedFields.find(f => f.id === id);
    return field?.dependencies || [];
  },
  
  getAvailableFieldKeys: () => {
    const fields: string[] = [];
    get().unifiedFields
      .filter(f => f.type !== 'composite-text')
      .forEach(f => {
        if (f.variant === 'options' && f.optionMappings) {
          // For options fields, add each option key instead of the field key
          f.optionMappings.forEach(mapping => {
            fields.push(`${f.key}.${mapping.key}`);
          });
        } else {
          // For regular fields, add the field key
          fields.push(f.key);
        }
      });
    return fields;
  },
  
  // Persistence operations
  loadFromStorage: () => {
    const fields = loadFieldsFromStorage();
    const gridSettings = loadGridSettings();
    const rightSidebarOpen = loadRightSidebarState();
    const queuedFields = loadQueuedFields();
    
    if (fields) {
      set({ unifiedFields: fields });
    }
    if (gridSettings) {
      set({
        gridEnabled: gridSettings.gridEnabled,
        gridSize: gridSettings.gridSize as GridSize,
        showGrid: gridSettings.showGrid,
      });
    }
    if (rightSidebarOpen !== null) {
      set({ isRightSidebarOpen: rightSidebarOpen });
    }
    if (queuedFields) {
      set({ queuedFields });
    }
  },
  
  clearStorage: () => {
    clearStoredData();
    set({
      unifiedFields: [],
      selectedUnifiedFieldId: null,
      queuedFields: [],
    });
  },
  
  // PDF operations
  setPdfFile: (file) => set({ pdfFile: file }),
  
  setPdfUrl: (url) => set({ pdfUrl: url }),
  
  clearPdf: () => set({ 
    pdfFile: null, 
    pdfUrl: null, 
    currentPage: 1, 
    totalPages: 0 
  }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  setTotalPages: (pages) => set({ totalPages: pages }),
  
  // Grid operations
  setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
  
  setGridSize: (size) => set({ gridSize: size }),
  
  setShowGrid: (show) => set({ showGrid: show }),
  
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  
  // Clear all
  clearAll: () => {
    // Clear URL to free memory
    const currentUrl = get().pdfUrl;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
    }
    
    set({
      unifiedFields: [],
      selectedUnifiedFieldId: null,
      pdfFile: null,
      pdfUrl: null,
      currentPage: 1,
      totalPages: 0,
      queuedFields: [],
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

// Save queued fields whenever they change
useFieldStore.subscribe(
  (state) => state.queuedFields,
  (fields) => {
    saveQueuedFields(fields);
  }
);

// Save right sidebar state whenever it changes
useFieldStore.subscribe(
  (state) => state.isRightSidebarOpen,
  (isOpen) => {
    saveRightSidebarState(isOpen);
  }
);