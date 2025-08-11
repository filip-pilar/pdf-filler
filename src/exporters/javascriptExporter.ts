import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';
import type { UnifiedField } from '@/types/unifiedField.types';

interface ExportOptions {
  framework?: 'hono' | 'express' | 'vanilla';
  includeValidation?: boolean;
  includeJsDoc?: boolean;
  moduleType?: 'esm' | 'commonjs';
}

export function generateJavaScriptCode(
  fields: Field[], 
  logicFields: LogicField[] = [],
  options: ExportOptions = {},
  unifiedFields?: UnifiedField[]
): string {
  const {
    framework = 'hono',
    includeValidation = true,
    includeJsDoc = true,
    moduleType = 'esm'
  } = options;
  
  // Use unified fields if available
  if (unifiedFields && unifiedFields.length > 0) {
    if (framework === 'express') {
      return generateUnifiedExpressCode(unifiedFields, { includeValidation, includeJsDoc, moduleType });
    } else if (framework === 'vanilla') {
      return generateUnifiedVanillaCode(unifiedFields, { includeValidation, includeJsDoc, moduleType });
    }
    return generateUnifiedHonoCode(unifiedFields, { includeValidation, includeJsDoc });
  }
  
  // Legacy field system
  if (framework === 'express') {
    return generateExpressCode(fields, logicFields, { includeValidation, includeJsDoc, moduleType });
  } else if (framework === 'vanilla') {
    return generateVanillaCode(fields, logicFields, { includeValidation, includeJsDoc, moduleType });
  }
  
  // Default to Hono (edge-ready)
  return generateHonoCode(fields, logicFields, { includeValidation, includeJsDoc });
}

