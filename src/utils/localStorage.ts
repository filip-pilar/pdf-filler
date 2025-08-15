import type { UnifiedField } from '@/types/unifiedField.types';

const STORAGE_KEYS = {
  UNIFIED_FIELDS: 'pdf_filler_unified_fields',
  GRID_SETTINGS: 'pdf_filler_grid_settings',
  PDF_METADATA: 'pdf_filler_pdf_metadata',
  APP_VERSION: 'pdf_filler_app_version',
  QUEUED_FIELDS: 'pdf_filler_queued_fields',
  RIGHT_SIDEBAR_OPEN: 'pdf_filler_right_sidebar_open',
} as const;

const APP_VERSION = '2.0.0';

export interface StoredPdfMetadata {
  fileName?: string;
  fileSize?: number;
  totalPages: number;
  lastModified?: number;
}

export interface StoredGridSettings {
  gridEnabled: boolean;
  gridSize: number;
  showGrid: boolean;
}

export interface StoredAppData {
  version: string;
  unifiedFields: UnifiedField[];
  gridSettings: StoredGridSettings;
  pdfMetadata?: StoredPdfMetadata;
  lastSaved: string;
}

/**
 * Save unified fields to localStorage
 * Only saves field configuration, not actual PDF or sensitive data
 */
export function saveFieldsToStorage(fields: UnifiedField[]): void {
  try {
    // Filter out any sensitive data from fields
    const fieldsToSave = fields.map(field => ({
      ...field,
      // Don't save sample values that might contain real data
      sampleValue: typeof field.sampleValue === 'boolean' ? field.sampleValue : undefined,
    }));
    
    localStorage.setItem(STORAGE_KEYS.UNIFIED_FIELDS, JSON.stringify(fieldsToSave));
  } catch (error) {
    console.error('Failed to save fields to localStorage:', error);
  }
}

/**
 * Load unified fields from localStorage
 */
export function loadFieldsFromStorage(): UnifiedField[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.UNIFIED_FIELDS);
    if (!stored) return null;
    
    const fields = JSON.parse(stored) as UnifiedField[];
    
    // Validate that the loaded data has the expected structure
    if (!Array.isArray(fields)) return null;
    
    return fields.filter(field => 
      field.id && 
      field.key && 
      field.type && 
      field.page && 
      field.position
    );
  } catch (error) {
    console.error('Failed to load fields from localStorage:', error);
    return null;
  }
}

/**
 * Save grid settings to localStorage
 */
export function saveGridSettings(settings: StoredGridSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.GRID_SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save grid settings:', error);
  }
}

/**
 * Load grid settings from localStorage
 */
export function loadGridSettings(): StoredGridSettings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GRID_SETTINGS);
    if (!stored) return null;
    return JSON.parse(stored) as StoredGridSettings;
  } catch (error) {
    console.error('Failed to load grid settings:', error);
    return null;
  }
}

/**
 * Save PDF metadata (not the actual PDF)
 */
export function savePdfMetadata(metadata: StoredPdfMetadata): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PDF_METADATA, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save PDF metadata:', error);
  }
}

/**
 * Load PDF metadata
 */
export function loadPdfMetadata(): StoredPdfMetadata | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PDF_METADATA);
    if (!stored) return null;
    return JSON.parse(stored) as StoredPdfMetadata;
  } catch (error) {
    console.error('Failed to load PDF metadata:', error);
    return null;
  }
}

/**
 * Save all app data as a single bundle
 */
export function saveAppData(data: {
  fields: UnifiedField[];
  gridSettings: StoredGridSettings;
  pdfMetadata?: StoredPdfMetadata;
}): void {
  try {
    // Save individual components
    saveFieldsToStorage(data.fields);
    saveGridSettings(data.gridSettings);
    if (data.pdfMetadata) {
      savePdfMetadata(data.pdfMetadata);
    }
    
    // Also save version for migration purposes
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, APP_VERSION);
  } catch (error) {
    console.error('Failed to save app data:', error);
  }
}

/**
 * Load all app data
 */
export function loadAppData(): Partial<StoredAppData> | null {
  try {
    const fields = loadFieldsFromStorage();
    const gridSettings = loadGridSettings();
    const pdfMetadata = loadPdfMetadata();
    const version = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    
    if (!fields && !gridSettings && !pdfMetadata) {
      return null;
    }
    
    return {
      version: version || 'unknown',
      unifiedFields: fields || [],
      gridSettings: gridSettings || {
        gridEnabled: false,
        gridSize: 10,
        showGrid: false,
      },
      pdfMetadata: pdfMetadata || undefined,
    };
  } catch (error) {
    console.error('Failed to load app data:', error);
    return null;
  }
}

/**
 * Clear all stored data
 */
export function clearStoredData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
}

/**
 * Export data as JSON for backup
 */
export function exportDataAsJson(): string {
  const data = loadAppData();
  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON backup
 */
export function importDataFromJson(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString) as StoredAppData;
    
    // Validate structure
    if (!data.unifiedFields || !Array.isArray(data.unifiedFields)) {
      throw new Error('Invalid data structure');
    }
    
    // Save imported data
    if (data.unifiedFields) {
      saveFieldsToStorage(data.unifiedFields);
    }
    if (data.gridSettings) {
      saveGridSettings(data.gridSettings);
    }
    if (data.pdfMetadata) {
      savePdfMetadata(data.pdfMetadata);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
}

/**
 * Save queued fields to localStorage
 */
export function saveQueuedFields(fields: UnifiedField[]): void {
  try {
    const fieldsToSave = fields.map(field => ({
      ...field,
      sampleValue: typeof field.sampleValue === 'boolean' ? field.sampleValue : undefined,
    }));
    localStorage.setItem(STORAGE_KEYS.QUEUED_FIELDS, JSON.stringify(fieldsToSave));
  } catch (error) {
    console.error('Failed to save queued fields:', error);
  }
}

/**
 * Load queued fields from localStorage
 */
export function loadQueuedFields(): UnifiedField[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.QUEUED_FIELDS);
    if (!stored) return null;
    
    const fields = JSON.parse(stored) as UnifiedField[];
    if (!Array.isArray(fields)) return null;
    
    return fields.filter(field => 
      field.id && 
      field.key && 
      field.type && 
      field.page && 
      field.position
    );
  } catch (error) {
    console.error('Failed to load queued fields:', error);
    return null;
  }
}

/**
 * Save right sidebar state
 */
export function saveRightSidebarState(isOpen: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RIGHT_SIDEBAR_OPEN, JSON.stringify(isOpen));
  } catch (error) {
    console.error('Failed to save sidebar state:', error);
  }
}

/**
 * Load right sidebar state
 */
export function loadRightSidebarState(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RIGHT_SIDEBAR_OPEN);
    if (!stored) return false;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load sidebar state:', error);
    return false;
  }
}

/**
 * Check if there's stored data available
 */
export function hasStoredData(): boolean {
  return !!(
    localStorage.getItem(STORAGE_KEYS.UNIFIED_FIELDS) ||
    localStorage.getItem(STORAGE_KEYS.GRID_SETTINGS) ||
    localStorage.getItem(STORAGE_KEYS.PDF_METADATA) ||
    localStorage.getItem(STORAGE_KEYS.QUEUED_FIELDS)
  );
}