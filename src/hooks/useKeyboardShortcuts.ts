import { useEffect } from 'react';
import { useFieldStore } from '@/store/fieldStore';

export function useKeyboardShortcuts() {
  const { 
    selectedFieldKey, 
    fields, 
    updateField, 
    deleteField, 
    duplicateField,
    selectField 
  } = useFieldStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedField = fields.find(f => f.key === selectedFieldKey);
      
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete selected field (only Delete key, not Backspace to avoid accidental deletion)
      if (e.key === 'Delete') {
        if (selectedFieldKey) {
          e.preventDefault();
          deleteField(selectedFieldKey);
        }
      }

      // Duplicate field (Ctrl/Cmd + D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedFieldKey) {
          e.preventDefault();
          duplicateField(selectedFieldKey);
        }
      }

      // Copy field (Ctrl/Cmd + C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedField) {
          e.preventDefault();
          localStorage.setItem('copiedField', JSON.stringify({
            ...selectedField,
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
            useFieldStore.getState().addField({
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

      // Move selected field with arrow keys
      if (selectedField && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
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
          updateField(selectedField.key, { position: newPosition });
        }
      }

      // Resize selected field with Shift + Arrow keys
      if (selectedField && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const resizeAmount = e.altKey ? 10 : 2;
        let resized = false;
        const newSize = { ...selectedField.size };

        switch (e.key) {
          case 'ArrowUp':
            newSize.height = Math.max(10, newSize.height - resizeAmount);
            resized = true;
            break;
          case 'ArrowDown':
            newSize.height = newSize.height + resizeAmount;
            resized = true;
            break;
          case 'ArrowLeft':
            newSize.width = Math.max(20, newSize.width - resizeAmount);
            resized = true;
            break;
          case 'ArrowRight':
            newSize.width = newSize.width + resizeAmount;
            resized = true;
            break;
        }

        if (resized) {
          e.preventDefault();
          updateField(selectedField.key, { size: newSize });
        }
      }

      // Note: Page navigation and zoom controls are now handled in PdfEditor component

      // Select all fields (Ctrl/Cmd + A)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // This could be extended to multi-select in the future
        e.preventDefault();
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectField(null);
      }

      // Tab through fields (simplified without page context)
      if (e.key === 'Tab') {
        if (fields.length > 0) {
          e.preventDefault();
          const currentIndex = fields.findIndex(f => f.key === selectedFieldKey);
          const nextIndex = e.shiftKey 
            ? (currentIndex - 1 + fields.length) % fields.length
            : (currentIndex + 1) % fields.length;
          selectField(fields[nextIndex].key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFieldKey, 
    fields, 
    updateField, 
    deleteField, 
    duplicateField, 
    selectField
  ]);
}