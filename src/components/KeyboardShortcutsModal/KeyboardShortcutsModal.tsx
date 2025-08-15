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
    title: 'File Operations',
    shortcuts: [
      { keys: '⌘/Ctrl + O', description: 'Open/Upload PDF' },
      { keys: '⌘/Ctrl + I', description: 'Open Import dialog' },
      { keys: '⌘/Ctrl + E', description: 'Open Export dialog' },
      { keys: '⌘/Ctrl + S', description: 'Save to localStorage' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: '⌘/Ctrl + ←', description: 'Previous page' },
      { keys: '⌘/Ctrl + →', description: 'Next page' },
      { keys: '⌘/Ctrl + [', description: 'Toggle left sidebar' },
      { keys: '⌘/Ctrl + ]', description: 'Toggle right sidebar (Queue)' },
    ],
  },
  {
    title: 'View Controls',
    shortcuts: [
      { keys: '⌘/Ctrl + +', description: 'Zoom in' },
      { keys: '⌘/Ctrl + -', description: 'Zoom out' },
      { keys: '⌘/Ctrl + 0', description: 'Fit to width' },
      { keys: '⌘/Ctrl + P', description: 'Toggle preview mode' },
    ],
  },
  {
    title: 'Field Operations',
    shortcuts: [
      { keys: '⌘/Ctrl + Delete', description: 'Delete selected field' },
      { keys: 'Escape', description: 'Deselect field / Cancel' },
      { keys: '⌘/Ctrl + D', description: 'Duplicate field' },
      { keys: '⌘/Ctrl + Shift + D', description: 'Duplicate field with offset' },
      { keys: '⌘/Ctrl + L', description: 'Lock/unlock selected field' },
      { keys: '⌘/Ctrl + C', description: 'Copy field' },
      { keys: '⌘/Ctrl + V', description: 'Paste field' },
      { keys: 'Shift + Arrows', description: 'Move selected field' },
      { keys: 'Shift + Alt + Arrows', description: 'Move field by 10px' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: '⌘/Ctrl + Z', description: 'Undo' },
      { keys: '⌘/Ctrl + Shift + Z', description: 'Redo' },
      { keys: '?', description: 'Show this help' },
      { keys: '⌘/Ctrl + /', description: 'Show this help' },
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
        
        <Tabs defaultValue="file" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
          
          {shortcutGroups.map((group, index) => (
            <TabsContent 
              key={group.title} 
              value={['file', 'navigation', 'view', 'fields', 'general'][index]}
              className={`mt-4 space-y-2 max-h-[280px] overflow-y-auto ${index === 3 ? 'fields-tab-scrollbar' : ''}`}
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