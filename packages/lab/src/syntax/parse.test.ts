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

  it('strips type annotations, generic parameters and type aliases', () => {
    const program = parse(`type Rational = Pair<number, number>;
type Op<T> = (x: T, y: T) => T | null;
const make_rat = (n: number, d: number): Rational => pair(n, d);
const id = <T, U extends List<T> = null>(x: T): T => x;
const table: [string, (x: number) => number][] = null;
function first<T>(xs: List<T>): T { return head(xs); }
`);
    expect(program.body.map((statement) => statement.kind)).toEqual(['const', 'const', 'const', 'function']);
    expect(program.body[0]).toMatchObject({ init: { kind: 'lambda', name: 'make_rat', params: ['n', 'd'] } });
  });

  it('reads rest parameters, spread arguments and optional calls', () => {
    const [declaration, call] = parse('const f = (a: number, ...rest: List<number>): number => a;\nf?.(1, ...xs)(2);').body;
    expect(declaration).toMatchObject({ init: { params: ['a'], rest: 'rest' } });
    expect(call).toMatchObject({
      kind: 'application',
      chained: true,
      fun: { kind: 'application', optional: true, args: [{ kind: 'literal' }, { kind: 'spread', argument: { symbol: 'xs' } }] },
    });
  });

  it('tells a lambda with a return type from the branches of a conditional', () => {
    expect(parse('c ? (x): number => x : y;').body[0]).toMatchObject({ kind: 'conditional', consequent: { kind: 'lambda' } });
    expect(parse('c ? (1) : y => y;').body[0]).toMatchObject({ kind: 'conditional', alternative: { kind: 'lambda' } });
    expect(parse('c ? (b) : y => y;').body[0]).toMatchObject({ kind: 'conditional', alternative: { kind: 'lambda' } });
  });

  it('reads async functions and await, which only async functions and the top level may use', () => {
    const [lambda, declaration, top] = parse('async (x) => await x;\nasync function f() { return 1; }\nawait f();').body;
    expect(lambda).toMatchObject({ kind: 'lambda', async: true, body: { kind: 'await' } });
    expect(declaration).toMatchObject({ kind: 'function', lambda: { async: true } });
    expect(top).toMatchObject({ kind: 'await' });
    expect(parseError('const f = x => await x;').message).toContain("'await' is only allowed in an async function");
    // `async` is still an ordinary name where it is not followed by a function.
    expect(parse('async(1);').body[0]).toMatchObject({ kind: 'application', fun: { symbol: 'async' } });
  });

  it('refuses to mix ?? with && or || without parentheses, as JavaScript does', () => {
    expect(parse('a ?? b ?? c;').body[0]).toMatchObject({ kind: 'logical', operator: '??', left: { operator: '??' } });
    expect(parse('(a || b) ?? c;').body[0]).toMatchObject({ operator: '??', left: { operator: '||' } });
    expect(parseError('a || b ?? c;').message).toContain("'??' cannot be combined");
    expect(parseError('a ?? b && c;').message).toContain("'??' cannot be combined");
  });

  it('explains what the subset leaves out', () => {
    expect(parseError('math.sqrt(2);').message).toContain('Property access is not part of this Source subset');
    expect(parseError('const xs = [1, 2];').message).toContain('Array literals');
    expect(parseError('const f = (x?: number) => x;').message).toContain('Optional parameters');
    expect(parseError('const f = (x = 1) => x;').message).toContain('Default parameter values');
    expect(parseError('const f = (...xs, y) => y;').message).toContain('rest parameter must be the last');
  });
});
