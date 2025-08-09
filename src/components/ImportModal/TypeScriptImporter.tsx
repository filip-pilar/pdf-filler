import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateFieldsFromTypeScript } from '@/parsers/typeScriptParser';
import type { Field } from '@/types/field.types';
import { Code2, AlertCircle } from 'lucide-react';

interface TypeScriptImporterProps {
  onFieldsGenerated: (fields: Partial<Field>[]) => void;
}

const DEFAULT_TYPESCRIPT = `interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  age?: number;
  isActive: boolean;
  role: 'admin' | 'user' | 'guest';
  bio?: string;
  phoneNumber?: string;
  dateOfBirth: Date;
  preferences: {
    newsletter: boolean;
    notifications: boolean;
  };
  tags: string[];
}`;

export function TypeScriptImporter({ onFieldsGenerated }: TypeScriptImporterProps) {
  const [typescript, setTypescript] = useState(DEFAULT_TYPESCRIPT);
  const [parseError, setParseError] = useState<{ error: string; suggestion: string } | null>(null);

  useEffect(() => {
    // Generate fields whenever TypeScript changes
    const timeoutId = setTimeout(() => {
      const result = generateFieldsFromTypeScript(typescript);
      
      if (result.success && result.fields) {
        onFieldsGenerated(result.fields);
        setParseError(null);
      } else {
        onFieldsGenerated([]);
        setParseError({
          error: result.error || 'Failed to parse TypeScript',
          suggestion: result.suggestion || 'Check your TypeScript syntax'
        });
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [typescript, onFieldsGenerated]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            TypeScript Interface
          </CardTitle>
          <CardDescription className="text-xs">
            Paste your TypeScript interface or type definition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="300px"
              defaultLanguage="typescript"
              value={typescript}
              onChange={(value) => setTypescript(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            <div className="font-medium">{parseError.error}</div>
            <div className="text-xs">{parseError.suggestion}</div>
          </AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Automatic field type detection:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>string → Text input</li>
          <li>number → Number input</li>
          <li>boolean → Checkbox</li>
          <li>Date → Date picker</li>
          <li>Union types → Dropdown</li>
          <li>Arrays → Multi-select</li>
          <li>Optional fields (?) → Not required</li>
        </ul>
        <p className="mt-2">Nested interfaces are flattened into field paths.</p>
      </div>
    </div>
  );
}