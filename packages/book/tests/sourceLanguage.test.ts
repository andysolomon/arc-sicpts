import { StringStream } from '@codemirror/language';
import { describe, expect, it } from 'vitest';
import { sourceParser as parser } from '../src/editor/sourceLanguage.ts';

/** Each non-space token of `text` with the style the mode gives it, line by line. */
function styles(text: string): [string, string | null][] {
  const state = parser.startState?.(2) ?? (null as never);
  const out: [string, string | null][] = [];
  for (const line of text.split('\n')) {
    const stream = new StringStream(line, 4, 2);
    while (!stream.eol()) {
      const style = parser.token(stream, state);
      const token = stream.current();
      if (token.trim() !== '') out.push([token, style]);
      stream.start = stream.pos;
    }
  }
  return out;
}

const typeNames = (text: string): string[] => styles(text).filter(([, style]) => style === 'typeName').map(([token]) => token);

describe('the Source editor mode', () => {
  it('colours parameter and return annotations as types, and leaves the body alone', () => {
    expect(typeNames('const square = (x: number): number => x * x;')).toEqual(['number', 'number']);
    expect(typeNames('const f = (g: (x: number) => number, xs: List<number>): List<number> =>\n  map(g, xs);')).toEqual([
      '(', 'x', ':', 'number', ')', '=>', 'number', 'List', '<', 'number', '>', 'List', '<', 'number', '>',
    ]);
  });

  it('tells the colon of a conditional from the colon of an annotation', () => {
    expect(typeNames('const y = c ? (x: number): number => x : f;')).toEqual(['number', 'number']);
    expect(typeNames('const z = c ? 1 : 2;')).toEqual([]);
    expect(typeNames('const k = c ? (x: number) => x : y;')).toEqual(['number']);
  });

  it('reads type parameters, type aliases and keywords', () => {
    expect(typeNames('const id = <T>(x: T): T => x;')).toEqual(['<', 'T', '>', 'T', 'T']);
    expect(typeNames('type Rational = Pair<number, number>;\nconst r = 1;')).toEqual(['Pair', '<', 'number', ',', 'number', '>']);
    const keywords = styles('type T = number;\nconst f = async (x: number): Promise<number> => await x;\nconst type = 1;')
      .filter(([, style]) => style === 'keyword')
      .map(([token]) => token);
    expect(keywords).toEqual(['type', 'const', 'async', 'await', 'const']);
  });

  it('indents the concise body of an arrow function that ends a line', () => {
      const state = parser.startState?.(2) ?? (null as never);
    const stream = new StringStream('const f = (n: number): number =>', 4, 2);
    while (!stream.eol()) {
      parser.token(stream, state);
      stream.start = stream.pos;
    }
    const context = { unit: 2 } as Parameters<NonNullable<typeof parser.indent>>[2];
    expect(parser.indent?.(state, '', context)).toBe(2);
  });
});
