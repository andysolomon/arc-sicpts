import { paradigmAppendPairsProgram, paradigmPairsProgram } from '@sicp/lab';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PairsOrderScene } from '../src/anim/chapter-3/PairsOrderScene.tsx';
import { appendedPairs, gridSize, interleavedPairs, orderOf, pairsFromOutput, precedingCount, rowShares } from '../src/anim/chapter-3/pairsOrder.ts';
import { scenes } from '../src/anim/chapter-3/section-3.5-paradigm.tsx';
import type { Trace } from '../src/anim/useTrace.ts';
import { pairsPart } from '../src/diagrams/chapter-3/PairsDecompositionDiagram.tsx';
import { diagrams } from '../src/diagrams/chapter-3/section-3.5-paradigm.tsx';
import { anchor, signalFigures, wirePoints } from '../src/diagrams/chapter-3/signalFlow.ts';
import { traceOf } from './traceHelper.ts';

const fakeTrace = (output: string[]): Trace => ({
  type: 'trace-done',
  id: 1,
  records: [],
  truncated: false,
  outcome: { status: 'done', value: 'true' },
  output,
});

describe('the order of a stream of pairs (model)', () => {
  it('reads pairs printed by display_list or by display', () => {
    expect(pairsFromOutput(['list(1, 2)', '[3, [4, null]]', '[5, 6]', '"label"', '7', 'list(1, 2, 3)'])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('interleaves the rows as the book’s pairs does', () => {
    expect(interleavedPairs(8)).toEqual([
      [1, 1],
      [1, 2],
      [2, 2],
      [1, 3],
      [2, 3],
      [1, 4],
      [3, 3],
      [1, 5],
    ]);
  });

  it('predicts the position of every pair, as exercise 3.66 asks', () => {
    const pairs = interleavedPairs(400);
    for (const [k, [i, j]] of pairs.entries()) expect(precedingCount(i, j)).toBe(k);
    expect(precedingCount(1, 100)).toBe(197);
    expect(precedingCount(100, 100)).toBe(2 ** 100 - 2);
  });

  it('tells the two orders apart, and neither from another', () => {
    expect(orderOf(interleavedPairs(10))).toBe('interleave');
    expect(orderOf(appendedPairs(10))).toBe('append');
    expect(orderOf([[1, 1], [2, 1]])).toBe('other');
    expect(orderOf([])).toBe('other');
  });

  it('sizes the grid to the pairs, within bounds', () => {
    expect(gridSize([])).toEqual({ rows: 4, cols: 6 });
    expect(gridSize(interleavedPairs(31))).toEqual({ rows: 5, cols: 10 });
    expect(gridSize(appendedPairs(3))).toEqual({ rows: 4, cols: 6 });
  });

  it('halves the share of each row', () => {
    expect(rowShares(interleavedPairs(31), 4)).toEqual([16, 8, 4, 2]);
  });
});

describe('the pairs-order scene', () => {
  it('lights the pairs the program printed, beside the appended order', () => {
    render(<PairsOrderScene trace={traceOf(paradigmPairsProgram, 1)} />);
    const scene = screen.getByRole('region', { name: 'The order the pairs come out in' });
    expect(within(scene).getByTestId('keyframe-counter')).toHaveTextContent('1 / 31');
    fireEvent.change(within(scene).getByRole('slider'), { target: { value: '30' } });
    const lit = (grid: string) => scene.querySelectorAll(`[data-testid="pairs-cell"][data-grid="${grid}"]:not([data-order=""])`);
    // 25 of the 31 lie on the 5 × 10 grid on the left; on the right, only row 1.
    expect(lit('program')).toHaveLength(25);
    expect(lit('model')).toHaveLength(10);
    expect(scene.querySelector('[data-grid="program"][data-i="5"][data-j="5"]')).toHaveAttribute('data-order', '31');
    expect(screen.getByTestId('caption')).toHaveTextContent('row 1 gave 16, row 2 gave 8, row 3 gave 4');
  });

  it('shows stream_append stuck on the first row, beside interleave', () => {
    render(<PairsOrderScene trace={traceOf(paradigmAppendPairsProgram, 1)} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });
    expect(screen.getByText('this program (stream_append)')).toBeInTheDocument();
    expect(screen.getByText('with interleave')).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toHaveTextContent('All 31 pairs come from row 1');
  });

  it('names each pair with its predicted position as it plays', () => {
    render(<PairsOrderScene trace={fakeTrace(interleavedPairs(6).map(([i, j]) => `list(${i}, ${j})`))} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });
    expect(screen.getByTestId('caption')).toHaveTextContent('Pair 5: (2, 3). 4 pairs come before it');
    expect(screen.getByRole('list', { name: 'Pairs in order' }).children).toHaveLength(5);
  });

  it('explains what to print when there are no pairs, and reports errors', () => {
    const { unmount } = render(<PairsOrderScene trace={fakeTrace(['1', '2'])} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('display_list(list(i, j))');
    unmount();
    render(<PairsOrderScene trace={{ ...fakeTrace([]), outcome: { status: 'error', error: { message: 'boom', phase: 'runtime', loc: null } } }} />);
    expect(screen.getByTestId('caption')).toHaveTextContent('boom');
  });

  it('is registered as pairs-order', () => {
    expect(Object.keys(scenes)).toEqual(['pairs-order']);
  });
});

describe('signal-flow diagrams', () => {
  it('connects every wire to nodes that exist, inside the drawing', () => {
    for (const figure of Object.values(signalFigures)) {
      for (const edge of figure.edges) {
        for (const [x, y] of wirePoints(figure, edge)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(figure.width);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(figure.height);
        }
      }
      expect(new Set(figure.nodes.map((n) => n.id)).size).toBe(figure.nodes.length);
    }
  });

  it('ends wires on the outline of boxes and adders', () => {
    expect(anchor({ id: 'b', kind: 'box', x: 100, y: 50, w: 80 }, [0, 50])).toEqual([60, 50]);
    expect(anchor({ id: 'b', kind: 'box', x: 100, y: 50, w: 80 }, [100, 0])).toEqual([100, 33]);
    const [x, y] = anchor({ id: 'a', kind: 'adder', x: 0, y: 0 }, [30, 40]);
    expect(Math.hypot(x, y)).toBeCloseTo(15, 9);
    expect(anchor({ id: 't', kind: 'tap', x: 5, y: 6 }, [0, 0])).toEqual([5, 6]);
  });

  it('closes the feedback loops of integral and solve', () => {
    expect(signalFigures.integral.edges.some((e) => e.from === 'tap' && e.to === 'add')).toBe(true);
    expect(signalFigures.solve.edges.some((e) => e.from === 'map' && e.to === 'integral' && e.label === 'dy')).toBe(true);
  });

  it('renders every registered diagram with its caption', () => {
    for (const [name, Diagram] of Object.entries(diagrams)) {
      const { unmount, container } = render(<Diagram caption={<span>{name} caption</span>} />);
      expect(screen.getByText(`${name} caption`)).toBeInTheDocument();
      expect(container.querySelector('svg[role="img"]')).not.toBeNull();
      unmount();
    }
  });

  it('draws the three parts of pairs(S, T)', () => {
    expect([pairsPart(0, 0), pairsPart(0, 3), pairsPart(2, 3), pairsPart(3, 1)]).toEqual(['corner', 'row', 'rest', 'below']);
    render(<diagrams.PairsDecompositionDiagram />);
    expect(screen.getAllByTestId('pairs-part').filter((g) => g.dataset['part'] === 'row')).toHaveLength(5);
  });
});
