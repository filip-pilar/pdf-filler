export type BooleanFieldActionType = 
  | 'fillCustom'   // Fill with custom text
  | 'checkmark';   // Insert checkmark symbol (✓)

export interface BooleanFieldAction {
  id: string;
  type: BooleanFieldActionType;
  position: {
    x: number;
    y: number;
    page: number;
  };
  size?: {
    width: number;
    height: number;
  };
  customText?: string;       // For 'fillCustom' action type
  properties?: {
    fontSize?: number;       // Font size for text actions
  };
}

export interface BooleanField {
  key: string;           // e.g., "isActive" - unique identifier  
  label: string;         // e.g., "Is Active" - display label
  trueActions: BooleanFieldAction[];   // Actions when value is true
  falseActions: BooleanFieldAction[];  // Actions when value is false
  page?: number;         // The page where this field was created (optional)
}

// For export format
export interface BooleanFieldExport {
  key: string;
  label: string;
  trueActions: Array<{
    type: BooleanFieldActionType;
    position: {
      x: number;
      y: number;
      page: number;
    };
    customText?: string;
  }>;
  falseActions: Array<{
    type: BooleanFieldActionType;
    position: {
      x: number;
      y: number;
      page: number;
    };
    customText?: string;
  }>;
}