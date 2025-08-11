import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FieldToolbox } from '@/components/AppSidebar/FieldToolbox';
import { PdfEditor } from '@/components/PdfViewer/PdfEditor';
import { DropzoneArea } from '@/components/PdfViewer/DropzoneArea';
import { useFieldStore } from '@/store/fieldStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { StatusBar } from '@/components/StatusBar/StatusBar';

function App() {
  const { pdfFile } = useFieldStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  // Auto-expand sidebar when PDF is loaded
  useEffect(() => {
    if (pdfFile) {
      setSidebarOpen(true);
    }
  }, [pdfFile]);
  
  return (
    <DndProvider backend={HTML5Backend}>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <FieldToolbox />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center border-b bg-background">
            <div className="flex w-full items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="h-4" />
              <Toolbar />
            </div>
          </header>
          <main className="flex flex-1 h-[calc(100vh-6rem)]">
            {pdfFile ? (
              <PdfEditor />
            ) : (
              <div className="w-full h-full p-4">
                <DropzoneArea />
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <StatusBar />
    </DndProvider>
  );
}

export default App;