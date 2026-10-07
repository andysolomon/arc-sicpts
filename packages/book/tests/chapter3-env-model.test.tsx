import {
  averageDampProgram,
  envModelInternalSqrtProgram,
  envModelMakeAccountProgram,
  envModelMakeWithdrawProgram,
  envModelMutualRecursionProgram,
  envModelTooEarlyProgram,
  envModelTwoWithdrawsProgram,
} from '@sicp/lab';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises.ts';
import { closureFrame, environmentStates, functionParams } from '../src/anim/model/environment.ts';
import { EnvironmentScene } from '../src/anim/scenes/EnvironmentScene.tsx';
import { EnvModelSimpleDiagram, lookupSimple } from '../src/diagrams/chapter-3/EnvModelDiagrams.tsx';
import { traceOf } from './traceHelper.ts';

describe('§3.2 environment model: frames from the trace', () => {
  it('W1(50) changes balance in the frame of make_withdraw(100), leaving the call frame with only amount', () => {
    const states = environmentStates(envModelMakeWithdrawProgram, traceOf(envModelMakeWithdrawProgram));
    const assigned = states.find((s) => s.caption.startsWith('Assign `balance`'));
    expect(assigned?.caption).toBe(
      'Assign `balance` = 50 in E1: not in E2, so look outward: E1, 1 frame out, is the first frame that binds it, and its binding changes.',
    );
    expect(assigned?.lookup).toEqual({ symbol: 'balance', from: 'E2', found: 'E1', value: '50', assignment: true });
    const last = states.at(-1);
    expect(last?.frames.find((f) => f.id === 'E1')?.bindings).toEqual([{ name: 'balance', value: '50' }]);
    expect(last?.frames.find((f) => f.id === 'E2')?.bindings).toEqual([{ name: 'amount', value: '50' }]);
    expect(last?.frames.find((f) => f.id === 'E0')?.bindings).toContainEqual({ name: 'W1', value: 'fn[E1]' });
  });

  it('says that a returned function keeps its frame, and names a lambda’s frame by the call as written', () => {
    const states = environmentStates(envModelMakeWithdrawProgram, traceOf(envModelMakeWithdrawProgram));
    expect(states.map((s) => s.caption)).toContain(
      '`make_withdraw(100)` → fn[E1], a function object whose environment is E1. E1 has returned, but it stays: that function still points into it.',
    );
    expect(states.map((s) => s.caption)).toContain('Declare `W1` in E0: the function object made in E1, so its environment pointer leads to E1.');
    const call = states.at(-1)?.frames.find((f) => f.id === 'E2');
    expect(call).toMatchObject({ label: 'lambda(50)', appliedAs: 'W1(50)', parent: 'E1' });
  });

  it('keeps two withdrawal processors apart', () => {
    const last = environmentStates(envModelTwoWithdrawsProgram, traceOf(envModelTwoWithdrawsProgram)).at(-1);
    const balances = last?.frames.filter((f) => f.bindings.some((b) => b.name === 'balance')).map((f) => [f.id, f.bindings[0]?.value]);
    expect(balances).toEqual([
      ['E1', '10'],
      ['E3', '30'],
    ]);
  });

  it('shows a block frame with all its names from its first step, extending the call frame', () => {
    const states = environmentStates(envModelInternalSqrtProgram, traceOf(envModelInternalSqrtProgram));
    const entered = states.find((s) => s.frames.some((f) => f.id === 'E2'));
    expect(entered?.frames.find((f) => f.id === 'E2')).toMatchObject({
      label: 'block',
      parent: 'E1',
      bindings: [
        // The first step in the block declares is_good_enough; the others are already there, unassigned.
        { name: 'is_good_enough', value: 'fn[E2]' },
        { name: 'improve', value: null },
        { name: 'sqrt_iter', value: null },
      ],
    });
    const lookup = states.find((s) => s.lookup?.symbol === 'x' && s.lookup.from !== s.lookup.found);
    expect(lookup?.lookup?.found).toBe('E1');
  });

  it('shows the scanned-out names when a name is used too early', () => {
    const states = environmentStates(envModelTooEarlyProgram, traceOf(envModelTooEarlyProgram));
    const last = states.at(-1);
    expect(last?.caption).toContain('Name z used before its declaration was evaluated');
    expect(last?.frames.find((f) => f.label === 'block')?.bindings).toEqual([
      { name: 'y', value: null },
      { name: 'z', value: null },
    ]);
  });

  it('knows the parameters of declared and of applied functions', () => {
    const params = functionParams(envModelMakeAccountProgram, traceOf(envModelMakeAccountProgram));
    expect(params.get('make_account')).toEqual(['balance']);
    expect(params.get('deposit')).toEqual(['amount']);
    expect(params.get('acc')).toEqual(['m']);
    expect(closureFrame('fn[E12]')).toBe('E12');
    expect(closureFrame('12')).toBeNull();
  });
});

