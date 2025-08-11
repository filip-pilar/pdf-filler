import { CodeViewer } from '@/components/common/CodeViewer';
import { exportToJSON, downloadJSON } from '@/exporters/jsonExporter';
import type { UnifiedField } from '@/types/unifiedField.types';

interface JsonExportTabProps {
  pdfFileName?: string;
  unifiedFields?: UnifiedField[];
}

export function JsonExportTab({ pdfFileName, unifiedFields = [] }: JsonExportTabProps) {
  const hasFields = unifiedFields.length > 0;
  const code = !hasFields
    ? '// No fields to export. Add some fields to your PDF first.'
    : exportToJSON([], pdfFileName, [], {}, unifiedFields);

  const handleDownload = () => {
    downloadJSON([], pdfFileName, [], unifiedFields);
  };

  return (
    <CodeViewer
      code={code}
      language="json"
      title="JSON Configuration"
      description={`Field configuration (${unifiedFields.length} fields)`}
      onDownload={handleDownload}
      showDownload={true}
      buttonPosition="top"
    />
  );
}