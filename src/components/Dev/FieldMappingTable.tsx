import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import type { FieldType } from '@/types/field.types';
import { 
  Search,
  Undo2,
  Redo2,
  FileText
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

type FieldVariant = 'single' | 'text-multi' | 'checkbox-multi' | 'text-list';
type LayoutDirection = 'vertical' | 'horizontal' | 'grid';

interface CheckboxMapping {
  checkedValue: string;
  uncheckedValue: string;
  defaultChecked: boolean;
}

interface FieldMapping {
  id: string; // Stable identifier for React key
  key: string;
  displayName: string;
  type: FieldType | 'logic';
  fieldVariant: FieldVariant;
  page: number;
  enabled: boolean;
  sampleValue?: any;
  structure?: 'object' | 'array' | 'simple';
  itemCount?: number;
  nestedKeys?: string[];
  options?: Array<{ label: string; value: string }>;
  layoutDirection?: LayoutDirection;
  groupSpacing?: number;
  placementCount: number;
  multiFieldNames?: string[];
  checkboxMapping?: CheckboxMapping;
  multiSelect?: boolean;
  gridColumns?: 2 | 3 | 4;
}

interface FieldMappingTableProps {
  fields: any[];
  totalPages: number;
  onConfirm: (mappedFields: FieldMapping[]) => void;
}

export function FieldMappingTable({ fields, totalPages, onConfirm }: FieldMappingTableProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<FieldMapping[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  


  const looksLikePermissions = (field: any): boolean => {
    const permissionPatterns = [
      'permissions', 'roles', 'features', 'capabilities',
      'access', 'privileges', 'scopes', 'rights'
    ];
    
    const keyLower = field.key.toLowerCase();
    const hasPermissionKey = permissionPatterns.some(pattern => keyLower.includes(pattern));
    
    if (!hasPermissionKey) return false;
    
    if (Array.isArray(field.sampleValue)) {
      const values = field.sampleValue.map((v: any) => String(v).toLowerCase());
      const actionWords = ['read', 'write', 'delete', 'create', 'update', 'admin', 'view', 'edit', 'manage'];
      return values.some((v: string) => actionWords.includes(v));
    }
    
    return false;
  };

  const analyzeField = (field: any): Partial<FieldMapping> => {
    const fieldName = field.key.toLowerCase();
    
    // Check for image/signature fields first (by field name)
    if (fieldName.includes('image') || fieldName.includes('photo') || fieldName.includes('picture') || 
        fieldName.includes('img') || fieldName.includes('avatar') || fieldName.includes('logo')) {
      // Check if it's a URL
      if (typeof field.sampleValue === 'string' && 
          (field.sampleValue.startsWith('http') || field.sampleValue.startsWith('data:image'))) {
        return {
          type: 'image',
          fieldVariant: 'single',
          structure: 'simple',
          placementCount: 1
        };
      }
    }
    
    if (fieldName.includes('signature') || fieldName.includes('sig')) {
      if (typeof field.sampleValue === 'string' && 
          (field.sampleValue.startsWith('http') || field.sampleValue.startsWith('data:image'))) {
        return {
          type: 'signature',
          fieldVariant: 'single',
          structure: 'simple',
          placementCount: 1
        };
      }
    }
    
    // Handle arrays
    if (field.structure === 'array' && Array.isArray(field.sampleValue)) {
      const itemCount = field.sampleValue.length;
      
      // Check if URLs (likely images)
      const hasUrls = field.sampleValue.every((v: any) => 
        typeof v === 'string' && (v.startsWith('http') || v.includes('.jpg') || v.includes('.png'))
      );
      
      if (hasUrls) {
        return {
          type: 'image',
          fieldVariant: 'text-multi',  // Default to separate images
          structure: 'array',
          itemCount,
          placementCount: itemCount,
          multiFieldNames: field.sampleValue.map((_: any, i: number) => `${field.key}_${i + 1}`)
        };
      }

      // Check for multi-select patterns (permissions, features, etc.)
      if (looksLikePermissions(field)) {
        return {
          type: 'checkbox',
          fieldVariant: 'text-list',
          structure: 'array',
          itemCount,
          placementCount: 1,
          multiSelect: true,
          layoutDirection: 'vertical',
          groupSpacing: 10,
          options: field.sampleValue.map((v: any) => ({ 
            label: String(v), 
            value: String(v) 
          }))
        };
      }

      // Default to 'combine as text' for most arrays
      // Developer can change to separate text or checkmarks as needed

      return {
        type: 'text',
        fieldVariant: 'text-list',  // Default to 'combine as text'
        structure: 'array',
        itemCount,
        placementCount: 1,
        options: field.sampleValue.map((v: any) => ({ 
          label: String(v), 
          value: String(v) 
        }))
      };
    }

    // Handle objects
    if (field.structure === 'object' && field.nestedKeys) {
      const keyCount = field.nestedKeys.length;
      
      if (keyCount === 0) {
        // Empty object
        return {
          type: 'logic',
          fieldVariant: 'text-multi',
          structure: 'object',
          itemCount: 0,
          placementCount: 1,
          options: []
        };
      }

      // Default objects to logic fields with flattening option
      return {
        type: 'logic',
        fieldVariant: 'text-multi',
        structure: 'object',
        itemCount: keyCount,
        placementCount: 1,
        layoutDirection: 'vertical',
        groupSpacing: 10,
        options: field.nestedKeys.map((key: string) => ({
          label: key,
          value: key
        }))
      };
    }

    // Handle simple fields
    if (typeof field.sampleValue === 'boolean' || field.key.startsWith('is_') || field.key.startsWith('has_')) {
      return {
        type: 'checkbox',
        fieldVariant: 'single',
        structure: 'simple',
        placementCount: 1
      };
    }

    if (field.key.includes('signature')) {
      return {
        type: 'signature',
        fieldVariant: 'single',
        structure: 'simple',
        placementCount: 1
      };
    }

    if (field.key.includes('image') || field.key.includes('photo') || field.key.includes('picture')) {
      return {
        type: 'image',
        fieldVariant: 'single',
        structure: 'simple',
        placementCount: 1
      };
    }

    // Default to text
    return {
      type: field.type || 'text',
      fieldVariant: 'single',
      structure: 'simple',
      placementCount: 1
    };
  };

  // const _looksLikeBoolean = (values: any[]): boolean => {
  //   const stringValues = values.map(v => String(v).toLowerCase());
  //   const booleanPairs = [
  //     ['yes', 'no'],
  //     ['true', 'false'],
  //     ['1', '0'],
  //     ['on', 'off'],
  //     ['active', 'inactive']
  //   ];
  //   
  //   return booleanPairs.some(pair => 
  //     (stringValues.includes(pair[0]) && stringValues.includes(pair[1]))
  //   );
  // };

  const ensureUniqueFieldNames = useCallback((mappingList: FieldMapping[]): FieldMapping[] => {
    const nameCount = new Map<string, number>();
    
    return mappingList.map(field => {
      let finalName = field.key;
      
      if (nameCount.has(finalName)) {
        const count = nameCount.get(finalName)! + 1;
        nameCount.set(finalName, count);
        finalName = `${finalName}_${count}`;
      } else {
        nameCount.set(finalName, 1);
      }
      
      return finalName !== field.key ? { ...field, key: finalName } : field;
    });
  }, []);

  useEffect(() => {
    const processedFields: FieldMapping[] = [];
    
    fields.forEach((field, idx) => {
      // Auto-flatten objects into separate fields
      if (field.structure === 'object' && field.nestedKeys && field.nestedKeys.length > 0) {
        field.nestedKeys.forEach((nestedKey: any) => {
          const nestedValue = field.sampleValue?.[nestedKey];
          processedFields.push({
            id: `field-${idx}-${field.key}-${nestedKey}`,
            key: `${field.key}_${nestedKey}`,
            displayName: `${field.key}.${nestedKey}`,
            type: 'text' as FieldType,
            fieldVariant: 'single' as FieldVariant,
            page: field.page || 1,
            enabled: true,
            sampleValue: nestedValue,
            structure: 'simple' as const,
            placementCount: 1,
          });
        });
      } else {
        // Process non-object fields normally
        const analysis = analyzeField(field);
        processedFields.push({
          id: `field-${idx}-${field.key}`,
          type: 'text' as FieldType,
          fieldVariant: 'single' as FieldVariant,
          placementCount: 1,
          ...analysis,
          key: field.key,
          displayName: field.displayName || field.key,
          page: field.page || 1,
          enabled: true,
          sampleValue: field.sampleValue,
        });
      }
    });
    
    const uniqueMappings = ensureUniqueFieldNames(processedFields);
    setMappings(uniqueMappings);
    setHistory([uniqueMappings]);
    setHistoryIndex(0);
  }, [fields, ensureUniqueFieldNames]);

  const pushHistory = useCallback((newState: FieldMapping[]) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setMappings(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setMappings(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);



  const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
    const newMappings = [...mappings];
    const current = newMappings[index];
    
    // Handle type/variant changes
    if (updates.fieldVariant && updates.fieldVariant !== current.fieldVariant) {
      // Handle variant changes
      if (updates.fieldVariant === 'text-list') {
        // Combine as text (1 place)
        updates.type = 'text';
        updates.placementCount = 1;
      } else if (updates.fieldVariant === 'text-multi') {
        // Separate text (multiple places)
        updates.type = 'text';
        updates.placementCount = current.itemCount || 1;
        if (current.itemCount && !updates.multiFieldNames) {
          updates.multiFieldNames = Array.from({ length: current.itemCount }, (_, i) => 
            `${current.key}_${i + 1}`
          );
        }
      } else if (updates.fieldVariant === 'checkbox-multi') {
        // Checkmarks (multiple places)
        updates.type = 'checkbox';
        updates.placementCount = current.itemCount || 1;
      } else {
        updates.placementCount = 1;
      }
    }
    
    newMappings[index] = { ...current, ...updates };
    
    // Ensure unique names if key was changed
    if (updates.key) {
      const uniqueMappings = ensureUniqueFieldNames(newMappings);
      setMappings(uniqueMappings);
      pushHistory(uniqueMappings);
    } else {
      setMappings(newMappings);
      pushHistory(newMappings);
    }
  };


  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      // Only select keys that actually exist in current filtered mappings
      const validKeys = new Set(filteredMappings.map(m => m.key));
      setSelectedKeys(validKeys);
    } else {
      setSelectedKeys(new Set());
    }
  };

  const toggleFieldSelection = (key: string) => {
    const newSelection = new Set(selectedKeys);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    setSelectedKeys(newSelection);
    setSelectAll(newSelection.size === filteredMappings.length);
  };

  const handleBulkInclude = (include: boolean) => {
    const newMappings = mappings.map(m => 
      selectedKeys.has(m.key) ? { ...m, enabled: include } : m
    );
    setMappings(newMappings);
    pushHistory(newMappings);
  };

  const handleBulkMovePage = (targetPage: number) => {
    const newMappings = mappings.map(m => 
      selectedKeys.has(m.key) ? { ...m, page: targetPage } : m
    );
    setMappings(newMappings);
    pushHistory(newMappings);
    // Clear selection after move
    setSelectedKeys(new Set());
    setSelectAll(false);
  };

  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesSearch = m.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           m.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [mappings, searchTerm]);

  // Group mappings by page for sectioned display
  const mappingsByPage = useMemo(() => {
    const grouped = new Map<number, typeof filteredMappings>();
    filteredMappings.forEach(mapping => {
      const page = mapping.page;
      if (!grouped.has(page)) {
        grouped.set(page, []);
      }
      grouped.get(page)!.push(mapping);
    });
    // Sort by page number and return as array
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredMappings]);



  const renderTypeConfig = (mapping: FieldMapping, index: number) => {
    // For simple fields, just show type dropdown
    if (mapping.structure === 'simple' || !mapping.itemCount) {
      return (
        <Select
          value={mapping.type}
          onValueChange={(value: FieldType | 'logic') => updateMapping(index, { type: value })}
          disabled={!mapping.enabled}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="checkbox">Checkmark</SelectItem>
            <SelectItem value="image">Image (from URL)</SelectItem>
            <SelectItem value="signature">Signature (from URL)</SelectItem>
          </SelectContent>
        </Select>
      );
    }


    // For arrays, show clear PDF placement options
    if (mapping.structure === 'array' && mapping.itemCount) {
      const getArrayFieldLabel = (variant: string) => {
        switch(variant) {
          case 'text-list': return 'Text list';
          case 'text-multi': return 'Text (multiple)';
          case 'checkbox-multi': return 'Checkmarks (multiple)';
          default: return variant;
        }
      };
      
      return (
        <Select
          value={mapping.fieldVariant}
          onValueChange={(value: FieldVariant) => updateMapping(index, { fieldVariant: value })}
          disabled={!mapping.enabled}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue>{getArrayFieldLabel(mapping.fieldVariant || 'text-list')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text-list">
              <div className="space-y-0.5">
                <div className="font-medium">Text list</div>
                <div className="text-xs text-muted-foreground">Value1, Value2...</div>
              </div>
            </SelectItem>
            <SelectItem value="text-multi">
              <div className="space-y-0.5">
                <div className="font-medium">Text (multiple)</div>
                <div className="text-xs text-muted-foreground">Each at own place</div>
              </div>
            </SelectItem>
            <SelectItem value="checkbox-multi">
              <div className="space-y-0.5">
                <div className="font-medium">Checkmarks (multiple)</div>
                <div className="text-xs text-muted-foreground">✓ at each place</div>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    // Fallback for any other structure
    return <div className="text-sm text-muted-foreground">-</div>;
  };



  const getTotalPlacements = () => {
    return mappings.filter(m => m.enabled).reduce((sum, m) => sum + m.placementCount, 0);
  };

  const getPlacementsByPage = () => {
    const byPage: Record<number, number> = {};
    mappings.filter(m => m.enabled).forEach(m => {
      byPage[m.page] = (byPage[m.page] || 0) + 1;
    });
    return byPage;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header with search, filters, and bulk actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex === 0}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
                title="Redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${selectedKeys.size > 0 ? 'bg-muted/50' : 'bg-background'}`}>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedKeys.size > 0 ? (
                  <>{selectedKeys.size} field{selectedKeys.size !== 1 ? 's' : ''} selected</>
                ) : (
                  <span className="text-muted-foreground">No fields selected</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkInclude(true)}
                  disabled={selectedKeys.size === 0}
                >
                  Include All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkInclude(false)}
                  disabled={selectedKeys.size === 0}
                >
                  Exclude All
                </Button>
                <Select 
                  onValueChange={(value) => handleBulkMovePage(parseInt(value))}
                  disabled={selectedKeys.size === 0}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue placeholder="Move to Page" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <SelectItem key={page} value={page.toString()}>
                        Page {page}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedKeys.size > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedKeys(new Set());
                      setSelectAll(false);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {filteredMappings.filter(m => m.enabled).length} of {filteredMappings.length} included
              </span>
              {searchTerm && (
                <Badge variant="secondary">
                  Filtered: {filteredMappings.length}/{mappings.length}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <div className="flex justify-center">
                    <Checkbox 
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all for bulk actions"
                    />
                  </div>
                </TableHead>
                <TableHead className="w-16 text-center">Include</TableHead>
                <TableHead className="w-48">Data Key</TableHead>
                <TableHead className="w-48 min-w-[12rem] max-w-[12rem]">Field Type</TableHead>
                <TableHead className="w-32 text-center">Locations Needed</TableHead>
                <TableHead className="w-20 text-center">Page</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappingsByPage.map(([pageNum, pageMappings], pageIndex) => (
                <React.Fragment key={`page-${pageNum}`}>
                  {/* Page Section Header */}
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2">
                    <TableCell colSpan={6} className="h-10">
                      <div className="flex items-center gap-2 h-full">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Page {pageNum}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Page Fields */}
                  {pageMappings.map((mapping) => {
                    const originalIndex = mappings.findIndex(m => m.key === mapping.key);
                    return (
                      <TableRow 
                        key={mapping.id} 
                        className={`${!mapping.enabled ? 'opacity-50' : ''} ${pageIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedKeys.has(mapping.key)}
                          onCheckedChange={() => toggleFieldSelection(mapping.key)}
                          aria-label={`Select ${mapping.key} for bulk actions`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={mapping.enabled}
                          onCheckedChange={(checked) => 
                            updateMapping(originalIndex, { enabled: checked as boolean })
                          }
                          aria-label={`Include ${mapping.key} in PDF`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={mapping.key}
                        onChange={(e) => updateMapping(originalIndex, { key: e.target.value })}
                        className="h-8 -ml-[1px] pl-0 pr-2 font-mono text-sm bg-transparent border-0 border-b border-dashed border-muted-foreground/30 hover:border-solid hover:border-muted-foreground hover:bg-muted/30 focus:border focus:rounded-md focus:border-primary focus:bg-background focus:pl-2 transition-all"
                        placeholder="data.key"
                        disabled={!mapping.enabled}
                      />
                    </TableCell>
                    <TableCell className="w-48 min-w-[12rem] max-w-[12rem]">
                      {renderTypeConfig(mapping, originalIndex)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={mapping.placementCount > 1 ? "secondary" : "outline"} className="font-mono">
                        {mapping.placementCount || 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <Select
                          value={mapping.page.toString()}
                          onValueChange={(value) => updateMapping(originalIndex, { page: parseInt(value) })}
                          disabled={!mapping.enabled}
                        >
                          <SelectTrigger className="h-8 w-16">
                            <SelectValue />
                          </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <SelectItem key={page} value={page.toString()}>
                              {page}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                      </TableRow>
                    );
                  })}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Import Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Fields to Create</p>
                    <p className="text-2xl font-bold">{mappings.filter(m => m.enabled).length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Distribution by Page</p>
                    <div className="space-y-1">
                      {Object.entries(getPlacementsByPage()).map(([page, count]) => (
                        <div key={page} className="flex items-center justify-between text-xs">
                          <span>Page {page}:</span>
                          <Badge variant="secondary">{count} field{count !== 1 ? 's' : ''}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <p>{mappings.filter(m => m.fieldVariant === 'text-multi').length} text (multiple)</p>
                    <p>{mappings.filter(m => m.fieldVariant === 'checkbox-multi').length} checkmarks (multiple)</p>
                    <p>{mappings.filter(m => m.fieldVariant === 'text-list').length} text lists</p>
                  </div>
                  <Button 
                    onClick={() => {
                      const simplifiedMappings = mappings
                        .filter(m => m.enabled)
                        .map(m => ({
                          id: m.id,
                          key: m.key,
                          displayName: m.displayName,
                          type: m.type,
                          page: m.page,
                          enabled: m.enabled,
                          placementCount: m.placementCount,
                          fieldVariant: m.fieldVariant,
                          // Only include options as simple array of values for arrays
                          ...(m.options && m.fieldVariant !== 'single' ? { 
                            options: m.options.map(opt => opt.value) 
                          } : {})
                        }) as FieldMapping);
                      onConfirm(simplifiedMappings);
                    }}
                    disabled={mappings.filter(m => m.enabled).length === 0}
                  >
                    Import {getTotalPlacements()} Fields
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}