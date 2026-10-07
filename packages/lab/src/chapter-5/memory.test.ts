import { describe, expect, it } from 'vitest';
import { collectGarbage, memoryImage, type MemoryImage } from './memory.ts';

const image = (source: string, start = 0): MemoryImage => {
  const { image, error } = memoryImage(source, { start });
  if (image === null) throw new Error(error ?? 'no image');
  return image;
};

describe('section 5.3.1: memory as vectors', () => {
  it('lays out exercise 5.19 as the book’s representation would', () => {
    const memory = image('const x = pair(1, 2);\nconst y = list(x, x);', 1);
    expect(memory.heads.slice(1)).toEqual(['n1', 'p1', 'p1']);
    expect(memory.tails.slice(1)).toEqual(['n2', 'e0', 'p2']);
    expect(memory.free).toBe(4);
    expect(memory.names).toEqual([
      { name: 'x', pointer: 'p1' },
      { name: 'y', pointer: 'p3' },
    ]);
  });
});

describe('section 5.3.2: stop-and-copy garbage collection', () => {
  const source = `let xs = list(1, 2, 3);
const shared = pair(4, 5);
xs = list(shared, shared);`;

  it('keeps only what the names reach, with sharing preserved', () => {
    const { before, after, steps } = collectGarbage(image(source));
    // Three garbage pairs, three live ones, and the two pairs of the root list.
    expect(before.free).toBe(8);
    expect(after.free).toBe(5);
    expect(after.names.map((n) => n.name)).toEqual(['xs', 'shared']);
    const cell = (pointer: string) => Number(pointer.slice(1));
    const xs = cell(after.names[0]?.pointer ?? '');
    const shared = after.names[1]?.pointer;
    expect(after.heads[xs]).toBe(shared);
    expect(after.heads[cell(after.tails[xs] ?? '')]).toBe(shared);
    expect(after.heads[cell(shared ?? '')]).toBe('n4');
    expect(steps.at(-1)?.flipped).toBe(true);
    expect(steps.some((step) => step.heads.includes('broken_heart'))).toBe(true);
  });
});
