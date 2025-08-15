import { Upload, FileJson, Database, FileText, AlertTriangle, Save, Download, Trash2, Inbox } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import { Button } from '@/components/ui/button';
import { ImportModal } from '@/components/ImportModal/ImportModal';
import { ExportDialog } from '@/components/ExportModal/ExportDialog';
import { GridControls } from '@/components/Toolbar/GridControls';
import { exportDataAsJson, importDataFromJson, hasStoredData } from '@/utils/localStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const { clearAll, clearStorage, loadFromStorage, fields, unifiedFields, setPdfFile, setPdfUrl, pdfFile, useUnifiedFields, queuedFields, isRightSidebarOpen, setRightSidebarOpen } = useFieldStore();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showNewProjectAlert, setShowNewProjectAlert] = useState(false);
  const [showUploadAlert, setShowUploadAlert] = useState(false);
  const [showClearStorageAlert, setShowClearStorageAlert] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const activeFieldsCount = useUnifiedFields ? unifiedFields.length : fields.length;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (pdfFile && activeFieldsCount > 0) {
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
    if (activeFieldsCount > 0) {
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
  
  const handleExportBackup = () => {
    const jsonData = exportDataAsJson();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf-filler-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (importDataFromJson(content)) {
          loadFromStorage();
          alert('Backup imported successfully!');
        } else {
          alert('Failed to import backup. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };
  
  const handleClearStorage = () => {
    setShowClearStorageAlert(true);
  };
  
  const confirmClearStorage = () => {
    clearStorage();
    setShowClearStorageAlert(false);
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
            disabled={!pdfFile || activeFieldsCount === 0}
            title={!pdfFile ? "Upload a PDF first" : activeFieldsCount === 0 ? "No fields to export" : "Export configuration"}
          >
            <FileJson className="h-4 w-4" />
            Export
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <Button
            variant={isRightSidebarOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setRightSidebarOpen(!isRightSidebarOpen)}
            className="relative"
          >
            <Inbox className="h-4 w-4" />
            Queue
            {queuedFields.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {queuedFields.length}
              </span>
            )}
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4" />
                Storage
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportBackup}>
                <Download className="h-4 w-4 mr-2" />
                Export Backup
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => jsonImportRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import Backup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleClearStorage}
                className="text-destructive"
                disabled={!hasStoredData()}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Local Storage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
          
          <input
            ref={jsonImportRef}
            type="file"
            accept="application/json"
            onChange={handleImportBackup}
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
      
      <AlertDialog open={showClearStorageAlert} onOpenChange={setShowClearStorageAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Clear Local Storage?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all saved field configurations from your browser's local storage.
              Consider exporting a backup first. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearStorage} className="bg-destructive text-destructive-foreground">
              Clear Storage
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}