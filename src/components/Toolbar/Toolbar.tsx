import { Upload, FileJson, Database, FileText, AlertTriangle } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import { Button } from '@/components/ui/button';
import { ImportModal } from '@/components/ImportModal/ImportModal';
import { ExportDialog } from '@/components/ExportModal/ExportDialog';
import { GridControls } from '@/components/Toolbar/GridControls';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { clearAll, fields, setPdfFile, setPdfUrl, pdfFile } = useFieldStore();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showNewProjectAlert, setShowNewProjectAlert] = useState(false);
  const [showUploadAlert, setShowUploadAlert] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (pdfFile && fields.length > 0) {
        setPendingFile(file);
        setShowUploadAlert(true);
      } else {
        setPdfFile(file);
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const confirmUpload = () => {
    if (pendingFile) {
      clearAll();
      setPdfFile(pendingFile);
      const url = URL.createObjectURL(pendingFile);
      setPdfUrl(url);
      setPendingFile(null);
    }
    setShowUploadAlert(false);
  };

  const handleNewProject = () => {
    if (fields.length > 0) {
      setShowNewProjectAlert(true);
    } else {
      clearAll();
    }
  };

  const confirmNewProject = () => {
    clearAll();
    setShowNewProjectAlert(false);
  };

  const handleImportSchema = () => {
    setImportModalOpen(true);
  };

  const handleExport = () => {
    setExportModalOpen(true);
  };

  return (
    <>
      <div className="toolbar flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">PDF Filler</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <GridControls />
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload PDF
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportSchema}
            disabled={!pdfFile}
            title={!pdfFile ? "Upload a PDF first" : "Import schema from SQL, JSON, or TypeScript"}
          >
            <Database className="h-4 w-4" />
            Import Schema
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!pdfFile || fields.length === 0}
            title={!pdfFile ? "Upload a PDF first" : fields.length === 0 ? "No fields to export" : "Export configuration"}
          >
            <FileJson className="h-4 w-4" />
            Export
          </Button>
          
          <Button
            size="sm"
            onClick={handleNewProject}
          >
            New Project
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>
      
      <ImportModal 
        open={importModalOpen} 
        onOpenChange={setImportModalOpen} 
      />
      
      <ExportDialog
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
      />
      
      <AlertDialog open={showNewProjectAlert} onOpenChange={setShowNewProjectAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Start New Project?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Starting a new project will clear all current fields and remove the loaded PDF.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNewProject}>
              Start New Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUploadAlert} onOpenChange={setShowUploadAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Replace Current PDF?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Uploading a new PDF will clear all current fields and replace the existing PDF.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpload}>
              Upload New PDF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}