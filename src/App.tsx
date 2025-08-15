import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { FieldToolbox } from '@/components/AppSidebar/FieldToolbox';
import { PdfEditor } from '@/components/PdfViewer/PdfEditor';
import { DropzoneArea } from '@/components/PdfViewer/DropzoneArea';
import { QueueSidebar } from '@/components/RightSidebar/QueueSidebar';
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
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen w-full">
        {/* Main Layout with Both Sidebars */}
        <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
          {/* Left Sidebar */}
          <FieldToolbox />
          
          {/* Main Content Area */}
          <SidebarInset className={`flex-1 transition-all duration-300 ${isRightSidebarOpen ? 'mr-80' : ''}`}>
            <div className="flex flex-1 flex-col h-full">
              {/* Header */}
              <header className="flex h-16 shrink-0 items-center border-b bg-background">
                <div className="flex w-full items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="h-4" />
                  <Toolbar />
                </div>
              </header>
              
              {/* Main PDF Editor Area */}
              <main className="flex-1 overflow-auto">
                {pdfFile ? (
                  <PdfEditor />
                ) : (
                  <div className="w-full h-full p-4">
                    <DropzoneArea />
                  </div>
                )}
              </main>
            </div>
          </SidebarInset>
          
          {/* Right Sidebar (Queue) - Outside of SidebarInset */}
          <QueueSidebar />
        </SidebarProvider>
      </div>
      <StatusBar />
    </DndProvider>
  );
}

export default App;