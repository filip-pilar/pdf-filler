# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PDF Filler is a React-based application for creating dynamic PDF forms with drag-and-drop field placement, data import/export capabilities, and sophisticated field logic. Built with Vite, TypeScript, React 19, and uses pdf-lib for PDF manipulation.

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
- **Routing**: React Router v7 (main app at `/`, dev tools at `/dev`)
- **State Management**: Zustand (see `src/store/fieldStore.ts`)
- **UI Components**: Radix UI primitives + shadcn/ui components
- **Styling**: Tailwind CSS with custom theme
- **PDF Handling**: pdf-lib for manipulation, react-pdf for rendering
- **Drag & Drop**: react-dnd with HTML5 backend

### Key Architectural Patterns

1. **Field System**: Three distinct field types managed in parallel:
   - **Regular Fields** (`Field`): Text, checkbox, radio, image, signature fields
   - **Logic Fields** (`LogicField`): Dropdown/select fields with conditional actions
   - **Boolean Fields** (`BooleanField`): Binary choice fields with true/false actions

2. **Import/Export Pipeline**:
   - **Parsers** (`src/parsers/`): Convert SQL, JSON, TypeScript to field definitions
   - **Exporters** (`src/exporters/`): Generate JavaScript, JSON, Next.js API, filled PDFs

3. **Component Organization**:
   - UI primitives in `src/components/ui/` (auto-generated from shadcn)
   - Feature components grouped by domain (e.g., `PdfViewer/`, `ImportModal/`)
   - Shared hooks in `src/hooks/`

### State Management (Zustand Store)

The central `fieldStore` manages:
- Field collections (regular, logic, boolean)
- PDF file and pagination state
- Grid snap settings
- Complex operations like field actions and option management

Key store methods:
- Field CRUD: `addField`, `updateField`, `deleteField`, `duplicateField`
- Logic fields: `addLogicField`, `updateLogicField`, with nested option/action management
- Boolean fields: `addBooleanField` with true/false action branches
- PDF operations: `setPdfFile`, `setPdfUrl`, `setCurrentPage`

### Path Aliases

Uses `@/` alias for `./src/` directory (configured in both TypeScript and Vite).

## Field Type Architecture

### Field Positioning & Actions
- Fields have page-specific positions with x/y coordinates
- Logic fields can trigger actions on specific options (show/hide other fields, set values)
- Boolean fields have separate action sets for true/false states
- Actions can target other fields by key and modify their visibility or values

### Grid System
- Configurable grid sizes: 5px, 10px, 25px
- Toggle grid visibility and snapping independently
- Grid state persisted in field store

## Development Routes

- `/` - Main PDF editor application
- `/dev` - Development tools and field mapping table experiments

## Important Implementation Details

1. **PDF Coordinate System**: PDF uses bottom-left origin, component converts to top-left for UI
2. **Field Keys**: Unique identifiers used for data binding and cross-field references
3. **Drag Preview**: Custom drag preview components for better UX during field placement
4. **Position Picker**: Overlay mode for precise field positioning with click-to-place
5. **Keyboard Shortcuts**: Implemented via `useKeyboardShortcuts` hook

## Testing Approach

No test framework currently configured. The codebase includes development pages (`/dev`) for testing components in isolation.

## Common Tasks

### Adding New Field Types
1. Update `FieldType` in `src/types/field.types.ts`
2. Add rendering logic in `src/components/PdfViewer/FieldOverlay.tsx`
3. Update exporters in `src/exporters/`
4. Add drag component if needed

### Creating New UI Components
1. Check existing shadcn/ui components first
2. Follow Radix UI patterns for accessibility
3. Use Tailwind classes with theme variables
4. Place in appropriate component subdirectory

### Working with PDF Coordinates
Always convert between PDF coordinates (bottom-left origin) and screen coordinates (top-left origin) using the height of the page.