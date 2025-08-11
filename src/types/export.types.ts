import type { Field } from './field.types';
// Legacy type - temporarily defined here
type LogicFieldExport = any;

export interface ExportConfig {
  version: string;
  createdAt: string;
  updatedAt: string;
  pdfInfo: {
    name: string;
    pages: number;
    size?: {
      width: number;
      height: number;
    };
  };
  fields: Field[];
  logicFields?: LogicFieldExport[];
  conditionals?: unknown[]; // Deprecated, kept for backward compatibility
  metadata?: {
    description?: string;
    author?: string;
    tags?: string[];
    exportDate?: string;
    statistics?: {
      total: number;
      byType: Record<string, number>;
      byPage: Record<number, number>;
      required: number;
    };
  };
  $schema?: string;
}

export type ExportFormat = 
  | 'json'
  | 'javascript'
  | 'html'
  | 'pdf';