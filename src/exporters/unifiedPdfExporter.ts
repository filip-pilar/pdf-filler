/* eslint-disable @typescript-eslint/no-explicit-any */
import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import type { UnifiedField, SimplifiedConditionalOperator, ConditionalFieldResult } from '@/types/unifiedField.types';
import { TemplateEngine } from '@/utils/templateEngine';

interface ExportOptions {
  fields: UnifiedField[];
  fieldValues?: Record<string, any>;
}

/**
 * Export a filled PDF using UnifiedField configuration
 * This exporter uses the user-defined field configurations to fill PDFs dynamically
 */
export async function exportUnifiedPDF(
  pdfBytes: ArrayBuffer,
  options: ExportOptions
): Promise<Uint8Array> {
  const { fields, fieldValues = {} } = options;
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  // Embed fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
  const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
  
  // Font mapping
  const getFontForField = (field: UnifiedField): PDFFont => {
    const fontFamily = field.properties?.fontFamily || 'Helvetica';
    const bold = field.properties?.bold || false;
    const italic = field.properties?.italic || false;
    
    switch (fontFamily) {
      case 'Times':
        if (bold) return timesBoldFont;
        if (italic) return timesItalicFont;
        return timesFont;
      case 'Courier':
        if (bold) return courierBoldFont;
        return courierFont;
      case 'Helvetica':
      default:
        if (bold) return helveticaBoldFont;
        return helveticaFont;
    }
  };
  
  // Process each page
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();
    const pageNumber = pageIndex + 1;
    
    // Get fields for this page
    const pageFields = fields.filter(f => f.page === pageNumber && f.enabled);
    
    for (const field of pageFields) {
      // Determine the value to render
      let value: any;
      
      // Handle conditional fields - evaluate to get the text to display
      if (field.type === 'conditional') {
        value = evaluateConditionalField(field, fieldValues);
      }
      // Handle composite fields by evaluating their template
      else if (field.type === 'composite-text' && field.template) {
        value = TemplateEngine.evaluateWithContext(field.template, fieldValues, field.compositeFormatting);
      } else {
        value = fieldValues[field.key] ?? field.properties?.defaultValue ?? field.sampleValue;
      }
      
      if (value === undefined || value === null || value === '') continue;
      
      // Handle different field variants
      if (field.variant === 'options' && field.optionMappings) {
        // Handle options fields
        await renderOptionsField(page, field, value, pageHeight, getFontForField(field));
      } else {
        // Handle single fields
        await renderSingleField(page, field, value, pageHeight, pdfDoc, getFontForField(field));
      }
    }
  }
  
  return await pdfDoc.save();
}

/**
 * Evaluate a simplified conditional operator
 */
function evaluateCondition(
  operator: SimplifiedConditionalOperator,
  fieldValue: any,
  compareValue: any
): boolean {
  switch (operator) {
    case 'equals':
      // Use == for loose equality (handles type coercion)
      return fieldValue == compareValue;
    case 'not-equals':
      return fieldValue != compareValue;
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
    case 'exists':
      return fieldValue != null && fieldValue !== '';
    case 'not-exists':
      return fieldValue == null || fieldValue === '';
    default:
      return false;
  }
}

/**
 * Evaluate conditional field and determine which text value to render
 */
