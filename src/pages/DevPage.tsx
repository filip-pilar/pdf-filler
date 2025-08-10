import { useState } from 'react';
import { FieldMappingTable } from '@/components/Dev/FieldMappingTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Code2, Database, FileJson } from 'lucide-react';
import { Link } from 'react-router-dom';

// Sample data with various structures
const SAMPLE_SQL_FIELDS = [
  {
    key: 'user_name',
    displayName: 'User Name',
    type: 'text' as const,
    sampleValue: 'John Doe',
    page: 1,
    source: { type: 'sql' as const, originalName: 'user_name' }
  },
  {
    key: 'email',
    displayName: 'Email',
    type: 'text' as const,
    sampleValue: 'john@example.com',
    page: 1,
    source: { type: 'sql' as const, originalName: 'email' }
  },
  {
    key: 'is_active',
    displayName: 'Is Active',
    type: 'checkbox' as const,
    sampleValue: true,
    page: 1,
    source: { type: 'sql' as const, originalName: 'is_active' }
  },
  {
    key: 'profile_image',
    displayName: 'Profile Image',
    type: 'image' as const,
    sampleValue: 'profile.jpg',
    page: 1,
    source: { type: 'sql' as const, originalName: 'profile_image' }
  }
];

const SAMPLE_JSON_FIELDS = [
  {
    key: 'status',
    displayName: 'Status',
    type: 'text' as const,
    sampleValue: ['active', 'pending', 'inactive'],
    page: 1,
    source: { type: 'json' as const, originalName: 'status' },
    structure: 'array',
    required: true,
    defaultValue: 'active'
  },
  {
    key: 'agreement',
    displayName: 'Agreement',
    type: 'text' as const,
    sampleValue: ['yes', 'no'],
    page: 1,
    source: { type: 'json' as const, originalName: 'agreement' },
    structure: 'array'
  },
  {
    key: 'departments',
    displayName: 'Departments',
    type: 'text' as const,
    sampleValue: ['Sales', 'Marketing', 'Engineering', 'HR', 'Finance', 'Legal', 'Operations', 'IT', 'Customer Support', 'Product', 'Design', 'QA'],
    page: 1,
    source: { type: 'json' as const, originalName: 'departments' },
    structure: 'array',
    required: false
  },
  {
    key: 'profile_images',
    displayName: 'Profile Images',
    type: 'text' as const,
    sampleValue: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg', 'https://example.com/img3.jpg'],
    page: 1,
    source: { type: 'json' as const, originalName: 'profile_images' },
    structure: 'array'
  },
  {
    key: 'permissions',
    displayName: 'Permissions',
    type: 'text' as const,
    sampleValue: ['read', 'write', 'delete', 'admin'],
    page: 1,
    source: { type: 'json' as const, originalName: 'permissions' },
    structure: 'array'
  },
  {
    key: 'preferences',
    displayName: 'Preferences',
    type: 'text' as const,
    sampleValue: {
      theme: 'dark',
      notifications: true,
      language: 'en',
      timezone: 'UTC'
    },
    page: 1,
    source: { type: 'json' as const, originalName: 'preferences' },
    structure: 'object',
    nestedKeys: ['theme', 'notifications', 'language', 'timezone']
  },
  {
    key: 'address',
    displayName: 'Address',
    type: 'text' as const,
    sampleValue: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA'
    },
    page: 2,
    source: { type: 'json' as const, originalName: 'address' },
    structure: 'object',
    nestedKeys: ['street', 'city', 'state', 'zip', 'country']
  },
  {
    key: 'empty_data',
    displayName: 'Empty Data',
    type: 'text' as const,
    sampleValue: [],
    page: 1,
    source: { type: 'json' as const, originalName: 'empty_data' },
    structure: 'array'
  }
];

// Additional test fields for specific features
const SAMPLE_ADVANCED_FIELDS = [
  {
    key: 'user_roles',
    displayName: 'User Roles',
    type: 'text' as const,
    sampleValue: ['admin', 'editor', 'viewer', 'contributor'],
    page: 1,
    source: { type: 'json' as const, originalName: 'user_roles' },
    structure: 'array'
  },
  {
    key: 'feature_access',
    displayName: 'Feature Access',
    type: 'text' as const,
    sampleValue: ['dashboard', 'reports', 'settings', 'billing', 'api'],
    page: 1,
    source: { type: 'json' as const, originalName: 'feature_access' },
    structure: 'array'
  },
  {
    key: 'contact_info',
    displayName: 'Contact Information',
    type: 'text' as const,
    sampleValue: {
      email: 'user@example.com',
      phone: '+1-555-0123',
      linkedin: 'linkedin.com/in/user',
      twitter: '@user'
    },
    page: 2,
    source: { type: 'json' as const, originalName: 'contact_info' },
    structure: 'object',
    nestedKeys: ['email', 'phone', 'linkedin', 'twitter']
  },
  {
    key: 'subscription_status',
    displayName: 'Subscription Status',
    type: 'text' as const,
    sampleValue: ['active', 'cancelled'],
    page: 1,
    source: { type: 'json' as const, originalName: 'subscription_status' },
    structure: 'array'
  }
];

const SAMPLE_MIXED_FIELDS = [
  ...SAMPLE_SQL_FIELDS.slice(0, 2),
  ...SAMPLE_JSON_FIELDS,
  ...SAMPLE_ADVANCED_FIELDS
];

export function DevPage() {
  const [selectedSample, setSelectedSample] = useState<'sql' | 'json' | 'mixed'>('mixed');
  const [mappedFields, setMappedFields] = useState<any[]>([]);

  const getSampleData = () => {
    switch (selectedSample) {
      case 'sql':
        return SAMPLE_SQL_FIELDS;
      case 'json':
        return SAMPLE_JSON_FIELDS;
      case 'mixed':
        return SAMPLE_MIXED_FIELDS;
      default:
        return SAMPLE_MIXED_FIELDS;
    }
  };

  const handleConfirm = (fields: any[]) => {
    setMappedFields(fields);
    console.log('Confirmed fields:', fields);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Field Mapping Table - Dev Playground</h1>
            <p className="text-muted-foreground mt-1">
              Test the new field mapping table UI with different data structures
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-colors ${selectedSample === 'sql' ? 'border-primary' : ''}`}
            onClick={() => setSelectedSample('sql')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                SQL Fields
              </CardTitle>
              <CardDescription className="text-xs">
                Simple flat fields from SQL schema
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${selectedSample === 'json' ? 'border-primary' : ''}`}
            onClick={() => setSelectedSample('json')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                JSON with Nested
              </CardTitle>
              <CardDescription className="text-xs">
                Objects and arrays that could be logic fields
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${selectedSample === 'mixed' ? 'border-primary' : ''}`}
            onClick={() => setSelectedSample('mixed')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Mixed Complex
              </CardTitle>
              <CardDescription className="text-xs">
                Combination of simple and nested structures
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Field Mapping Table</CardTitle>
            <CardDescription>
              Enhanced table with smart detection and placement preview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldMappingTable
              fields={getSampleData()}
              totalPages={3}
              onConfirm={handleConfirm}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}