/**
 * Unified Field Model - Simplified field system for PDF Filler
 * Replaces the complex three-field-type system (Field, LogicField, BooleanField)
 * with a single, unified model that handles all cases.
 */

import type { FieldType } from './field.types';

/**
 * Field variant determines how array values are handled in the PDF
 */
export type FieldVariant = 
  | 'single'           // Single field placement (default for non-arrays)
  | 'text-multi'       // Multiple text placements (each array item gets its own position)
  | 'checkbox-multi'   // Multiple checkbox placements (checkmarks at each position)  
  | 'text-list';       // Combined text list at single position (Value1, Value2, ...)

/**
 * Structure type indicates the data shape
 */
export type FieldStructure = 
  | 'simple'   // Single value field
  | 'array'    // Array of values
  | 'object';  // Object (auto-flattened into multiple fields)

/**
 * The unified field model that handles all field types
 */
export interface UnifiedField {
  /** Unique identifier for React key and internal management */
  id: string;
  
  /** Data binding key (e.g., "user_name", "permissions") - single source of truth */
  key: string;
  
  /** Field type determines the rendering and behavior */
  type: FieldType | 'logic';
  
  /** Variant determines how arrays/multiple values are handled */
  variant: FieldVariant;
  
  /** PDF page number (1-based) */
  page: number;
  
  /** Position on the PDF page */
  position: {
    x: number;
    y: number;
  };
  
  /** Optional size for the field */
  size?: {
    width: number;
    height: number;
  };
  
  /** Whether this field is enabled/included in the PDF */
  enabled: boolean;
  
  /** Data structure type */
  structure: FieldStructure;
  
  /** Number of placement locations needed on the PDF */
  placementCount: number;
  
  /** Sample value from imported data (helps with type detection) */
  sampleValue?: any;
  
  /** For arrays - the individual items as simple strings */
  options?: string[];
  
  /** For arrays with multiple placements - individual field names */
  multiFieldNames?: string[];
  
  /** 
   * Source information for debugging and traceability
   * @deprecated Will be removed in final cleanup
   */
  source?: {
    type: 'sql' | 'json' | 'typescript' | 'manual';
    originalName?: string;
  };
}

/**
 * Simplified export format for unified fields
 */
export interface UnifiedFieldExport {
  key: string;
  type: FieldType | 'logic';
  variant: FieldVariant;
  page: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  placementCount: number;
  options?: string[];
}

/**
 * Migration helpers to convert old field types to unified model
 */
export interface FieldMigrationResult {
  fields: UnifiedField[];
  warnings?: string[];
}