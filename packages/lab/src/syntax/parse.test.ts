import { describe, expect, it } from 'vitest';
import { SourceError } from './errors.ts';
import { parse } from './parse.ts';

const parseError = (source: string): SourceError => {
  try {
    parse(source);
  } catch (error) {
    if (error instanceof SourceError) return error;
    throw error;
  }
  throw new Error(`expected a parse error for: ${source}`);
};

describe('parse', () => {
  it('records 1-based, end-exclusive spans', () => {
    const program = parse('const square = x => x * x;\n\nfunction sum_of_squares(a, b) {\n  return square(a) + square(b);\n}\n');
    const fn = program.body[1];
    if (fn?.kind !== 'function' || fn.lambda.body.kind !== 'block') throw new Error('shape');
    const ret = fn.lambda.body.body[0];
    if (ret?.kind !== 'return' || ret.argument?.kind !== 'binary') throw new Error('shape');
    const call = ret.argument.left;
    expect(call).toMatchObject({
      kind: 'application',
      fun: { kind: 'name', symbol: 'square' },
      args: [{ kind: 'name', symbol: 'a' }],
      loc: { line: 4, col: 10, endLine: 4, endCol: 19 },
    });
  });

  it('gives multiplication precedence over addition and comparison', () => {
    const [statement] = parse('1 + 2 * 3 < 10;').body;
    expect(statement).toMatchObject({
      kind: 'binary',
      operator: '<',
      left: { operator: '+', right: { operator: '*' } },
    });
  });

  it('names lambdas after the constant they are bound to', () => {
    const [declaration] = parse('const inc = (x) => x + 1;').body;
    expect(declaration).toMatchObject({ kind: 'const', init: { kind: 'lambda', name: 'inc', params: ['x'] } });
  });

  it('parses nested conditional expressions to the right', () => {
    const [statement] = parse('a ? 1 : b ? 2 : 3;').body;
    expect(statement).toMatchObject({ kind: 'conditional', alternative: { kind: 'conditional' } });
  });

  it('reports a missing semicolon at the end of the statement', () => {
    const error = parseError('const x = 1\nx;');
    expect(error.message).toBe('Line 1: Missing semicolon after declaration');
    expect(error.loc).toMatchObject({ line: 1, col: 12 });
  });

  it('rejects loose equality and words outside the subset', () => {
    expect(parseError('1 == 1;').message).toContain('Use === instead of ==');
    expect(parseError('while (true) {}').message).toContain("'while' is not part of this Source subset");
  });
});
