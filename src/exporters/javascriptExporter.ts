import type { Field } from '@/types/field.types';

export function generateJavaScriptCode(fields: Field[]): string {
  const fieldsJson = JSON.stringify(fields, null, 2);
  
  return `import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { PDFDocument, rgb } from 'pdf-lib';

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Field configuration
const fields = ${fieldsJson};

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', fields: fields.length });
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
    
    // Load the PDF
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // Fill fields
    for (const field of fields) {
      const value = fieldData[field.key];
      if (!value) continue;
      
      const pageIndex = field.page - 1;
      if (pageIndex >= pages.length) continue;
      
      const page = pages[pageIndex];
      const { height } = page.getSize();
      const y = height - field.position.y - field.size.height;
      
      // Draw field value based on type
      switch (field.type) {
        case 'checkbox':
          if (value) {
            page.drawText('✓', {
              x: field.position.x + 2,
              y: y + 2,
              size: field.size.height * 0.8,
              color: rgb(0, 0, 0),
            });
          }
          break;
        
        default:
          page.drawText(String(value), {
            x: field.position.x + 2,
            y: y + (field.size.height / 2) - 4,
            size: 10,
            color: rgb(0, 0, 0),
          });
      }
    }
    
    // Save and return the filled PDF
    const filledPdfBytes = await pdfDoc.save();
    
    return new Response(filledPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="filled-form.pdf"'
      }
    });
  } catch (error) {
    console.error('Error filling PDF:', error);
    return c.json({ error: 'Failed to fill PDF' }, 500);
  }
});

// Export for Cloudflare Workers, Deno, Bun, etc.
export default app;

// Example client usage:
/*
async function fillPDF(pdfFile, fieldData) {
  const formData = new FormData();
  formData.append('pdf', pdfFile);
  formData.append('data', JSON.stringify(fieldData));
  
  const response = await fetch('http://localhost:8787/fill-pdf', {
    method: 'POST',
    body: formData
  });
  
  if (response.ok) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url);
  }
}
*/`;
}