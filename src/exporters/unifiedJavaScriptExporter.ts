import type { UnifiedField } from '@/types/unifiedField.types';

interface ExportOptions {
  framework?: 'vanilla' | 'express' | 'hono';
  includeTypes?: boolean;
  moduleType?: 'esm' | 'commonjs';
}

/**
 * Generate JavaScript code that accepts field configuration and data to fill PDFs
 * The generated code does NOT hardcode fields - it accepts them as parameters
 */
export function generateUnifiedJavaScriptCode(
  sampleFields: UnifiedField[],
  options: ExportOptions = {}
): string {
  const {
    framework = 'vanilla',
    includeTypes = true,
    moduleType = 'esm'
  } = options;
  
  if (framework === 'express') {
    return generateExpressService(includeTypes, moduleType);
  } else if (framework === 'hono') {
    return generateHonoService(includeTypes);
  }
  
  return generateVanillaService(sampleFields, includeTypes, moduleType);
}

function generateVanillaService(sampleFields: UnifiedField[], includeTypes: boolean, moduleType: 'esm' | 'commonjs'): string {
  const imports = moduleType === 'esm' 
    ? `import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';`
    : `const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');`;
    
  const exports = moduleType === 'esm'
    ? `export { fillPDF, UnifiedField };`
    : `module.exports = { fillPDF };`;
  
  const types = includeTypes ? `
/**
 * UnifiedField configuration type
 * This describes how fields should be rendered in the PDF
 */
interface UnifiedField {
  id: string;
  key: string;
  type: 'text' | 'checkbox' | 'image' | 'signature' | 'logic';
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
}
` : '';

  const sampleFieldsJson = JSON.stringify(sampleFields, null, 2);

  return `${imports}
${types}
/**
 * PDF Form Filler Service
 * 
 * This service fills PDF forms based on field configuration and data.
 * Fields are NOT hardcoded - they are passed as parameters.
 * 
 * @param {ArrayBuffer} pdfBytes - The PDF file to fill
 * @param {UnifiedField[]} fields - Field configuration defining where to place data
 * @param {Record<string, any>} data - The data to fill into the fields
 * @returns {Promise<Uint8Array>} - The filled PDF as bytes
 */
async function fillPDF(pdfBytes, fields, data) {
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
  
  // Helper to get the right font
  const getFont = (field) => {
    const family = field.properties?.fontFamily || 'Helvetica';
    const bold = field.properties?.bold || false;
    
    if (family === 'Times') return bold ? fonts.timesBold : fonts.times;
    if (family === 'Courier') return bold ? fonts.courierBold : fonts.courier;
    return bold ? fonts.helveticaBold : fonts.helvetica;
  };
  
  // Helper to get color
  const getColor = (color) => {
    if (!color) return rgb(0, 0, 0);
    return rgb(color.r / 255, color.g / 255, color.b / 255);
  };
  
  // Process each field
  for (const field of fields) {
    if (!field.enabled) continue;
    
    const pageIndex = field.page - 1;
    if (pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();
    
    // Get the value for this field
    const value = data[field.key] ?? field.properties?.defaultValue;
    if (value === undefined || value === null || value === '') continue;
    
    // Convert position if needed (top-edge vs bottom-edge)
    const fieldHeight = field.size?.height || 30;
    const y = field.positionVersion === 'top-edge' 
      ? pageHeight - field.position.y - fieldHeight  // Convert from top-origin to bottom-origin
      : field.position.y;
    
    // Render based on field type
    if (field.variant === 'options' && field.optionMappings) {
      // Handle options fields (radio/checkbox groups)
      const selectedValues = field.multiSelect 
        ? (Array.isArray(value) ? value : [value])
        : [value];
      
      for (const mapping of field.optionMappings) {
        if (selectedValues.includes(mapping.key)) {
          const mappingHeight = mapping.size?.height || 20;
          const mappingY = field.positionVersion === 'top-edge'
            ? pageHeight - mapping.position.y - mappingHeight  // Convert from top-origin to bottom-origin
            : mapping.position.y;
          
          if (field.renderType === 'checkmark') {
            page.drawText('✓', {
              x: mapping.position.x,
              y: mappingY,
              size: mapping.size?.height || field.properties?.fontSize || 12,
              font: getFont(field),
              color: getColor(field.properties?.textColor),
            });
          } else if (field.renderType === 'custom' && mapping.customText) {
            page.drawText(mapping.customText, {
              x: mapping.position.x,
              y: mappingY,
              size: field.properties?.fontSize || 10,
              font: getFont(field),
              color: getColor(field.properties?.textColor),
            });
          } else {
            page.drawText(mapping.key, {
              x: mapping.position.x,
              y: mappingY,
              size: field.properties?.fontSize || 10,
              font: getFont(field),
              color: getColor(field.properties?.textColor),
            });
          }
        }
      }
    } else {
      // Handle single fields
      switch (field.type) {
        case 'checkbox':
          if (value === true || value === 'true' || value === 1) {
            const checkSize = field.properties?.checkboxSize || field.size?.width || 20;
            page.drawText('✓', {
              x: field.position.x + (field.size?.width || checkSize) / 4,
              y: y + (field.size?.height || checkSize) / 4,
              size: checkSize * 0.7,
              font: fonts.helveticaBold,
              color: getColor(field.properties?.textColor),
            });
          }
          break;
          
        case 'text':
        default:
          const text = String(value);
          const fontSize = field.properties?.fontSize || 10;
          const font = getFont(field);
          const padding = field.properties?.padding || { left: 2, right: 2 };
          
          let textX = field.position.x + (padding.left || 2);
          const fieldWidth = (field.size?.width || 100) - (padding.left || 2) - (padding.right || 2);
          
          // Handle alignment
          if (field.properties?.textAlign === 'center') {
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            textX = field.position.x + ((field.size?.width || 100) - textWidth) / 2;
          } else if (field.properties?.textAlign === 'right') {
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            textX = field.position.x + (field.size?.width || 100) - textWidth - (padding.right || 2);
          }
          
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
  
  return await pdfDoc.save();
}

// Example usage:
/*
const pdfBytes = await fetch('template.pdf').then(r => r.arrayBuffer());

// These fields would come from your PDF Filler configuration
const fields = ${sampleFieldsJson};

// This is the actual data to fill
const data = {
  name: "John Doe",
  email: "john@example.com",
  hasLicense: true,
  gender: "male"
};

const filledPdf = await fillPDF(pdfBytes, fields, data);

// Download or save the filled PDF
const blob = new Blob([filledPdf], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
// ... download or display
*/

${exports}`;
}

