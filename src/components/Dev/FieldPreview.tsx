import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface FieldMapping {
  key: string;
  displayName: string;
  type: any;
  fieldVariant: string;
  options?: Array<{ label: string; value: string }>;
  layoutDirection?: 'vertical' | 'horizontal' | 'grid';
  gridColumns?: 2 | 3 | 4;
  checkboxMapping?: {
    checkedValue: string;
    uncheckedValue: string;
    defaultChecked: boolean;
  };
  multiSelect?: boolean;
  defaultValue?: any;
  required?: boolean;
  placementCount?: number;
  flattenedFields?: any[];
}

export const FieldPreview: React.FC<{ mapping: FieldMapping }> = ({ mapping }) => {
  const renderField = () => {
    switch(mapping.fieldVariant) {
      case 'dropdown':
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName}
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select defaultValue={mapping.defaultValue || mapping.options?.[0]?.value}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {mapping.options?.map(opt => 
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );

      case 'radio-group':
        const radioLayout = mapping.layoutDirection === 'horizontal' 
          ? 'flex-row gap-4' 
          : mapping.layoutDirection === 'grid'
          ? `grid grid-cols-${mapping.gridColumns || 2} gap-4`
          : 'flex-col gap-2';
        
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName}
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <RadioGroup 
              defaultValue={mapping.defaultValue || mapping.options?.[0]?.value}
              className={`flex ${radioLayout}`}
            >
              {mapping.options?.map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${mapping.key}-${opt.value}`} />
                  <Label htmlFor={`${mapping.key}-${opt.value}`} className="text-sm font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'checkbox-group':
      case 'checkbox-set':
        const checkboxLayout = mapping.layoutDirection === 'horizontal' 
          ? 'flex-row gap-4' 
          : mapping.layoutDirection === 'grid'
          ? `grid grid-cols-${mapping.gridColumns || 2} gap-4`
          : 'flex-col gap-2';
        
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName}
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
              {mapping.multiSelect && (
                <Badge className="ml-2" variant="secondary">Multi-select</Badge>
              )}
            </Label>
            <div className={`flex ${checkboxLayout}`}>
              {mapping.options?.map(opt => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`${mapping.key}-${opt.value}`}
                    defaultChecked={mapping.defaultValue?.includes?.(opt.value)}
                  />
                  <Label htmlFor={`${mapping.key}-${opt.value}`} className="text-sm font-normal">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'single':
        if (mapping.type === 'checkbox') {
          return (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={mapping.key}
                defaultChecked={mapping.checkboxMapping?.defaultChecked || mapping.defaultValue}
              />
              <Label htmlFor={mapping.key} className="text-sm">
                {mapping.displayName}
                {mapping.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {mapping.checkboxMapping && (
                <Badge variant="outline" className="ml-2 text-xs">
                  ✓ {mapping.checkboxMapping.checkedValue} / ✗ {mapping.checkboxMapping.uncheckedValue}
                </Badge>
              )}
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName}
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input 
              type="text" 
              placeholder={`Enter ${mapping.displayName.toLowerCase()}`}
              defaultValue={mapping.defaultValue}
              className="w-full"
            />
          </div>
        );

      case 'multiple-fields':
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName} ({mapping.placementCount} fields)
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: Math.min(mapping.placementCount || 1, 4) }, (_, i) => (
                <Input 
                  key={i}
                  type="text" 
                  placeholder={`Field ${i + 1}`}
                  className="text-sm"
                />
              ))}
              {(mapping.placementCount || 0) > 4 && (
                <div className="text-xs text-muted-foreground col-span-2">
                  ... and {(mapping.placementCount || 0) - 4} more fields
                </div>
              )}
            </div>
          </div>
        );

      case 'flatten-fields':
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName} (flattened)
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {mapping.flattenedFields?.slice(0, 4).map((field, i) => (
                <div key={i} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{field.displayName}</Label>
                  <Input 
                    type="text" 
                    placeholder={field.displayName}
                    className="text-sm h-8"
                  />
                </div>
              ))}
              {(mapping.flattenedFields?.length || 0) > 4 && (
                <div className="text-xs text-muted-foreground col-span-2">
                  ... and {(mapping.flattenedFields?.length || 0) - 4} more fields
                </div>
              )}
            </div>
          </div>
        );

      case 'json-string':
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName} (JSON)
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <textarea 
              className="w-full p-2 border rounded-md font-mono text-xs"
              rows={3}
              placeholder='{"key": "value"}'
              defaultValue={mapping.defaultValue ? JSON.stringify(mapping.defaultValue, null, 2) : ''}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Label className="text-sm">
              {mapping.displayName}
              {mapping.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input 
              type="text" 
              placeholder={`Enter ${mapping.displayName.toLowerCase()}`}
              defaultValue={mapping.defaultValue}
              className="w-full"
            />
          </div>
        );
    }
  };

  return (
    <Card className="p-4 w-full max-w-md">
      {renderField()}
    </Card>
  );
};