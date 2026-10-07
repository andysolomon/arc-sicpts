import {
  createLabHost,
  imperativeFactorialProgram,
  type LabEvent,
  aliasedAccountProgram,
  makeAccountProgram,
  makeWithdrawProgram,
  monteCarloSeriesProgram,
  newWithdrawProgram,
  separateAccountProgram,
  simplifiedWithdrawProgram,
  withdrawProgram,
} from '@sicp/lab';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { scenes } from '../src/anim/chapter-3/section-3.1.tsx';
import { environmentStates } from '../src/anim/model/environment.ts';
import { localStateKeyframes } from '../src/anim/model/localState.ts';
import { seriesOf } from '../src/anim/model/series.ts';
import { EnvironmentScene } from '../src/anim/scenes/EnvironmentScene.tsx';
import { LocalStateScene, visibleHistory } from '../src/anim/scenes/LocalStateScene.tsx';
import type { Trace } from '../src/anim/useTrace.ts';
import { traceOf } from './traceHelper.ts';

/** A trace with the budget the series animation runs with. */
function longTrace(source: string): Trace {
  const events: LabEvent[] = [];
  createLabHost({ post: (event) => events.push(event) }).handle({ type: 'trace', id: 1, source, maxRecords: 1, budget: 1_000_000 });
  const done = events.find((event): event is Trace => event.type === 'trace-done');
  if (done === undefined) throw new Error('trace did not finish synchronously');
  return done;
}

/** Each holder as `frame names: name=old>…>current`, for compact assertions. */
const summary = (source: string): string[] => {
  const keyframes = localStateKeyframes(traceOf(source, 2000));
  const last = keyframes[keyframes.length - 1];
  return (last?.holders ?? []).map(
    (h) => `${h.key} ${h.names.join('/')}: ${h.cells.map((c) => `${c.name}=${[...c.history, c.value].join('>')}`).join(', ')}`,
  );
};

const bindingIn = (source: string, frame: string, name: string): string | null | undefined => {
  const states = environmentStates(source, traceOf(source));
  const last = states[states.length - 1];
  return last?.frames.find((f) => f.id === frame)?.bindings.find((b) => b.name === name)?.value;
};

describe('assignments land in the frame that binds the name', () => {
  it('changes the balance new_withdraw remembers, not a new binding in the withdrawal\'s own frame', () => {
    // E1 is the call of make_withdraw_balance_100, E2 the block of its body that declares balance.
    expect(bindingIn(newWithdrawProgram, 'E2', 'balance')).toBe('35');
    expect(bindingIn(newWithdrawProgram, 'E3', 'balance')).toBeUndefined();
  });

  it('changes the program frame\'s balance for the global withdraw', () => {
    expect(bindingIn(withdrawProgram, 'E0', 'balance')).toBe('35');
    expect(bindingIn(withdrawProgram, 'E1', 'balance')).toBeUndefined();
  });

  it('changes make_account\'s parameter through withdraw and deposit alike', () => {
    expect(bindingIn(makeAccountProgram, 'E1', 'balance')).toBe('30');
  });
});