function generateHonoCode(
  fields: Field[],
  logicFields: LogicField[],
  options: { includeValidation: boolean; includeJsDoc: boolean }
): string {
  const { includeValidation, includeJsDoc } = options;
  const fieldsJson = JSON.stringify(fields, null, 2);
  const logicFieldsJson = JSON.stringify(logicFields, null, 2);
  
  return `${includeJsDoc ? `/**
 * PDF Form Filling Service
 * 
 * This service provides endpoints for filling PDF forms with field data.
 * Compatible with Cloudflare Workers, Deno Deploy, Bun, and Node.js.
 * 
 * @module pdf-form-service
 */
` : ''}
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Field configuration
const fields = ${fieldsJson};

// Logic field configuration
const logicFields = ${logicFieldsJson};

${includeValidation ? `
/**
 * Validates required fields in the provided data
 * @param {Object} data - Field data to validate
 * @returns {Array} Array of validation errors
 */
function validateFieldData(data) {
  const errors = [];
  
  for (const field of fields) {
    if (field.properties?.required && !data[field.key]) {
      errors.push({
        field: field.key,
        message: \`Required field "\${field.displayName || field.name}" is missing\`
      });
    }
    
    // Type validation
    if (data[field.key] !== undefined) {
      const value = data[field.key];
      switch (field.type) {
        case 'checkbox':
          if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            errors.push({
              field: field.key,
              message: \`Field "\${field.key}" must be a boolean value\`
            });
          }
          break;
        case 'text':
          if (typeof value !== 'string') {
            errors.push({
              field: field.key,
              message: \`Field "\${field.key}" must be a string\`
            });
          }
          break;
      }
    }
  }
  
  return errors;
}` : ''}

/**
 * Applies logic field actions to a PDF page
 * @param {Object} page - PDF page object
 * @param {Object} logicField - Logic field configuration
 * @param {string} selectedValue - Selected option value
 * @param {Object} fonts - Available fonts
 * @param {number} pageHeight - Page height for coordinate conversion
 */
function applyLogicFieldActions(page, logicField, selectedValue, fonts, pageHeight) {
  const selectedOption = logicField.options.find(opt => opt.key === selectedValue);
  if (!selectedOption) return;
  
  for (const action of selectedOption.actions) {
    // Convert from top edge to bottom edge for PDF rendering
    const y = action.position.y - (action.size?.height || 20);
    
    switch (action.type) {
      case 'checkmark':
        page.drawText('✓', {
          x: action.position.x,
          y: y,
          size: action.properties?.fontSize || 12,
          font: fonts.bold,
          color: rgb(0, 0, 0),
        });
        break;
        
      case 'fillLabel':
        page.drawText(selectedOption.label, {
          x: action.position.x,
          y: y,
          size: action.properties?.fontSize || 10,
          font: fonts.regular,
          color: rgb(0, 0, 0),
        });
        break;
        
      case 'fillCustom':
        if (action.customText) {
          page.drawText(action.customText, {
            x: action.position.x,
            y: y,
            size: action.properties?.fontSize || 10,
            font: fonts.regular,
            color: rgb(0, 0, 0),
          });
        }
        break;
    }
  }
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    fields: fields.length,
    logicFields: logicFields.length,
    version: '1.0.0'
  });
});

// Get field information
app.get('/fields', (c) => {
  return c.json({
    fields: fields.map(f => ({
      key: f.key,
      name: f.displayName || f.name,
      type: f.type,
      required: f.properties?.required || false,
      page: f.page
    })),
    logicFields: logicFields.map(lf => ({
      key: lf.key,
      label: lf.label,
      options: lf.options.map(opt => ({ key: opt.key, label: opt.label }))
    }))
  });
});

// Fill PDF endpoint
app.post('/fill-pdf', async (c) => {
  try {
    const formData = await c.req.formData();
    const pdfFile = formData.get('pdf') as File;
    const fieldData = JSON.parse(formData.get('data') as string || '{}');
    
    if (!pdfFile) {
      return c.json({ error: 'No PDF file provided' }, 400);
    }
    
    ${includeValidation ? `// Validate field data
    const validationErrors = validateFieldData(fieldData);
    if (validationErrors.length > 0) {
      return c.json({ 
        error: 'Validation failed', 
        errors: validationErrors 
      }, 400);
    }
    ` : ''}
    // Load the PDF
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fonts = { regular: helveticaFont, bold: helveticaBoldFont };
    
    // Fill regular fields
    for (const field of fields) {
      const value = fieldData[field.key] ?? field.properties?.defaultValue;
      if (value === undefined || value === null) continue;
      
      const pageIndex = field.page - 1;
      if (pageIndex >= pages.length) continue;
      
      const page = pages[pageIndex];
      const { height } = page.getSize();
      // Convert from top edge to bottom edge for PDF rendering
      const y = field.position.y - field.size.height;
      
      switch (field.type) {
        case 'checkbox':
          if (value === true || value === 'true' || value === 1) {
            const checkSize = field.properties?.checkboxSize || field.size.height * 0.7;
            page.drawText('✓', {
              x: field.position.x + (field.size.width - checkSize) / 2,
              y: y + (field.size.height - checkSize) / 2,
              size: checkSize,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0),
            });
          }
          break;
        
        case 'image':
        case 'signature':
          if (typeof value === 'string' && value.startsWith('data:image')) {
            try {
              const base64Data = value.split(',')[1];
              const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              let image;
              if (value.includes('image/png')) {
                image = await pdfDoc.embedPng(imageBytes);
              } else if (value.includes('image/jpeg') || value.includes('image/jpg')) {
                image = await pdfDoc.embedJpg(imageBytes);
              }
              
              if (image) {
                const dims = image.scale(1);
                const scale = Math.min(
                  field.size.width / dims.width,
                  field.size.height / dims.height
                );
                
                page.drawImage(image, {
                  x: field.position.x,
                  y: y,
                  width: dims.width * scale,
                  height: dims.height * scale,
                });
              }
            } catch (err) {
              console.error(\`Failed to embed image for field \${field.key}:\`, err);
            }
          }
          break;
        
        default:
          // Text field
          const text = String(value);
          const fontSize = field.properties?.fontSize || 10;
          
          // Simple text wrapping
          const maxWidth = field.size.width - 4;
          const words = text.split(' ');
          const lines = [];
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? \`\${currentLine} \${word}\` : word;
            const textWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
            
            if (textWidth > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
          
          // Draw lines
          const lineHeight = fontSize * 1.2;
          lines.forEach((line, index) => {
            page.drawText(line, {
              x: field.position.x + 2,
              y: y + field.size.height - fontSize - (index * lineHeight),
              size: fontSize,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
          });
      }
    }
    
    // Process logic fields
    for (const logicField of logicFields) {
      const selectedValue = fieldData[logicField.key];
      if (!selectedValue) continue;
      
      // Apply actions to all relevant pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { height } = page.getSize();
        
        const selectedOption = logicField.options.find(opt => opt.key === selectedValue);
        if (!selectedOption) continue;
        
        for (const action of selectedOption.actions) {
          if (action.position.page !== i + 1) continue;
          applyLogicFieldActions(page, logicField, selectedValue, fonts, height);
        }
      }
    }
    
    // Save and return the filled PDF
    const filledPdfBytes = await pdfDoc.save();
    
    return new Response(filledPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="filled-form.pdf"',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error filling PDF:', error);
    return c.json({ 
      error: 'Failed to fill PDF',
      message: error.message 
    }, 500);
  }
});

// Export for various runtimes
export default app;

/*
 * Client Usage Example:
 * 
 * async function fillPDF(pdfFile, fieldData) {
 *   const formData = new FormData();
 *   formData.append('pdf', pdfFile);
 *   formData.append('data', JSON.stringify(fieldData));
 *   
 *   const response = await fetch('http://localhost:8787/fill-pdf', {
 *     method: 'POST',
 *     body: formData
 *   });
 *   
 *   if (response.ok) {
 *     const blob = await response.blob();
 *     const url = URL.createObjectURL(blob);
 *     window.open(url);
 *   } else {
 *     const error = await response.json();
 *     console.error('Failed:', error);
 *   }
 * }
 */`;
}

function generateExpressCode(
  fields: Field[],
  logicFields: LogicField[],
  options: { includeValidation: boolean; includeJsDoc: boolean; moduleType: 'esm' | 'commonjs' }
): string {
  const { includeJsDoc, moduleType } = options;
  const fieldsJson = JSON.stringify(fields, null, 2);
  const logicFieldsJson = JSON.stringify(logicFields, null, 2);
  
  const imports = moduleType === 'esm' 
    ? `import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';`
    : `const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');`;
  
  const exports = moduleType === 'esm'
    ? 'export default app;'
    : 'module.exports = app;';
  
  return `${includeJsDoc ? `/**
 * Express PDF Form Filling Service
 * 
 * Installation:
 * npm install express multer cors pdf-lib
 * 
 * Usage:
 * node server.js (or use nodemon for development)
 */
` : ''}
${imports}

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json());

// Field configuration
const fields = ${fieldsJson};

// Logic field configuration
const logicFields = ${logicFieldsJson};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    fields: fields.length,
    logicFields: logicFields.length 
  });
});

// Get field information
app.get('/fields', (req, res) => {
  res.json({
    fields: fields.map(f => ({
      key: f.key,
      name: f.displayName || f.name,
      type: f.type,
      required: f.properties?.required || false,
      page: f.page
    })),
    logicFields: logicFields.map(lf => ({
      key: lf.key,
      label: lf.label,
      options: lf.options.map(opt => ({ key: opt.key, label: opt.label }))
    }))
  });
});

// Fill PDF endpoint
app.post('/fill-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }
    
    const fieldData = JSON.parse(req.body.data || '{}');
    
    // Load and fill PDF (implementation similar to Hono version)
    const pdfBytes = req.file.buffer;
    const pdfDoc = await PDFDocument.load(pdfBytes);
    // ... (PDF filling logic same as Hono version)
    
    const filledPdfBytes = await pdfDoc.save();
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="filled-form.pdf"'
    });
    res.send(Buffer.from(filledPdfBytes));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fill PDF' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`PDF Form Service running on port \${PORT}\`);
});

${exports}`;
}

function generateVanillaCode(
  fields: Field[],
  _logicFields: LogicField[],
  options: { includeValidation: boolean; includeJsDoc: boolean; moduleType: 'esm' | 'commonjs' }
): string {
  const { includeJsDoc, moduleType } = options;
  const fieldsJson = JSON.stringify(fields, null, 2);
  
  return `${includeJsDoc ? `/**
 * Vanilla JavaScript PDF Form Configuration
 * 
 * This module provides field configuration and helper functions
 * for PDF form filling without a specific framework.
 */
` : ''}
${moduleType === 'esm' ? 'export ' : ''}const fieldConfiguration = {
  fields: ${fieldsJson},
  
  /**
   * Get all field keys
   * @returns {string[]} Array of field keys
   */
  getFieldKeys() {
    return this.fields.map(f => f.key);
  },
  
  /**
   * Get required fields
   * @returns {Object[]} Array of required fields
   */
  getRequiredFields() {
    return this.fields.filter(f => f.properties?.required);
  },
  
  /**
   * Get fields by page
   * @param {number} pageNumber - Page number (1-indexed)
   * @returns {Object[]} Fields on the specified page
   */
  getFieldsByPage(pageNumber) {
    return this.fields.filter(f => f.page === pageNumber);
  },
  
  /**
   * Validate field data
   * @param {Object} data - Field data to validate
   * @returns {Object} Validation result with valid flag and errors
   */
  validateData(data) {
    const errors = [];
    
    for (const field of this.fields) {
      if (field.properties?.required && !data[field.key]) {
        errors.push({
          field: field.key,
          message: \`Required field "\${field.displayName || field.name}" is missing\`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Generate form HTML
   * @returns {string} HTML form based on field configuration
   */
  generateFormHTML() {
    let html = '<form id="pdf-form">';
    
    for (const field of this.fields) {
      html += '<div class="form-field">';
      html += \`<label for="\${field.key}">\${field.displayName || field.name}\`;
      if (field.properties?.required) html += ' *';
      html += '</label>';
      
      switch (field.type) {
        case 'checkbox':
          html += \`<input type="checkbox" id="\${field.key}" name="\${field.key}">\`;
          break;
        case 'text':
        default:
          html += \`<input type="text" id="\${field.key}" name="\${field.key}" \`;
          if (field.properties?.placeholder) {
            html += \`placeholder="\${field.properties.placeholder}" \`;
          }
          if (field.properties?.required) {
            html += 'required ';
          }
          html += '>';
      }
      
      html += '</div>';
    }
    
    html += '<button type="submit">Fill PDF</button>';
    html += '</form>';
    
    return html;
  },
  
  /**
   * Collect form data from HTML form
   * @param {string} formId - ID of the form element
   * @returns {Object} Collected form data
   */
  collectFormData(formId = 'pdf-form') {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const data = {};
    const formData = new FormData(form);
    
    for (const field of this.fields) {
      if (field.type === 'checkbox') {
        data[field.key] = form.elements[field.key]?.checked || false;
      } else {
        data[field.key] = formData.get(field.key) || '';
      }
    }
    
    return data;
  }
};

${moduleType === 'commonjs' ? 'module.exports = fieldConfiguration;' : ''}

/*
 * Usage Example:
 * 
 * // Validate data
 * const data = { firstName: 'John', lastName: 'Doe' };
 * const validation = fieldConfiguration.validateData(data);
 * if (!validation.valid) {
 *   console.error('Validation errors:', validation.errors);
 * }
 * 
 * // Generate form
 * document.getElementById('form-container').innerHTML = fieldConfiguration.generateFormHTML();
 * 
 * // Collect and submit data
 * document.getElementById('pdf-form').onsubmit = async (e) => {
 *   e.preventDefault();
 *   const data = fieldConfiguration.collectFormData();
 *   // Send data to PDF filling service
 * };
 */`;
}

// Unified field generators
function generateUnifiedHonoCode(
  fields: UnifiedField[],
  options: { includeValidation: boolean; includeJsDoc: boolean }
): string {
  const { includeValidation, includeJsDoc } = options;
  const fieldsJson = JSON.stringify(
    fields.filter(f => f.enabled).map(f => ({
      key: f.key,
      type: f.type,
      variant: f.variant,
      page: f.page,
      position: f.position,
      size: f.size,
      placementCount: f.placementCount,
      options: f.options
    })), 
    null, 
    2
  );
  
  return `${includeJsDoc ? `/**
 * PDF Form Filling Service (Unified Fields)
 * 
 * This service provides endpoints for filling PDF forms with unified field data.
 * Compatible with Cloudflare Workers, Deno Deploy, Bun, and Node.js.
 * 
 * @module pdf-form-service-unified
 */
` : ''}
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Unified field configuration
const unifiedFields = ${fieldsJson};

${includeValidation ? `
/**
 * Validates field data
 * @param {Object} data - Field data to validate
 * @returns {Array} Array of validation errors
 */
function validateFieldData(data) {
  const errors = [];
  
  for (const field of unifiedFields) {
    // Check for array fields
    if (field.variant !== 'single' && field.options) {
      if (!data[field.key] || !Array.isArray(data[field.key])) {
        errors.push({
          field: field.key,
          message: \`Field "\${field.key}" must be an array\`
        });
      }
    }
  }
  
  return errors;
}` : ''}

/**
 * Fills a PDF with unified field data
 * @param {Uint8Array} pdfBytes - PDF file bytes
 * @param {Object} data - Field data
 * @returns {Promise<Uint8Array>} Filled PDF bytes
 */
async function fillPDF(pdfBytes, data) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  for (const field of unifiedFields) {
    const page = pdfDoc.getPages()[field.page - 1];
    if (!page) continue;
    
    const value = data[field.key];
    if (value === undefined || value === null) continue;
    
    // Handle different field types and variants
    if (field.type === 'text') {
      if (field.variant === 'text-list' && Array.isArray(value)) {
        // Combine array values into single text
        const text = value.join(', ');
        page.drawText(text, {
          x: field.position.x,
          y: page.getHeight() - field.position.y - (field.size?.height || 30),
          size: 12,
          font,
          color: rgb(0, 0, 0)
        });
      } else if (field.variant === 'text-multi' && Array.isArray(value)) {
        // Multiple placements for array values
        value.forEach((item, idx) => {
          if (idx < field.placementCount) {
            page.drawText(String(item), {
              x: field.position.x + (idx * 20),
              y: page.getHeight() - field.position.y - (field.size?.height || 30) - (idx * 20),
              size: 12,
              font,
              color: rgb(0, 0, 0)
            });
          }
        });
      } else {
        // Single text field
        page.drawText(String(value), {
          x: field.position.x,
          y: page.getHeight() - field.position.y - (field.size?.height || 30),
          size: 12,
          font,
          color: rgb(0, 0, 0)
        });
      }
    } else if (field.type === 'checkbox') {
      if (value === true || value === 'true') {
        page.drawText('✓', {
          x: field.position.x,
          y: page.getHeight() - field.position.y - (field.size?.height || 25),
          size: 14,
          font,
          color: rgb(0, 0, 0)
        });
      }
    }
  }
  
  return await pdfDoc.save();
}

// Health check endpoint
app.get('/', (c) => c.json({ 
  status: 'ready', 
  fields: unifiedFields.length,
  version: '2.0.0'
}));

// Fill PDF endpoint
app.post('/fill', async (c) => {
  try {
    const formData = await c.req.formData();
    const pdfFile = formData.get('pdf');
    const fieldData = formData.get('data');
    
    if (!pdfFile || !(pdfFile instanceof File)) {
      return c.json({ error: 'PDF file is required' }, 400);
    }
    
    const data = fieldData ? JSON.parse(fieldData.toString()) : {};
    
    ${includeValidation ? `// Validate field data
    const errors = validateFieldData(data);
    if (errors.length > 0) {
      return c.json({ errors }, 400);
    }
    ` : ''}
    const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
    const filledPdf = await fillPDF(pdfBytes, data);
    
    return new Response(filledPdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="filled.pdf"'
      }
    });
  } catch (error) {
    return c.json({ 
      error: 'Failed to process PDF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

export default app;`;
}

function generateUnifiedExpressCode(
  fields: UnifiedField[],
  options: { includeValidation: boolean; includeJsDoc: boolean; moduleType: 'esm' | 'commonjs' }
): string {
  // Similar to Hono but with Express syntax
  return generateUnifiedHonoCode(fields, options); // Simplified for now
}

function generateUnifiedVanillaCode(
  fields: UnifiedField[],
  options: { includeValidation: boolean; includeJsDoc: boolean; moduleType: 'esm' | 'commonjs' }
): string {
  // Similar to Hono but with vanilla JS
  return generateUnifiedHonoCode(fields, options); // Simplified for now
}