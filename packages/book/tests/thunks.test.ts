// @vitest-environment node
import { createCallLogTracer, evaluate, lazyEvaluator, memoProgram, tryMeProgram, unmemoizedLazyEvaluator } from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { rowsAt, THUNK_WATCH, thunkTimeline, unparse } from '../src/anim/model/thunks.ts';
import { readValue } from '../src/anim/model/taggedList.ts';

function timelineOf(source: string, prelude = lazyEvaluator) {
  const tracer = createCallLogTracer(THUNK_WATCH);
  evaluate(source, { prelude, budget: 5_000_000, hooks: [tracer.hooks] });
  return thunkTimeline(tracer.calls);
}

describe('unparse', () => {
  it('writes tagged lists back as source', () => {
    const text = (s: string) => unparse(readValue(s));
    expect(text('["application", [["name", ["head", null]], [[["literal", [null, null]], null], null]]]')).toBe('head(null)');
    expect(text('["binary_operator_combination", ["*", [["name", ["n", null]], [["application", [["name", ["f", null]], [[["binary_operator_combination", ["-", [["name", ["n", null]], [["literal", [1, null]], null]]]], null], null]]], null]]]]')).toBe('n * f(n - 1)');
    expect(text('["lambda_expression", [[["name", ["x", null]], null], [["return_statement", [["binary_operator_combination", ["+", [["name", ["x", null]], [["literal", [1, null]], null]]]], null]], null]]]')).toBe('x => x + 1');
    expect(text('["application", [["name", ["f", null]], [[["literal", [1')).toBe('f(1…)');
  });
});

describe('the thunk timeline', () => {
  it('try_me(0, head(null)): two thunks, a forced once, b never', () => {
    const timeline = timelineOf(tryMeProgram);
    expect(timeline.thunks.map((t) => `${t.param}: ${t.exp}`)).toEqual(['a: 0', 'b: head(null)']);
    expect(timeline.events).toEqual([
      { kind: 'delay', params: ['a', 'b'], thunks: [0, 1] },
      { kind: 'force', thunk: 0, via: 'a', primitive: true, again: false, value: '0', done: true },
    ]);
    const rows = rowsAt(timeline, timeline.events.length - 1);
    expect(rows.map((r) => [r.exp, r.state, r.value])).toEqual([
      ['0', 'evaluated', '0'],
      ['head(null)', 'delayed', null],
    ]);
  });

  it('square(id(10)): the thunk for id(10) is forced once and reused once', () => {
    const timeline = timelineOf(memoProgram);
    expect(timeline.thunks.map((t) => `${t.param}: ${t.exp}`)).toEqual(['x: id(10)', 'x: 10']);
    expect(timeline.events.map((e) => e.kind)).toEqual(['delay', 'force', 'delay', 'force', 'forced', 'reuse']);
    expect(timeline.events[3]).toMatchObject({ thunk: 1, via: 'id(10)', primitive: false, done: true, value: '10' });
    expect(timeline.events[5]).toMatchObject({ kind: 'reuse', thunk: 0, via: 'x', primitive: true, value: '10' });
    const rows = rowsAt(timeline, timeline.events.length - 1);
    expect(rows.map((r) => [r.exp, r.state, r.value, r.forcings, r.reuses])).toEqual([
      ['id(10)', 'evaluated', '10', 1, 1],
      ['10', 'evaluated', '10', 1, 0],
    ]);
  });

  it('without memoization, the thunk for id(10) is evaluated twice', () => {
    const timeline = timelineOf(memoProgram, unmemoizedLazyEvaluator);
    const forcings = timeline.events.filter((e) => e.kind === 'force' && e.thunk === 0);
    expect(forcings.map((e) => e.kind === 'force' && e.again)).toEqual([false, true]);
    expect(timeline.events.some((e) => e.kind === 'reuse')).toBe(false);
    const rows = rowsAt(timeline, timeline.events.length - 1, false);
    expect(rows.find((r) => r.exp === 'id(10)')).toMatchObject({ state: 'delayed', forcings: 2 });
  });
});
