import { CodeViewer } from '@/components/common/CodeViewer';
import { generateNextJsApiRoute } from '@/exporters/nextjsApiExporter';
import { generateUnifiedNextJsApiRoute } from '@/exporters/unifiedNextJsExporter';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { UnifiedField } from '@/types/unifiedField.types';

interface NextJsApiExportTabProps {
  fields: Field[];
  logicFields: LogicField[];
  pdfFileName?: string;
  unifiedFields?: UnifiedField[];
}

export function NextJsApiExportTab({ fields, logicFields, unifiedFields }: NextJsApiExportTabProps) {
  const useUnified = unifiedFields && unifiedFields.length > 0;
  const fieldCount = useUnified ? unifiedFields.length : fields.length;
  
  const code = fieldCount === 0
    ? '// No fields to export. Add some fields to your PDF first.'
    : useUnified
      ? generateUnifiedNextJsApiRoute(unifiedFields)
      : generateNextJsApiRoute(fields, logicFields);

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route.ts';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
        <p className="text-xs text-orange-800 dark:text-orange-200">
          <strong>Quick Setup:</strong> Save as <code className="bg-orange-100 dark:bg-orange-900/50 px-1 rounded">app/api/fill-pdf/route.ts</code> and run <code className="bg-orange-100 dark:bg-orange-900/50 px-1 rounded">npm install pdf-lib</code>
        </p>
      </div>

      <CodeViewer
        code={code}
        language="typescript"
        title="Next.js 15 API Route"
        description={`Production-ready API route (${fieldCount} fields${useUnified ? '' : `, ${logicFields.length} logic fields`})`}
        onDownload={handleDownload}
        showDownload={true}
        buttonPosition="top"
      />
    </div>
  );
}