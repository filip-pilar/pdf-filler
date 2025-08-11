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
  isNested?: boolean;
  nestedInterface?: string;
}

interface ParsedInterface {
  name: string;
  properties: ParsedProperty[];
}

interface ParseResult {
  success: boolean;
  properties?: ParsedProperty[];
  interfaces?: Map<string, ParsedInterface>;
  error?: string;
  suggestion?: string;
}

export function parseTypeScriptInterface(code: string): ParseResult {
  try {
    const interfaces = new Map<string, ParsedInterface>();
    
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
    
    // Parse all interfaces in the file
    const interfaceRegex = /(?:interface|type)\s+(\w+)\s*(?:=\s*)?{([^{}]+(?:{[^{}]*}[^{}]*)*)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(cleanCode)) !== null) {
      const interfaceName = match[1];
      const interfaceContent = match[2];
      
      const interfaceProperties = parseInterfaceContent(interfaceContent);
      interfaces.set(interfaceName, {
        name: interfaceName,
        properties: interfaceProperties
      });
    }
    
    if (interfaces.size === 0) {
      return {
        success: false,
        error: 'No interfaces found in the code',
        suggestion: 'Ensure your code contains at least one interface or type definition'
      };
    }
    
    // Find the main Entity interface or use the first one
    const entityInterface = interfaces.get('Entity') || 
                           interfaces.get('EntityFlattened') || 
                           Array.from(interfaces.values())[0];
    
    // Flatten all properties
    const flattenedProperties = flattenProperties(entityInterface.properties, interfaces, '');
    
    if (flattenedProperties.length === 0) {
      return {
        success: false,
        error: 'No properties found in the interface',
        suggestion: 'Add at least one property like: fieldName: string;'
      };
    }
    
    return {
      success: true,
      properties: flattenedProperties,
      interfaces
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

/**
 * Parse the content of a single interface
 */
function parseInterfaceContent(content: string): ParsedProperty[] {
  const properties: ParsedProperty[] = [];
  
  // Split by semicolons or newlines, but be careful with nested objects
  const lines = content.split(/[;\n]/).filter(line => line.trim());
  
  for (const line of lines) {
    const property = parseProperty(line);
    if (property) {
      properties.push(property);
    }
  }
  
  return properties;
}

function parseProperty(line: string): ParsedProperty | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  
  // Match property pattern: name?: type | type[] | InterfaceName | null
  const match = trimmed.match(/^['"]?(\w+)['"]?\s*(\?)?\s*:\s*(.+)$/);
  if (!match) return null;
  
  const name = match[1];
  const isOptional = !!match[2];
  let typeStr = match[3].trim();
  
  // Remove trailing | null or | undefined
  typeStr = typeStr.replace(/\s*\|\s*(null|undefined)\s*$/, '');
  
  // Check if it's an array type
  const isArray = typeStr.endsWith('[]') || typeStr.startsWith('Array<');
  if (isArray) {
    typeStr = typeStr.replace(/\[\]$/, '').replace(/^Array<(.+)>$/, '$1');
  }
  
  // Check for union types
  const unionTypes = typeStr.includes('|') 
    ? typeStr.split('|').map(t => t.trim())
    : undefined;
  
  // Check if this is a nested interface reference
  const isNested = /^[A-Z]/.test(typeStr) && !['Date', 'String', 'Number', 'Boolean'].includes(typeStr);
  
  return {
    name,
    type: typeStr,
    isOptional,
    isArray,
    unionTypes,
    isNested,
    nestedInterface: isNested ? typeStr : undefined
  };
}

/**
 * Recursively flatten nested properties
 */
function flattenProperties(
  properties: ParsedProperty[], 
  interfaces: Map<string, ParsedInterface>,
  prefix: string
): ParsedProperty[] {
  const flattened: ParsedProperty[] = [];
  
  for (const prop of properties) {
    const propertyName = prefix ? `${prefix}_${prop.name}` : prop.name;
    
    if (prop.isNested && prop.nestedInterface) {
      // This is a reference to another interface
      const nestedInterface = interfaces.get(prop.nestedInterface);
      
      if (nestedInterface) {
        // Recursively flatten the nested interface
        const nestedProps = flattenProperties(
          nestedInterface.properties,
          interfaces,
          propertyName
        );
        flattened.push(...nestedProps);
      } else {
        // Interface not found, treat as a simple property
        flattened.push({
          ...prop,
          name: propertyName,
          isNested: false
        });
      }
    } else {
      // Simple property
      flattened.push({
        ...prop,
        name: propertyName
      });
    }
  }
  
  return flattened;
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
  const spacing = 30; // Reduced spacing to fit more fields
  const maxFieldsPerPage = 25;
  const pageHeight = 750; // Approximate max height before new page
  let currentPage = page;
  let fieldsOnCurrentPage = 0;
  
  for (const property of parseResult.properties) {
    // Skip certain meta fields that shouldn't be in the PDF
    if (property.name === 'id' || property.name === 'owner_id' || 
        property.name === 'created_at' || property.name === 'updated_at') {
      continue;
    }
    
    // Check if we need a new page
    if (fieldsOnCurrentPage >= maxFieldsPerPage || (startPosition.y + yOffset) > pageHeight) {
      currentPage++;
      yOffset = 0;
      fieldsOnCurrentPage = 0;
    }
    
    const fieldType = tsTypeToFieldType(property);
    const displayName = property.name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const field: Partial<Field> = {
      type: fieldType,
      key: sanitizeFieldKey(property.name),
      displayName,
      name: property.name,
      page: currentPage,
      position: {
        x: startPosition.x,
        y: startPosition.y + yOffset
      },
      size: {
        width: fieldType === 'checkbox' ? 25 : 200,
        height: 25
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
    fieldsOnCurrentPage++;
  }
  
  return {
    success: true,
    fields
  };
}