function evaluateConditionalField(
  field: UnifiedField,
  fieldValues: Record<string, any>
): ConditionalFieldResult {
  let textValue = '';
  
  if (!field.conditionalBranches || field.conditionalBranches.length === 0) {
    textValue = field.conditionalDefaultValue || '';
  } else {
    // Evaluate each branch in order
    for (const branch of field.conditionalBranches) {
      const fieldValue = fieldValues[branch.condition.field];
      const matches = evaluateCondition(
        branch.condition.operator,
        fieldValue,
        branch.condition.value
      );
      
      if (matches) {
        textValue = branch.renderValue || '';
        break;
      }
    }
    
    // If no branches matched, use default value
    if (!textValue && field.conditionalDefaultValue) {
      textValue = field.conditionalDefaultValue;
    }
  }
  
  // Check if it's a simple field reference pattern like {fieldName}
  const simpleFieldRefMatch = textValue.match(/^{([^}]+)}$/);
  
  if (simpleFieldRefMatch) {
    // Direct field reference - get the raw value (could be boolean, string, etc.)
    const fieldKey = simpleFieldRefMatch[1].trim();
    const rawValue = fieldValues[fieldKey];
    
    // For checkbox mode, evaluate the raw value
    if (field.conditionalRenderAs === 'checkbox') {
      if (typeof rawValue === 'boolean') {
        return rawValue;
      }
      // Convert string values to boolean
      return ['true', 'checked', 'yes', '1'].includes(String(rawValue).toLowerCase());
    }
    
    // For text mode, convert to string
    return rawValue != null ? String(rawValue) : '';
  }
  
  // Complex template - process with TemplateEngine (with circular reference detection)
  if (textValue.includes('{') && textValue.includes('}')) {
    textValue = TemplateEngine.evaluateWithContext(textValue, fieldValues);
  }
  
  // Handle empty results - if template evaluated to empty, use default or empty string
  if (!textValue && field.conditionalDefaultValue) {
    textValue = field.conditionalDefaultValue;
    // Re-evaluate if default is also a template
    if (textValue.includes('{') && textValue.includes('}')) {
      textValue = TemplateEngine.evaluateWithContext(textValue, fieldValues);
    }
  }
  
  // If renderAs is checkbox and we have a processed string value
  if (field.conditionalRenderAs === 'checkbox') {
    // Strict matching - only exact values (trimmed) count as checked
    const trimmedValue = String(textValue).trim().toLowerCase();
    
    // Support escape syntax: \true becomes literal "true" text
    if (textValue.startsWith('\\')) {
      // Escaped value - treat as literal text, not checkbox
      return false;
    }
    
    // Only these exact, complete values trigger checkbox checked state
    const checkboxTrueValues = ['true', 'checked', 'yes', '1'];
    const checkboxFalseValues = ['false', 'unchecked', 'no', '0', ''];
    
    if (checkboxTrueValues.includes(trimmedValue)) {
      return true;
    }
    
    // Explicitly handle false values
    if (checkboxFalseValues.includes(trimmedValue)) {
      return false;
    }
    
    // Any other value (like "Answer: true") is treated as unchecked
    // This prevents accidental matches on partial strings
    console.warn(`Ambiguous checkbox value "${textValue}" treated as unchecked. Use exact values: ${checkboxTrueValues.join(', ')}`);
    return false;
  }
  
  return textValue;
}

async function renderOptionsField(
  page: any,
  field: UnifiedField,
  value: any,
  pageHeight: number,
  font: PDFFont
) {
  if (!field.optionMappings) return;
  
  // Handle multi-select vs single-select
  // Always treat as array for options fields since we want to show all selected
  const selectedValues = Array.isArray(value) ? value : [value];
  
  for (const mapping of field.optionMappings) {
    if (selectedValues.includes(mapping.key)) {
      const position = convertPosition(mapping.position, mapping.size?.height || 20, pageHeight, field.positionVersion);
      
      switch (field.renderType) {
        case 'checkmark': {
          // Draw only X mark (no border - PDF has its own checkbox)
          const checkSize = mapping.size?.height || 16;
          const boxX = position.x;
          const boxY = position.y;
          
          // Draw X mark
          const padding = checkSize * 0.2;
          const lineWidth = 1.5;
          
          // First diagonal
          page.drawLine({
            start: { x: boxX + padding, y: boxY + checkSize - padding },
            end: { x: boxX + checkSize - padding, y: boxY + padding },
            thickness: lineWidth,
            color: getColor(field.properties?.textColor),
          });
          
          // Second diagonal
          page.drawLine({
            start: { x: boxX + checkSize - padding, y: boxY + checkSize - padding },
            end: { x: boxX + padding, y: boxY + padding },
            thickness: lineWidth,
            color: getColor(field.properties?.textColor),
          });
          break;
        }
          
        case 'text': {
          // Center text vertically like regular text fields
          const fontSize = field.properties?.fontSize || 10;
          const fieldHeight = mapping.size?.height || 30;
          const textY = position.y + (fieldHeight - fontSize) / 2;
          
          page.drawText(mapping.key, {
            x: position.x,
            y: textY,
            size: fontSize,
            font,
            color: getColor(field.properties?.textColor),
          });
          break;
        }
          
        case 'custom':
          if (mapping.customText) {
            // Center text vertically like regular text fields
            const fontSize = field.properties?.fontSize || 10;
            const fieldHeight = mapping.size?.height || 30;
            const textY = position.y + (fieldHeight - fontSize) / 2;
            
            page.drawText(mapping.customText, {
              x: position.x,
              y: textY,
              size: fontSize,
              font,
              color: getColor(field.properties?.textColor),
            });
          }
          break;
      }
    }
  }
}

