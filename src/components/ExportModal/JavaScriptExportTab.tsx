import { CodeViewer } from '@/components/common/CodeViewer';
import { generateJavaScriptCode } from '@/exporters/javascriptExporter';
import { generateUnifiedJavaScriptCode } from '@/exporters/unifiedJavaScriptExporter';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { UnifiedField } from '@/types/unifiedField.types';

interface JavaScriptExportTabProps {
  fields: Field[];
  logicFields?: LogicField[];
  unifiedFields?: UnifiedField[];
}

export function JavaScriptExportTab({ fields, logicFields = [], unifiedFields }: JavaScriptExportTabProps) {
  const useUnified = unifiedFields && unifiedFields.length > 0;
  const hasFields = useUnified ? unifiedFields.length > 0 : fields.length > 0;
  
  const code = !hasFields
    ? '// No fields to export. Add some fields to your PDF first.'
    : useUnified
      ? generateUnifiedJavaScriptCode(unifiedFields, { framework: 'hono' })
      : generateJavaScriptCode(fields, logicFields, {});

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pdf-form-service.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <CodeViewer
      code={code}
      language="javascript"
      title="JavaScript Service"
      description={`Hono service for edge runtimes (${useUnified ? unifiedFields.length : fields.length} fields${useUnified ? '' : `, ${logicFields.length} logic fields`})`}
      onDownload={handleDownload}
      showDownload={true}
      buttonPosition="top"
    />
  );
}