describe('objects and their state', () => {
  it('gives W1 and W2 a balance each', () => {
    expect(summary(makeWithdrawProgram)).toEqual(['E1 W1: balance=100>50>10', 'E2 W2: balance=100>30']);
  });

  it('keeps the state of a dispatching account in the frame of make_account', () => {
    expect(summary(makeAccountProgram)).toEqual(['E1 acc: balance=100>50>90>30']);
  });

  it('shows the global balance as the program frame\'s state', () => {
    expect(summary(withdrawProgram)).toEqual(['E0 : balance=100>75>50>35']);
  });

  it('tells two accounts made alike apart, and one account under two names together', () => {
    expect(summary(separateAccountProgram)).toEqual(['E1 peter_acc: balance=100>90>60', 'E3 paul_acc: balance=100>80']);
    expect(summary(aliasedAccountProgram)).toEqual(['E1 peter_acc/paul_acc: balance=100>90>70>40']);
  });

  it('shows a decrementer\'s balance never changing', () => {
    expect(summary(simplifiedWithdrawProgram)).toEqual(['E1 W: balance=25>5>-5', 'E2 D: balance=25']);
  });

  it('says in words who sees each change', () => {
    const captions = localStateKeyframes(traceOf(separateAccountProgram)).map((k) => k.caption);
    expect(captions).toContain('`balance` in E1 goes from 100 to 90. Only `peter_acc` sees it; the `balance` of `paul_acc` does not move.');
    const joint = localStateKeyframes(traceOf(aliasedAccountProgram)).map((k) => k.caption);
    expect(joint).toContain('`paul_acc` names the same object as `peter_acc`: no call, no new frame. Both names reach the same state.');
    expect(joint).toContain('`balance` in E1 goes from 100 to 90. Through `peter_acc` and `paul_acc` alike, it is the same `balance`.');
  });

  it('starts empty, makes a keyframe only when the state changes, and ends on an error', () => {
    const keyframes = localStateKeyframes(traceOf(makeWithdrawProgram));
    expect(keyframes[0]?.holders).toEqual([]);
    expect(keyframes).toHaveLength(6);
    const failing = localStateKeyframes(traceOf(`${makeAccountProgram}acc("transfer");\n`));
    expect(failing[failing.length - 1]?.caption).toMatch(/^The evaluator stops with an error/);
    expect(localStateKeyframes(null)).toHaveLength(1);
  });

  it('finds no objects in an imperative factorial, whose state belongs to one call', () => {
    expect(summary(imperativeFactorialProgram)).toEqual([]);
  });

  it('shows the latest earlier values that fit on a row', () => {
    expect(visibleHistory('balance', '10', ['100', '50'])).toEqual(['100', '50']);
    expect(visibleHistory('x', '730956990', ['2026', '97797046', '592151360'])).toEqual(['592151360']);
  });
});

describe('scenes of section 3.1', () => {
  it('draws a card per object with its current state', () => {
    const trace = traceOf(separateAccountProgram);
    render(<LocalStateScene trace={trace} stepIndex={trace.records.length} />);
    const cards = screen.getAllByTestId('state-holder');
    expect(cards.map((c) => c.dataset['names'])).toEqual(['peter_acc', 'paul_acc']);
    expect(screen.getAllByTestId('state-cell').map((c) => `${c.dataset['name']}=${c.dataset['value']}`)).toEqual(['balance=60', 'balance=80']);
    expect(screen.getByTestId('caption')).toHaveTextContent('goes from 90 to 60');
  });

  it('puts two names for one account on one card', () => {
    const trace = traceOf(aliasedAccountProgram);
    render(<LocalStateScene trace={trace} stepIndex={trace.records.length} />);
    expect(screen.getAllByTestId('state-holder').map((c) => c.dataset['names'])).toEqual(['peter_acc,paul_acc']);
  });

  it('starts on the first keyframe with its transport', () => {
    render(<LocalStateScene trace={traceOf(makeWithdrawProgram)} />);
    expect(screen.getByRole('region', { name: 'Objects and their state' })).toBeInTheDocument();
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 6');
    expect(screen.getByText('No object made yet')).toBeInTheDocument();
  });

  it('says so when a program has no local state, or while it runs', () => {
    render(<LocalStateScene trace={traceOf('1 + 1;')} />);
    expect(screen.getByText('No objects with state')).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toHaveTextContent('No local state here');
    render(<LocalStateScene trace={null} />);
    expect(screen.getAllByTestId('caption')[1]).toHaveTextContent('Running the program');
  });

  it('draws the balance in the remembered frame', () => {
    const trace = traceOf(newWithdrawProgram);
    render(<EnvironmentScene source={newWithdrawProgram} trace={trace} stepIndex={trace.records.length} />);
    const frame = screen.getAllByTestId('frame').find((f) => f.dataset['frame'] === 'E2');
    expect(frame).toHaveTextContent('balance: 35');
  });

  it('registers the local-state kind', () => {
    expect(Object.keys(scenes)).toEqual(['local-state']);
  });
});

describe('the Monte Carlo series', () => {
  it('plots 40 running estimates against 40 copies of π', () => {
    const series = seriesOf(longTrace(monteCarloSeriesProgram).output);
    expect(series.map((s) => [s.label, s.values.length])).toEqual([
      ['estimate of π', 40],
      ['π', 40],
    ]);
    expect(Math.abs((series[0]?.values.at(-1) ?? 0) - Math.PI)).toBeLessThan(0.05);
  });
});
