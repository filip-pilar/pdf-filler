import type { Field } from '@/types/field.types';
import type { ExportConfig } from '@/types/export.types';
import type { LogicField, LogicFieldExport } from '@/types/logicField.types';

export function exportToJSON(
  fields: Field[], 
  pdfName?: string, 
  logicFields?: LogicField[]
): string {
  // Convert internal logic fields to export format
  const exportLogicFields: LogicFieldExport[] = (logicFields || []).map(of => ({
    key: of.key,
    label: of.label,
    options: of.options.map(opt => ({
      key: opt.key,
      label: opt.label,
      actions: opt.actions.map(act => ({
        type: act.type,
        position: act.position,
        customText: act.customText
      }))
    }))
  }));

  const config: ExportConfig = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pdfInfo: {
      name: pdfName || 'document.pdf',
      pages: Math.max(...fields.map(f => f.page), 1),
    },
    fields: fields.map(field => ({
      ...field,
      // Clean up internal properties
      id: undefined,
      source: undefined,
    })),
    logicFields: exportLogicFields,
    metadata: {
      description: 'PDF field configuration exported from PDF Filler',
      author: 'PDF Filler',
      tags: ['pdf', 'form', 'fields'],
    },
  };

  return JSON.stringify(config, null, 2);
}

export function downloadJSON(fields: Field[], pdfName?: string): void {
  const json = exportToJSON(fields, pdfName);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pdf-fields-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}