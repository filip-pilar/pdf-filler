import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PdfCanvasProps {
  url: string;
  currentPage: number;
  scale: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onPageLoadSuccess: (page: { width: number; height: number }) => void;
}

export function PdfCanvas({
  url,
  currentPage,
  scale,
  onLoadSuccess,
  onPageLoadSuccess
}: PdfCanvasProps) {
  return (
    <Document
      file={url}
      onLoadSuccess={onLoadSuccess}
      onLoadError={(err) => {
        console.error('Error loading PDF:', err);
      }}
      loading={
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <Page
        pageNumber={currentPage}
        scale={scale}
        onLoadSuccess={onPageLoadSuccess}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}