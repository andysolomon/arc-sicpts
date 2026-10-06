import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dialog } from './Dialog.tsx';
import { search } from './searchIndex.ts';

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const results = useMemo(() => search(query), [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  const go = (index: number): void => {
    const page = results[index];
    if (page === undefined) return;
    onClose();
    void navigate(page.path);
  };

  return (
    <Dialog open={open} onClose={onClose} label="Search the book">
      <div className="flex flex-col">
        <input
          autoFocus
          type="search"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="search-results"
          aria-activedescendant={results.length > 0 ? `search-result-${selected}` : undefined}
          aria-label="Search sections"
          placeholder="Search sections…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setSelected((i) => Math.min(i + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected((i) => Math.max(i - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              go(selected);
            }
          }}
          className="h-12 border-b border-line bg-transparent px-4 text-[17px] text-ink outline-none placeholder:text-ink-3"
        />
        <ul id="search-results" role="listbox" aria-label="Results" className="m-0 flex max-h-[50vh] list-none flex-col overflow-y-auto p-1.5">
          {results.map((page, index) => (
            <li
              key={page.path}
              id={`search-result-${index}`}
              role="option"
              aria-selected={index === selected}
              onClick={() => go(index)}
              onMouseMove={() => setSelected(index)}
              className={`grid min-h-11 cursor-pointer grid-cols-[48px_1fr] items-baseline gap-2 rounded-md px-2.5 py-2.5 text-[15px] ${
                index === selected ? 'bg-accent-soft text-accent-ink' : 'text-ink'
              }`}
            >
              <span className="font-mono text-[11px] text-ink-3">{page.crumb}</span>
              <span>{page.title}</span>
            </li>
          ))}
          {query.trim() !== '' && results.length === 0 && (
            <li className="px-2.5 py-3 text-[15px] text-ink-2">No section matches “{query}”.</li>
          )}
        </ul>
        <p className="m-0 border-t border-line px-4 py-2 font-mono text-[11px] text-ink-3">
          ↑↓ select · enter open · esc close · searches titles and summaries
        </p>
      </div>
    </Dialog>
  );
}
