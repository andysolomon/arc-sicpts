import { describe, expect, it } from 'vitest';
import { collectGarbage, memoryImage, type GcStep, type MemoryImage } from './memory.ts';
import { garbageCollectionProgram, memoryFigureProgram, memoryGarbageProgram, memoryStackProgram } from './section-5-3.ts';

/** What the pages of §5.3 say about the pairs their programs allocate and collect. */

const image = (source: string, start = 0): MemoryImage => {
  const { image, error } = memoryImage(source, { start });
  if (image === null) throw new Error(error ?? 'no image');
  return image;
};

/** How many times the collector entered a block, i.e. ran its first instruction. */
const entries = (steps: GcStep[], label: string): number =>
  steps.filter((step, i) => step.label === label && steps[i - 1]?.label !== label).length;

describe('section 5.3: how much a program allocates', () => {
  it('builds ten pairs to sum the odd numbers up to 6, and no name keeps any of them', () => {
    const memory = image(memoryGarbageProgram);
    expect(memory.free).toBe(10);
    // enum_list(0, 6) makes 7 pairs, filter 3 more.
    expect(memory.heads.slice(0, 7)).toEqual(['n6', 'n5', 'n4', 'n3', 'n2', 'n1', 'n0']);
    expect(memory.heads.slice(7)).toEqual(['n5', 'n3', 'n1']);
    expect(memory.names).toEqual([
      { name: 'is_odd', pointer: 'f' },
      { name: 'sum', pointer: 'n9' },
    ]);
  });
});

describe('section 5.3.1: memory as vectors', () => {
  it('lays out list(list(1, 2), 3, 4) in five pairs from p1, in the order list makes them', () => {
    const memory = image(memoryFigureProgram, 1);
    expect(memory.heads.slice(1)).toEqual(['n2', 'n1', 'n4', 'n3', 'p2']);
    expect(memory.tails.slice(1)).toEqual(['e0', 'p1', 'e0', 'p3', 'p4']);
    expect(memory.free).toBe(6);
    expect(memory.names).toEqual([{ name: 'x', pointer: 'p5' }]);
  });

  it('keeps a stack as a list: a restore leaves the popped pair behind', () => {
    const memory = image(memoryStackProgram);
    expect(memory.heads).toEqual(['n1', 'n2', 'n3']);
    expect(memory.tails).toEqual(['e0', 'p0', 'p0']);
    expect(memory.names[0]).toEqual({ name: 'the_stack', pointer: 'p2' });
    // Nothing points at p1, the pair that held 2.
    expect([...memory.heads, ...memory.tails, ...memory.names.map((n) => n.pointer)]).not.toContain('p1');
  });
});

describe('section 5.3.2: stop-and-copy', () => {
  it('copies three live pairs and the root list, and follows two broken hearts', () => {
    const { before, after, steps } = collectGarbage(image(garbageCollectionProgram));
    expect(before.free - before.names.length).toBe(6);
    expect(before.free).toBe(8);
    expect(after.free).toBe(5);
    expect(entries(steps, 'already_moved')).toBe(2);
    expect(after.names).toEqual([
      { name: 'xs', pointer: 'p1' },
      { name: 'shared', pointer: 'p3' },
    ]);
    expect(after.heads).toEqual(['p1', 'p3', 'p3', 'n4', 'p3']);
    expect(after.tails).toEqual(['p2', 'p4', 'e0', 'n5', 'e0']);
  });

  it('keeps nothing of the ten pairs of the summing program but the root list', () => {
    const { before, after } = collectGarbage(image(memoryGarbageProgram));
    expect(before.free).toBe(12);
    expect(after.free).toBe(2);
    expect(after.names).toEqual([
      { name: 'is_odd', pointer: 'f' },
      { name: 'sum', pointer: 'n9' },
    ]);
  });
});
