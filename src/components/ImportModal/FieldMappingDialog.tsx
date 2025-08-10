import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFieldStore } from '@/store/fieldStore';
import type { Field, FieldType } from '@/types/field.types';
import { Type, CheckSquare, Image, PenTool, Layers, MapPin, Import } from 'lucide-react';
import { toast } from 'sonner';

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Partial<Field>[];
  onConfirm: (mappedFields: Partial<Field>[]) => void;
}

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { value: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" /> },
  { value: 'image', label: 'Image', icon: <Image className="h-4 w-4" /> },
  { value: 'signature', label: 'Signature', icon: <PenTool className="h-4 w-4" /> },
];

export function FieldMappingDialog({ open, onOpenChange, fields: initialFields, onConfirm }: FieldMappingDialogProps) {
  const [mappedFields, setMappedFields] = useState<Partial<Field>[]>([]);
  const [activeTab, setActiveTab] = useState('mapping');
  const { totalPages } = useFieldStore();
  const effectivePages = totalPages || 1; // Default to 1 if no PDF loaded

  // Update mappedFields when dialog opens with new fields
  React.useEffect(() => {
    if (open && initialFields && initialFields.length > 0) {
      const mapped = initialFields.map(field => ({
        ...field,
        type: field.type || 'text',
        page: field.page || 1,
        position: field.position || { x: 100, y: 100 },
        size: field.size || getDefaultSize(field.type || 'text'),
      }));
      setMappedFields(mapped);
      setActiveTab('mapping'); // Reset to first tab
    }
  }, [open, initialFields]);

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...mappedFields];
    newFields[index] = { 
      ...newFields[index], 
      ...updates,
      // Update size when type changes
      size: updates.type ? getDefaultSize(updates.type) : newFields[index].size
    };
    setMappedFields(newFields);
  };

  const handlePageAssignment = (strategy: 'all-first' | 'distribute') => {
    const newFields = [...mappedFields];
    
    if (strategy === 'all-first') {
      newFields.forEach(field => field.page = 1);
    } else if (strategy === 'distribute') {
      const fieldsPerPage = Math.ceil(newFields.length / effectivePages);
      newFields.forEach((field, i) => {
        field.page = Math.min(Math.floor(i / fieldsPerPage) + 1, effectivePages);
      });
    }
    
    setMappedFields(newFields);
  };

  const handleConfirm = () => {
    onConfirm(mappedFields);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setMappedFields([]);
    onOpenChange(false);
  };

  const getPageFieldCount = (page: number) => {
    return mappedFields.filter(f => f.page === page).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Imported Fields</DialogTitle>
          <DialogDescription>
            Map field types and assign to PDF pages before importing
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mapping" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Field Types
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Page Assignment
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="mapping" className="mt-0 h-full">
              {mappedFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fields to configure. Please import a schema first.
                </div>
              ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {mappedFields.map((field, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {field.key}
                              </Badge>
                              {field.displayName && field.displayName !== field.key && (
                                <span className="text-sm text-muted-foreground">
                                  ({field.displayName})
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary">
                              Page {field.page || 1}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-xs text-muted-foreground mb-1">Field Type</Label>
                              <Select
                                value={field.type || 'text'}
                                onValueChange={(value: FieldType) => updateField(index, { type: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPE_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        {option.icon}
                                        <span>{option.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {field.sampleValue !== undefined && (
                              <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1">Sample Value</Label>
                                <div className="h-8 px-3 flex items-center bg-muted rounded-md">
                                  <span className="text-sm truncate">
                                    {typeof field.sampleValue === 'boolean' 
                                      ? field.sampleValue ? 'true' : 'false'
                                      : String(field.sampleValue)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="pages" className="mt-0 space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2">Quick Assignment</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageAssignment('all-first')}
                    >
                      All to Page 1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePageAssignment('distribute')}
                      disabled={effectivePages <= 1}
                    >
                      Distribute Evenly
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm mb-2">Individual Assignment</Label>
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {mappedFields.map((field, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {field.key}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {field.type || 'text'}
                            </Badge>
                          </div>
                          <Select
                            value={(field.page || 1).toString()}
                            onValueChange={(value) => updateField(index, { page: parseInt(value) })}
                          >
                            <SelectTrigger className="h-7 w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: effectivePages }, (_, i) => i + 1).map(page => (
                                <SelectItem key={page} value={page.toString()}>
                                  Page {page}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium mb-2">Page Summary</p>
                      {Array.from({ length: effectivePages }, (_, i) => i + 1).map(page => {
                        const count = getPageFieldCount(page);
                        return (
                          <div key={page} className="flex items-center justify-between text-xs">
                            <span>Page {page}:</span>
                            <Badge variant={count > 0 ? 'default' : 'secondary'}>
                              {count} field{count !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex items-center gap-2">
            <Import className="h-4 w-4" />
            Import {mappedFields.length} Fields
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultSize(type: FieldType): { width: number; height: number } {
  switch(type) {
    case 'checkbox':
      return { width: 25, height: 25 };
    case 'signature':
      return { width: 150, height: 40 };
    case 'image':
      return { width: 150, height: 100 };
    default:
      return { width: 200, height: 30 };
  }
}