import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  restrictToWindowEdges,
} from '@dnd-kit/modifiers';
import type { Modifier } from '@dnd-kit/core';
import { createGridSnapModifier } from '@/utils/dndModifiers';
import { FieldToolbox } from '@/components/AppSidebar/FieldToolbox';
import { PdfEditor } from '@/components/PdfViewer/PdfEditor';
import { FieldDragPreview } from '@/components/PdfViewer/FieldDragPreview';
import { DropzoneArea } from '@/components/PdfViewer/DropzoneArea';
import { useFieldStore } from '@/store/fieldStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { StatusBar } from '@/components/StatusBar/StatusBar';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import type { UnifiedField } from '@/types/unifiedField.types';

function App() {
  const { pdfFile, updateUnifiedField, addUnifiedField, currentPage, gridEnabled, gridSize } = useFieldStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDraggingField, setIsDraggingField] = useState(false);
  const [activeField, setActiveField] = useState<UnifiedField | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  // CRITICAL: PointerSensor with distance constraint prevents accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Must drag 8px to activate
      },
    }),
    useSensor(KeyboardSensor)
  );
  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setActiveDragData(active.data.current);
    
    // Handle existing field drag
    if (active.data.current?.field) {
      setActiveField(active.data.current.field);
      setIsDraggingField(true);
    }
    // Handle new field drag from sidebar
    else if (active.data.current?.type === 'NEW_FIELD') {
      setIsDraggingField(true);
      // Create a preview field for the DragOverlay
      const fieldType = active.data.current.fieldType;
      const previewField: UnifiedField = {
        id: 'preview',
        key: fieldType,
        type: fieldType,
        variant: 'single',
        page: currentPage,
        position: { x: 0, y: 0 },
        size: getFieldSize(fieldType),
        enabled: true,
        structure: 'simple',
        placementCount: 1,
      };
      setActiveField(previewField);
    }
  };
  
  // Helper function to get field size
  const getFieldSize = (type: string) => {
    if (type === 'checkbox') return { width: 25, height: 25 };
    if (type === 'image' || type === 'signature') return { width: 200, height: 100 };
    return { width: 200, height: 30 };
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta, activatorEvent } = event;
    
    if (!over || over.id !== 'pdf-drop-zone') {
      // Not dropped on PDF, cancel
      setActiveField(null);
      setActiveId(null);
      setActiveDragData(null);
      setIsDraggingField(false);
      setPointerPosition(null);
      return;
    }
    
    // Calculate drop position from the droppable's callback
    const dropData = over.data.current as any;
    let dropPosition: { x: number; y: number } | null = null;
    
    if (dropData?.onDrop && typeof dropData.onDrop === 'function') {
      dropPosition = dropData.onDrop(event);
    }
    
    if (!dropPosition) {
      // Fallback: calculate position here if onDrop didn't provide it
      const pdfElement = document.querySelector('.unified-field-drop-zone');
      if (pdfElement && activatorEvent && 'clientX' in activatorEvent) {
        const rect = pdfElement.getBoundingClientRect();
        const mouseEvent = activatorEvent as MouseEvent;
        const currentX = mouseEvent.clientX + delta.x;
        const currentY = mouseEvent.clientY + delta.y;
        
        // Get scale from the dragged field data or use default
        let scale = 1;
        if (active.data.current?.scale) {
          scale = active.data.current.scale;
        }
        
        // Calculate position relative to PDF
        const relativeX = (currentX - rect.left) / scale;
        const relativeY = (currentY - rect.top) / scale;
        
        // Get field size
        let fieldWidth = 200;
        let fieldHeight = 30;
        
        if (active.data.current?.fieldType) {
          const fieldSize = getFieldSize(active.data.current.fieldType);
          fieldWidth = fieldSize.width;
          fieldHeight = fieldSize.height;
        } else if (active.data.current?.field) {
          const field = active.data.current.field as UnifiedField;
          fieldWidth = field.size?.width || 200;
          fieldHeight = field.size?.height || 30;
        }
        
        // Center field under cursor and convert to PDF coordinates
        // Note: This is a simplified fallback - the onDrop callback should be preferred
        const screenY = relativeY - fieldHeight / 2;
        // We need pageHeight but don't have it in this context
        // For now, use a reasonable default or get from active data
        const pageHeight = active.data.current?.pageHeight || 800;
        
        dropPosition = {
          x: Math.max(0, relativeX - fieldWidth / 2),
          y: Math.max(fieldHeight, pageHeight - screenY),
        };
      }
    }
    
    if (!dropPosition) {
      console.error('Could not calculate drop position');
      setActiveField(null);
      setActiveId(null);
      setActiveDragData(null);
      setIsDraggingField(false);
      setPointerPosition(null);
      return;
    }
    
    // Handle new field creation from sidebar
    if (active.data.current?.type === 'NEW_FIELD') {
      const fieldType = active.data.current.fieldType;
      const fieldSize = getFieldSize(fieldType);
      
      // Create new unified field at the drop position
      addUnifiedField({
        type: fieldType,
        variant: 'single',
        page: currentPage,
        position: dropPosition,
        size: fieldSize,
        enabled: true,
        structure: 'simple',
        placementCount: 1,
      });
    }
    // Handle existing field repositioning
    else if (active.data.current?.field) {
      const field = active.data.current.field as UnifiedField;
      const optionKey = active.data.current.optionKey;
      
      // For existing fields, we should use the calculated drop position
      // which already accounts for centering and constraints
      
      // Update field position
      if (optionKey && field.optionMappings) {
        // Update specific option mapping position
        const updatedMappings = field.optionMappings.map(m => 
          m.key === optionKey 
            ? { ...m, position: dropPosition }
            : m
        );
        updateUnifiedField(field.id, {
          optionMappings: updatedMappings
        });
      } else {
        // Update main field position
        updateUnifiedField(field.id, {
          position: dropPosition,
          page: currentPage,
        });
      }
    }
    
    // Reset drag state
    setActiveField(null);
    setActiveId(null);
    setActiveDragData(null);
    setIsDraggingField(false);
    setPointerPosition(null);
  };
  
  // Auto-expand sidebar when PDF is loaded
  useEffect(() => {
    if (pdfFile) {
      setSidebarOpen(true);
    }
  }, [pdfFile]);

  // Create modifiers array based on grid settings
  const modifiers = [
    restrictToWindowEdges,
    gridEnabled && gridSize > 0 ? createGridSnapModifier(gridSize) : null,
  ].filter(Boolean) as Modifier[];

  // Track pointer position during drag
  const handleDragMove = (event: any) => {
    // Store the current pointer position
    if (event.activatorEvent && 'clientX' in event.activatorEvent) {
      const { clientX, clientY } = event.activatorEvent as MouseEvent;
      setPointerPosition({
        x: clientX + event.delta.x,
        y: clientY + event.delta.y,
      });
    }
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      modifiers={modifiers}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className={cn(isDraggingField && "dragging-active")}>
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
              <PdfEditor onDragStateChange={setIsDraggingField} />
            ) : (
              <div className="w-full h-full p-4">
                <DropzoneArea />
              </div>
            )}
          </main>
        </SidebarInset>
        </SidebarProvider>
        <StatusBar />
        <Toaster />
      </div>
      
      {/* CRITICAL: DragOverlay must be at ROOT level */}
      <DragOverlay dropAnimation={null}>
        {activeField ? (
          <FieldDragPreview field={activeField} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;