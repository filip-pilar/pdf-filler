import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';

export function generateNextJsApiRoute(fields: Field[], logicFields: LogicField[] = []): string {
  const fieldsJson = JSON.stringify(fields, null, 2);
  const logicFieldsJson = JSON.stringify(logicFields, null, 2);
  
  return `/**
 * Next.js 15 API Route for PDF Form Filling
 * 
 * INSTALLATION INSTRUCTIONS:
 * 1. Install required dependencies:
 *    npm install pdf-lib
 * 
 * 2. Create this file at:
 *    app/api/fill-pdf/route.ts
 * 
 * 3. Place your PDF template file at:
 *    public/templates/form-template.pdf
 *    OR configure the PDF_TEMPLATE_PATH environment variable
 * 
 * 4. Configure CORS if needed by setting these headers in next.config.js
 * 
 * USAGE EXAMPLE:
 * See the client-side example at the bottom of this file
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

// Field configuration generated from PDF Filler
const fields: Field[] = ${fieldsJson};

// Logic fields configuration
const logicFields: LogicField[] = ${logicFieldsJson};

// Type definitions
interface Field {
  type: 'text' | 'checkbox' | 'image' | 'signature';
  name: string;
  key: string;
  displayName?: string;
  sampleValue?: any;
  label?: string;
  page: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: {
    required?: boolean;
    defaultValue?: any;
    placeholder?: string;
    validation?: unknown[];
    fontSize?: number;
    checkboxSize?: number;
    fitMode?: 'fit' | 'fill';
  };
  source?: {
    type: 'sql' | 'json' | 'typescript' | 'manual';
    originalName?: string;
  };
}

interface LogicField {
  key: string;
  label: string;
  options: Array<{
    key: string;
    label: string;
    actions: Array<{
      id: string;
      type: 'fillLabel' | 'fillCustom' | 'checkmark';
      position: { x: number; y: number; page: number };
      size?: { width: number; height: number };
      customText?: string;
      properties?: { fontSize?: number };
    }>;
  }>;
  page?: number;
}

interface FillPdfRequest {
  fieldData: Record<string, any>;
  templatePath?: string;
}

// Helper function to apply logic field actions to PDF
function applyLogicFieldActions(
  page: any,
  logicField: LogicField,
  selectedValue: string,
  fonts: { helvetica: any; helveticaBold: any },
  pageHeight: number
) {
  const selectedOption = logicField.options.find(opt => opt.key === selectedValue);
  if (!selectedOption) return;
  
  for (const action of selectedOption.actions) {
    // Skip if action is for a different page
    if (action.position.page !== logicField.page) continue;
    
    // Convert from top edge to bottom edge for PDF rendering
    const y = action.position.y - (action.size?.height || 20);
    
    switch (action.type) {
      case 'checkmark':
        page.drawText('✓', {
          x: action.position.x,
          y: y,
          size: action.properties?.fontSize || 12,
          font: fonts.helveticaBold,
          color: rgb(0, 0, 0),
        });
        break;
        
      case 'fillLabel':
        page.drawText(selectedOption.label, {
          x: action.position.x,
          y: y,
          size: action.properties?.fontSize || 10,
          font: fonts.helvetica,
          color: rgb(0, 0, 0),
        });
        break;
        
      case 'fillCustom':
        if (action.customText) {
          page.drawText(action.customText, {
            x: action.position.x,
            y: y,
            size: action.properties?.fontSize || 10,
            font: fonts.helvetica,
            color: rgb(0, 0, 0),
          });
        }
        break;
    }
  }
}

// Helper function to validate required fields
function validateRequiredFields(fieldData: Record<string, any>): string[] {
  const errors: string[] = [];
  
  for (const field of fields) {
    if (field.properties.required && !fieldData[field.key]) {
      errors.push(\`Required field "\${field.displayName || field.name}" is missing\`);
    }
  }
  
  return errors;
}

// GET: Health check and field information
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    fields: fields.length,
    logicFields: logicFields.length,
    fieldKeys: fields.map(f => ({
      key: f.key,
      name: f.displayName || f.name,
      type: f.type,
      required: f.properties.required || false,
      page: f.page
    }))
  });
}

// POST: Fill PDF with field data
export async function POST(request: NextRequest) {
  try {
    const body: FillPdfRequest = await request.json();
    const { fieldData, templatePath } = body;
    
    if (!fieldData) {
      return NextResponse.json(
        { error: 'No field data provided' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    const validationErrors = validateRequiredFields(fieldData);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      );
    }
    
    // We'll process logic fields directly when filling the PDF
    
    // Load PDF template
    const pdfPath = templatePath || 
      process.env.PDF_TEMPLATE_PATH || 
      path.join(process.cwd(), 'public', 'templates', 'form-template.pdf');
    
    let pdfBytes: Buffer;
    try {
      pdfBytes = await fs.readFile(pdfPath);
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'PDF template not found',
          details: \`Expected template at: \${pdfPath}\`,
          hint: 'Place your PDF template file at the specified path or provide templatePath in the request'
        },
        { status: 404 }
      );
    }
    
    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();
    const fonts = { helvetica: helveticaFont, helveticaBold: helveticaBoldFont };
    
    // Fill regular fields
    for (const field of fields) {
      const value = fieldData[field.key];
      
      // Skip if no value and no default
      if (value === undefined && !field.properties.defaultValue) continue;
      
      const finalValue = value !== undefined ? value : field.properties.defaultValue;
      if (finalValue === undefined || finalValue === null) continue;
      
      const pageIndex = field.page - 1;
      if (pageIndex >= pages.length) {
        console.warn(\`Page \${field.page} does not exist for field "\${field.key}"\`);
        continue;
      }
      
      const page = pages[pageIndex];
      const { height } = page.getSize();
      
      // Convert from top edge to bottom edge for PDF rendering
      const y = field.position.y - field.size.height;
      
      // Draw field value based on type
      switch (field.type) {
        case 'checkbox': {
          if (finalValue === true || finalValue === 'true' || finalValue === 1) {
            // Draw checkmark
            const checkSize = field.properties.checkboxSize || field.size.height * 0.8;
            page.drawText('✓', {
              x: field.position.x + (field.size.width - checkSize) / 2,
              y: y + (field.size.height - checkSize) / 2,
              size: checkSize,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0),
            });
          }
          break;
        }
        
        case 'image':
        case 'signature': {
          // Handle base64 image data
          if (typeof finalValue === 'string' && finalValue.startsWith('data:image')) {
            try {
              const base64Data = finalValue.split(',')[1];
              const imageBytes = Buffer.from(base64Data, 'base64');
              
              let image;
              if (finalValue.includes('image/png')) {
                image = await pdfDoc.embedPng(imageBytes);
              } else if (finalValue.includes('image/jpeg') || finalValue.includes('image/jpg')) {
                image = await pdfDoc.embedJpg(imageBytes);
              } else {
                console.warn(\`Unsupported image format for field "\${field.key}"\`);
                break;
              }
              
              // Scale image to fit field dimensions
              const dims = image.scale(1);
              let scale = Math.min(
                field.size.width / dims.width,
                field.size.height / dims.height
              );
              
              if (field.properties.fitMode === 'fill') {
                scale = Math.max(
                  field.size.width / dims.width,
                  field.size.height / dims.height
                );
              }
              
              page.drawImage(image, {
                x: field.position.x,
                y: y,
                width: dims.width * scale,
                height: dims.height * scale,
              });
            } catch (error) {
              console.error(\`Error embedding image for field "\${field.key}":\`, error);
            }
          }
          break;
        }
        
        case 'text':
        default: {
          // Handle text fields
          const text = String(finalValue);
          const fontSize = field.properties.fontSize || 10;
          const font = helveticaFont;
          
          // Simple text wrapping for multi-line fields
          const maxWidth = field.size.width - 4; // 2px padding on each side
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? \`\${currentLine} \${word}\` : word;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            lines.push(currentLine);
          }
          
          // Draw each line
          const lineHeight = fontSize * 1.2;
          const totalHeight = lines.length * lineHeight;
          const startY = y + field.size.height - (field.size.height - totalHeight) / 2 - fontSize;
          
          lines.forEach((line, index) => {
            page.drawText(line, {
              x: field.position.x + 2,
              y: startY - (index * lineHeight),
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          });
          break;
        }
      }
    }
    
    // Process logic fields
    for (const logicField of logicFields) {
      const selectedValue = fieldData[logicField.key];
      if (!selectedValue) continue;
      
      // Apply actions for all pages
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const { height } = page.getSize();
        
        // Apply actions for this logic field
        const selectedOption = logicField.options.find(opt => opt.key === selectedValue);
        if (!selectedOption) continue;
        
        for (const action of selectedOption.actions) {
          // Check if action is for current page (1-indexed)
          if (action.position.page !== pageIndex + 1) continue;
          
          // Convert from top edge to bottom edge for PDF rendering
          const y = action.position.y - (action.size?.height || 20);
          
          switch (action.type) {
            case 'checkmark':
              page.drawText('✓', {
                x: action.position.x,
                y: y,
                size: action.properties?.fontSize || 12,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0),
              });
              break;
              
            case 'fillLabel':
              page.drawText(selectedOption.label, {
                x: action.position.x,
                y: y,
                size: action.properties?.fontSize || 10,
                font: helveticaFont,
                color: rgb(0, 0, 0),
              });
              break;
              
            case 'fillCustom':
              if (action.customText) {
                page.drawText(action.customText, {
                  x: action.position.x,
                  y: y,
                  size: action.properties?.fontSize || 10,
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
                });
              }
              break;
          }
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
        'Content-Disposition': \`attachment; filename="filled-form-\${Date.now()}.pdf"\`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Error filling PDF:', error);
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
 * CLIENT-SIDE USAGE EXAMPLE:
 * 
 * // Example 1: Using fetch API
 * async function fillPdf(fieldData) {
 *   const response = await fetch('/api/fill-pdf', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify({
 *       fieldData: {
 *         firstName: 'John',
 *         lastName: 'Doe',
 *         email: 'john.doe@example.com',
 *         agreeToTerms: true,
 *         signature: 'data:image/png;base64,...'
 *       }
 *     })
 *   });
 *   
 *   if (response.ok) {
 *     const blob = await response.blob();
 *     const url = URL.createObjectURL(blob);
 *     
 *     // Option 1: Open in new tab
 *     window.open(url, '_blank');
 *     
 *     // Option 2: Download directly
 *     const a = document.createElement('a');
 *     a.href = url;
 *     a.download = 'filled-form.pdf';
 *     a.click();
 *     
 *     // Clean up
 *     URL.revokeObjectURL(url);
 *   } else {
 *     const error = await response.json();
 *     console.error('Failed to fill PDF:', error);
 *   }
 * }
 * 
 * // Example 2: Using a form component
 * export function PdfFormComponent() {
 *   const [loading, setLoading] = useState(false);
 *   
 *   const handleSubmit = async (formData) => {
 *     setLoading(true);
 *     try {
 *       await fillPdf(formData);
 *     } catch (error) {
 *       console.error(error);
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       // Your form fields here
 *     </form>
 *   );
 * }
 * 
 * // Example 3: Get field information
 * async function getFieldInfo() {
 *   const response = await fetch('/api/fill-pdf');
 *   const info = await response.json();
 *   console.log('Available fields:', info.fieldKeys);
 *   return info;
 * }
 */
`
}