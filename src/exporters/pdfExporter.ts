import { PDFDocument, rgb } from 'pdf-lib';
import type { Field } from '@/types/field.types';

export async function exportFilledPDF(pdfBytes: ArrayBuffer, fields: Field[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  
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
      // Convert Y coordinate (PDF has origin at bottom-left)
      const y = height - field.position.y - field.size.height;
      
      if (field.sampleValue) {
        switch (field.type) {
          case 'checkbox':
            if (field.sampleValue) {
              // Draw checkmark
              page.drawText('✓', {
                x: field.position.x + 2,
                y: y + 2,
                size: field.size.height * 0.8,
                color: rgb(0, 0, 0),
              });
            }
            break;
          
          case 'image':
          case 'signature':
            // For base64 images, we'd need to embed them
            // This is a simplified version that just adds a placeholder
            if (typeof field.sampleValue === 'string' && field.sampleValue.startsWith('data:image')) {
              try {
                // Extract base64 data
                const base64Data = field.sampleValue.split(',')[1];
                const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                
                // Determine image type
                const isPng = field.sampleValue.includes('image/png');
                const image = isPng 
                  ? await pdfDoc.embedPng(imageBytes)
                  : await pdfDoc.embedJpg(imageBytes);
                
                // Draw image
                page.drawImage(image, {
                  x: field.position.x,
                  y: y,
                  width: field.size.width,
                  height: field.size.height,
                });
              } catch (e) {
                console.error('Failed to embed image:', e);
              }
            }
            break;
          
          default:
            // Draw single line text
            page.drawText(String(field.sampleValue), {
              x: field.position.x + 2,
              y: y + (field.size.height / 2) - 4,
              size: 10,
              color: rgb(0, 0, 0),
            });
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