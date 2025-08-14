import type { UnifiedField } from '@/types/unifiedField.types';

/**
 * Generate a Next.js API route that accepts field configuration dynamically
 * The generated route does NOT hardcode fields - it accepts them with each request
 */
export function generateUnifiedNextJsApiRoute(sampleFields: UnifiedField[] = []): string {
  const sampleFieldsJson = JSON.stringify(sampleFields, null, 2);
  const sampleData = generateSampleData(sampleFields);
  
  return `/**
 * Next.js 15 App Router API Route for Dynamic PDF Form Filling
 * 
 * This route accepts field configuration with each request,
 * allowing dynamic PDF filling without hardcoded fields.
 * 
 * Installation:
 * 1. npm install pdf-lib
 * 2. Save this file as: app/api/fill-pdf/route.ts
 * 
 * Usage:
 * POST /api/fill-pdf
 * - Send PDF file, field configuration, and data
 * - Receive filled PDF
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Type definitions
interface UnifiedField {
  id: string;
  key: string;
  type: 'text' | 'checkbox' | 'image' | 'signature' | 'logic' | 'composite-text';
  variant: 'single' | 'options';
  page: number;
  position: { x: number; y: number };
  size?: { width: number; height: number };
  enabled: boolean;
  multiSelect?: boolean;
  renderType?: 'text' | 'checkmark' | 'custom';
  optionMappings?: Array<{
    key: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
    customText?: string;
  }>;
  properties?: {
    fontSize?: number;
    fontFamily?: 'Helvetica' | 'Times' | 'Courier';
    textColor?: { r: number; g: number; b: number };
    textAlign?: 'left' | 'center' | 'right';
    bold?: boolean;
    italic?: boolean;
    checkboxSize?: number;
    fitMode?: 'fit' | 'fill' | 'stretch';
    defaultValue?: any;
    padding?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    lineHeight?: number;
    autoSize?: boolean;
  };
  positionVersion?: 'top-edge';
  template?: string;
  dependencies?: string[];
  compositeFormatting?: {
    emptyValueBehavior: 'skip' | 'show-empty' | 'placeholder';
    separatorHandling: 'smart' | 'literal';
    whitespaceHandling: 'normalize' | 'preserve';
  };
}

interface FillPdfRequest {
  fields: UnifiedField[];
  data: Record<string, any>;
}

// GET: Health check and API documentation
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Dynamic PDF Filler',
    version: '2.0.0',
    endpoints: {
      'GET /api/fill-pdf': 'Health check and documentation',
      'POST /api/fill-pdf': 'Fill PDF with dynamic field configuration'
    },
    usage: {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      body: {
        pdf: 'PDF file (binary)',
        fields: 'Field configuration (JSON string)',
        data: 'Field values (JSON string)'
      }
    },
    example: {
      fields: ${sampleFieldsJson.length > 2 ? '[/* Your field configuration */]' : sampleFieldsJson},
      data: ${JSON.stringify(sampleData, null, 2)}
    }
  });
}

// POST: Fill PDF with dynamic fields
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File;
    const fieldsJson = formData.get('fields') as string;
    const dataJson = formData.get('data') as string;
    
    // Validate inputs
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }
    
    if (!fieldsJson) {
      return NextResponse.json(
        { error: 'No field configuration provided' },
        { status: 400 }
      );
    }
    
    if (!dataJson) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }
    
    // Parse JSON
    let fields: UnifiedField[];
    let data: Record<string, any>;
    
    try {
      fields = JSON.parse(fieldsJson);
      data = JSON.parse(dataJson);
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in fields or data' },
        { status: 400 }
      );
    }
    
    // Validate fields array
    if (!Array.isArray(fields)) {
      return NextResponse.json(
        { error: 'Fields must be an array' },
        { status: 400 }
      );
    }
    
    // Load PDF
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // Embed fonts
    const fonts = {
      helvetica: await pdfDoc.embedFont(StandardFonts.Helvetica),
      helveticaBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      times: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      timesBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      courier: await pdfDoc.embedFont(StandardFonts.Courier),
      courierBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    };
    
    // Helper functions
    const getFont = (field: UnifiedField) => {
      const family = field.properties?.fontFamily || 'Helvetica';
      const bold = field.properties?.bold || false;
      
      if (family === 'Times') return bold ? fonts.timesBold : fonts.times;
      if (family === 'Courier') return bold ? fonts.courierBold : fonts.courier;
      return bold ? fonts.helveticaBold : fonts.helvetica;
    };
    
    const getColor = (color?: { r: number; g: number; b: number }) => {
      if (!color) return rgb(0, 0, 0);
      return rgb(color.r / 255, color.g / 255, color.b / 255);
    };
    
    // Helper to evaluate composite field templates
    const evaluateTemplate = (
      template: string, 
      data: Record<string, any>, 
      formatting?: { 
        emptyValueBehavior?: 'skip' | 'show-empty' | 'placeholder';
        separatorHandling?: 'smart' | 'literal';
        whitespaceHandling?: 'normalize' | 'preserve';
      }
    ) => {
      let result = template.replace(/{([^}]+)}/g, (match, fieldPath) => {
        const keys = fieldPath.split('.');
        let value: any = data;
        
        for (const key of keys) {
          if (value == null || typeof value !== 'object') {
            return formatting?.emptyValueBehavior === 'placeholder' ? \`[\${fieldPath}]\` : '';
          }
          value = value[key];
        }
        
        if (value == null || value === '') {
          return formatting?.emptyValueBehavior === 'placeholder' ? \`[\${fieldPath}]\` : '';
        }
        
        return String(value).trim();
      });
      
      // Smart separator handling
      if (formatting?.separatorHandling === 'smart') {
        result = result
          .replace(/,\\s*,/g, ',')     // Multiple commas
          .replace(/^\\s*,\\s*/, '')    // Leading comma
          .replace(/\\s*,\\s*$/, '')    // Trailing comma
          .replace(/\\s+/g, ' ')        // Multiple spaces
          .trim();
      }
      
      if (formatting?.whitespaceHandling === 'normalize') {
        result = result.replace(/\\s+/g, ' ').trim();
      }
      
      return result;
    };
    
    // Process each field
    for (const field of fields) {
      if (!field.enabled) continue;
      
      const pageIndex = field.page - 1;
      if (pageIndex >= pages.length) {
        console.warn(\`Page \${field.page} does not exist for field "\${field.key}"\`);
        continue;
      }
      
      const page = pages[pageIndex];
      const { height: pageHeight } = page.getSize();
      
      // Get value for this field
      let value: any;
      if (field.type === 'composite-text' && field.template) {
        value = evaluateTemplate(field.template, data, field.compositeFormatting);
      } else {
        value = data[field.key] ?? field.properties?.defaultValue;
      }
      if (value === undefined || value === null || value === '') continue;
      
      // Convert position (handle top-edge vs bottom-edge)
      const fieldHeight = field.size?.height || 30;
      const y = field.positionVersion === 'top-edge' 
        ? pageHeight - field.position.y - fieldHeight  // Convert from top-origin to bottom-origin
        : field.position.y;
      
      // Render based on variant
      if (field.variant === 'options' && field.optionMappings) {
        // Handle options fields
        const selectedValues = field.multiSelect 
          ? (Array.isArray(value) ? value : [value])
          : [value];
        
        for (const mapping of field.optionMappings) {
          if (selectedValues.includes(mapping.key)) {
            const mappingHeight = mapping.size?.height || 20;
            const mappingY = field.positionVersion === 'top-edge'
              ? pageHeight - mapping.position.y - mappingHeight  // Convert from top-origin to bottom-origin
              : mapping.position.y;
            
            switch (field.renderType) {
              case 'checkmark':
                page.drawText('✓', {
                  x: mapping.position.x,
                  y: mappingY,
                  size: mapping.size?.height || field.properties?.fontSize || 12,
                  font: getFont(field),
                  color: getColor(field.properties?.textColor),
                });
                break;
                
              case 'custom':
                if (mapping.customText) {
                  page.drawText(mapping.customText, {
                    x: mapping.position.x,
                    y: mappingY,
                    size: field.properties?.fontSize || 10,
                    font: getFont(field),
                    color: getColor(field.properties?.textColor),
                  });
                }
                break;
                
              case 'text':
              default:
                page.drawText(mapping.key, {
                  x: mapping.position.x,
                  y: mappingY,
                  size: field.properties?.fontSize || 10,
                  font: getFont(field),
                  color: getColor(field.properties?.textColor),
                });
                break;
            }
          }
        }
      } else {
        // Handle single fields
        switch (field.type) {
          case 'checkbox':
            if (value === true || value === 'true' || value === 1 || value === '1') {
              const checkSize = field.properties?.checkboxSize || field.size?.width || 20;
              const checkX = field.position.x + ((field.size?.width || checkSize) - checkSize) / 2;
              const checkY = y + ((field.size?.height || checkSize) - checkSize) / 2;
              
              page.drawText('✓', {
                x: checkX,
                y: checkY,
                size: checkSize * 0.8,
                font: fonts.helveticaBold,
                color: getColor(field.properties?.textColor),
              });
            }
            break;
            
          case 'image':
          case 'signature':
            if (typeof value === 'string' && value.startsWith('data:image')) {
              try {
                const base64Data = value.split(',')[1];
                const imageBytes = Buffer.from(base64Data, 'base64');
                
                let image;
                if (value.includes('image/png')) {
                  image = await pdfDoc.embedPng(imageBytes);
                } else if (value.includes('image/jpeg') || value.includes('image/jpg')) {
                  image = await pdfDoc.embedJpg(imageBytes);
                } else {
                  console.warn(\`Unsupported image format for field "\${field.key}"\`);
                  break;
                }
                
                const imgDims = image.scale(1);
                let imgWidth = field.size?.width || 100;
                let imgHeight = field.size?.height || 100;
                
                // Apply fit mode
                const fitMode = field.properties?.fitMode || 'fit';
                if (fitMode === 'fit') {
                  const scale = Math.min(
                    (field.size?.width || 100) / imgDims.width,
                    (field.size?.height || 100) / imgDims.height
                  );
                  imgWidth = imgDims.width * scale;
                  imgHeight = imgDims.height * scale;
                } else if (fitMode === 'fill') {
                  const scale = Math.max(
                    (field.size?.width || 100) / imgDims.width,
                    (field.size?.height || 100) / imgDims.height
                  );
                  imgWidth = imgDims.width * scale;
                  imgHeight = imgDims.height * scale;
                }
                
                page.drawImage(image, {
                  x: field.position.x,
                  y,
                  width: imgWidth,
                  height: imgHeight,
                });
              } catch (error) {
                console.error(\`Error embedding image for field "\${field.key}":\`, error);
              }
            }
            break;
            
          case 'text':
          case 'composite-text':
          default:
            const text = String(value);
            const fontSize = field.properties?.fontSize || 10;
            const font = getFont(field);
            const padding = field.properties?.padding || { left: 2, right: 2, top: 2, bottom: 2 };
            
            // Calculate text position
            let textX = field.position.x + (padding.left || 2);
            const fieldWidth = (field.size?.width || 100) - (padding.left || 2) - (padding.right || 2);
            
            // Handle alignment
            const textAlign = field.properties?.textAlign || 'left';
            if (textAlign === 'center') {
              const textWidth = font.widthOfTextAtSize(text, fontSize);
              textX = field.position.x + ((field.size?.width || 100) - textWidth) / 2;
            } else if (textAlign === 'right') {
              const textWidth = font.widthOfTextAtSize(text, fontSize);
              textX = field.position.x + (field.size?.width || 100) - textWidth - (padding.right || 2);
            }
            
            // Simple text rendering (you can add wrapping logic here)
            page.drawText(text, {
              x: textX,
              y: y + (padding.bottom || 2),
              size: fontSize,
              font,
              color: getColor(field.properties?.textColor),
            });
            break;
        }
      }
    }
    
    // Save the filled PDF
    const filledPdfBytes = await pdfDoc.save();
    
    // Return the filled PDF
    return new NextResponse(filledPdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': \`attachment; filename="filled-\${pdfFile.name}"\`,
      },
    });
  } catch (error) {
    console.error('PDF filling error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fill PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Example client-side usage:
 * 
 * async function fillPdf() {
 *   const formData = new FormData();
 *   
 *   // Add PDF file
 *   const pdfFile = document.getElementById('pdf-input').files[0];
 *   formData.append('pdf', pdfFile);
 *   
 *   // Add field configuration
 *   const fields = ${sampleFieldsJson.length > 200 ? '[/* Your fields from PDF Filler */]' : sampleFieldsJson};
 *   formData.append('fields', JSON.stringify(fields));
 *   
 *   // Add data to fill
 *   const data = ${JSON.stringify(sampleData, null, 2).split('\n').map(l => ' *   ' + l).join('\n')};
 *   formData.append('data', JSON.stringify(data));
 *   
 *   // Send request
 *   const response = await fetch('/api/fill-pdf', {
 *     method: 'POST',
 *     body: formData
 *   });
 *   
 *   if (response.ok) {
 *     const blob = await response.blob();
 *     const url = URL.createObjectURL(blob);
 *     // Download or display the filled PDF
 *   }
 * }
 */`;
}

