import { HighlightStyle, StreamLanguage, syntaxHighlighting, type StreamParser } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags } from '@lezer/highlight';

/**
 * A CodeMirror mode for the Source subset. It only has to colour tokens and
 * suggest indentation; the Laboratory parser is the authority on syntax.
 * Type annotations get a colour of their own, quieter than the code around
 * them: the Laboratory strips them before it runs anything.
 */

const DECLARING = new Set(['const', 'let', 'function', 'return', 'if', 'else', 'await']);
const ATOMS = new Set(['true', 'false', 'null', 'undefined']);
const OPENING = '([{<';
const CLOSING = ')]}>';

export interface ModeState {
  inBlockComment: boolean;
  /** Inside a backquoted string, which may span lines. */
  inTemplate: boolean;
  /** Number of unclosed brackets, for indentation. */
  depth: number;
  /** For each `?` of a conditional expression still waiting for its `:`, the bracket depth it is at. */
  conditionals: number[];
  /** Inside a type: the number of brackets opened since it began. `null` outside types. */
  type: number | null;
  /** The type began at a `:`, so `=>` at its outermost level ends it, unless it follows a parameter list. */
  annotation: boolean;
  /** The previous token closed a parameter list inside the type, so a `=>` belongs to a function type. */
  afterTypeParams: boolean;
  /** The previous token, for the few places where it decides what comes next. */
  last: string;
}

/** Where `<` begins type parameters rather than a comparison, as in `= <T>(x: T) =>`. */
const BEFORE_TYPE_PARAMS = new Set(['', '=', '(', ',', '=>', ':', '?', 'return', 'async']);

/** The tokenizer behind the mode, exported so that tests can run it line by line. */
export const sourceParser: StreamParser<ModeState> = {
  name: 'source',
  startState: () => ({
    inBlockComment: false,
    inTemplate: false,
    depth: 0,
    conditionals: [],
    type: null,
    annotation: false,
    afterTypeParams: false,
    last: '',
  }),
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
    if (state.inTemplate) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '\\') stream.next();
        else if (ch === '`') {
          state.inTemplate = false;
          break;
        }
      }
      return 'string';
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

    const style = state.type === null ? code(stream, state) : type(stream, state);
    state.last = stream.current();
    return style;
  },
  indent(state, textAfter, context) {
    const closing = /^\s*[)}]/.test(textAfter) ? 1 : 0;
    // The concise body of an arrow function that ends the previous line goes one level in.
    const body = state.last === '=>' && state.type === null ? 1 : 0;
    return Math.max(0, state.depth - closing + body) * context.unit;
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '{', '"', "'"] },
  },
};

const sourceMode = StreamLanguage.define(sourceParser);

type Stream = Parameters<StreamParser<ModeState>['token']>[0];

const beginType = (state: ModeState, annotation: boolean): void => {
  state.type = 0;
  state.annotation = annotation;
  state.afterTypeParams = false;
};

