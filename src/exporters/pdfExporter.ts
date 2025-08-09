import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Field } from '@/types/field.types';
import type { LogicField } from '@/types/logicField.types';

interface ExportOptions {
  fields: Field[];
  logicFields?: LogicField[];
  fieldValues?: Record<string, any>;
}

export async function exportFilledPDF(
  pdfBytes: ArrayBuffer, 
  options: ExportOptions | Field[]
): Promise<Uint8Array> {
  // Handle backward compatibility
  let fields: Field[];
  let logicFields: LogicField[] = [];
  let fieldValues: Record<string, any> = {};
  
  if (Array.isArray(options)) {
    // Legacy call with just fields array
    fields = options;
  } else {
    fields = options.fields;
    logicFields = options.logicFields || [];
    fieldValues = options.fieldValues || {};
  }
  
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
  // Embed fonts for better text rendering
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Group fields by page
  const fieldsByPage = fields.reduce((acc, field) => {
    const pageIndex = field.page - 1; // Convert to 0-based index
    if (!acc[pageIndex]) acc[pageIndex] = [];
    acc[pageIndex].push(field);
    return acc;
  }, {} as Record<number, Field[]>);
  
  // Draw fields on each page
  for (const [pageIndexStr, pageFields] of Object.entries(fieldsByPage)) {
    const pageIndex = parseInt(pageIndexStr);
    if (pageIndex >= pages.length) continue;
    
    const page = pages[pageIndex];
    const { height } = page.getSize();
    
    for (const field of pageFields) {
      // Get the value to display (prioritize fieldValues over sampleValue)
      const value = fieldValues[field.key] !== undefined 
        ? fieldValues[field.key] 
        : field.sampleValue;
      
      if (value === undefined || value === null || value === '') continue;
      
      // Convert Y coordinate (PDF has origin at bottom-left)
      const y = height - field.position.y - field.size.height;
      
      switch (field.type) {
        case 'checkbox': {
          // Only draw checkmark if value is truthy
          if (value === true || value === 'true' || value === 1 || value === '1') {
            // Calculate optimal checkmark size and position
            const checkSize = field.properties?.checkboxSize || Math.min(field.size.width, field.size.height) * 0.7;
            const checkX = field.position.x + (field.size.width - checkSize) / 2;
            const checkY = y + (field.size.height - checkSize) / 2;
            
            // Draw an X mark instead of checkmark to avoid encoding issues
            page.drawText('X', {
              x: checkX,
              y: checkY,
              size: checkSize,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0),
            });
            
            // Alternative: Draw an X if checkbox is square
            if (Math.abs(field.size.width - field.size.height) < 2) {
              // Could use drawLine if needed for X mark
            }
          }
          break;
        }
        
        case 'image':
        case 'signature': {
          // Handle base64 images
          if (typeof value === 'string' && value.startsWith('data:image')) {
            try {
              // Extract base64 data
              const base64Data = value.split(',')[1];
              const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              // Determine image type and embed
              let image;
              if (value.includes('image/png')) {
                image = await pdfDoc.embedPng(imageBytes);
              } else if (value.includes('image/jpeg') || value.includes('image/jpg')) {
                image = await pdfDoc.embedJpg(imageBytes);
              } else {
                console.warn(`Unsupported image format for field "${field.key}"`);
                break;
              }
              
              // Calculate image dimensions to fit within field bounds
              const imgDims = image.scale(1);
              let imgWidth = field.size.width;
              let imgHeight = field.size.height;
              
              // Maintain aspect ratio based on fitMode
              if (field.properties?.fitMode === 'fit') {
                const scale = Math.min(
                  field.size.width / imgDims.width,
                  field.size.height / imgDims.height
                );
                imgWidth = imgDims.width * scale;
                imgHeight = imgDims.height * scale;
              } else if (field.properties?.fitMode === 'fill') {
                const scale = Math.max(
                  field.size.width / imgDims.width,
                  field.size.height / imgDims.height
                );
                imgWidth = imgDims.width * scale;
                imgHeight = imgDims.height * scale;
              }
              
              // Center image in field if it's smaller
              const imgX = field.position.x + (field.size.width - imgWidth) / 2;
              const imgY = y + (field.size.height - imgHeight) / 2;
              
              // Draw image
              page.drawImage(image, {
                x: Math.max(field.position.x, imgX),
                y: Math.max(y, imgY),
                width: Math.min(imgWidth, field.size.width),
                height: Math.min(imgHeight, field.size.height),
              });
            } catch (e) {
              console.error(`Failed to embed image for field "${field.key}":`, e);
              // Draw placeholder text
              page.drawText('[Image]', {
                x: field.position.x + 2,
                y: y + field.size.height / 2 - 5,
                size: 8,
                font: helveticaFont,
                color: rgb(0.5, 0.5, 0.5),
              });
            }
          }
          break;
        }
        
        case 'text':
        default: {
          // Handle text fields with better formatting
          const text = String(value);
          const fontSize = field.properties?.fontSize || 10;
          const font = helveticaFont;
          
          // Calculate text dimensions for better positioning
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const maxWidth = field.size.width - 4; // 2px padding on each side
          
          if (textWidth <= maxWidth) {
            // Single line text - center vertically
            const textY = y + (field.size.height - fontSize) / 2 + fontSize * 0.3;
            page.drawText(text, {
              x: field.position.x + 2,
              y: textY,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          } else {
            // Multi-line text - wrap text
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';
            
            for (const word of words) {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const testWidth = font.widthOfTextAtSize(testLine, fontSize);
              
              if (testWidth > maxWidth && currentLine) {
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
            const totalTextHeight = lines.length * lineHeight;
            const startY = y + field.size.height - (field.size.height - totalTextHeight) / 2 - fontSize * 0.3;
            
            lines.forEach((line, index) => {
              // Prevent text from going outside field bounds
              if (startY - (index * lineHeight) > y) {
                page.drawText(line, {
                  x: field.position.x + 2,
                  y: Math.max(y + 2, startY - (index * lineHeight)),
                  size: fontSize,
                  font,
                  color: rgb(0, 0, 0),
                });
              }
            });
          }
          break;
        }
      }
    }
    
    // Process logic fields for this page
    for (const logicField of logicFields) {
      const selectedValue = fieldValues[logicField.key];
      if (!selectedValue) continue;
      
      const selectedOption = logicField.options.find(opt => opt.key === selectedValue);
      if (!selectedOption) continue;
      
      for (const action of selectedOption.actions) {
        // Check if action is for current page (1-indexed)
        if (action.position.page !== pageIndex + 1) continue;
        
        const actionY = height - action.position.y - (action.size?.height || 20);
        
        switch (action.type) {
          case 'checkmark':
            page.drawText('X', {
              x: action.position.x,
              y: actionY,
              size: action.properties?.fontSize || 12,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0),
            });
            break;
            
          case 'fillLabel':
            page.drawText(selectedOption.label, {
              x: action.position.x,
              y: actionY,
              size: action.properties?.fontSize || 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            break;
            
          case 'fillCustom':
            if (action.customText) {
              page.drawText(action.customText, {
                x: action.position.x,
                y: actionY,
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
  
  return await pdfDoc.save();
}

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