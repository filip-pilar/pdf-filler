import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { useState } from 'react';

interface CodeViewerProps {
  code: string;
  language: string;
  onCopy?: () => void;
  onDownload?: () => void;
  showDownload?: boolean;
  description?: string;
}

export function CodeViewer({ 
  code, 
  language, 
  onCopy, 
  onDownload, 
  showDownload = false,
  description 
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Editor
          height="400px"
          language={language}
          theme="vs-dark"
          value={code}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
      <div className="flex justify-between">
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
          {showDownload && onDownload && (
            <Button size="sm" onClick={onDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}