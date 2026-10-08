import { delayedPrimeProgram, implicitFibsProgram, memoizedStreamProgram, sieveProgram } from '@sicp/lab';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Animation } from '../src/anim/Animation.tsx';
import { divisibilityTests, sieveCaption, sieveCascade } from '../src/anim/chapter-3/sieveCascade.ts';
import { SieveScene } from '../src/anim/chapter-3/SieveScene.tsx';
import { forcingAt, forcingRuns, forcingSummary, forcingTotal } from '../src/anim/chapter-3/streamForcing.ts';
import { StreamForcingScene } from '../src/anim/chapter-3/StreamForcingScene.tsx';
import { SieveDiagram } from '../src/diagrams/chapter-3/SieveDiagram.tsx';
import { traceOf } from './traceHelper.ts';

// Registry tests verify routing to a scene; worker execution is covered separately.
vi.mock('../src/lab/client.ts', () => ({
  labClient: () => ({ submit: () => ({ id: 1, cancel() {}, finished: new Promise(() => {}) }) }),
}));

describe('stream forcing model', () => {
  it('reads labelled runs of printed numbers and ignores other lines', () => {
    expect(forcingRuns(['"a"', '1', '2', 'list(1, 2)', '"b"', '"c"', '3', 'true'])).toEqual([
      { label: 'a', values: ['1', '2'] },
      { label: 'c', values: ['3'] },
    ]);
    expect(forcingRuns(['5'])).toEqual([{ label: '', values: ['5'] }]);
  });

  it('counts recomputations, across runs in printed order', () => {
    const runs = forcingRuns(traceOf(memoizedStreamProgram).output);
    expect(forcingTotal(runs)).toBe(14);
    const middle = forcingAt(runs, 7);
    expect(middle.rows[0]?.cells.map((c) => `${c.value}×${c.count}`)).toEqual(['1×1', '4×2', '9×2', '16×1', '25×1']);
    expect(middle.rows[1]?.cells).toEqual([]);
    expect(middle.latest).toEqual({ row: 0, value: '9', count: 2, elements: 5 });
    expect(forcingSummary(runs)).toEqual([
      { label: 'stream_map', elements: 5, computations: 9, repeats: 4 },
      { label: 'stream_map_optimized', elements: 5, computations: 5, repeats: 0 },
    ]);
  });
});

describe('sieve model', () => {
  const trace = traceOf(sieveProgram, 6000);
  const sieve = sieveCascade(divisibilityTests(trace.records), !trace.truncated);

  it('reads each is_divisible test and its answer from the trace', () => {
    expect(divisibilityTests(trace.records).slice(0, 4)).toEqual([
      { candidate: 3, divisor: 2, divisible: false },
      { candidate: 4, divisor: 2, divisible: true },
      { candidate: 5, divisor: 2, divisible: false },
      { candidate: 5, divisor: 3, divisible: false },
    ]);
  });

  it('builds one filter per prime and sends every candidate through them', () => {
    expect(sieve.filters.slice(0, 8)).toEqual([2, 3, 5, 7, 11, 13, 17, 19]);
    expect(sieve.candidates.slice(0, 7).map((c) => c.value)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(sieve.candidates[6]).toEqual({ value: 9, passed: [2], stoppedBy: 3, filters: 4 });
    expect(sieve.candidates[8]).toEqual({ value: 11, passed: [2, 3, 5, 7], stoppedBy: null, filters: 4 });
    expect(sieveCaption(sieve, 6)).toBe('9 gets through the filter for 2, but it is a multiple of 3: dropped.');
    expect(sieveCaption(sieve, 8)).toContain('11 is not a multiple of 2, 3, 5 or 7');
  });

  it('drops the last candidate of a cut-short trace', () => {
    const tests = [
      { candidate: 3, divisor: 2, divisible: false },
      { candidate: 5, divisor: 2, divisible: false },
    ];
    expect(sieveCascade(tests, false).candidates.map((c) => c.value)).toEqual([3]);
  });
});

describe('stream scenes', () => {
  it('draws the interval as far as the second prime, with the rest a promise', () => {
    render(<StreamForcingScene trace={traceOf(delayedPrimeProgram)} />);
    expect(screen.getByRole('region', { name: 'Forcing a stream, one tail at a time' })).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toHaveTextContent('Computed 10000: 1 element so far');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } });
    expect(screen.getAllByTestId('stream-cell')).toHaveLength(10);
    expect(screen.getByTestId('stream-promise')).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toHaveTextContent('10 computations for 10 elements, none repeated');
  });

  it('marks the elements an unmemoized stream computes again', () => {
    render(<StreamForcingScene trace={traceOf(memoizedStreamProgram)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '13' } });
    expect(screen.getAllByTestId('stream-row').map((r) => r.dataset['label'])).toEqual(['stream_map', 'stream_map_optimized']);
    expect(screen.getAllByTestId('stream-count').map((c) => c.textContent)).toEqual(['×2', '×2', '×2', '×2']);
    expect(screen.getByTestId('caption')).toHaveTextContent('`stream_map`: 9 computations for 5 elements, 4 of them repeats.'.replaceAll('`', ''));
  });

  it('folds long chains and groups many computations into fewer keyframes', () => {
    render(<StreamForcingScene trace={traceOf(implicitFibsProgram)} />);
    // 79 additions in at most 48 keyframes.
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 40');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '39' } });
    expect(screen.getAllByTestId('stream-cell').map((c) => c.textContent)).toEqual(['1', '2', '3', '5', '8', '13', '21']);
    expect(screen.getByTestId('caption')).toHaveTextContent('79 computations for 7 elements, 72 of them repeats');
  });

  it('explains what to print when nothing is printed', () => {
    render(<StreamForcingScene trace={traceOf('const ones = pair(1, () => ones);')} />);
    expect(screen.getByText('No elements computed yet')).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toHaveTextContent('display returns its argument');
  });

  it('sends candidates through the sieve one keyframe at a time', () => {
    render(<SieveScene trace={traceOf(sieveProgram, 6000)} />);
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 30');
    expect(screen.getByTestId('sieve-candidate')).toHaveTextContent('3');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '6' } });
    expect(screen.getByTestId('sieve-candidate')).toHaveTextContent('9');
    expect(screen.getAllByTestId('sieve-filter').map((f) => f.dataset['divisor'])).toEqual(['2', '3', '5', '7']);
    expect(screen.getByTestId('caption')).toHaveTextContent('multiple of 3: dropped');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    expect(screen.getAllByTestId('sieve-prime').map((p) => p.textContent)).toEqual(['2', '3', '5', '7', '11']);
  });

  it('asks for is_divisible when the program has none', () => {
    render(<SieveScene trace={traceOf('1;')} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('Keep the filter');
  });

  it('dispatches the stream kinds from the registry', async () => {
    render(<Animation kind="stream-forcing" source="1;" />);
    expect(await screen.findByRole('region', { name: 'Forcing a stream, one tail at a time' })).toBeInTheDocument();
    render(<Animation kind="sieve" source="1;" />);
    expect(await screen.findByRole('region', { name: 'The sieve as a cascade of filters' })).toBeInTheDocument();
  });

  it('draws figure 3.31', () => {
    render(<SieveDiagram />);
    expect(screen.getByRole('img', { name: /head of the input makes a filter/ })).toBeInTheDocument();
    expect(screen.getAllByTestId('sieve-diagram-box')).toHaveLength(4);
  });
});
