import { Dialog } from './Dialog.tsx';

interface ShortcutSheetProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: readonly (readonly [keys: string, action: string])[] = [
  ['[', 'Previous section'],
  [']', 'Next section'],
  ['⌘K / Ctrl K', 'Search'],
  ['?', 'This sheet'],
  ['⌘↵ / Ctrl ↵', 'Run the focused editor'],
  ['Esc', 'Close a dialog or the contents drawer'],
];

export function ShortcutSheet({ open, onClose }: ShortcutSheetProps) {
  return (
    <Dialog open={open} onClose={onClose} label="Keyboard shortcuts">
      <div className="flex flex-col gap-3 p-5">
        <h2 className="m-0 font-mono text-sm font-medium tracking-[0.06em] text-ink-2 uppercase">
          Keyboard shortcuts
        </h2>
        <dl className="m-0 grid grid-cols-[auto_1fr] items-baseline gap-x-5 gap-y-2.5 text-[15.5px]">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={keys} className="contents">
              <dt>
                <kbd className="rounded border border-line bg-paper-2 px-1.5 py-0.5 text-xs whitespace-nowrap">
                  {keys}
                </kbd>
              </dt>
              <dd className="m-0">{action}</dd>
            </div>
          ))}
        </dl>
        <form method="dialog" className="flex justify-end">
          <button
            type="submit"
            autoFocus
            className="h-9 rounded-md border border-line bg-transparent px-3 text-[13.5px] text-ink-2"
          >
            Close
          </button>
        </form>
      </div>
    </Dialog>
  );
}