describe('§3.2 environment model: the scene', () => {
  it('draws W1 as a function object whose environment pointer leads to the frame holding balance', () => {
    const trace = traceOf(envModelMakeWithdrawProgram);
    render(<EnvironmentScene source={envModelMakeWithdrawProgram} trace={trace} stepIndex={trace.records.length} />);
    const objects = screen.getAllByTestId('function-object');
    expect(objects.map((o) => [o.dataset['binding'], o.dataset['env']])).toEqual([
      ['make_withdraw', 'E0'],
      ['W1', 'E1'],
    ]);
    const pointers = screen.getAllByTestId('env-pointer').map((p) => `${p.dataset['from']}→${p.dataset['to']}`);
    expect(pointers).toContain('E0.W1→E1');
    expect(pointers).toContain('E0.make_withdraw→E0');
    const held = screen.getAllByTestId('frame').find((f) => f.dataset['frame'] === 'E1');
    expect(held?.dataset['status']).toBe('returned');
    expect(held?.dataset['held']).toBe('true');
    expect(held).toHaveTextContent('balance: 50');
    expect(screen.getAllByTestId('frame').find((f) => f.dataset['frame'] === 'E2')).toHaveTextContent('W1(50)');
  });

  it('labels a pointer to a frame further left instead of crossing the drawing', () => {
    const trace = traceOf(averageDampProgram);
    render(<EnvironmentScene source={averageDampProgram} trace={trace} stepIndex={trace.records.length} />);
    const f = screen.getAllByTestId('env-pointer').find((p) => p.dataset['from'] === 'E1.f');
    expect(f?.dataset['to']).toBe('E0');
    expect(f).toHaveTextContent('E0');
  });

  it('draws the scanned-out names of a block frame', () => {
    const trace = traceOf(envModelMutualRecursionProgram);
    render(<EnvironmentScene source={envModelMutualRecursionProgram} trace={trace} stepIndex={trace.records.length} />);
    const block = screen.getAllByTestId('frame').find((f) => f.dataset['frame'] === 'E2');
    expect(block).toHaveTextContent('is_even');
    expect(block).toHaveTextContent('is_odd');
  });
});

describe('§3.2 figure 3.1', () => {
  it('looks names up frame by frame, with shadowing', () => {
    expect(lookupSimple('A', 'x')).toEqual({ path: ['II'], found: 'II', value: 7 });
    expect(lookupSimple('B', 'x')).toEqual({ path: ['III', 'I'], found: 'I', value: 3 });
    expect(lookupSimple('B', 'z')).toEqual({ path: ['III', 'I'], found: null, value: null });
    expect(lookupSimple('D', 'y')).toEqual({ path: ['I'], found: 'I', value: 5 });
  });

  it('lets the reader choose the environment and the name', () => {
    render(<EnvModelSimpleDiagram />);
    expect(screen.getByTestId('simple-verdict')).toHaveTextContent('In environment A, x is 7: frame II binds it. Its binding shadows the x of frame I.');
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByTestId('simple-verdict')).toHaveTextContent('In environment B, x is 3: frame III has no x, so the search goes on to frame I.');
    fireEvent.click(screen.getByRole('button', { name: 'z' }));
    expect(screen.getByTestId('simple-verdict')).toHaveTextContent('z is unbound in environment B');
  });
});

describe('§3.2 pages', () => {
  const pages = ['3.2.1', '3.2.2', '3.2.3', '3.2.4'];

  it.each(pages)('%s compiles, numbers its editors in order and names real exercises', async (id) => {
    const module = (await import(`../content/3/${id}.mdx`)) as { default: unknown };
    expect(typeof module.default).toBe('function');
    const text = readFileSync(resolve(import.meta.dirname, '../content/3', `${id}.mdx`), 'utf8');
    const indexes = [...text.matchAll(/<Example index=\{(\d+)\}/g)].map((m) => Number(m[1]));
    expect(indexes).toEqual(indexes.map((_, i) => i));
    expect(text.match(/<Example /g)?.length).toBe(text.match(/anim="frames"/g)?.length);
    for (const [, exercise] of text.matchAll(/<Exercise id="([\d.]+)"/g)) expect(exercises[exercise ?? '']).toBeDefined();
  });
});