/** A token of code: everything outside type annotations. */
function code(stream: Stream, state: ModeState): string | null {
  if (stream.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)) return 'number';
  if (stream.match(/^"(?:[^"\\]|\\.)*"?/) || stream.match(/^'(?:[^'\\]|\\.)*'?/)) return 'string';
  if (stream.eat('`')) {
    state.inTemplate = true;
    return 'string';
  }

  const word = stream.match(/^[A-Za-z_$][\w$]*/);
  if (word !== null && typeof word !== 'boolean') {
    const text = word[0] ?? '';
    if (DECLARING.has(text)) return 'keyword';
    if (ATOMS.has(text)) return 'atom';
    // `async` and `type` are keywords only where TypeScript reads them so.
    if (text === 'async' && stream.match(/^\s*(?:\(|<|function\b|[A-Za-z_$][\w$]*\s*=>)/, false)) return 'keyword';
    if (text === 'type' && stream.column() === stream.indentation() && stream.match(/^\s+[A-Za-z_$][\w$]*\s*[=<]/, false)) {
      return 'keyword';
    }
    return 'variable';
  }

  if (stream.match('?.') || stream.match('??') || stream.match('...') || stream.match('=>')) return 'operator';
  if (stream.match('?')) {
    state.conditionals.push(state.depth);
    return 'operator';
  }
  if (stream.match(':')) {
    // The `:` of a conditional is at the depth of its `?`; any other `:` begins a type annotation.
    // After `)`, it is a return type if `=>` follows and the conditional's own `:` is still to come.
    const returnType = state.last === ')' && /^\s*[^?:;=]+=>.*:/.test(stream.string.slice(stream.pos));
    if (!returnType && state.conditionals.at(-1) === state.depth) state.conditionals.pop();
    else beginType(state, true);
    return 'operator';
  }
  const alias = /^type\s/.test(stream.string.slice(stream.indentation()));
  if (stream.match(/^=(?!=)/)) {
    // `type Name<T> =`: what follows, up to the semicolon, is a type.
    if (alias) beginType(state, false);
    return 'operator';
  }
  if (stream.peek() === '<' && (BEFORE_TYPE_PARAMS.has(state.last) || alias)) {
    beginType(state, false);
    return type(stream, state);
  }

  const ch = stream.next();
  if (ch === '(' || ch === '{') state.depth++;
  else if (ch === ')' || ch === '}') state.depth = Math.max(0, state.depth - 1);
  return ch !== undefined && '(){},;'.includes(ch) ? 'punctuation' : 'operator';
}

/** A token of a type: a name, a literal type, or the punctuation that builds types. */
function type(stream: Stream, state: ModeState): string | null {
  const nesting = state.type ?? 0;
  const afterTypeParams = state.afterTypeParams;
  state.afterTypeParams = false;

  if (stream.match(/^"(?:[^"\\]|\\.)*"?/) || stream.match(/^'(?:[^'\\]|\\.)*'?/)) return 'string';
  if (stream.match(/^-?\d+(?:\.\d+)?/)) return 'number';
  const word = stream.match(/^[A-Za-z_$][\w$]*/);
  if (word !== null && typeof word !== 'boolean') {
    const text = word[0] ?? '';
    if (ATOMS.has(text)) return 'atom';
    return text === 'extends' ? 'keyword' : 'typeName';
  }

  if (stream.match('=>')) {
    // `(x): R => body` ends the return type `R`; `(x: A) => R` inside a type is a function type.
    if (nesting === 0 && state.annotation && !afterTypeParams) {
      state.type = null;
      return 'operator';
    }
    return 'typeName';
  }
  if (stream.match('...')) return 'typeName';

  const ch = stream.peek() ?? '';
  // A `{` straight after `:` begins an object type; after a return type, it begins the function's body.
  const body = ch === '{' && state.annotation && state.last !== ':';
  if (nesting === 0 && (',)};='.includes(ch) || body)) {
    state.type = null;
    return code(stream, state);
  }
  stream.next();
  if (OPENING.includes(ch)) {
    state.type = nesting + 1;
    if (ch === '(') state.depth++;
  } else if (CLOSING.includes(ch)) {
    state.type = Math.max(0, nesting - 1);
    if (ch === ')') {
      state.depth = Math.max(0, state.depth - 1);
      state.afterTypeParams = true;
    }
    // The `>` that closes type parameters such as `<T>` ends them.
    if (ch === '>' && nesting === 1 && !state.annotation) state.type = null;
  }
  return 'typeName';
}

const highlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.atom, tags.bool, tags.null], color: 'var(--color-accent-ink)' },
  { tag: tags.number, color: 'var(--color-num)' },
  { tag: tags.string, color: 'var(--color-str)' },
  { tag: tags.comment, color: 'var(--color-ink-3)' },
  { tag: tags.typeName, color: 'var(--color-ink-3)' },
]);

export const sourceLanguage: Extension = [sourceMode, syntaxHighlighting(highlight)];
