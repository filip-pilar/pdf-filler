import type { Field, FieldType } from '@/types/field.types';

// Sanitize key to remove spaces and special characters
function sanitizeFieldKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '');  // Remove all non-alphanumeric chars except underscore
}

interface ParsedField {
  path: string;
  value: unknown;
  type: string;
  isArray: boolean;
  isOptional: boolean;
}

export function parseJSON(jsonString: string): ParsedField[] {
  try {
    const obj = JSON.parse(jsonString);
    return extractFields(obj);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return [];
  }
}

function extractFields(obj: unknown, parentPath = '', fields: ParsedField[] = []): ParsedField[] {
  if (obj === null || obj === undefined) return fields;
  
  if (Array.isArray(obj)) {
    // For arrays, analyze the first element to determine structure
    if (obj.length > 0) {
      extractFields(obj[0], `${parentPath}[]`, fields);
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      const path = parentPath ? `${parentPath}.${key}` : key;
      
      if (value === null || value === undefined) {
        // Field exists but is null/undefined - mark as optional
        fields.push({
          path,
          value: null,
          type: 'unknown',
          isArray: false,
          isOptional: true
        });
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object') {
          // Array of objects - recurse into first element
          extractFields(value[0], `${path}[]`, fields);
        } else {
          // Array of primitives
          fields.push({
            path: `${path}[]`,
            value: value[0] || '',
            type: typeof (value[0] || 'string'),
            isArray: true,
            isOptional: false
          });
        }
      } else if (typeof value === 'object') {
        // Nested object - recurse
        extractFields(value, path, fields);
      } else {
        // Primitive value
        fields.push({
          path,
          value,
          type: typeof value,
          isArray: false,
          isOptional: false
        });
      }
    }
  }
  
  return fields;
}

export function jsonFieldToFieldType(field: ParsedField): FieldType {
  const path = field.path.toLowerCase();
  const value = field.value;
  
  // Check path patterns first
  if (path.includes('date') || path.includes('time') || path.includes('_at')) return 'text'; // dates use text field
  if (path.includes('phone') || path.includes('tel')) return 'text';
  if (path.includes('url') || path.includes('website') || path.includes('link')) return 'text';
  if (path.includes('password') || path.includes('secret')) return 'text';
  
  // Check by value type
  if (field.type === 'boolean') return 'checkbox';
  
  // Check by value patterns
  if (typeof value === 'string') {
    // Check if it looks like a date - use text field for dates
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'text';
  }
  
  // Arrays default to text
  if (field.isArray) return 'text';
  
  return 'text';
}

export function generateFieldsFromJSON(jsonString: string, startPosition = { x: 50, y: 50 }, page = 1): Partial<Field>[] {
  const parsedFields = parseJSON(jsonString);
  const fields: Partial<Field>[] = [];
  
  let yOffset = 0;
  const spacing = 40;
  
  // Group fields by depth level for better organization
  const fieldsByDepth = new Map<number, ParsedField[]>();
  for (const field of parsedFields) {
    const depth = field.path.split('.').length - 1;
    if (!fieldsByDepth.has(depth)) {
      fieldsByDepth.set(depth, []);
    }
    fieldsByDepth.get(depth)!.push(field);
  }
  
  // Process fields level by level
  for (const [depth, levelFields] of Array.from(fieldsByDepth.entries()).sort((a, b) => a[0] - b[0])) {
    for (const field of levelFields) {
      const fieldType = jsonFieldToFieldType(field);
      
      // Create a display name from the path
      const pathParts = field.path.replace(/\[\]/g, '').split('.');
      const fieldName = pathParts[pathParts.length - 1];
      const displayName = fieldName
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase());
      
      // Generate a valid key from the path
      const key = sanitizeFieldKey(
        field.path
          .replace(/\./g, '_')
          .replace(/\[\]/g, '_array')
      );
      
      fields.push({
        type: fieldType,
        key,
        displayName,
        name: fieldName,
        page,
        position: {
          x: startPosition.x + (depth * 20), // Indent nested fields
          y: startPosition.y + yOffset
        },
        size: {
          width: fieldType === 'checkbox' ? 25 : 200,
          height: 30
        },
        properties: {
          required: !field.isOptional,
          placeholder: displayName,
          defaultValue: field.value !== null && field.value !== '' ? String(field.value) : undefined
        },
        sampleValue: field.value !== null && field.value !== '' ? field.value : undefined,
        source: {
          type: 'json',
          originalName: field.path
        }
      });
      
      yOffset += spacing;
    }
  }
  
  return fields;
}