# PDF Filler

A modern, privacy-focused PDF form field mapper that runs entirely in your browser. Create reusable field configurations, map data schemas to PDF positions, and generate code to automate PDF filling.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

### 🎯 Core Capabilities
- **Drag & Drop Field Placement** - Visually place fields exactly where you need them on your PDF
- **Smart Schema Import** - Import from JSON, SQL, or TypeScript and auto-detect field types
- **Composite Fields** - Combine multiple data fields into one (e.g., `{firstName} {lastName}` → "John Doe")
- **Auto-Save** - All configurations save automatically to browser localStorage
- **Privacy-First** - No uploads, no servers - everything runs locally in your browser

### 🔧 Field Types
- **Text Fields** - Standard text input with font, size, and alignment options
- **Checkboxes** - Boolean fields with checkmark rendering
- **Images & Signatures** - Support for base64 encoded images
- **Options Fields** - Radio buttons and multi-select checkboxes
- **Composite Fields** - Template-based fields that combine multiple values

### 📤 Export Options
- **JavaScript/TypeScript** - Generate vanilla JS code with pdf-lib
- **Next.js API Routes** - Ready-to-deploy API endpoints
- **JSON Configuration** - Share field mappings with your team
- **Filled PDFs** - Generate PDFs with sample or real data

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 and start mapping!

## 📖 How It Works

### 1. Upload Your PDF
Drag and drop or click to upload any PDF form you want to fill programmatically.

### 2. Add Fields
**Manual Method:**
- Drag field types from the left sidebar onto your PDF
- Position them exactly where data should appear

**Import Method:**
- Click "Import Schema" and paste your data structure (JSON/SQL/TypeScript)
- Fields are automatically created from your schema
- Use the configuration wizard to map them to PDF positions

### 3. Create Composite Fields (Optional)
Click "+ Composite" in the Fields sidebar to combine multiple data fields:
```
Template: {firstName} {lastName}
Result: John Doe

Template: {address.line1}, {address.city}, {address.state} {address.zip}
Result: 123 Main St, Boston, MA 02101
```

### 4. Export Your Configuration
Choose your export format:
- **JavaScript** - Copy the code into your Node.js application
- **Next.js** - Drop-in API route for your Next.js app
- **JSON** - Save and share field configurations

## 💾 Data Persistence

Your work saves automatically! The app uses browser localStorage to persist:
- Field configurations and positions
- Grid settings and preferences
- PDF metadata (not the actual PDF)

**Storage Menu Options:**
- **Export Backup** - Download all configurations as JSON
- **Import Backup** - Restore from a backup file
- **Clear Storage** - Remove all saved data

## 🛠️ Advanced Features

### Grid System
- Toggle grid visibility with `G` key
- Adjustable grid sizes (10px, 25px, 50px, 100px)
- Snap-to-grid for precise alignment

### Keyboard Shortcuts
- `G` - Toggle grid
- `Delete/Backspace` - Delete selected field
- `Esc` - Deselect field

### Position Picker
Click the position picker icon to place fields with pixel-perfect precision by clicking directly on the PDF.

## 🏗️ Architecture

Built with modern web technologies:
- **React 19** with TypeScript for type safety
- **Vite** for lightning-fast development
- **pdf-lib** for PDF manipulation
- **Zustand** for state management
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components

## 📁 Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # Reusable UI primitives
│   ├── PdfViewer/   # PDF rendering and field overlay
│   └── ImportModal/ # Schema import functionality
├── store/           # Zustand state management
├── parsers/         # Schema parsing (JSON, SQL, TypeScript)
├── exporters/       # Code generation for various formats
├── utils/           # Utilities (localStorage, templates)
└── types/           # TypeScript type definitions
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this in your projects!

## 🔒 Privacy

- **No Server Upload** - PDFs never leave your browser
- **No Analytics** - We don't track your usage
- **No External Services** - Everything runs locally
- **Filtered Storage** - Sample data excluded from saves

## 🐛 Troubleshooting

**Fields not showing after import?**
- Make sure to complete the import configuration wizard
- Check that fields are enabled (visible in the Fields sidebar)

**Composite fields not finding dependencies?**
- Ensure base fields exist first (manual or imported)
- Field keys are case-sensitive

**Changes not persisting?**
- Check browser localStorage isn't disabled
- Try exporting a backup for safety

## 🚦 Roadmap

- [ ] Barcode/QR code field type
- [ ] Field validation rules
- [ ] Conditional field visibility
- [ ] Multi-page field copying
- [ ] Cloud storage integration (optional)
- [ ] Team collaboration features

---

Built with ❤️ for developers who need to automate PDF filling without the complexity of enterprise solutions.