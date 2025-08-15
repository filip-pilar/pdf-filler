/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Field } from '@/types/field.types';
import type { ExportConfig } from '@/types/export.types';
import type { UnifiedField } from '@/types/unifiedField.types';
// Legacy types - temporarily defined here
type LogicField = any;
type LogicFieldExport = any;

interface ExportOptions {
  includeMetadata?: boolean;
  includeSchema?: boolean;
  minify?: boolean;
}

export function exportToJSON(
  fields: Field[], 
  pdfName?: string, 
  logicFields?: LogicField[],
  options: ExportOptions = {},
  unifiedFields?: UnifiedField[]
): string {
  const { 
    includeMetadata = true, 
    includeSchema = false,
    minify = false 
  } = options;
  
  // Convert internal logic fields to export format
  const exportLogicFields: LogicFieldExport[] = (logicFields || []).map(lf => ({
    key: lf.key,
    label: lf.label,
    options: lf.options.map((opt: any) => ({
      key: opt.key,
      label: opt.label,
      actions: opt.actions.map((act: any) => ({
        type: act.type,
        position: act.position,
        customText: act.customText,
        size: act.size,
        properties: act.properties
      }))
    }))
  }));

  // Calculate statistics
  const fieldStats = {
    total: fields.length,
    byType: fields.reduce((acc, field) => {
      acc[field.type] = (acc[field.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byPage: fields.reduce((acc, field) => {
      acc[field.page] = (acc[field.page] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
    required: fields.filter(f => f.properties.required).length,
  };

  // If we have unified fields, use those instead
  if (unifiedFields && unifiedFields.length > 0) {
    const unifiedExport = unifiedFields
      .filter(f => f.enabled)
      .map(field => ({
        key: field.key,
        type: field.type,
        variant: field.variant,
        page: field.page,
        position: field.position,
        size: field.size,
        placementCount: field.placementCount,
        multiSelect: field.multiSelect,
        renderType: field.renderType,
        optionMappings: field.optionMappings,
        properties: field.properties,
        positionVersion: field.positionVersion,
        sampleValue: field.sampleValue
      }));
    
    const config = {
      version: '2.0.0', // New version for unified fields
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pdfInfo: {
        name: pdfName || 'document.pdf',
        pages: Math.max(...unifiedFields.map(f => f.page), 1),
      },
      unifiedFields: unifiedExport,
      metadata: includeMetadata ? {
        description: 'PDF field configuration (unified) exported from PDF Filler',
        author: 'PDF Filler',
        tags: ['pdf', 'form', 'fields', 'unified'],
        exportDate: new Date().toISOString(),
        statistics: {
          total: unifiedExport.length,
          byType: unifiedExport.reduce((acc, field) => {
            acc[field.type] = (acc[field.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byPage: unifiedExport.reduce((acc, field) => {
            acc[field.page] = (acc[field.page] || 0) + 1;
            return acc;
          }, {} as Record<number, number>),
        },
      } : undefined,
      $schema: includeSchema ? 'https://pdf-filler.app/schemas/unified-export-config.json' : undefined
    };
    
    return JSON.stringify(config, null, minify ? 0 : 2);
  }
  
  // Legacy export for old field system
  const config: ExportConfig = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pdfInfo: {
      name: pdfName || 'document.pdf',
      pages: Math.max(...fields.map(f => f.page), 1),
    },
    fields: fields.map(field => {
      // Clean up internal properties and remove undefined values
      const cleanField: any = {
        type: field.type,
        name: field.name,
        key: field.key,
        page: field.page,
        position: field.position,
        size: field.size,
        properties: field.properties
      };
      
      // Only include optional properties if they have values
      if (field.displayName) cleanField.displayName = field.displayName;
      if (field.sampleValue !== undefined) cleanField.sampleValue = field.sampleValue;
      if (field.label) cleanField.label = field.label;
      
      return cleanField;
    }),
    logicFields: exportLogicFields.length > 0 ? exportLogicFields : undefined,
  };

  // Add metadata if requested
  if (includeMetadata) {
    config.metadata = {
      description: 'PDF field configuration exported from PDF Filler',
      author: 'PDF Filler',
      tags: ['pdf', 'form', 'fields'],
      exportDate: new Date().toISOString(),
      statistics: fieldStats,
    };
  }

  // Add JSON schema if requested
  if (includeSchema) {
    config.$schema = 'https://pdf-filler.app/schemas/export-config.json';
  }

  // Return formatted or minified JSON
  return JSON.stringify(config, null, minify ? 0 : 2);
}

export function validateJSON(jsonString: string): { 
  valid: boolean; 
  errors?: string[];
  fieldCount?: number;
  logicFieldCount?: number;
} {
  try {
    const config = JSON.parse(jsonString);
    const errors: string[] = [];
    
    // Check required properties
    if (!config.version) errors.push('Missing version field');
    if (!config.fields || !Array.isArray(config.fields)) {
      errors.push('Missing or invalid fields array');
    }
    
    // Validate each field
    if (config.fields) {
      config.fields.forEach((field: any, index: number) => {
        if (!field.type) errors.push(`Field ${index}: missing type`);
        if (!field.key) errors.push(`Field ${index}: missing key`);
        if (!field.page || field.page < 1) errors.push(`Field ${index}: invalid page number`);
        if (!field.position || typeof field.position.x !== 'number' || typeof field.position.y !== 'number') {
          errors.push(`Field ${index}: invalid position`);
        }
        if (!field.size || typeof field.size.width !== 'number' || typeof field.size.height !== 'number') {
          errors.push(`Field ${index}: invalid size`);
        }
      });
    }
    
    // Validate logic fields if present
    if (config.logicFields) {
      if (!Array.isArray(config.logicFields)) {
        errors.push('Invalid logicFields array');
      } else {
        config.logicFields.forEach((lf: any, index: number) => {
          if (!lf.key) errors.push(`Logic field ${index}: missing key`);
          if (!lf.label) errors.push(`Logic field ${index}: missing label`);
          if (!lf.options || !Array.isArray(lf.options)) {
            errors.push(`Logic field ${index}: missing or invalid options`);
          }
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      fieldCount: config.fields?.length || 0,
      logicFieldCount: config.logicFields?.length || 0,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

export function downloadJSON(
  fields: Field[], 
  pdfName?: string, 
  logicFields?: LogicField[],
  unifiedFields?: UnifiedField[]
): void {
  const json = exportToJSON(fields, pdfName, logicFields, {}, unifiedFields);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const baseName = pdfName ? pdfName.replace('.pdf', '') : 'pdf-fields';
  a.download = `${baseName}-config-${timestamp}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}