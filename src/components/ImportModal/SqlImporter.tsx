import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateFieldsFromSQL } from '@/parsers/sqlParser';
import type { Field } from '@/types/field.types';
import { Database } from 'lucide-react';

interface SqlImporterProps {
  onFieldsGenerated: (fields: Partial<Field>[]) => void;
}

const DEFAULT_SQL = `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  date_of_birth DATE,
  is_active BOOLEAN DEFAULT true,
  bio TEXT,
  country VARCHAR(100),
  subscription_type ENUM('free', 'basic', 'premium') DEFAULT 'free',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

export function SqlImporter({ onFieldsGenerated }: SqlImporterProps) {
  const [sql, setSql] = useState('');

  useEffect(() => {
    // Generate fields whenever SQL changes
    const timeoutId = setTimeout(() => {
      try {
        const fields = generateFieldsFromSQL(sql);
        onFieldsGenerated(fields);
      } catch (error) {
        console.error('Failed to parse SQL:', error);
        onFieldsGenerated([]);
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [sql, onFieldsGenerated]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                SQL Schema
              </CardTitle>
              <CardDescription className="text-xs">
                Paste your CREATE TABLE statement to generate fields
              </CardDescription>
            </div>
            <button
              onClick={() => setSql(DEFAULT_SQL)}
              className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
            >
              Use Example Data
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Editor
              height="300px"
              defaultLanguage="sql"
              value={sql}
              onChange={(value) => setSql(value || '')}
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

      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Automatic field type detection:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>VARCHAR/TEXT → Text input</li>
          <li>BOOLEAN → Checkbox</li>
          <li>INT/DECIMAL → Number input</li>
          <li>DATE/TIMESTAMP → Date picker</li>
          <li>ENUM → Dropdown</li>
          <li>TEXT/LONGTEXT → Textarea</li>
          <li>Email columns → Email input</li>
        </ul>
        <p className="mt-2">ID fields and timestamp columns are automatically excluded.</p>
      </div>
    </div>
  );
}