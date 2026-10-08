import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentUnit } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { useEffect, useRef } from 'react';
import { sourceLanguage } from './sourceLanguage.ts';
import { setStepHighlight, stepHighlight, type HighlightRange } from './stepHighlight.ts';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name for the editing surface. */
  label: string;
  /** Called on Mod-Enter. */
  onRun?: () => void;
  /** The syntax node the stepper is on, as character offsets. */
  highlight?: HighlightRange | null;
}

const theme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: 'var(--color-ink)',
    fontSize: 'var(--editor-font-size)',
  },
  // Draw inside the editor so the surrounding overflow container cannot clip it.
  '&.cm-focused': { outline: '2px solid var(--color-accent)', outlineOffset: '-2px' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    fontVariantLigatures: 'none',
    lineHeight: '1.6',
  },
  '.cm-content': { padding: '14px 0', caretColor: 'var(--color-ink)' },
  '.cm-line': { padding: '0 14px 0 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--color-ink-3)',
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    boxSizing: 'border-box',
    minWidth: '40px',
    padding: '0 14px 0 0',
    textAlign: 'right',
  },
  '.cm-cursor': { borderLeftColor: 'var(--color-ink)' },
  '.cm-content ::selection': { backgroundColor: 'var(--color-paper-3)' },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--color-paper-3)',
    outline: 'none',
  },
});

/** CodeMirror 6 with the Source mode, kept in sync with a React value. */
export function CodeEditor({ value, onChange, label, onRun, highlight = null }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onRun });
  const initialValue = useRef(value);

  useEffect(() => {
    handlers.current = { onChange, onRun };
  }, [onChange, onRun]);

  useEffect(() => {
    if (host.current === null) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          lineNumbers(),
          history(),
          bracketMatching(),
          indentUnit.of('  '),
          EditorState.tabSize.of(2),
          sourceLanguage,
          stepHighlight,
          theme,
          // Tab is left alone so that keyboard users can move past the editor.
          keymap.of([
            {
              key: 'Mod-Enter',
              run: () => {
                handlers.current.onRun?.();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) handlers.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, [label]);

  // Follow external changes to the value, such as Reset.
  useEffect(() => {
    const editor = view.current;
    if (editor === null || editor.state.doc.toString() === value) return;
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);

  const from = highlight?.from ?? null;
  const to = highlight?.to ?? null;
  useEffect(() => {
    const editor = view.current;
    if (editor === null) return;
    if (from === null || to === null) {
      editor.dispatch({ effects: setStepHighlight.of(null) });
      return;
    }
    editor.dispatch({
      effects: [
        setStepHighlight.of({ from, to }),
        EditorView.scrollIntoView(Math.min(from, editor.state.doc.length), { y: 'nearest' }),
      ],
    });
  }, [from, to]);

  return <div ref={host} data-testid="code-editor" className="min-w-0 overflow-auto" />;
}
