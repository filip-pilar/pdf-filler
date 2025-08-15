/* eslint-disable react-hooks/exhaustive-deps */
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
  const [isEditorReady, setIsEditorReady] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (error) {
      console.error('Failed to copy:', error);
    }
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
      <div className="border rounded-lg overflow-hidden relative">
        {!isEditorReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
              Loading editor...
            </div>
          </div>
        )}
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
          onMount={() => {
            setIsEditorReady(true);
          }}
          loading={
            <div className="h-[400px] flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                Loading editor...
              </div>
            </div>
          }
        />
      </div>
      {buttonPosition === 'bottom' && buttons}
    </div>
  );
}