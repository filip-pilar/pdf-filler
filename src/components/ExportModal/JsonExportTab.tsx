import { CodeViewer } from '@/components/common/CodeViewer';
import { exportToJSON, downloadJSON } from '@/exporters/jsonExporter';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { UnifiedField } from '@/types/unifiedField.types';

interface JsonExportTabProps {
  fields: Field[];
  logicFields: LogicField[];
  pdfFileName?: string;
  unifiedFields?: UnifiedField[];
}

export function JsonExportTab({ fields, logicFields, pdfFileName, unifiedFields }: JsonExportTabProps) {
  const hasFields = unifiedFields ? unifiedFields.length > 0 : fields.length > 0;
  const code = !hasFields
    ? '// No fields to export. Add some fields to your PDF first.'
    : exportToJSON(fields, pdfFileName, logicFields, {}, unifiedFields);

  const handleDownload = () => {
    downloadJSON(fields, pdfFileName, logicFields, unifiedFields);
  };

  return (
    <CodeViewer
      code={code}
      language="json"
      title="JSON Configuration"
      description={`Field configuration (${unifiedFields ? unifiedFields.length : fields.length} fields, ${logicFields.length} logic fields)`}
      onDownload={handleDownload}
      showDownload={true}
      buttonPosition="top"
    />
  );
}