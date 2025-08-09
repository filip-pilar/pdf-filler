import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    },
    multiple: false
  });

  const clearImage = () => {
    onChange('');
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
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
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
    </div>
  );
}