import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FieldToolbox } from '@/components/AppSidebar/FieldToolbox';
import { PdfEditor } from '@/components/PdfViewer/PdfEditor';
import { DropzoneArea } from '@/components/PdfViewer/DropzoneArea';
import { FieldQueueSidebar } from '@/components/RightSidebar/FieldQueueSidebar';
import { useFieldStore } from '@/store/fieldStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { StatusBar } from '@/components/StatusBar/StatusBar';

function App() {
  const { pdfFile, isRightSidebarOpen } = useFieldStore();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  // Auto-expand left sidebar when PDF is loaded
  useEffect(() => {
    if (pdfFile) {
      setLeftSidebarOpen(true);
    }
  }, [pdfFile]);
  
  // Initialize right sidebar state from store
  useEffect(() => {
    // Right sidebar state is managed in the store
  }, []);
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen w-full">
        {/* Left Sidebar with main content */}
        <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
          <FieldToolbox />
          <SidebarInset>
            <div className="flex flex-1 flex-col">
              {/* Header */}
              <header className="flex h-16 shrink-0 items-center border-b bg-background">
                <div className="flex w-full items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="h-4" />
                  <Toolbar />
                </div>
              </header>
              
              {/* Main content area with right sidebar */}
              <div className="flex flex-1 h-[calc(100vh-6rem)]">
                {/* Main PDF Editor Area */}
                <main className="flex-1">
                  {pdfFile ? (
                    <PdfEditor />
                  ) : (
                    <div className="w-full h-full p-4">
                      <DropzoneArea />
                    </div>
                  )}
                </main>
                
                {/* Right Sidebar (Queue) */}
                <FieldQueueSidebar isOpen={isRightSidebarOpen} />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
      <StatusBar />
    </DndProvider>
  );
}

export default App;