import { useEffect, useState } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import { usePositionPickerStore } from '@/store/positionPickerStore';

export function useKeyboardShortcuts() {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  
  const { 
    selectedUnifiedFieldId, 
    unifiedFields, 
    updateUnifiedField, 
    deleteUnifiedField, 
    duplicateUnifiedField,
    selectUnifiedField,
    addUnifiedField,
    deselectUnifiedField,
    gridEnabled,
    setGridEnabled,
    setShowGrid,
    currentPage,
    totalPages,
    setCurrentPage,
    isRightSidebarOpen,
    setRightSidebarOpen
  } = useFieldStore();
  
  const { isPickingPosition, cancelPicking } = usePositionPickerStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedField = unifiedFields.find(f => f.id === selectedUnifiedFieldId);
      
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete selected field (Ctrl/Cmd + Delete)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (selectedUnifiedFieldId) {
          e.preventDefault();
          deleteUnifiedField(selectedUnifiedFieldId);
        }
      }

      // Duplicate field (Ctrl/Cmd + D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey) {
        if (selectedUnifiedFieldId) {
          e.preventDefault();
          duplicateUnifiedField(selectedUnifiedFieldId);
        }
      }
      
      // Duplicate field with offset (Ctrl/Cmd + Shift + D)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'd') {
        if (selectedUnifiedFieldId) {
          e.preventDefault();
          duplicateUnifiedField(selectedUnifiedFieldId);
          // The duplicateUnifiedField already adds a 20px offset
        }
      }

      // Copy field (Ctrl/Cmd + C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedField) {
          e.preventDefault();
          localStorage.setItem('copiedField', JSON.stringify({
            ...selectedField,
            id: undefined, // Remove id so it gets a new one when pasted
            key: undefined // Remove key so it gets a new one when pasted
          }));
        }
      }

      // Paste field (Ctrl/Cmd + V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        const copiedField = localStorage.getItem('copiedField');
        if (copiedField) {
          try {
            const field = JSON.parse(copiedField);
            addUnifiedField({
              ...field,
              position: {
                x: field.position.x + 20,
                y: field.position.y + 20
              },
              page: field.page || 1 // Default to page 1
            });
          } catch (error) {
            console.error('Failed to paste field:', error);
          }
        }
      }

      // Navigate PDF pages with Ctrl/Cmd + Arrow keys
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
          e.preventDefault();
          setCurrentPage(currentPage - 1);
        } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
          e.preventDefault();
          setCurrentPage(currentPage + 1);
        }
      }
      
      // Lock/unlock selected field (Ctrl/Cmd + L)
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        if (selectedUnifiedFieldId) {
          e.preventDefault();
          const field = unifiedFields.find(f => f.id === selectedUnifiedFieldId);
          if (field) {
            updateUnifiedField(selectedUnifiedFieldId, { locked: !field.locked });
          }
        }
      }
      
      // Preview mode toggle (Ctrl/Cmd + P)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setPreviewMode(prev => !prev);
      }
      
      // Open Import dialog (Ctrl/Cmd + I)
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        // Trigger the import modal by clicking the import button
        const importBtn = document.querySelector('[data-import-trigger]') as HTMLButtonElement;
        if (importBtn) importBtn.click();
      }
      
      // Open Export dialog (Ctrl/Cmd + E)  
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        // Trigger the export modal by clicking the export button
        const exportBtn = document.querySelector('[data-export-trigger]') as HTMLButtonElement;
        if (exportBtn) exportBtn.click();
      }
      
      // Move selected field with arrow keys - now requires Shift key
      if (selectedField && !selectedField.locked && selectedField.position && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const moveAmount = e.altKey ? 10 : 1;
        let moved = false;
        const newPosition = { ...selectedField.position };

        switch (e.key) {
          case 'ArrowUp':
            newPosition.y = Math.max(0, newPosition.y - moveAmount);
            moved = true;
            break;
          case 'ArrowDown':
            newPosition.y = newPosition.y + moveAmount;
            moved = true;
            break;
          case 'ArrowLeft':
            newPosition.x = Math.max(0, newPosition.x - moveAmount);
            moved = true;
            break;
          case 'ArrowRight':
            newPosition.x = newPosition.x + moveAmount;
            moved = true;
            break;
        }

        if (moved) {
          e.preventDefault();
          updateUnifiedField(selectedField.id, { position: newPosition });
        }
      }

      // Resize selected field with Shift + Arrow keys (skip if field is locked)
      if (selectedField && !selectedField.locked && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const resizeAmount = e.altKey ? 10 : 2;
        let resized = false;
        const newSize = { ...selectedField.size };

        switch (e.key) {
          case 'ArrowUp':
            newSize.height = Math.max(10, (newSize.height || 32) - resizeAmount);
            resized = true;
            break;
          case 'ArrowDown':
            newSize.height = (newSize.height || 32) + resizeAmount;
            resized = true;
            break;
          case 'ArrowLeft':
            newSize.width = Math.max(20, (newSize.width || 120) - resizeAmount);
            resized = true;
            break;
          case 'ArrowRight':
            newSize.width = (newSize.width || 120) + resizeAmount;
            resized = true;
            break;
        }

        if (resized) {
          e.preventDefault();
          updateUnifiedField(selectedField.id, { 
            size: { 
              width: newSize.width || 120, 
              height: newSize.height || 32 
            } 
          });
        }
      }

      // Open PDF file picker (Ctrl/Cmd + O)
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        // Trigger the file input click
        const fileInput = document.querySelector('input[type="file"][accept="application/pdf"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.click();
        }
      }
      
      // Save to localStorage (Ctrl/Cmd + S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Storage already auto-saves, but we can trigger a manual save confirmation
        console.log('Data saved to localStorage');
      }
      
      
      // Toggle sidebars (Ctrl/Cmd + [ or ])
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        setRightSidebarOpen(!isRightSidebarOpen);
      }
      
      // Show keyboard shortcuts help (? or Ctrl/Cmd + /)
      if (e.key === '?' || ((e.ctrlKey || e.metaKey) && e.key === '/')) {
        e.preventDefault();
        setShowHelpModal(true);
      }

      // Select all fields (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // This could be extended to multi-select in the future
        e.preventDefault();
      }

      // Escape to deselect field or cancel position picker
      if (e.key === 'Escape' && !(e.ctrlKey || e.metaKey)) {
        if (isPickingPosition) {
          cancelPicking();
        } else if (selectedUnifiedFieldId) {
          deselectUnifiedField();
        }
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedUnifiedFieldId, 
    unifiedFields, 
    updateUnifiedField, 
    deleteUnifiedField, 
    duplicateUnifiedField, 
    selectUnifiedField,
    addUnifiedField,
    deselectUnifiedField,
    gridEnabled,
    setGridEnabled,
    setShowGrid,
    currentPage,
    totalPages,
    setCurrentPage,
    isPickingPosition,
    cancelPicking,
    isRightSidebarOpen,
    setRightSidebarOpen
  ]);
  
  return { showHelpModal, setShowHelpModal, previewMode, setPreviewMode };
}