# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDF Filler is a React-based application for creating dynamic PDF forms with drag-and-drop field placement, data import/export capabilities, and field mapping. Built with Vite, TypeScript, React 19, and uses pdf-lib for PDF manipulation.

## Development Commands

```bash
# Development
npm run dev          # Start Vite dev server on http://localhost:5173

# Build & Deployment
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally

# Code Quality
npm run lint         # Run ESLint
```

## Architecture

### Core Technologies
- **Build Tool**: Vite with React plugin
- **Framework**: React 19 with TypeScript
- **Routing**: React Router v7 (main app at `/`, import config at `/import-config`)
- **State Management**: Zustand (see `src/store/fieldStore.ts`)
- **UI Components**: Radix UI primitives + shadcn/ui components
- **Styling**: Tailwind CSS with custom theme
- **PDF Handling**: pdf-lib for manipulation, react-pdf for rendering
- **Drag & Drop**: react-dnd with HTML5 backend

### Field System Architecture

The application uses a **Unified Field Model** that handles all field types:

1. **UnifiedField** - Single model for all field types with variants:
   - **Single variant**: Standard fields placed at one position (text, checkbox, image, signature)
   - **Options variant**: Fields with multiple selectable options (like radio buttons or checkboxes)

2. **Key-Only Approach**: No labels in the data model - fields work with data keys from imported schemas

3. **Field Types**:
   - `text`: Text input fields
   - `checkbox`: Checkbox fields (boolean true/false)
   - `image`: Image fields
   - `signature`: Signature fields
   - Options fields support both checkmark and text rendering

### Import/Export Pipeline

- **Parsers** (`src/parsers/`): Convert SQL, JSON, TypeScript to field definitions
- **Exporters** (`src/exporters/`): Generate JavaScript, JSON, Next.js API, filled PDFs
- **Smart Detection**: Automatically detects field types and structures from imported data

### Component Organization

- UI primitives in `src/components/ui/` (auto-generated from shadcn)
- Feature components grouped by domain (e.g., `PdfViewer/`, `ImportModal/`)
- Shared hooks in `src/hooks/`

### State Management (Zustand Store)

The central `fieldStore` manages:
- Unified field collection
- PDF file and pagination state
- Grid snap settings
- Migration flag (`useUnifiedFields`) for gradual transition

Key store methods:
- Unified fields: `addUnifiedField`, `updateUnifiedField`, `deleteUnifiedField`
- Query: `getUnifiedFieldById`, `getUnifiedFieldByKey`
- PDF operations: `setPdfFile`, `setPdfUrl`, `setCurrentPage`

### Path Aliases

Uses `@/` alias for `./src/` directory (configured in both TypeScript and Vite).

## Options Field System

Options fields handle scenarios where users need to map multiple possible values to PDF positions:

### Key Concepts
- **Option Mappings**: Define where each option value appears on the PDF
- **Placement Modes**:
  - **Separate**: Each option at its own position (like radio buttons)
  - **Combined**: All selected options appear at one position as a list
- **Render Types**:
  - **Checkmark**: Shows ✓ for selected options
  - **Text Value**: Shows the actual value
  - **Custom Text**: Shows user-defined text for each option

### Data Flow
1. User defines field key (e.g., "gender", "permissions")
2. User adds option keys (e.g., "male", "female", "other")
3. User places each option on the PDF
4. At generation time, only selected values are rendered

## Boolean Data Handling

The system takes a pragmatic approach to boolean values:

- **For checkbox fields**: Pass boolean directly (true shows ✓, false shows nothing)
- **For text fields**: Transform booleans to desired text before passing to PDF generation
- **No special boolean field type**: Users handle transformations in their data layer

Example:
```javascript
// User's data transformation
const pdfData = {
  licenseStatus: data.hasLicense ? "Valid" : "Invalid",  // Boolean → Text
  hasInsurance: data.insured,  // Boolean → Checkbox
  membershipType: data.membership  // Options field
};
```

## Grid System
- Configurable grid sizes: 5px, 10px, 25px
- Toggle grid visibility and snapping independently
- Grid state persisted in field store

## Application Routes

- `/` - Main PDF editor application
- `/import-config` - Import configuration page for advanced field mapping

## Important Implementation Details

1. **PDF Coordinate System**: PDF uses bottom-left origin, component converts to top-left for UI
2. **Field Keys**: Must be valid identifiers (alphanumeric, underscore, hyphen only)
3. **Position Picker**: Click-to-place interface for precise field positioning
4. **Drag & Drop**: Support for dragging fields from palette and repositioning on PDF
5. **Key Validation**: Automatic cleaning of field keys (spaces → underscores, special chars removed)

## Testing Approach

No test framework currently configured.

## Common Tasks

### Adding New Field Types
1. Update `FieldType` in `src/types/field.types.ts`
2. Add rendering logic in `src/components/PdfViewer/UnifiedFieldOverlay.tsx`
3. Update exporters in `src/exporters/`
4. Add appropriate icon in `UnifiedFieldsList.tsx`

### Creating Options Fields
1. Open Options Field Dialog
2. Enter field key
3. Choose display type (checkmark, text, custom)
4. Choose placement strategy (separate positions or combined)
5. Add option keys
6. Click "Start Placement" to position on PDF

### Working with PDF Coordinates
Always convert between PDF coordinates (bottom-left origin) and screen coordinates (top-left origin) using the height of the page.

## Migration Status

The application is currently using the Unified Field Model (`useUnifiedFields: true` in store). The legacy field system (Field, LogicField, BooleanField) is deprecated and will be removed in future updates.