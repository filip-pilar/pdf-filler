import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';
import { useFieldStore } from '@/store/fieldStore';
import { cn } from '@/lib/utils';

export function DropzoneArea() {
  const { setPdfFile, setPdfUrl } = useFieldStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  }, [setPdfFile, setPdfUrl]);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "w-full h-full flex items-center justify-center cursor-pointer transition-all",
        "border-2 border-dashed rounded-lg",
        isDragActive && "border-primary bg-primary/5",
        isDragAccept && "border-green-500 bg-green-500/5",
        isDragReject && "border-red-500 bg-red-500/5",
        !isDragActive && "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
      )}
    >
      <input {...getInputProps()} />
      <div className="text-center p-12">
        <div className="mb-6 flex justify-center">
          <div className={cn(
            "rounded-full p-6 transition-colors",
            isDragActive ? "bg-primary/10" : "bg-muted"
          )}>
            {isDragActive ? (
              <Upload className="h-16 w-16 text-primary animate-pulse" />
            ) : (
              <FileText className="h-16 w-16 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {isDragReject ? (
          <>
            <h3 className="text-lg font-semibold mb-2 text-red-600">
              Invalid file type
            </h3>
            <p className="text-sm text-muted-foreground">
              Please drop a PDF file
            </p>
          </>
        ) : isDragActive ? (
          <>
            <h3 className="text-lg font-semibold mb-2 text-primary">
              Drop your PDF here
            </h3>
            <p className="text-sm text-muted-foreground">
              Release to upload
            </p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold mb-3">
              Drop PDF here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Upload a PDF document to start adding fields
            </p>
            <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>PDF files supported</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Drag & drop enabled</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}