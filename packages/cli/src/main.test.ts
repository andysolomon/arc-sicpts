import { describe, expect, it } from 'vitest';
import { main, type Io } from './main.ts';
import { createRepl } from './repl.ts';

function fakeIo(files: Record<string, string> = {}): Io & { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    out: (text) => stdout.push(text),
    err: (text) => stderr.push(text),
    readFile: (path) => {
      const content = files[path];
      if (content === undefined) throw new Error('ENOENT');
      return content;
    },
  };
}

describe('sicp run', () => {
  it('prints display output, then the value', () => {
    const io = fakeIo({ 'a.sicp': 'display("hi"); 1 + 2;' });
    expect(main(['run', 'a.sicp'], io)).toBe(0);
    expect(io.stdout).toEqual(['"hi"', '3']);
  });

  it('prints the call-depth trace with --shape', () => {
    const io = fakeIo({ 'f.sicp': 'function f(n) { return n === 0 ? 0 : 1 + f(n - 1); }\nf(2);' });
    expect(main(['run', 'f.sicp', '--shape'], io)).toBe(0);
    expect(io.stdout).toEqual(['2', 'f(2) · recursive · max depth 3 · 3 calls', '  1 2 3 3 2 1']);
  });

  it('exits 1 on a program error and 2 on an exhausted budget', () => {
    const io = fakeIo({ 'bad.sicp': 'nope;', 'loop.sicp': 'function f() { return f(); } f();' });
    expect(main(['run', 'bad.sicp'], io)).toBe(1);
    expect(main(['run', 'loop.sicp', '--budget', '100'], io)).toBe(2);
    expect(io.stderr).toEqual(['Line 1: Name nope not declared', 'Budget exhausted after 100 steps']);
  });

  it('rejects bad usage', () => {
    const io = fakeIo();
    expect(main(['run'], io)).toBe(64);
    expect(main(['run', 'missing.sicp'], io)).toBe(66);
    expect(main(['run', 'x', '--budget', 'lots'], io)).toBe(64);
    expect(main(['frobnicate'], io)).toBe(64);
  });
});

describe('repl', () => {
  it('keeps declarations between inputs and survives errors', () => {
    const repl = createRepl();
    expect(repl.evaluate('const x = 20;')).toMatchObject({ status: 'done', text: 'undefined' });
    expect(repl.evaluate('oops;')).toMatchObject({ status: 'error' });
    expect(repl.evaluate('function double(n) { return n * 2; }')).toMatchObject({ status: 'done' });
    expect(repl.evaluate('double(x) + 2;')).toMatchObject({ status: 'done', text: '42' });
  });

  it('starts with the list library', () => {
    expect(createRepl().evaluate('length(map(x => x, list(1, 2, 3)));')).toMatchObject({ status: 'done', text: '3' });
  });
});
