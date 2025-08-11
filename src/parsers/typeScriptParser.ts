import type { Field, FieldType } from '@/types/field.types';

// Sanitize key to remove spaces and special characters
function sanitizeFieldKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '');  // Remove all non-alphanumeric chars except underscore
}

interface ParsedProperty {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  unionTypes?: string[];
}

interface ParseResult {
  success: boolean;
  properties?: ParsedProperty[];
  error?: string;
  suggestion?: string;
}

export function parseTypeScriptInterface(code: string): ParseResult {
  try {
    const properties: ParsedProperty[] = [];
    
    // Check for empty input
    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: 'No code provided',
        suggestion: 'Please provide a TypeScript interface or type definition'
      };
    }
    
    // Remove comments
    const cleanCode = code
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
    
    // Check for basic syntax issues
    const openBraces = (cleanCode.match(/{/g) || []).length;
    const closeBraces = (cleanCode.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return {
        success: false,
        error: `Mismatched braces: ${openBraces} opening, ${closeBraces} closing`,
        suggestion: 'Check that all opening braces { have corresponding closing braces }'
      };
    }
    
    // Find interface or type definition
    const interfaceMatch = cleanCode.match(/(?:interface|type)\s+\w+\s*(?:=\s*)?{([^}]+)}/);
    if (!interfaceMatch) {
      // Check for common mistakes
      if (cleanCode.includes('class ')) {
        return {
          success: false,
          error: 'Class definitions are not supported',
          suggestion: 'Please provide an interface or type definition instead of a class'
        };
      }
      if (!cleanCode.includes('interface') && !cleanCode.includes('type')) {
        return {
          success: false,
          error: 'No interface or type definition found',
          suggestion: 'Start with "interface MyForm {" or "type MyForm = {"'
        };
      }
      return {
        success: false,
        error: 'Could not parse the interface structure',
        suggestion: 'Ensure your interface follows the pattern: interface Name { field: type; }'
      };
    }
    
    const content = interfaceMatch[1];
    
    // Parse each property
    const lines = content.split(/[;,\n]/).filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const property = parseProperty(line);
        if (property) {
          properties.push(property);
        }
      } catch {
        return {
          success: false,
          error: `Failed to parse property: "${line.trim()}"`,
          suggestion: 'Check the syntax of this property definition'
        };
      }
    }
    
    if (properties.length === 0) {
      return {
        success: false,
        error: 'No properties found in the interface',
        suggestion: 'Add at least one property like: fieldName: string;'
      };
    }
    
    return {
      success: true,
      properties
    };
  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to parse TypeScript code';
    if (errorMessage.includes('Unexpected token')) {
      return {
        success: false,
        error: 'Syntax error in TypeScript code',
        suggestion: 'Check for missing semicolons, quotes, or brackets'
      };
    }
    
    return {
      success: false,
      error: errorMessage,
      suggestion: 'Ensure your TypeScript interface is valid'
    };
  }
}

function parseProperty(line: string): ParsedProperty | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  
  // Match property pattern: name?: type | type[] | type1 | type2
  const match = trimmed.match(/^['"]?(\w+)['"]?\s*(\?)?\s*:\s*(.+)$/);
  if (!match) return null;
  
  const name = match[1];
  const isOptional = !!match[2];
  let typeStr = match[3].trim();
  
  // Check if it's an array type
  const isArray = typeStr.endsWith('[]') || typeStr.startsWith('Array<');
  if (isArray) {
    typeStr = typeStr.replace(/\[\]$/, '').replace(/^Array<(.+)>$/, '$1');
  }
  
  // Check for union types
  const unionTypes = typeStr.includes('|') 
    ? typeStr.split('|').map(t => t.trim())
    : undefined;
  
  return {
    name,
    type: typeStr,
    isOptional,
    isArray,
    unionTypes
  };
}

function tsTypeToFieldType(property: ParsedProperty): FieldType {
  const name = property.name.toLowerCase();
  const type = property.type.toLowerCase();
  
  // Check name patterns first
  if (name.includes('date') || name.includes('time') || name.includes('_at')) return 'text'; // dates use text field
  if (name.includes('phone') || name.includes('tel')) return 'text';
  if (name.includes('url') || name.includes('website') || name.includes('link')) return 'text';
  
  // Check TypeScript types
  if (type === 'boolean') return 'checkbox';
  if (type === 'date') return 'text'; // dates use text field
  
  // Union types default to text
  if (property.unionTypes && property.unionTypes.every(t => t.startsWith("'") || t.startsWith('"'))) {
    return 'text';
  }
  
  // Arrays default to text
  if (property.isArray) return 'text';
  
  return 'text';
}

interface GenerateFieldsResult {
  success: boolean;
  fields?: Partial<Field>[];
  error?: string;
  suggestion?: string;
}

export function generateFieldsFromTypeScript(code: string, startPosition = { x: 50, y: 50 }, page = 1): GenerateFieldsResult {
  const parseResult = parseTypeScriptInterface(code);
  
  if (!parseResult.success || !parseResult.properties) {
    return {
      success: false,
      error: parseResult.error,
      suggestion: parseResult.suggestion
    };
  }
  
  const fields: Partial<Field>[] = [];
  let yOffset = 0;
  const spacing = 40;
  
  for (const property of parseResult.properties) {
    const fieldType = tsTypeToFieldType(property);
    const displayName = property.name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const field: Partial<Field> = {
      type: fieldType,
      key: sanitizeFieldKey(property.name),
      displayName,
      name: property.name,
      page,
      position: {
        x: startPosition.x,
        y: startPosition.y + yOffset
      },
      size: {
        width: fieldType === 'checkbox' ? 25 : 200,
        height: 30
      },
      properties: {
        required: !property.isOptional,
        placeholder: displayName
      },
      source: {
        type: 'typescript',
        originalName: property.name
      }
    };
    
    
    fields.push(field);
    yOffset += spacing;
  }
  
  return {
    success: true,
    fields
  };
}