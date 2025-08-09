import { CodeViewer } from '@/components/common/CodeViewer';
import { generateJavaScriptCode } from '@/exporters/javascriptExporter';
import type { Field } from '@/types/field.types';

interface JavaScriptExportTabProps {
  fields: Field[];
}

export function JavaScriptExportTab({ fields }: JavaScriptExportTabProps) {
  const code = fields.length === 0 
    ? '// No fields to export. Add some fields to your PDF first.'
    : generateJavaScriptCode(fields);

  return (
    <CodeViewer
      code={code}
      language="javascript"
      description="JavaScript code for form handling"
    />
  );
}