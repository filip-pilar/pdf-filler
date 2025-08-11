import { create } from 'zustand';

interface Position {
  x: number;
  y: number;
  page: number;
}

interface PositionPickerState {
  // Picking state
  isPickingPosition: boolean;
  pickingForActionId: string | null;
  pickingContent: string;
  pickingOptionLabel: string;
  pickingActionType: 'checkmark' | 'fillLabel' | 'fillCustom' | 'text' | null;
  
  // Temporary position while adjusting
  tempPosition: Position | null;
  isAdjusting: boolean;
  
  // Last confirmed position (for subscription-based workflows)
  lastConfirmedPosition: Position | null;
  
  // Callbacks
  onComplete: ((position: Position) => void) | null;
  onCancel: (() => void) | null;
  
  // Actions
  startPicking: (params: {
    actionId: string;
    content: string;
    optionLabel: string;
    actionType?: 'checkmark' | 'fillLabel' | 'fillCustom' | 'text';
    onComplete: (position: Position) => void;
    onCancel: () => void;
  } | string) => void; // Also accepts just action type string for simple workflows
  
  setTempPosition: (position: Position) => void;
  startAdjusting: () => void;
  confirmPosition: (position?: Position) => void;
  cancelPicking: () => void;
  reset: () => void;
}

export const usePositionPickerStore = create<PositionPickerState>((set, get) => ({
  // Initial state
  isPickingPosition: false,
  pickingForActionId: null,
  pickingContent: '',
  pickingOptionLabel: '',
  pickingActionType: null,
  tempPosition: null,
  isAdjusting: false,
  lastConfirmedPosition: null,
  onComplete: null,
  onCancel: null,
  
  startPicking: (params) => {
    // Handle both object params and simple string for action type
    if (typeof params === 'string') {
      // Simple mode for options field dialog
      const actionType = params as 'checkmark' | 'text';
      set({
        isPickingPosition: true,
        pickingForActionId: 'options-field',
        pickingContent: actionType === 'checkmark' ? '✓' : 'Option',
        pickingOptionLabel: 'Options Field',
        pickingActionType: actionType,
        onComplete: null,
        onCancel: null,
        tempPosition: null,
        isAdjusting: false,
        lastConfirmedPosition: null, // Clear previous position
      });
    } else {
      // Full params mode for complex workflows
      const { actionId, content, optionLabel, actionType, onComplete, onCancel } = params;
      set({
        isPickingPosition: true,
        pickingForActionId: actionId,
        pickingContent: content,
        pickingOptionLabel: optionLabel,
        pickingActionType: actionType || null,
        onComplete,
        onCancel,
        tempPosition: null,
        isAdjusting: false,
        lastConfirmedPosition: null, // Clear previous position
      });
    }
  },
  
  setTempPosition: (position) => {
    set({ tempPosition: position });
  },
  
  startAdjusting: () => {
    set({ isAdjusting: true });
  },
  
  confirmPosition: (position?: Position) => {
    const { tempPosition, onComplete } = get();
    const finalPosition = position || tempPosition;
    
    // Set lastConfirmedPosition for subscription-based workflows
    if (finalPosition) {
      set({ lastConfirmedPosition: finalPosition });
    }
    
    // Call callback if provided
    if (finalPosition && onComplete) {
      onComplete(finalPosition);
    }
    
    // Reset but keep lastConfirmedPosition for subscribers
    set({
      isPickingPosition: false,
      pickingForActionId: null,
      pickingContent: '',
      pickingOptionLabel: '',
      pickingActionType: null,
      tempPosition: null,
      isAdjusting: false,
      onComplete: null,
      onCancel: null,
      // Keep lastConfirmedPosition so subscribers can read it
    });
  },
  
  cancelPicking: () => {
    const { onCancel } = get();
    if (onCancel) {
      onCancel();
    }
    get().reset();
  },
  
  reset: () => {
    set({
      isPickingPosition: false,
      pickingForActionId: null,
      pickingContent: '',
      pickingOptionLabel: '',
      pickingActionType: null,
      tempPosition: null,
      isAdjusting: false,
      lastConfirmedPosition: null,
      onComplete: null,
      onCancel: null,
    });
  },
}));