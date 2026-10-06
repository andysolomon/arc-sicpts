import { factorialProgram, processShape, type ProcessShapeSnapshot } from '@sicp/lab';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { describeRun, downsample, layoutBars, ProcessShapeViz } from '../src/viz/ProcessShapeViz.tsx';
import fixture from './fixtures/processShape.factorial.json';

const snapshot = fixture as ProcessShapeSnapshot;

const bars = (chart: Element): SVGRectElement[] => [...chart.querySelectorAll('rect')];

describe('ProcessShapeViz', () => {
  it('uses a fixture that is a real inspect/processShape trace', () => {
    expect(processShape(factorialProgram).snapshot).toEqual(snapshot);
  });

  it('invites a run before there is a trace', () => {
    const { container } = render(<ProcessShapeViz snapshot={null} />);
    expect(screen.getByText('Process shape')).toBeInTheDocument();
    expect(screen.getByText('stack depth · per step')).toBeInTheDocument();
    expect(screen.getByText(/no trace yet/)).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(0);
    expect(container.querySelector('details')).toBeNull();
  });

  it('draws one labelled chart per run, one bar per sample', () => {
    render(<ProcessShapeViz snapshot={snapshot} />);
    expect(screen.getByText('factorial(6) · recursive · max depth 6')).toBeInTheDocument();
    expect(screen.getByText('fact_iter(1, 1, 6) · iterative · max depth 1')).toBeInTheDocument();

    const [recursive, iterative] = screen.getAllByRole('img');
    if (recursive === undefined || iterative === undefined) throw new Error('expected two charts');
    expect(recursive).toHaveAttribute('viewBox', '0 0 320 76');
    expect(bars(recursive).map((bar) => bar.dataset['depth'])).toEqual(
      ['1', '2', '3', '4', '5', '6', '6', '5', '4', '3', '2', '1'],
    );
    expect(bars(iterative)).toHaveLength(8);
  });

  it('sizes bars 11px per depth unit from the baseline, with a 4px gap', () => {
    render(<ProcessShapeViz snapshot={snapshot} />);
    const [first, second, , , , peak] = bars(screen.getAllByRole('img')[0] as Element);
    expect(first).toHaveAttribute('x', '0');
    expect(first).toHaveAttribute('width', '23');
    expect(first).toHaveAttribute('height', '11');
    expect(first).toHaveAttribute('y', '64');
    expect(first).toHaveAttribute('rx', '2');
    expect(second).toHaveAttribute('x', '27');
    expect(peak).toHaveAttribute('height', '66');
    expect(peak).toHaveAttribute('y', '9');
  });

  it('colours recursive runs with the accent and iterative runs with ok', () => {
    render(<ProcessShapeViz snapshot={snapshot} />);
    const [recursive, iterative] = screen.getAllByRole('img');
    expect(bars(recursive as Element).every((bar) => bar.classList.contains('fill-accent'))).toBe(true);
    expect(bars(iterative as Element).every((bar) => bar.classList.contains('fill-ok'))).toBe(true);
  });

  it('describes each chart in words and offers the trace as text', () => {
    const { container } = render(<ProcessShapeViz snapshot={snapshot} />);
    expect(screen.getByRole('img', { name: 'Stack depth grows to 6 then shrinks to 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Stack depth stays at 1 for every step' })).toBeInTheDocument();

    const details = container.querySelector('details');
    if (details === null) throw new Error('expected a text alternative');
    expect(within(details).getByText('as text')).toBeInTheDocument();
    const items = within(details).getAllByRole('listitem', { hidden: true });
    expect(items[0]).toHaveTextContent(
      'factorial(6) · recursive · max depth 6 · 6 calls · depths: 1 2 3 4 5 6 6 5 4 3 2 1',
    );
    expect(items[1]).toHaveTextContent('fact_iter(1, 1, 6) · iterative · max depth 1 · 7 calls · depths: 1 1 1 1 1 1 1 1');
  });

  it('renders the note it is given', () => {
    render(
      <ProcessShapeViz snapshot={snapshot}>
        Depth is sampled at every call and every return.
      </ProcessShapeViz>,
    );
    expect(screen.getByText('Depth is sampled at every call and every return.')).toBeInTheDocument();
  });

  it('adds bars as a partial trace grows', () => {
    const partial = (count: number): ProcessShapeSnapshot => ({
      runs: [{ ...snapshot.runs[0]!, samples: snapshot.runs[0]!.samples.slice(0, count) }],
    });
    const { rerender } = render(<ProcessShapeViz snapshot={partial(3)} runKey={1} />);
    expect(bars(screen.getByRole('img'))).toHaveLength(3);
    rerender(<ProcessShapeViz snapshot={partial(9)} runKey={1} />);
    expect(bars(screen.getByRole('img'))).toHaveLength(9);
    rerender(<ProcessShapeViz snapshot={null} runKey={2} />);
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('distinguishes "not run yet" from "ran but made no calls"', () => {
    render(<ProcessShapeViz snapshot={{ runs: [] }} />);
    expect(screen.getByText('no function calls in this run')).toBeInTheDocument();
  });

  it('says when a trace was truncated', () => {
    const truncated: ProcessShapeSnapshot = { runs: [{ ...snapshot.runs[0]!, truncated: true }] };
    render(<ProcessShapeViz snapshot={truncated} />);
    expect(screen.getByText(/trace truncated/)).toBeInTheDocument();
  });
});

describe('layout', () => {
  it('scales deep traces to fit above the baseline', () => {
    const deep = layoutBars([10, 35, 70]);
    expect(deep.map((bar) => bar.height)).toEqual([10, 35, 70]);
    expect(Math.min(...deep.map((bar) => bar.y))).toBe(5);
  });

  it('keeps the peak of each bucket when there are more samples than bars', () => {
    const samples = Array.from({ length: 640 }, (_, i) => (i === 333 ? 99 : 1));
    const reduced = downsample(samples);
    expect(reduced).toHaveLength(64);
    expect(reduced[33]).toBe(99);
    expect(reduced.filter((depth) => depth === 1)).toHaveLength(63);
    expect(layoutBars(samples)).toHaveLength(64);
  });

  it('describes shapes that are neither flat nor a single rise and fall', () => {
    const run = { ...snapshot.runs[0]!, samples: [1, 2, 1, 2, 3, 1], maxDepth: 3 };
    expect(describeRun(run)).toBe('Stack depth varies between 1 and 3');
    expect(describeRun({ ...run, samples: [] })).toBe('No calls were made');
  });
});
