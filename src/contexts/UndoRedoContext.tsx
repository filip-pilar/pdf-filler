import React, { createContext, useContext } from 'react';
import { useUndoRedo } from '@/hooks/useUndoRedo';

interface UndoRedoContextType {
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getHistoryInfo: () => {
    size: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    history: Array<{
      fieldsCount: number;
      action?: string;
      timestamp: number;
    }>;
  };
  saveCheckpoint: (action: string) => void;
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined);

export function UndoRedoProvider({ children }: { children: React.ReactNode }) {
  const undoRedo = useUndoRedo();
  
  return (
    <UndoRedoContext.Provider value={undoRedo}>
      {children}
    </UndoRedoContext.Provider>
  );
}

export function useUndoRedoContext() {
  const context = useContext(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedoContext must be used within UndoRedoProvider');
  }
  return context;
}