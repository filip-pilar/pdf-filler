import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string;
    description: string;
  }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Essential',
    shortcuts: [
      { keys: '⌘/Ctrl + O', description: 'Open PDF' },
      { keys: '⌘/Ctrl + S', description: 'Save configuration' },
      { keys: '⌘/Ctrl + I', description: 'Import fields' },
      { keys: '⌘/Ctrl + E', description: 'Export' },
      { keys: '⌘/Ctrl + Z', description: 'Undo' },
      { keys: '⌘/Ctrl + Shift + Z', description: 'Redo' },
      { keys: '?', description: 'Show shortcuts' },
    ],
  },
  {
    title: 'Dialog Controls',
    shortcuts: [
      { keys: 'Enter', description: 'Save (in input fields)' },
      { keys: '⌘/Ctrl + Enter', description: 'Save (in text areas)' },
      { keys: 'Escape', description: 'Cancel/Close' },
      { keys: 'Tab / Shift+Tab', description: 'Navigate fields' },
    ],
  },
  {
    title: 'PDF Navigation',
    shortcuts: [
      { keys: '⌘/Ctrl + ← / →', description: 'Previous/Next page' },
      { keys: '⌘/Ctrl + + / -', description: 'Zoom in/out' },
      { keys: '⌘/Ctrl + 0', description: 'Fit to width' },
      { keys: '⌘/Ctrl + P', description: 'Preview mode' },
    ],
  },
  {
    title: 'Sidebars',
    shortcuts: [
      { keys: '⌘/Ctrl + [', description: 'Toggle left sidebar' },
      { keys: '⌘/Ctrl + ]', description: 'Toggle queue sidebar' },
    ],
  },
  {
    title: 'Field Editing',
    shortcuts: [
      { keys: '⌘/Ctrl + Delete', description: 'Delete field' },
      { keys: '⌘/Ctrl + D', description: 'Duplicate field' },
      { keys: '⌘/Ctrl + L', description: 'Lock/unlock field' },
      { keys: '⌘/Ctrl + C / V', description: 'Copy/Paste field' },
      { keys: 'Escape', description: 'Deselect field' },
    ],
  },
  {
    title: 'Field Movement',
    shortcuts: [
      { keys: 'Shift + ↑↓←→', description: 'Move by 1px' },
      { keys: 'Shift + Alt + ↑↓←→', description: 'Move by 10px' },
      { keys: '⌘/Ctrl + Shift + D', description: 'Duplicate with offset' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <>
      <style>{`
        .fields-tab-scrollbar::-webkit-scrollbar {
          width: 8px;
          display: block !important;
        }
        .fields-tab-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.3);
          border-radius: 4px;
        }
        .fields-tab-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        .fields-tab-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick keyboard shortcuts to speed up your workflow
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="essential" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="essential">Essential</TabsTrigger>
            <TabsTrigger value="dialogs">Dialogs</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="sidebars">Sidebars</TabsTrigger>
            <TabsTrigger value="editing">Editing</TabsTrigger>
            <TabsTrigger value="movement">Movement</TabsTrigger>
          </TabsList>
          
          {shortcutGroups.map((group, index) => (
            <TabsContent 
              key={group.title} 
              value={['essential', 'dialogs', 'navigation', 'sidebars', 'editing', 'movement'][index]}
              className={`mt-4 space-y-2 max-h-[280px] overflow-y-auto ${index >= 4 ? 'fields-tab-scrollbar' : ''}`}
            >
              <div className="grid gap-2 pr-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.keys}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border">?</kbd> anytime to show this help
        </p>
      </DialogContent>
    </Dialog>
    </>
  );
}