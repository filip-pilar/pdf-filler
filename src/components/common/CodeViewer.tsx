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
  title?: string;
  buttonPosition?: 'top' | 'bottom';
}

export function CodeViewer({ 
  code, 
  language, 
  onCopy, 
  onDownload, 
  showDownload = false,
  description,
  title,
  buttonPosition = 'top'
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  const buttons = (
    <div className="flex items-center justify-between">
      <div>
        {title && (
          <h3 className="text-sm font-medium">{title}</h3>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy Code
            </>
          )}
        </Button>
        {showDownload && onDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="gap-2"
          >
            <Download className="h-3 w-3" />
            Download
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {buttonPosition === 'top' && buttons}
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
      {buttonPosition === 'bottom' && buttons}
    </div>
  );
}