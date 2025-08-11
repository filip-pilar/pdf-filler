import type { Field, FieldType } from '@/types/field.types';

// Sanitize key to remove spaces and special characters
function sanitizeFieldKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '');  // Remove all non-alphanumeric chars except underscore
}

interface ParsedColumn {
  name: string;
  type: string;
  constraints: string[];
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue?: string;
}

export function parseSQLCreateTable(sql: string): ParsedColumn[] {
  const columns: ParsedColumn[] = [];
  
  // Remove comments and normalize whitespace
  const cleanSQL = sql
    .replace(/--.*$/gm, '') // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Extract the content between CREATE TABLE and the closing parenthesis
  const tableMatch = cleanSQL.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w`"]+\s*\(([\s\S]*)\)/i);
  if (!tableMatch) return columns;
  
  const tableContent = tableMatch[1];
  
  // Split by comma, but be careful with commas inside parentheses
  const columnDefinitions = splitByComma(tableContent);
  
  for (const def of columnDefinitions) {
    const trimmedDef = def.trim();
    
    // Skip table constraints (PRIMARY KEY, FOREIGN KEY, etc.)
    if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i.test(trimmedDef)) {
      continue;
    }
    
    // Parse column definition
    const column = parseColumnDefinition(trimmedDef);
    if (column) {
      columns.push(column);
    }
  }
  
  return columns;
}

function splitByComma(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let parenDepth = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    else if (char === ',' && parenDepth === 0) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  
  if (current) result.push(current);
  return result;
}

function parseColumnDefinition(def: string): ParsedColumn | null {
  // Match column name and type
  const match = def.match(/^[\s]*[`"]?(\w+)[`"]?\s+(\w+(?:\([^)]+\))?)/i);
  if (!match) return null;
  
  const name = match[1];
  const type = match[2].toUpperCase();
  const constraints: string[] = [];
  
  const upperDef = def.toUpperCase();
  const isPrimaryKey = upperDef.includes('PRIMARY KEY');
  const isNotNull = upperDef.includes('NOT NULL');
  const isUnique = upperDef.includes('UNIQUE');
  
  // Extract default value if present
  const defaultMatch = def.match(/DEFAULT\s+([^,\s]+)/i);
  const defaultValue = defaultMatch ? defaultMatch[1].replace(/['"]/g, '') : undefined;
  
  if (isPrimaryKey) constraints.push('PRIMARY KEY');
  if (isNotNull) constraints.push('NOT NULL');
  if (isUnique) constraints.push('UNIQUE');
  
  return {
    name,
    type,
    constraints,
    isPrimaryKey,
    isNotNull,
    isUnique,
    defaultValue
  };
}

export function sqlColumnToFieldType(column: ParsedColumn): FieldType {
  const type = column.type.toUpperCase();
  const name = column.name.toLowerCase();
  
  // Check name patterns first
  if (name.includes('date') || name.includes('_at')) return 'text'; // dates use text field
  if (name.includes('phone') || name.includes('tel')) return 'text';
  if (name.includes('url') || name.includes('website')) return 'text';
  
  // Check SQL types
  if (type.startsWith('BOOL') || type === 'TINYINT(1)' || type === 'BIT') return 'checkbox';
  if (type.startsWith('DATE') || type.startsWith('TIME') || type.startsWith('YEAR')) return 'text'; // dates use text field
  
  // Default to text for VARCHAR, CHAR, etc.
  return 'text';
}

export function generateFieldsFromSQL(sql: string, startPosition = { x: 50, y: 50 }, page = 1): Partial<Field>[] {
  const columns = parseSQLCreateTable(sql);
  const fields: Partial<Field>[] = [];
  
  let yOffset = 0;
  const spacing = 40;
  
  for (const column of columns) {
    // Skip ID fields and timestamps
    if (column.isPrimaryKey && column.name.toLowerCase() === 'id') continue;
    if (['created_at', 'updated_at', 'deleted_at'].includes(column.name.toLowerCase())) continue;
    
    const fieldType = sqlColumnToFieldType(column);
    const displayName = column.name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    fields.push({
      type: fieldType,
      key: sanitizeFieldKey(column.name),
      displayName,
      name: column.name,
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
        required: column.isNotNull && !column.defaultValue,
        defaultValue: column.defaultValue,
        placeholder: displayName
      },
      source: {
        type: 'sql',
        originalName: column.name
      }
    });
    
    yOffset += spacing;
  }
  
  return fields;
}