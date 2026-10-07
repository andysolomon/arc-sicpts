import { describe, expect, it } from 'vitest';
import { evaluate, prepare, type Outcome, type Session } from '../evaluator/evaluate.ts';
import { createHeapInspector, type HeapSnapshot } from '../inspect/heap.ts';
import {
  mutableAppendDefinitions,
  mutableAppendProgram,
  mutableFunctionalPairProgram,
  mutableGetNewPairProgram,
  mutableIdentityProgram,
  mutableSetHeadProgram,
  mutableSetTailProgram,
  mutableSharingProgram,
  queueBenProgram,
  queueDefinitions,
  queueProgram,
  table2DProgram,
  tableDefinitions,
  tableLocalProgram,
  tableProgram,
} from './mutableData.ts';

const done = (source: string): Extract<Outcome, { status: 'done' }> => {
  const outcome = evaluate(source);
  if (outcome.status !== 'done') {
    throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  }
  return outcome;
};

/** The heap after every top-level statement, as the box-and-pointer scene sees it. */
function heapOf(source: string): HeapSnapshot[] {
  let session: Session | null = null;
  const inspector = createHeapInspector(source, () => session?.machine.programEnv ?? null);
  session = prepare(source, { hooks: [inspector.hooks] });
  session.machine.run();
  inspector.finish();
  return inspector.snapshots;
}

const pairsNamed = (snapshot: HeapSnapshot | undefined, name: string): number => {
  const binding = snapshot?.bindings.find((b) => b.name === name);
  if (snapshot === undefined || binding?.value.kind !== 'pair') return 0;
  const seen = new Set<number>();
  const byId = new Map(snapshot.pairs.map((p) => [p.id, p]));
  const walk = (id: number): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const node = byId.get(id);
    if (node?.head.kind === 'pair') walk(node.head.id);
    if (node?.tail.kind === 'pair') walk(node.tail.id);
  };
  walk(binding.value.id);
  return seen.size;
};

describe('section 3.3.1: mutable list structure', () => {
  it('set_head replaces the head of x with y, leaving list("a", "b") unreachable', () => {
    expect(done(mutableSetHeadProgram).output).toEqual(['list(list("e", "f"), "c", "d")']);
    const after = heapOf(mutableSetHeadProgram);
    // Before set_head: x's five pairs and y's two. After: x reaches y's two and its own three spine pairs.
    expect(after.map((s) => s.pairs.length)).toEqual([5, 7, 5, 5]);
  });

  it('pair makes a new pair while set_tail changes an old one; z keeps "c" and "d" alive', () => {
    expect(done(mutableSetTailProgram).output).toEqual([
      'list(list("e", "f"), "c", "d")',
      'list(list("a", "b"), "e", "f")',
    ]);
  });

  it('pair can be built from get_new_pair, set_head and set_tail', () => {
    expect(done(mutableGetNewPairProgram).output).toEqual(['list(1, 2)']);
  });

  it('append copies its first argument and shares its second', () => {
    const outcome = done(mutableAppendProgram);
    expect(outcome.output).toEqual(['list("a", "b", "c", "d")']);
    expect(outcome.text).toBe('["b", null]');
    const last = heapOf(mutableAppendProgram).at(-1);
    // x: 2, y: 2, z: 2 copies + y's 2 shared, so 6 pairs in all.
    expect(last?.pairs).toHaveLength(6);
    expect(pairsNamed(last, 'z')).toBe(4);
    expect(done(`${mutableAppendDefinitions} const x = list("a", "b"); const w = append_mutator(x, list("c", "d")); list_to_string(tail(x));`).value).toBe(
      'list("b", "c", "d")',
    );
  });

  it('z1 shares one list where z2 has two; set_to_wow tells them apart', () => {
    expect(done(mutableSharingProgram).output).toEqual([
      'list(list("wow", "b"), "wow", "b")',
      'list(list("wow", "b"), "a", "b")',
    ]);
    const first = heapOf(mutableSharingProgram)[2];
    expect(pairsNamed(first, 'z1')).toBe(3);
    expect(pairsNamed(first, 'z2')).toBe(5);
  });

  it('=== on pairs is identity; equal compares contents', () => {
    expect(done(mutableIdentityProgram)).toMatchObject({ output: ['true', 'false'], value: true });
  });

  it('pairs made of functions mutate by assignment', () => {
    expect(done(mutableFunctionalPairProgram).value).toBe(3);
  });
});

describe('section 3.3.2: queues', () => {
  it('inserts at the rear and deletes at the front', () => {
    expect(done(queueProgram).value).toBe('b');
    const last = heapOf(queueProgram).at(-1);
    const q = last?.bindings.find((b) => b.name === 'q');
    // The queue pair, then b, c, d: "a" has been dropped from the front.
    expect(pairsNamed(last, 'q')).toBe(4);
    expect(q?.value.kind).toBe('pair');
  });

  it('prints as Ben saw it: the rear pointer still shows the last item', () => {
    expect(done(queueBenProgram).output).toEqual([
      'list(list("a"), "a")',
      'list(list("a", "b"), "b")',
      'list(list("b"), "b")',
      'list(null, "b")',
    ]);
  });

  it('reports an empty queue', () => {
    const outcome = evaluate(`${queueDefinitions} front_queue(make_queue());`);
    expect(outcome.status).toBe('error');
  });
});

describe('section 3.3.3: tables', () => {
  it('looks up, inserts, and replaces in a one-dimensional table', () => {
    expect(done(tableProgram).value).toBe(2);
    expect(done(`${tableProgram} lookup("a", table);`).value).toBe(10);
    expect(done(`${tableDefinitions} lookup("z", make_table());`).value).toBe(undefined);
    // The headed list: the head pair, three records on the spine, three record pairs.
    expect(pairsNamed(heapOf(tableProgram).at(-1), 'table')).toBe(7);
  });

  it('looks up by two keys in a table of subtables', () => {
    expect(done(table2DProgram).value).toBe(45);
    expect(done(`${table2DProgram} lookup("letters", "b", table);`).value).toBe(98);
    expect(done(`${table2DProgram} lookup("letters", "+", table);`).value).toBe(undefined);
  });

  it('keeps a table in the frame of make_table and reaches it through get and put', () => {
    expect(done(tableLocalProgram)).toMatchObject({ output: ['97', '43'], value: undefined });
  });
});
