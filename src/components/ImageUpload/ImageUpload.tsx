import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [error, setError] = useState<string>('');
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    // Clear any previous errors
    setError('');
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles[0].errors;
      
      if (errors.some((e) => e.code === 'file-invalid-type')) {
        setError(`File type not supported. Please upload a PNG or JPEG image.`);
      } else {
        setError(`Unable to upload file: ${errors[0]?.message || 'Unknown error'}`);
      }
      return;
    }
    
    const file = acceptedFiles[0];
    if (file) {
      // Additional validation for file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError('Only PNG and JPEG images are supported');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsDataURL(file);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const clearImage = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-2">
      {!value ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {isDragActive ? (
              <>
                <Upload className="h-8 w-8 text-primary animate-bounce" />
                <p className="text-sm font-medium">Drop image here</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop image or click to browse</p>
                <p className="text-xs text-muted-foreground">PNG or JPEG only, up to 10MB</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative border rounded-lg p-2 bg-muted/30">
            <img 
              src={value} 
              alt="Uploaded" 
              className="max-w-full h-32 object-contain mx-auto"
            />
          </div>
          <button
            type="button"
            onClick={clearImage}
            className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
          >
            Remove image
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive mt-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}