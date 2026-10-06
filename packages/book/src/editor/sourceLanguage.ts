import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';

/**
 * A CodeMirror mode for the Source subset. It only has to colour tokens and
 * suggest indentation; the Laboratory parser is the authority on syntax.
 */

const DECLARING = new Set(['const', 'let', 'function', 'return', 'if', 'else']);
const ATOMS = new Set(['true', 'false', 'null', 'undefined']);

interface ModeState {
  inBlockComment: boolean;
  /** Number of unclosed brackets, for indentation. */
  depth: number;
}

const sourceMode = StreamLanguage.define<ModeState>({
  name: 'source',
  startState: () => ({ inBlockComment: false, depth: 0 }),
  token(stream, state) {
    if (state.inBlockComment) {
      if (stream.skipTo('*/')) {
        stream.next();
        stream.next();
        state.inBlockComment = false;
      } else {
        stream.skipToEnd();
      }
      return 'comment';
    }
    if (stream.eatSpace()) return null;
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (stream.match('/*')) {
      state.inBlockComment = true;
      return 'comment';
    }
    if (stream.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)) return 'number';
    if (stream.match(/^"(?:[^"\\]|\\.)*"?/) || stream.match(/^'(?:[^'\\]|\\.)*'?/)) return 'string';

    const word = stream.match(/^[A-Za-z_$][\w$]*/);
    if (word !== null && typeof word !== 'boolean') {
      const text = word[0] ?? '';
      if (DECLARING.has(text)) return 'keyword';
      if (ATOMS.has(text)) return 'atom';
      return 'variable';
    }

    const ch = stream.next();
    if (ch === '(' || ch === '{') state.depth++;
    else if (ch === ')' || ch === '}') state.depth = Math.max(0, state.depth - 1);
    return ch !== undefined && '(){},;'.includes(ch) ? 'punctuation' : 'operator';
  },
  indent(state, textAfter, context) {
    const closing = /^\s*[)}]/.test(textAfter) ? 1 : 0;
    return Math.max(0, state.depth - closing) * context.unit;
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '{', '"', "'"] },
  },
});

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.atom, tags.bool, tags.null], color: 'var(--color-accent-ink)' },
  { tag: tags.number, color: 'var(--color-num)' },
  { tag: tags.string, color: 'var(--color-str)' },
  { tag: tags.comment, color: 'var(--color-ink-3)' },
]);

export const sourceLanguage: Extension = [sourceMode, syntaxHighlighting(highlight)];
