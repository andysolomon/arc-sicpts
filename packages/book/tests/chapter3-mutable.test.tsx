import {
  createLabHost,
  mutableSetHeadProgram,
  mutableSharingProgram,
  queueProgram,
  table2DProgram,
  type LabEvent,
} from '@sicp/lab';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Animation } from '../src/anim/Animation.tsx';
import { boxPointerFrames, layoutBoxPointer, placePairs } from '../src/anim/model/boxPointer.ts';
import { BoxPointerScene } from '../src/anim/scenes/BoxPointerScene.tsx';
import type { Trace } from '../src/anim/useTrace.ts';
import { BoxPointerDiagram, finalHeap } from '../src/diagrams/chapter-3/BoxPointerDiagram.tsx';

// Registry tests verify routing to a scene; worker execution is covered separately.
vi.mock('../src/lab/client.ts', () => ({
  labClient: () => ({ submit: () => ({ id: 1, cancel() {}, finished: new Promise(() => {}) }) }),
}));

/** A trace with heap snapshots, exactly as the worker would post it. */
function heapTraceOf(source: string): Trace {
  const events: LabEvent[] = [];
  createLabHost({ post: (event) => events.push(event) }).handle({ type: 'trace', id: 1, source, maxRecords: 2000, budget: 50_000, inspect: { heap: true } });
  const done = events.find((event): event is Trace => event.type === 'trace-done');
  if (done === undefined) throw new Error('trace did not finish synchronously');
  return done;
}

const frameAfter = (source: string, text: string) => {
  const frame = boxPointerFrames(heapTraceOf(source).heap).find((f) => f.snapshot.node?.text === text);
  if (frame === undefined) throw new Error(`no keyframe after ${text}`);
  return frame;
};

describe('box-and-pointer model', () => {
  it('lays a list along a row and hangs a head below it', () => {
    const snapshot = finalHeap('const x = list(list("a", "b"), "c", "d");');
    if (snapshot === null) throw new Error('no heap');
    const spots = [...placePairs(snapshot).values()].map(({ col, row }) => `${col},${row}`).sort();
    // The spine of three along row 0; list("a", "b") under its first pair.
    expect(spots).toEqual(['0,0', '0,1', '1,0', '1,1', '2,0']);
  });

  it('keeps hanging lists clear of each other in a table of subtables', () => {
    const snapshot = finalHeap(table2DProgram);
    if (snapshot === null) throw new Error('no heap');
    const spots = [...placePairs(snapshot).values()].map(({ col, row }) => `${col},${row}`);
    expect(new Set(spots).size).toBe(spots.length);
    expect(snapshot.pairs).toHaveLength(spots.length);
  });

  it('draws a queue as a pointer pair above its list, the rear pointer reaching along it', () => {
    const snapshot = finalHeap(queueProgram);
    if (snapshot === null) throw new Error('no heap');
    const layout = layoutBoxPointer(snapshot);
    const q = layout.boxes.find((box) => layout.names.some((n) => n.names.includes('q') && n.target === box.id));
    expect(q).toMatchObject({ col: 0, row: 0 });
    // b, c, d in the row below.
    expect(layout.boxes.filter((box) => box.row === 1).map((box) => box.head)).toEqual([
      { kind: 'atom', text: '"b"' },
      { kind: 'atom', text: '"c"' },
      { kind: 'atom', text: '"d"' },
    ]);
  });

  it('draws one arrow per pointer, sharing included, and loops a cycle back', () => {
    const z1 = layoutBoxPointer(frameAfter(mutableSharingProgram, 'const z1 = pair(x, x)').snapshot);
    expect(z1.boxes).toHaveLength(3);
    // x's tail, z1's head and tail, and the two names.
    expect(z1.pointers.filter((p) => !p.key.startsWith('name:'))).toHaveLength(3);
    const cycle = finalHeap('const z = list("a", "b", "c");\nset_tail(tail(tail(z)), z);');
    if (cycle === null) throw new Error('no heap');
    const layout = layoutBoxPointer(cycle);
    const back = layout.pointers.find((p) => p.key.endsWith(':tail') && p.target === layout.boxes[0]?.id && p.key !== `${layout.boxes[0]?.id}:tail`);
    expect(back?.d).toContain(' C ');
  });

  it('says what each statement did: new pairs, pointers changed, pairs left behind', () => {
    const frames = boxPointerFrames(heapTraceOf(mutableSetHeadProgram).heap);
    expect(frames.map((f) => f.caption)).toEqual([
      '`const x = list(list("a", "b"), "c", "d")`: 5 new pairs.',
      '`const y = list("e", "f")`: 2 new pairs.',
      '`set_head(x, y)`: 1 pointer changed in place; 2 pairs no longer reachable.',
      '`display_list(x)`: no pair changed.',
    ]);
    expect([...(frames[2]?.changed ?? [])]).toHaveLength(1);
  });

  it('skips function declarations', () => {
    const frames = boxPointerFrames(heapTraceOf(mutableSharingProgram).heap);
    expect(frames.some((f) => f.snapshot.node?.kind === 'function')).toBe(false);
    expect(frames.map((f) => f.snapshot.node?.text)).toContain('set_to_wow(z1)');
  });
});

