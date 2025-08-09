export type LogicFieldActionType = 
  | 'fillLabel'    // Fill with the option's label text
  | 'fillCustom'   // Fill with custom text
  | 'checkmark';   // Insert checkmark symbol (✓)

export interface FieldAction {
  id: string;
  type: LogicFieldActionType;
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

export interface FieldOption {
  key: string;    // e.g., "male" - unique identifier for the option
  label: string;  // e.g., "Male" - display text
  actions: FieldAction[];
}

export interface LogicField {
  key: string;     // e.g., "gender" - unique identifier
  label: string;   // e.g., "Gender Selection"
  options: FieldOption[];
  page?: number;   // The page where this field was created (optional for backward compatibility)
}

// For export format
export interface LogicFieldExport {
  key: string;
  label: string;
  options: Array<{
    key: string;
    label: string;
    actions: Array<{
      type: LogicFieldActionType;
      position: {
        x: number;
        y: number;
        page: number;
      };
      customText?: string;
    }>;
  }>;
}