import { describe, expect, it } from 'vitest';
import { prepare, type Session } from '../evaluator/evaluate.ts';
import { createLabHost } from '../worker/host.ts';
import type { LabEvent } from '../worker/protocol.ts';
import { createHeapInspector, heapGraph, type HeapSnapshot } from './heap.ts';

function snapshotsOf(source: string, options: { maxPairs?: number; maxSnapshots?: number } = {}): HeapSnapshot[] {
  let session: Session | null = null;
  const inspector = createHeapInspector(source, () => session?.machine.programEnv ?? null, options);
  session = prepare(source, { hooks: [inspector.hooks] });
  session.machine.run();
  inspector.finish();
  return inspector.snapshots;
}

describe('heap inspector', () => {
  it('snapshots the program frame after each top-level statement', () => {
    const snapshots = snapshotsOf('const x = list(1, 2);\nconst n = 3;\nset_head(x, n);\n');
    expect(snapshots.map((s) => [s.statement, s.node?.kind, s.node?.text])).toEqual([
      [0, 'const', 'const x = list(1, 2)'],
      [1, 'const', 'const n = 3'],
      [2, 'application', 'set_head(x, n)'],
    ]);
    // A declaration not yet evaluated is not a binding yet.
    expect(snapshots[0]?.bindings.map((b) => b.name)).toEqual(['x']);
    expect(snapshots[2]?.bindings).toEqual([
      { name: 'x', value: { kind: 'pair', id: 1 } },
      { name: 'n', value: { kind: 'atom', text: '3' } },
    ]);
    expect(snapshots[2]?.pairs).toEqual([
      { id: 1, head: { kind: 'atom', text: '3' }, tail: { kind: 'pair', id: 2 } },
      { id: 2, head: { kind: 'atom', text: '2' }, tail: { kind: 'null' } },
    ]);
  });

  it('keeps a pair’s id from one snapshot to the next', () => {
    const snapshots = snapshotsOf('const x = list("a");\nconst y = pair(0, x);\n');
    const x = snapshots[0]?.bindings[0]?.value;
    expect(snapshots[1]?.pairs.find((p) => p.tail.kind === 'pair')?.tail).toEqual(x);
  });

  it('lists a shared pair once and refers to it twice', () => {
    const [, z1] = snapshotsOf('const x = list("a", "b");\nconst z1 = pair(x, x);\n');
    const top = z1?.pairs.find((p) => z1.bindings[1]?.value.kind === 'pair' && p.id === z1.bindings[1].value.id);
    expect(z1?.pairs).toHaveLength(3);
    expect(top?.head).toEqual(top?.tail);
  });

  it('follows a cycle without looping', () => {
    const [snapshot] = snapshotsOf('const x = list(1, 2, 3);\nset_tail(tail(tail(x)), x);\n').slice(-1);
    expect(snapshot?.pairs).toHaveLength(3);
    expect(snapshot?.pairs.at(-1)?.tail).toEqual(snapshot?.bindings[0]?.value);
  });

  it('describes functions and leaves their environments alone', () => {
    const [snapshot] = snapshotsOf('function f(x) { return x; }\n');
    expect(snapshot?.bindings).toEqual([{ name: 'f', value: { kind: 'function', text: 'fn[E0]' } }]);
  });

  it('stops at its limits and says so', () => {
    const snapshots = snapshotsOf('const xs = enum_list(1, 50);\nconst a = 1;\nconst b = 2;\n', { maxPairs: 10, maxSnapshots: 2 });
    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]).toMatchObject({ truncated: true });
    expect(snapshots[0]?.pairs).toHaveLength(10);
  });

  it('walks a long list without recursion', () => {
    const session = prepare('const xs = enum_list(1, 5000);', { budget: 10_000_000 });
    session.machine.run();
    expect(heapGraph(session.machine.programEnv, undefined, 10_000).pairs).toHaveLength(5000);
  });
});

describe('heap inspection over the worker protocol', () => {
  const trace = (inspect?: { heap?: boolean }): Extract<LabEvent, { type: 'trace-done' }> => {
    const events: LabEvent[] = [];
    const host = createLabHost({ post: (event) => events.push(event) });
    host.handle({ type: 'trace', id: 1, source: 'const x = list(1);\nset_tail(x, x);\n', ...(inspect !== undefined && { inspect }) });
    const done = events.find((e): e is Extract<LabEvent, { type: 'trace-done' }> => e.type === 'trace-done');
    if (done === undefined) throw new Error('no trace');
    return done;
  };

  it('returns heap snapshots, lined up with the step log, only when asked', () => {
    expect(trace()).not.toHaveProperty('heap');
    const done = trace({ heap: true });
    expect(done.heap?.map((s) => s.statement)).toEqual([0, 1]);
    expect(done.heap?.[1]?.records).toBe(done.records.length);
    expect(done.heap?.[0]?.records).toBeLessThan(done.records.length);
    // Survives structured cloning: plain JSON with the cycle expressed by ids.
    expect(JSON.parse(JSON.stringify(done.heap))).toEqual(done.heap);
    expect(done.heap?.[1]?.pairs).toEqual([{ id: 1, head: { kind: 'atom', text: '1' }, tail: { kind: 'pair', id: 1 } }]);
  });

  it('returns no snapshots for a program that does not parse', () => {
    const events: LabEvent[] = [];
    createLabHost({ post: (event) => events.push(event) }).handle({ type: 'trace', id: 2, source: 'const = ;', inspect: { heap: true } });
    expect(events.find((e) => e.type === 'trace-done')).toMatchObject({ heap: [], outcome: { status: 'error' } });
  });
});
