import { CodeViewer } from '@/components/common/CodeViewer';
import { generateJavaScriptCode } from '@/exporters/javascriptExporter';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';

interface JavaScriptExportTabProps {
  fields: Field[];
  logicFields?: LogicField[];
}

export function JavaScriptExportTab({ fields, logicFields = [] }: JavaScriptExportTabProps) {
  const code = fields.length === 0 
    ? '// No fields to export. Add some fields to your PDF first.'
    : generateJavaScriptCode(fields, logicFields);

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
      description={`Hono service for edge runtimes (${fields.length} fields, ${logicFields.length} logic fields)`}
      onDownload={handleDownload}
      showDownload={true}
      buttonPosition="top"
    />
  );
}