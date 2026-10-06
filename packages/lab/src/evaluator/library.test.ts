import { describe, expect, it } from 'vitest';
import { evaluate } from './evaluate.ts';

const run = (source: string) => evaluate(source);
const value = (source: string): unknown => {
  const outcome = run(source);
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return outcome.value;
};
const shown = (source: string): string[] => run(source).output;

describe('the list library', () => {
  it('provides the Source §2 list functions', () => {
    expect(value('length(list(1, 2, 3));')).toBe(3);
    expect(shown('display_list(map(x => x * x, list(1, 2, 3)));')).toEqual(['list(1, 4, 9)']);
    expect(shown('display_list(build_list(i => i * 2, 4));')).toEqual(['list(0, 2, 4, 6)']);
    expect(shown('display_list(append(list(1, 2), list(3)));')).toEqual(['list(1, 2, 3)']);
    expect(shown('display_list(reverse(list(1, 2, 3)));')).toEqual(['list(3, 2, 1)']);
    expect(shown('display_list(member(2, list(1, 2, 3)));')).toEqual(['list(2, 3)']);
    expect(shown('display_list(remove(2, list(2, 1, 2)));')).toEqual(['list(1, 2)']);
    expect(shown('display_list(remove_all(2, list(2, 1, 2)));')).toEqual(['list(1)']);
    expect(shown('display_list(filter(x => x % 2 === 0, enum_list(1, 6)));')).toEqual(['list(2, 4, 6)']);
    expect(value('list_ref(list("a", "b", "c"), 2);')).toBe('c');
    expect(value('accumulate((x, y) => x + y, 0, list(1, 2, 3, 4));')).toBe(10);
    expect(value('equal(list(1, list(2, "x")), list(1, list(2, "x")));')).toBe(true);
    expect(value('equal(list(1, 2), list(1, 3));')).toBe(false);
    expect(shown('for_each(display, list(1, 2));')).toEqual(['1', '2']);
  });

  it('lets a program shadow a library name', () => {
    expect(value('function length(xs) { return 42; } length(list(1));')).toBe(42);
  });

  it('keeps its frames out of the program frame ids', () => {
    expect(value('const f = x => x; stringify(f);')).toBe('fn[E0]');
  });
});

describe('list notation and mutation', () => {
  it('prints lists, pairs and nested lists', () => {
    expect(value('list_to_string(list(1, list("a", null), pair(2, 3)));')).toBe('list(1, list("a", null), [2, 3])');
    expect(value('list_to_string(pair(1, pair(2, 3)));')).toBe('[1, [2, 3]]');
    expect(value('list_to_string(null);')).toBe('null');
  });

  it('changes pairs in place with set_head and set_tail', () => {
    expect(shown('const x = list(1, 2); set_head(x, 9); set_tail(tail(x), list(3)); display_list(x);')).toEqual([
      'list(9, 2, 3)',
    ]);
  });

  it('prints a circular list without looping', () => {
    expect(value('const x = list(1, 2); set_tail(tail(x), x); list_to_string(x);')).toBe('[1, [2, ...]]');
  });

  it('computes atan2', () => {
    expect(value('math_atan2(1, 1);')).toBeCloseTo(Math.PI / 4, 12);
  });
});

describe('the stream library', () => {
  it('provides Source §3 streams with unmemoized tails', () => {
    expect(shown('display_list(eval_stream(stream_map(x => x * x, integers_from(1)), 4));')).toEqual(['list(1, 4, 9, 16)']);
    expect(value('stream_ref(stream_filter(x => x % 7 === 0, integers_from(1)), 2);')).toBe(21);
    expect(shown('display_list(stream_to_list(enum_stream(1, 3)));')).toEqual(['list(1, 2, 3)']);
    expect(value('is_stream(list_to_stream(list(1, 2)));')).toBe(true);
    expect(value('stream_length(stream_append(enum_stream(1, 2), build_stream(i => i, 3)));')).toBe(5);
  });
});
