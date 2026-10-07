import type { Loc } from './ast.ts';
import { SourceError } from './errors.ts';

export type TokenType = 'number' | 'string' | 'name' | 'keyword' | 'punct' | 'eof';

export interface Token {
  type: TokenType;
  text: string;
  /** Decoded value for number and string tokens. */
  value: number | string | null;
  loc: Loc;
}

export const KEYWORDS: readonly string[] = [
  'const',
  'let',
  'function',
  'return',
  'if',
  'else',
  'true',
  'false',
  'null',
  'undefined',
];

/** JavaScript words that are deliberately not part of this Source subset. */
const UNSUPPORTED: readonly string[] = [
  'var',
  'while',
  'for',
  'do',
  'break',
  'continue',
  'class',
  'new',
  'this',
  'switch',
  'case',
  'try',
  'catch',
  'throw',
  'typeof',
  'import',
  'export',
];

// Longest first, so that `===` wins over `=`.
const PUNCTUATION: readonly string[] = [
  '===',
  '!==',
  '=>',
  '<=',
  '>=',
  '&&',
  '||',
  '(',
  ')',
  '{',
  '}',
  ',',
  ';',
  '?',
  ':',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
  '!',
  '=',
];

const ESCAPES: Readonly<Record<string, string>> = {
  n: '\n',
  t: '\t',
  r: '\r',
  '0': '\0',
  '\\': '\\',
  "'": "'",
  '"': '"',
};

const NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*/;

export function tokenize(source: string): Token[] {
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') lineStarts.push(i + 1);
  }

  const position = (offset: number): { line: number; col: number } => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - (lineStarts[lo] ?? 0) + 1 };
  };

  const locOf = (start: number, end: number): Loc => {
    const a = position(start);
    const b = position(end);
    return { start, end, line: a.line, col: a.col, endLine: b.line, endCol: b.col };
  };

  const fail = (message: string, start: number, end: number): never => {
    throw new SourceError('parse', message, locOf(start, end));
  };

  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i] ?? '';

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    if (ch === '/' && source[i + 1] === '*') {
      const close = source.indexOf('*/', i + 2);
      if (close === -1) fail('Unterminated comment', i, source.length);
      i = close + 2;
      continue;
    }

    const rest = source.slice(i);

    const number = NUMBER.exec(rest);
    if (number !== null) {
      const text = number[0];
      tokens.push({ type: 'number', text, value: Number(text), loc: locOf(i, i + text.length) });
      i += text.length;
      continue;
    }

    if (ch === '"' || ch === "'") {
      let j = i + 1;
      let value = '';
      for (;;) {
        const c = source[j];
        if (c === undefined || c === '\n') fail('Unterminated string', i, j);
        if (c === ch) break;
        if (c === '\\') {
          const escaped = source[j + 1] ?? '';
          const decoded = ESCAPES[escaped];
          if (decoded === undefined) fail(`Unknown escape \\${escaped}`, j, j + 2);
          value += decoded;
          j += 2;
          continue;
        }
        value += c;
        j++;
      }
      tokens.push({ type: 'string', text: source.slice(i, j + 1), value, loc: locOf(i, j + 1) });
      i = j + 1;
      continue;
    }

    // A template literal without substitutions: a string that may span lines,
    // as the programs handed to `parse` in chapters 4 and 5 are written.
    if (ch === '`') {
      let j = i + 1;
      let value = '';
      for (;;) {
        const c = source[j];
        if (c === undefined) fail('Unterminated template string', i, j);
        if (c === '`') break;
        if (c === '$' && source[j + 1] === '{') {
          fail('Template substitutions are not part of this Source subset', j, j + 2);
        }
        if (c === '\\') {
          const escaped = source[j + 1] ?? '';
          const decoded = escaped === '`' || escaped === '$' ? escaped : ESCAPES[escaped];
          if (decoded === undefined) fail(`Unknown escape \\${escaped}`, j, j + 2);
          value += decoded;
          j += 2;
          continue;
        }
        value += c;
        j++;
      }
      tokens.push({ type: 'string', text: source.slice(i, j + 1), value, loc: locOf(i, j + 1) });
      i = j + 1;
      continue;
    }

    const identifier = IDENTIFIER.exec(rest);
    if (identifier !== null) {
      const text = identifier[0];
      if (UNSUPPORTED.includes(text)) {
        fail(`'${text}' is not part of this Source subset`, i, i + text.length);
      }
      tokens.push({
        type: KEYWORDS.includes(text) ? 'keyword' : 'name',
        text,
        value: null,
        loc: locOf(i, i + text.length),
      });
      i += text.length;
      continue;
    }

    const punct = PUNCTUATION.find((p) => rest.startsWith(p));
    if (punct !== undefined) {
      if ((punct === '=' || punct === '!') && source[i + 1] === '=') {
        fail(`Use ${punct}== instead of ${punct}=`, i, i + 2);
      }
      tokens.push({ type: 'punct', text: punct, value: null, loc: locOf(i, i + punct.length) });
      i += punct.length;
      continue;
    }

    fail(`Unexpected character '${ch}'`, i, i + 1);
  }

  tokens.push({ type: 'eof', text: '', value: null, loc: locOf(source.length, source.length) });
  return tokens;
}