function generateSampleData(fields: UnifiedField[]): Record<string, any> {
  const data: Record<string, any> = {};
  
  for (const field of fields) {
    if (!field.enabled) continue;
    
    // Generate sample data based on field type and key
    const key = field.key;
    
    if (field.variant === 'options') {
      // For options fields, use the first option as sample
      if (field.optionMappings && field.optionMappings.length > 0) {
        data[key] = field.multiSelect 
          ? [field.optionMappings[0].key]
          : field.optionMappings[0].key;
      }
    } else {
      switch (field.type) {
        case 'checkbox':
          data[key] = true;
          break;
        case 'text':
          // Generate contextual sample data based on key name
          if (key.toLowerCase().includes('email')) {
            data[key] = 'user@example.com';
          } else if (key.toLowerCase().includes('phone')) {
            data[key] = '(555) 123-4567';
          } else if (key.toLowerCase().includes('name')) {
            data[key] = 'John Doe';
          } else if (key.toLowerCase().includes('date')) {
            data[key] = new Date().toISOString().split('T')[0];
          } else if (key.toLowerCase().includes('address')) {
            data[key] = '123 Main St';
          } else {
            data[key] = `Sample ${key}`;
          }
          break;
        case 'image':
        case 'signature':
          data[key] = 'data:image/png;base64,iVBORw0KG...'; // Placeholder
          break;
        default:
          data[key] = field.sampleValue || '';
      }
    }
  }
  
  return data;
}