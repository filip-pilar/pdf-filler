import { CodeViewer } from '@/components/common/CodeViewer';
import { exportToJSON, downloadJSON } from '@/exporters/jsonExporter';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';

interface JsonExportTabProps {
  fields: Field[];
  logicFields: LogicField[];
  pdfFileName?: string;
}

export function JsonExportTab({ fields, logicFields, pdfFileName }: JsonExportTabProps) {
  const code = fields.length === 0 
    ? '// No fields to export. Add some fields to your PDF first.'
    : exportToJSON(fields, pdfFileName, logicFields);

  const handleDownload = () => {
    downloadJSON(fields, pdfFileName, logicFields);
  };

  return (
    <CodeViewer
      code={code}
      language="json"
      title="JSON Configuration"
      description={`Field configuration (${fields.length} fields, ${logicFields.length} logic fields)`}
      onDownload={handleDownload}
      showDownload={true}
      buttonPosition="top"
    />
  );
}