function generateExpressService(_includeTypes: boolean, moduleType: 'esm' | 'commonjs'): string {
  const imports = moduleType === 'esm'
    ? `import express from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import multer from 'multer';`
    : `const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const multer = require('multer');`;

  return `${imports}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

/**
 * POST /fill-pdf
 * 
 * Fill a PDF with field data
 * 
 * Body (JSON):
 * - fields: Array of UnifiedField configurations
 * - data: Object with field values
 * 
 * Files (multipart):
 * - pdf: The PDF file to fill
 */
app.post('/fill-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }
    
    const { fields, data } = req.body;
    
    if (!fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: 'Field configuration required' });
    }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Data object required' });
    }
    
    // Your fillPDF implementation here
    const filledPdf = await fillPDF(req.file.buffer, fields, data);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="filled.pdf"'
    });
    
    res.send(Buffer.from(filledPdf));
  } catch (error) {
    console.error('PDF filling error:', error);
    res.status(500).json({ error: 'Failed to fill PDF' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`PDF filling service running on port \${PORT}\`);
});

// Add the fillPDF function from vanilla service here...`;
}

function generateHonoService(_includeTypes: boolean): string {
  return `import { Hono } from 'hono';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const app = new Hono();

/**
 * PDF Filling Service for Edge Runtimes
 * Works with Cloudflare Workers, Deno Deploy, Vercel Edge Functions, etc.
 */

app.post('/fill-pdf', async (c) => {
  try {
    const formData = await c.req.formData();
    const pdfFile = formData.get('pdf') as File;
    const fieldsJson = formData.get('fields') as string;
    const dataJson = formData.get('data') as string;
    
    if (!pdfFile) {
      return c.json({ error: 'No PDF file provided' }, 400);
    }
    
    if (!fieldsJson || !dataJson) {
      return c.json({ error: 'Fields and data required' }, 400);
    }
    
    const fields = JSON.parse(fieldsJson);
    const data = JSON.parse(dataJson);
    
    const pdfBytes = await pdfFile.arrayBuffer();
    const filledPdf = await fillPDF(pdfBytes, fields, data);
    
    return new Response(filledPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="filled.pdf"'
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to fill PDF' }, 500);
  }
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'pdf-filler' });
});

// Add the fillPDF function from vanilla service here...

export default app;`;
}