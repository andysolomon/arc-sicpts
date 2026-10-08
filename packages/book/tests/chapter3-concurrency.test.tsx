import {
  createLabHost,
  exchangeDeadlockProgram,
  jointAccountProgram,
  LabClient,
  serializedAccountProgram,
  squareIncrementProgram,
  type LabEvent,
  type WorkerLike,
} from '@sicp/lab';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { interleaving } from '../src/anim/chapter-3/interleaving.ts';
import { InterleavingScene } from '../src/anim/chapter-3/InterleavingScene.tsx';
import { describeRun, histogram, labelOf, summarizeRuns, type OutcomeRun } from '../src/anim/chapter-3/outcomes.ts';
import { OutcomesScene } from '../src/anim/chapter-3/OutcomesScene.tsx';
import type { Trace } from '../src/anim/useTrace.ts';
import { TimingDiagram } from '../src/diagrams/chapter-3/ConcurrencyTimingDiagram.tsx';

// jsdom has no IntersectionObserver; figure 3.29 fades in with motion's whileInView, which needs one.
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

/** The step log of one run, interleaved by `seed`, exactly as the worker would post it. */
function seededTrace(source: string, seed: number): Trace {
  const events: LabEvent[] = [];
  const host = createLabHost({ post: (event) => events.push(event) });
  host.handle({ type: 'trace', id: 1, source, seed, maxRecords: 3000, budget: 20_000 });
  const done = events.find((event): event is Trace => event.type === 'trace-done');
  if (done === undefined) throw new Error('trace did not finish synchronously');
  return done;
}

const modelOf = (source: string, seed: number) => {
  const trace = seededTrace(source, seed);
  return interleaving(trace.records, trace.outcome, trace.truncated);
};

/** A Laboratory on this thread, connected the way the page's worker is. */
function inProcessClient(): LabClient {
  return new LabClient(() => {
    const worker: WorkerLike = {
      onmessage: null,
      postMessage: (message) => setTimeout(() => host.handle(message), 0),
      terminate: () => {},
    };
    const host = createLabHost({ post: (event) => setTimeout(() => worker.onmessage?.({ data: event }), 0) });
    return worker;
  });
}

describe('the interleaving model', () => {
  it("finds Peter's lost withdrawal in seed 1 of the joint account", () => {
    const model = modelOf(jointAccountProgram, 1);
    expect(model.threads).toEqual([1, 2]);
    expect(model.shared).toEqual(['balance']);
    expect(model.initial).toEqual({ balance: '100' });
    expect(model.value).toBe('90');
    expect(model.lost).toBe(1);
    const lost = model.rows.find((row) => row.overwrites !== undefined);
    expect(lost).toMatchObject({ kind: 'write', symbol: 'balance', value: '90', thread: 1, overwrites: 2 });
    expect(model.rows.filter((row) => row.kind === 'call').map((row) => row.text).sort()).toEqual(['withdraw(10)', 'withdraw(25)']);
    expect(model.after.at(-1)).toEqual({ balance: '90' });
  });

  it("does not call Paul's withdrawal lost when his second look already sees Peter's", () => {
    const model = modelOf(jointAccountProgram, 2);
    expect(model.value).toBe('65');
    expect(model.lost).toBe(0);
  });

  it('marks a lost update exactly when x * x and x + 1 do not end as a serial order would', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const model = modelOf(squareIncrementProgram, seed);
      const serial = model.value === '101' || model.value === '121';
      expect(model.lost + model.mixed > 0, `seed ${seed} gave ${model.value}`).toBe(!serial);
      if (model.value === '110') expect(model.rows.find((row) => row.mixed !== undefined)?.mixed).toEqual(['10', '11']);
    }
  });

  it('shows the mutex at work and no lost update in the serialized account', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const model = modelOf(serializedAccountProgram, seed);
      expect(model.value).toBe('65');
      expect(model.lost).toBe(0);
      expect(model.rows.filter((row) => row.kind === 'lock' && row.value === 'false')).toHaveLength(2);
    }
  });

  it('folds a spinning mutex into one row with a count', () => {
    const spins = Array.from({ length: 10 }, (_, i) => modelOf(serializedAccountProgram, i + 1)).flatMap((m) => m.rows).filter((row) => row.kind === 'lock' && row.value === 'true');
    expect(spins.length).toBeGreaterThan(0);
    expect(spins.some((row) => row.repeat > 1)).toBe(true);
  });

  it('has nothing to draw for a program without threads', () => {
    const trace = seededTrace('let x = 1; x = x + 1;', 1);
    expect(interleaving(trace.records, trace.outcome).threads).toEqual([]);
  });
});

