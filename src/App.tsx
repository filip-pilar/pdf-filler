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
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal/KeyboardShortcutsModal';
import { cn } from '@/lib/utils';

function App() {
  const { pdfFile, isRightSidebarOpen } = useFieldStore();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  
  // Enable keyboard shortcuts
  const { showHelpModal, setShowHelpModal } = useKeyboardShortcuts();
  
  // Handle Ctrl/Cmd + [ for left sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        setLeftSidebarOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Auto-expand left sidebar when PDF is loaded
  useEffect(() => {
    if (pdfFile) {
      setLeftSidebarOpen(true);
    }
  }, [pdfFile]);
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen w-full">
        {/* Main Layout with Both Sidebars */}
        <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar */}
            <FieldToolbox />
            
            {/* Main Content Area */}
            <SidebarInset className="flex-1 flex flex-col overflow-hidden">
              {/* Header - Fixed */}
              <header className="flex h-16 shrink-0 items-center border-b bg-background">
                <div className="flex w-full items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="h-4" />
                  <Toolbar />
                </div>
              </header>
              
              {/* Main PDF Editor Area - Scrollable */}
              <main className="flex-1 overflow-auto">
                {pdfFile ? (
                  <PdfEditor />
                ) : (
                  <div className="w-full h-full p-4">
                    <DropzoneArea />
                  </div>
                )}
              </main>
            </SidebarInset>
            
            {/* Right Sidebar (Queue) - With smooth animation */}
            <div 
              className={cn(
                "transition-all duration-200 ease-in-out overflow-hidden",
                isRightSidebarOpen ? "w-80" : "w-0"
              )}
            >
              <QueueSidebar />
            </div>
          </div>
        </SidebarProvider>
        <StatusBar />
      </div>
      
      <KeyboardShortcutsModal 
        open={showHelpModal} 
        onOpenChange={setShowHelpModal} 
      />
    </DndProvider>
  );
}

export default App;