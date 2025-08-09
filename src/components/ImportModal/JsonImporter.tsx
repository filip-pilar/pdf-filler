import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateFieldsFromJSON } from '@/parsers/jsonParser';
import type { Field } from '@/types/field.types';
import { FileJson } from 'lucide-react';

interface JsonImporterProps {
  onFieldsGenerated: (fields: Partial<Field>[]) => void;
}

const DEFAULT_JSON = `{
  "user": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "age": 30,
    "isActive": true,
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "zipCode": "10001"
    },
    "preferences": {
      "newsletter": true,
      "notifications": false
    },
    "tags": ["customer", "premium"],
    "bio": "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
  }
}`;

export function JsonImporter({ onFieldsGenerated }: JsonImporterProps) {
  const [json, setJson] = useState(DEFAULT_JSON);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    // Generate fields whenever JSON changes
    const timeoutId = setTimeout(() => {
      try {
        // Validate JSON first
        JSON.parse(json);
        setIsValid(true);
        const fields = generateFieldsFromJSON(json);
        onFieldsGenerated(fields);
      } catch {
        setIsValid(false);
        onFieldsGenerated([]);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [json, onFieldsGenerated]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            JSON Data
          </CardTitle>
          <CardDescription className="text-xs">
            Paste JSON data or schema to generate fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`border rounded-lg overflow-hidden ${!isValid ? 'border-destructive' : ''}`}>
            <Editor
              height="300px"
              defaultLanguage="json"
              value={json}
              onChange={(value) => setJson(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
          {!isValid && (
            <p className="text-xs text-destructive mt-2">Invalid JSON format</p>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Automatic field type detection:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Boolean values → Checkbox</li>
          <li>Number values → Number input</li>
          <li>String values → Text input</li>
          <li>Long strings → Textarea</li>
          <li>Arrays → Multi-select dropdown</li>
          <li>Nested objects → Grouped fields</li>
          <li>Email patterns → Email input</li>
          <li>Date patterns → Date picker</li>
        </ul>
        <p className="mt-2">Field names are derived from object keys.</p>
      </div>
    </div>
  );
}