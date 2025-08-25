export type FieldType = 
  | 'text'
  | 'checkbox'
  | 'radio-group'
  | 'image'
  | 'signature'
  | 'composite-text'
  | 'conditional';

export interface Field {
  type: FieldType;
  name: string;
  key: string;           // The unique identifier and data binding key
  displayName?: string;  // User-friendly display name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sampleValue?: any;     // Sample value to show in the field
  label?: string;
  page: number;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  properties: {
    required?: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValue?: any;
    placeholder?: string;
    validation?: unknown[];
    fontSize?: number;
    checkboxSize?: number;
    fitMode?: 'fit' | 'fill';
  };
  source?: {
    type: 'sql' | 'json' | 'typescript' | 'manual';
    originalName?: string;
  };
}