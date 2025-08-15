import { useEffect, useRef, useCallback } from 'react';
import { useFieldStore } from '@/store/fieldStore';
import type { UnifiedField } from '@/types/unifiedField.types';

interface HistoryState {
  unifiedFields: UnifiedField[];
  timestamp: number;
  action?: string; // Track what action was performed
}

const MAX_HISTORY_SIZE = 50;

export function useUndoRedo() {
  const historyRef = useRef<HistoryState[]>([]);
  const currentIndexRef = useRef<number>(-1);
  const isUndoingRef = useRef<boolean>(false);
  const lastFieldsRef = useRef<string>('[]');
  const initializedRef = useRef<boolean>(false);
  
  const { unifiedFields, setUnifiedFields } = useFieldStore();
  
  // Initialize with empty state if not already initialized
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Save initial state (even if empty)
      const initialState: HistoryState = {
        unifiedFields: [],
        timestamp: Date.now(),
        action: 'initial'
      };
      historyRef.current = [initialState];
      currentIndexRef.current = 0;
      lastFieldsRef.current = JSON.stringify([]);
    }
  }, []);
  
  // Save current state to history
  const saveToHistory = useCallback((action?: string) => {
    if (isUndoingRef.current) return;
    
    // Check if fields actually changed
    const currentFieldsStr = JSON.stringify(unifiedFields);
    if (currentFieldsStr === lastFieldsRef.current) {
      return;
    }
    lastFieldsRef.current = currentFieldsStr;
    
    const newState: HistoryState = {
      unifiedFields: [...unifiedFields],
      timestamp: Date.now(),
      action
    };
    
    // Remove any states after current index (for when we undo then make a change)
    historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
    
    // Add new state
    historyRef.current.push(newState);
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      historyRef.current.shift();
    } else {
      currentIndexRef.current++;
    }
  }, [unifiedFields]);
  
  // Undo action
  const undo = useCallback(() => {
    if (currentIndexRef.current <= 0) return false;
    
    isUndoingRef.current = true;
    currentIndexRef.current--;
    const previousState = historyRef.current[currentIndexRef.current];
    setUnifiedFields(previousState.unifiedFields);
    lastFieldsRef.current = JSON.stringify(previousState.unifiedFields);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
    
    return true;
  }, [setUnifiedFields]);
  
  // Redo action
  const redo = useCallback(() => {
    if (currentIndexRef.current >= historyRef.current.length - 1) return false;
    
    isUndoingRef.current = true;
    currentIndexRef.current++;
    const nextState = historyRef.current[currentIndexRef.current];
    setUnifiedFields(nextState.unifiedFields);
    lastFieldsRef.current = JSON.stringify(nextState.unifiedFields);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoingRef.current = false;
    }, 0);
    
    return true;
  }, [setUnifiedFields]);
  
  // Check if undo/redo is available
  const canUndo = useCallback(() => currentIndexRef.current > 0, []);
  const canRedo = useCallback(() => currentIndexRef.current < historyRef.current.length - 1, []);
  
  // Clear history
  const clearHistory = useCallback(() => {
    const currentState: HistoryState = {
      unifiedFields: [...unifiedFields],
      timestamp: Date.now(),
      action: 'clear'
    };
    historyRef.current = [currentState];
    currentIndexRef.current = 0;
    lastFieldsRef.current = JSON.stringify(unifiedFields);
  }, [unifiedFields]);
  
  // Get history info
  const getHistoryInfo = useCallback(() => ({
    size: historyRef.current.length,
    currentIndex: currentIndexRef.current,
    canUndo: canUndo(),
    canRedo: canRedo(),
    history: historyRef.current.map(h => ({
      fieldsCount: h.unifiedFields.length,
      action: h.action,
      timestamp: h.timestamp
    }))
  }), [canUndo, canRedo]);
  
  // Watch for field changes and save to history
  useEffect(() => {
    // Skip if we're undoing/redoing or not initialized
    if (isUndoingRef.current || !initializedRef.current) {
      return;
    }
    
    // Use a shorter debounce for more responsive history
    const timeoutId = setTimeout(() => {
      saveToHistory();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [unifiedFields, saveToHistory]);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (
        (e.shiftKey && e.key === 'z') || 
        (!e.shiftKey && e.key === 'y')
      )) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  // Expose a method to manually save a checkpoint
  const saveCheckpoint = useCallback((action: string) => {
    if (!isUndoingRef.current) {
      // Force save immediately without debounce
      saveToHistory(action);
    }
  }, [saveToHistory]);
  
  return {
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistoryInfo,
    saveCheckpoint
  };
}