describe('box-and-pointer scene', () => {
  it('draws the pairs of the first keyframe with its transport', () => {
    render(<BoxPointerScene trace={heapTraceOf(mutableSetHeadProgram)} />);
    expect(screen.getByRole('region', { name: 'Box-and-pointer diagram' })).toBeInTheDocument();
    expect(screen.getByTestId('keyframe-counter')).toHaveTextContent('1 / 4');
    expect(screen.getAllByTestId('pair')).toHaveLength(5);
    expect(screen.getAllByTestId('pair-name').map((n) => n.textContent)).toEqual(['x']);
    expect(screen.getByTestId('caption')).toHaveTextContent('5 new pairs');
  });

  it('follows a stepper and lights the changed cell', () => {
    const trace = heapTraceOf(mutableSetHeadProgram);
    render(<BoxPointerScene trace={trace} stepIndex={trace.records.length} />);
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByTestId('caption')).toHaveTextContent('display_list(x)');
    expect(screen.getAllByTestId('pair')).toHaveLength(5);
  });

  it('shows null as a slash and atoms in their cells', () => {
    const { container } = render(<BoxPointerScene trace={heapTraceOf('const x = list(1);')} />);
    expect(container.querySelector('[data-testid="head"]')).toHaveTextContent('1');
    expect(container.querySelector('[data-testid="tail"]')?.getAttribute('data-kind')).toBe('null');
  });

  it('handles a program with no pairs, and one that fails', () => {
    render(<BoxPointerScene trace={heapTraceOf('function f(x) { return x; }')} />);
    expect(screen.getByText('No pairs to draw')).toBeInTheDocument();
    const failing = heapTraceOf('const x = list(1);\nhead(null);');
    render(<BoxPointerScene trace={failing} title="Failing" stepIndex={failing.records.length} />);
    expect(screen.getAllByTestId('caption').at(-1)).toHaveTextContent('Then the program stopped');
  });

  it('waits for its trace', () => {
    render(<BoxPointerScene trace={null} />);
    expect(screen.getByText('Tracing…')).toBeInTheDocument();
  });

  it('is registered as an animation kind', async () => {
    render(<Animation kind="box-pointer" source="const x = list(1);" />);
    expect(await screen.findByRole('region', { name: 'Box-and-pointer diagram' })).toBeInTheDocument();
  });

  it('draws a still diagram of what a program leaves behind', () => {
    render(<BoxPointerDiagram source={'const x = list("a", "b");\nconst z1 = pair(x, x);'} names={['z1']} />);
    expect(screen.getAllByTestId('pair')).toHaveLength(3);
    expect(screen.getAllByTestId('pair-name').map((n) => n.textContent)).toEqual(['z1']);
    render(<BoxPointerDiagram source="head(null);" title="Broken" />);
    expect(screen.getByText('The program did not run to its end.')).toBeInTheDocument();
  });
});

describe('box-and-pointer layout of a queue as it grows', () => {
  it('keeps the queue pair on top from the first insertion on', () => {
    const frames = boxPointerFrames(heapTraceOf(queueProgram).heap);
    for (const frame of frames.slice(1)) {
      const items = frame.layout.boxes.filter((box) => box.row === 1);
      expect(items.length).toBeGreaterThan(0);
    }
    // pair(x, x) of a list made on the spot hangs the list below, both arrows going down.
    const snapshot = finalHeap('const z1 = pair(list("a", "b"), null);\nset_tail(z1, head(z1));');
    if (snapshot === null) throw new Error('no heap');
    expect(layoutBoxPointer(snapshot).boxes.map((box) => box.row)).toEqual([0, 1, 1]);
  });
});
