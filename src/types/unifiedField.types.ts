/**
 * Unified Field Model - Simplified field system for PDF Filler
 * Replaces the complex three-field-type system (Field, LogicField, BooleanField)
 * with a single, unified model that handles all cases.
 */

import type { FieldType } from './field.types';

/**
 * Field variant determines how values are handled in the PDF
 */
export type FieldVariant = 
  | 'single'           // Single field placement (default)
  | 'options';         // Field with mapped option positions (radio/checkbox style)

/**
 * Structure type indicates the data shape
 */
export type FieldStructure = 
  | 'simple'   // Single value field
  | 'array'    // Array of values
  | 'object';  // Object (auto-flattened into multiple fields)

/**
 * Render type for option fields
 */
export type OptionRenderType = 
  | 'text'       // Render the actual value
  | 'checkmark'  // Render a checkmark symbol
  | 'custom';    // Render custom text

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
  
  /** 
   * For option fields - is this multi-select (checkboxes) or single-select (radio)?
   */
  multiSelect?: boolean;
  
  /** 
   * For option fields - how to render the selected value(s)
   */
  renderType?: OptionRenderType;
  
  /** 
   * For option fields - mapping of possible values to their PDF positions
   * At generation time, only positions for provided values are used
   */
  optionMappings?: Array<{
    /** The option key (e.g., "male", "female", "other") */
    key: string;
    /** Position on the PDF where this option would appear if selected */
    position: { x: number; y: number };
    /** Size of the rendered element */
    size?: { width: number; height: number };
    /** Custom text to render (only used when renderType is 'custom') */
    customText?: string;
  }>;
  
  /** 
   * Source information for debugging and traceability
   * @deprecated Will be removed in final cleanup
   */
  source?: {
    type: 'sql' | 'json' | 'typescript' | 'manual';
    originalName?: string;
  };
  
  /**
   * Position version - 'top-edge' means position.y stores distance from PDF bottom to field's TOP edge
   * If missing, assume legacy format (bottom edge)
   */
  positionVersion?: 'top-edge';
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