async function renderSingleField(
  page: any,
  field: UnifiedField,
  value: any,
  pageHeight: number,
  pdfDoc: PDFDocument,
  font: PDFFont
) {
  // Skip fields without position (data-only fields)
  if (!field.position) return;
  
  const position = convertPosition(
    field.position, 
    field.size?.height || 30, 
    pageHeight, 
    field.positionVersion
  );
  
  switch (field.type) {
    case 'checkbox':
      if (value === true || value === 'true' || value === 1 || value === '1') {
        const checkSize = field.properties?.checkboxSize || field.size?.width || 20;
        const boxX = field.position.x;
        const boxY = position.y;
        
        // Draw only X mark (no border - PDF has its own checkbox)
        const padding = checkSize * 0.2;
        const lineWidth = 2;
        
        // First diagonal line (top-left to bottom-right)
        page.drawLine({
          start: { x: boxX + padding, y: boxY + checkSize - padding },
          end: { x: boxX + checkSize - padding, y: boxY + padding },
          thickness: lineWidth,
          color: getColor(field.properties?.textColor),
        });
        
        // Second diagonal line (top-right to bottom-left)
        page.drawLine({
          start: { x: boxX + checkSize - padding, y: boxY + checkSize - padding },
          end: { x: boxX + padding, y: boxY + padding },
          thickness: lineWidth,
          color: getColor(field.properties?.textColor),
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
          } else {
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
          // 'stretch' mode uses the field dimensions as-is
          
          const imgX = field.position.x + ((field.size?.width || 100) - imgWidth) / 2;
          const imgY = position.y + ((field.size?.height || 100) - imgHeight) / 2;
          
          page.drawImage(image, {
            x: Math.max(field.position.x, imgX),
            y: Math.max(position.y, imgY),
            width: Math.min(imgWidth, field.size?.width || 100),
            height: Math.min(imgHeight, field.size?.height || 100),
          });
        } catch (e) {
          console.error(`Failed to embed image for field "${field.key}":`, e);
        }
      }
      break;
      
    case 'conditional':
      // Handle conditional fields that render as checkbox
      if (field.conditionalRenderAs === 'checkbox' && value === true) {
        const checkSize = field.properties?.checkboxSize || field.size?.width || 20;
        const boxX = field.position.x;
        const boxY = position.y;
        
        // Draw checkmark
        page.drawText('✓', {
          x: boxX,
          y: boxY,
          size: checkSize,
          font: font,
          color: getColor(field.properties?.textColor)
        });
      } else if (field.conditionalRenderAs !== 'checkbox' && value) {
        // Render as text (fall through to text case)
        const text = String(value);
        const fontSize = field.properties?.fontSize || 10;
        const textAlign = field.properties?.textAlign || 'left';
        const padding = field.properties?.padding || { left: 2, right: 2, top: 2, bottom: 2 };
        
        // Calculate text position based on alignment
        let textX = field.position.x + (padding.left || 2);
        
        if (textAlign === 'center') {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          textX = field.position.x + ((field.size?.width || 100) - textWidth) / 2;
        } else if (textAlign === 'right') {
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          textX = field.position.x + (field.size?.width || 100) - textWidth - (padding.right || 2);
        }
        
        // Center text vertically in field
        const fieldHeight = field.size?.height || 30;
        const textY = position.y + (fieldHeight - fontSize) / 2;
        
        page.drawText(text, {
          x: textX,
          y: textY,
          size: fontSize,
          font: font,
          color: getColor(field.properties?.textColor),
        });
      }
      break;
      
    case 'text':
    case 'composite-text':
    default: {
      const text = String(value);
      const fontSize = field.properties?.fontSize || 10;
      const textAlign = field.properties?.textAlign || 'left';
      const padding = field.properties?.padding || { left: 2, right: 2, top: 2, bottom: 2 };
      
      // Calculate text position based on alignment
      let textX = field.position.x + (padding.left || 2);
      const fieldWidth = (field.size?.width || 100) - (padding.left || 2) - (padding.right || 2);
      
      if (textAlign === 'center') {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        textX = field.position.x + ((field.size?.width || 100) - textWidth) / 2;
      } else if (textAlign === 'right') {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        textX = field.position.x + (field.size?.width || 100) - textWidth - (padding.right || 2);
      }
      
      // Handle text wrapping if needed
      if (field.properties?.autoSize) {
        // Auto-size text to fit
        let adjustedFontSize = fontSize;
        let textWidth = font.widthOfTextAtSize(text, adjustedFontSize);
        
        while (textWidth > fieldWidth && adjustedFontSize > 6) {
          adjustedFontSize--;
          textWidth = font.widthOfTextAtSize(text, adjustedFontSize);
        }
        
        // Center text vertically in field
        const fieldHeight = field.size?.height || 30;
        const textY = position.y + (fieldHeight - adjustedFontSize) / 2;
        
        page.drawText(text, {
          x: textX,
          y: textY,
          size: adjustedFontSize,
          font,
          color: getColor(field.properties?.textColor),
        });
      } else {
        // Wrap text if needed
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(testLine, fontSize);
          
          if (testWidth > fieldWidth && currentLine) {
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
        const lineHeight = fontSize * (field.properties?.lineHeight || 1.2);
        // Position text at vertical center of field instead of top
        const totalTextHeight = lines.length * lineHeight;
        const fieldHeight = field.size?.height || 30;
        const verticalPadding = (fieldHeight - totalTextHeight) / 2;
        const startY = position.y + fieldHeight - verticalPadding - fontSize;
        
        lines.forEach((line, index) => {
          let lineX = textX;
          
          if (textAlign === 'center') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            lineX = field.position!.x + ((field.size?.width || 100) - lineWidth) / 2;
          } else if (textAlign === 'right') {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            lineX = field.position!.x + (field.size?.width || 100) - lineWidth - (padding.right || 2);
          }
          
          page.drawText(line, {
            x: lineX,
            y: Math.max(position.y + (padding.bottom || 2), startY - (index * lineHeight)),
            size: fontSize,
            font,
            color: getColor(field.properties?.textColor),
          });
        });
      }
      break;
    }
  }
}

/**
 * Convert position based on version
 * UnifiedFields with 'top-edge': Y=0 is at TOP of page (screen coordinates)
 * pdf-lib: Y=0 is at BOTTOM of page
 * Legacy fields: Y is distance from PDF bottom to field's BOTTOM edge
 */
function convertPosition(
  position: { x: number; y: number },
  fieldHeight: number,
  pageHeight: number,
  positionVersion?: string
): { x: number; y: number } {
  if (positionVersion === 'top-edge') {
    // New unified fields: Y=0 is at TOP of page (screen coordinates)
    // Convert to pdf-lib coordinates where Y=0 is at BOTTOM
    // Position stored is to TOP edge of field, pdf-lib needs BOTTOM edge
    return {
      x: position.x,
      y: pageHeight - position.y - fieldHeight
    };
  }
  
  // Legacy: Y is already in PDF coordinates (bottom-origin) to field's BOTTOM edge
  return position;
}

/**
 * Convert RGB color object to pdf-lib rgb() function result
 */
function getColor(color?: { r: number; g: number; b: number }) {
  if (!color) return rgb(0, 0, 0); // Default to black
  return rgb(color.r / 255, color.g / 255, color.b / 255);
}

/**
 * Download helper function
 */
export function downloadPDF(pdfBytes: Uint8Array, filename: string = 'filled-form.pdf') {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}