describe('the outcomes model', () => {
  const runs: OutcomeRun[] = [
    { seed: 1, status: 'done', value: '121' },
    { seed: 2, status: 'done', value: '11' },
    { seed: 3, status: 'budget-exhausted', value: null },
    { seed: 4, status: 'done', value: '121' },
    { seed: 5, status: 'done', value: '"10 20"' },
  ];

  it('counts each final value, numbers in order and failures last', () => {
    expect(histogram(runs).map((bar) => [bar.label, bar.count, bar.firstSeed])).toEqual([
      ['11', 1, 2],
      ['121', 2, 1],
      ['10 20', 1, 5],
      ['did not finish', 1, 3],
    ]);
    expect(histogram(runs, 2).map((bar) => bar.label)).toEqual(['11', '121']);
    expect(labelOf({ seed: 9, status: 'error', value: null })).toBe('error');
  });

  it('describes each run and sums them up', () => {
    expect(describeRun(runs, 2)).toBe('Run 3, seed 3, never finished: it ran out of steps. So far 3 different outcomes.');
    expect(summarizeRuns(runs.slice(0, 1))).toBe('1 runs, 1 different outcome: 121 (1×). Every interleaving gave the same result.');
  });
});

describe('the §3.4 scenes', () => {
  it('draws a lane per thread and plays to the lost update', () => {
    render(<InterleavingScene source={jointAccountProgram} trace={seededTrace(jointAccountProgram, 1)} />);
    expect(screen.getByRole('region', { name: 'Interleaved threads' })).toBeInTheDocument();
    expect(screen.getByText('thread 1')).toBeInTheDocument();
    expect(screen.getByText('thread 2')).toBeInTheDocument();
    expect(screen.getByLabelText('seed')).toHaveValue(1);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: slider.getAttribute('max') } });
    expect(screen.getByTestId('caption')).toHaveTextContent("The program's value is 90. One write overwrote another thread's update unseen");
    expect(screen.getAllByTestId('lane-row').filter((row) => row.dataset['lost'] === 'true')).toHaveLength(1);
    expect(screen.getByTestId('shared-state')).toHaveTextContent('balance = 90');
  });

  it('traces again with the seed the reader picks', async () => {
    render(<InterleavingScene source={jointAccountProgram} client={inProcessClient()} delayMs={0} />);
    await waitFor(() => expect(screen.getAllByTestId('lane-row').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('button', { name: 'Another seed' }));
    expect(screen.getByLabelText('seed')).toHaveValue(2);
    const slider = await screen.findByRole('slider');
    await waitFor(() => {
      fireEvent.change(slider, { target: { value: slider.getAttribute('max') } });
      expect(screen.getByTestId('caption')).toHaveTextContent("The program's value is 65. No write overwrote");
    });
  });

  it('explains when a program starts no threads', () => {
    render(<InterleavingScene source="1;" trace={seededTrace('1;', 1)} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('This program starts no threads');
  });

  it('runs a program once per seed in the Laboratory and draws the histogram', async () => {
    render(<OutcomesScene source={squareIncrementProgram} count={30} client={inProcessClient()} delayMs={0} />);
    await waitFor(() => expect(screen.getByRole('slider')).toHaveAttribute('max', '29'), { timeout: 5000 });
    const slider = screen.getByRole('slider');
    fireEvent.input(slider, { target: { value: '29' } });
    const bars = screen.getAllByTestId('outcome-bar');
    const total = bars.reduce((sum, bar) => sum + Number(bar.dataset['count']), 0);
    expect(total).toBe(30);
    expect(bars.map((bar) => bar.dataset['value']).every((v) => ['11', '100', '101', '110', '121'].includes(v ?? ''))).toBe(true);
    expect(screen.getByTestId('caption')).toHaveTextContent(/^30 runs, \d different outcomes/);
  });

  it('gives runs that never finish a bar of their own', async () => {
    render(<OutcomesScene source={exchangeDeadlockProgram} count={12} budget={5000} client={inProcessClient()} delayMs={0} />);
    await waitFor(() => expect(screen.getAllByTestId('outcome-bar').length).toBeGreaterThan(0), { timeout: 5000 });
    expect(screen.getAllByTestId('outcome-bar').map((bar) => bar.dataset['value'])).toEqual(['10 20', 'did not finish']);
  });

  it('draws figure 3.29 step by step', () => {
    render(<TimingDiagram />);
    expect(screen.getAllByTestId('timing-step')).toHaveLength(6);
    expect(screen.getByRole('img', { name: /Peter's withdrawal is lost/ })).toBeInTheDocument();
  });
});
