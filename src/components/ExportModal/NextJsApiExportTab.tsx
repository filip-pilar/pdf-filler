import { CodeViewer } from '@/components/common/CodeViewer';
import { generateUnifiedNextJsApiRoute } from '@/exporters/unifiedNextJsExporter';
import type { UnifiedField } from '@/types/unifiedField.types';

interface NextJsApiExportTabProps {
  pdfFileName?: string;
  unifiedFields?: UnifiedField[];
}

export function NextJsApiExportTab({ unifiedFields = [] }: NextJsApiExportTabProps) {
  const fieldCount = unifiedFields.length;
  
  const code = fieldCount === 0
    ? '// No fields to export. Add some fields to your PDF first.'
    : generateUnifiedNextJsApiRoute(unifiedFields);

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
        description={`Production-ready API route (${fieldCount} fields)`}
        onDownload={handleDownload}
        showDownload={true}
        buttonPosition="top"
      />
    </div>
  );
}