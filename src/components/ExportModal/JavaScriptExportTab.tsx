import { CodeViewer } from '@/components/common/CodeViewer';
import { generateUnifiedJavaScriptCode } from '@/exporters/unifiedJavaScriptExporter';
import type { UnifiedField } from '@/types/unifiedField.types';

interface JavaScriptExportTabProps {
  unifiedFields?: UnifiedField[];
}

export function JavaScriptExportTab({ unifiedFields = [] }: JavaScriptExportTabProps) {
  const hasFields = unifiedFields.length > 0;
  
  const code = !hasFields
    ? '// No fields to export. Add some fields to your PDF first.'
    : generateUnifiedJavaScriptCode(unifiedFields, { framework: 'hono' });

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
      description={`Hono service for edge runtimes (${unifiedFields.length} fields)`}
      onDownload={handleDownload}
      showDownload={true}
      buttonPosition="top"
    />
  );
}