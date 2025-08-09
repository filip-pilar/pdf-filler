interface GridOverlayProps {
  show: boolean;
  enabled: boolean;
  pageWidth: number;
  pageHeight: number;
  scale: number;
  gridSize: number;
}

export function GridOverlay({ 
  show, 
  enabled, 
  pageWidth, 
  pageHeight, 
  scale, 
  gridSize 
}: GridOverlayProps) {
  if (!show || !enabled) {
    return null;
  }

  return (
    <div 
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
        backgroundImage: `
          linear-gradient(to right, rgba(0,0,0,0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0,0,0,0.15) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize * scale}px ${gridSize * scale}px`,
      }}
    />
  );
}