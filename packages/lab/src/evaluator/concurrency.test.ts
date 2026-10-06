import { describe, expect, it } from 'vitest';
import { createStepTracer } from '../inspect/stepTrace.ts';
import { evaluate } from './evaluate.ts';

const value = (source: string, seed?: number): unknown => {
  const outcome = evaluate(source, seed === undefined ? {} : { seed });
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return outcome.value;
};

const race = `
let balance = 100;
concurrent_execute(() => { balance = balance + 10; },
                   () => { balance = balance - 20; });
balance;
`;

describe('concurrent_execute', () => {
  it('runs every thread to its end before the caller continues', () => {
    const outcome = evaluate(`
      concurrent_execute(() => display("a"), () => display("b"), () => display("c"));
      display("after");
    `);
    expect(outcome.status).toBe('done');
    expect([...outcome.output].slice(0, 3).sort()).toEqual(['"a"', '"b"', '"c"']);
    expect(outcome.output[3]).toBe('"after"');
  });

  it('interleaves the steps of unserialized threads, losing updates', () => {
    const results = new Set<unknown>();
    for (let seed = 1; seed <= 200; seed++) results.add(value(race, seed));
    // Both updates applied, or one of them lost.
    expect([...results].sort()).toEqual([110, 80, 90].sort());
  });

  it('repeats an interleaving exactly for the same seed', () => {
    const first = Array.from({ length: 30 }, (_, seed) => value(race, seed));
    const again = Array.from({ length: 30 }, (_, seed) => value(race, seed));
    expect(again).toEqual(first);
  });

  it('makes a serialized update safe with a mutex built on test_and_set', () => {
    const serialized = `
      function make_mutex() {
        const cell = list(false);
        function the_mutex(m) {
          return m === "acquire"
            ? test_and_set(cell) ? the_mutex("acquire") : true
            : m === "release" ? set_head(cell, false) : error(m, "unknown request -- mutex");
        }
        return the_mutex;
      }
      function make_serializer() {
        const mutex = make_mutex();
        return f => () => {
          mutex("acquire");
          const value = f();
          mutex("release");
          return value;
        };
      }
      const protect = make_serializer();
      ${race.replace('() => { balance = balance + 10; }', 'protect(() => { balance = balance + 10; })').replace('() => { balance = balance - 20; }', 'protect(() => { balance = balance - 20; })')}
    `;
    for (let seed = 1; seed <= 60; seed++) expect(value(serialized, seed)).toBe(90);
  });

  it('rejects arguments that are not functions of no arguments', () => {
    expect(evaluate('concurrent_execute(1);')).toMatchObject({ status: 'error' });
    expect(evaluate('concurrent_execute(x => x);')).toMatchObject({ status: 'error' });
    expect(value('concurrent_execute(); 5;')).toBe(5);
  });

  it('lets a thread start threads of its own', () => {
    expect(
      value(`
        let n = 0;
        function bump() { n = n + 1; }
        concurrent_execute(() => concurrent_execute(bump, bump), bump);
        n >= 1;
      `),
    ).toBe(true);
  });

  it('marks the trace with the thread each step ran in', () => {
    const tracer = createStepTracer(race, 2000);
    evaluate(race, { seed: 7, hooks: [tracer.hooks] });
    const threads = new Set(tracer.records.map((r) => r.thread));
    expect(threads).toEqual(new Set([undefined, 0, 1, 2]));
    expect(tracer.records.filter((r) => r.event.kind === 'thread').map((r) => r.event)).toEqual(
      expect.arrayContaining([
        { kind: 'thread', thread: 1, change: 'spawn' },
        { kind: 'thread', thread: 2, change: 'spawn' },
        { kind: 'thread', thread: 1, change: 'end' },
        { kind: 'thread', thread: 2, change: 'end' },
      ]),
    );
  });
});
