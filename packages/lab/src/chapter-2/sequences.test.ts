import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { listToString, stringify } from '../evaluator/values.ts';
import {
  appendProgram,
  closurePropertyProgram,
  countLeavesDefinition,
  countLeavesProgram,
  hierarchyProgram,
  listRefProgram,
  louisQueensDefinition,
  mapProgram,
  mixAndMatchProgram,
  oneThroughFourProgram,
  permutationsProgram,
  primeSumPairsProgram,
  queensBoardDefinitions,
  queensDefinition,
  scaleTreeMapProgram,
  scaleTreeProgram,
  sequenceOperationDefinitions,
  signalFlowProgram,
  sumOddSquaresProgram,
} from './sequences.ts';

const run = (source: string, budget = 1_000_000) => {
  const outcome = evaluate(source, { budget });
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return outcome;
};

const value = (source: string, budget?: number): unknown => run(source, budget).value;

/** The value of a program in list notation, as `display_list` prints it. */
const notation = (source: string): string => listToString(run(source).value as never);

/** How many times evaluating `source` applies the compound function `fn`. */
const calls = (source: string, fn: string, budget = 1_000_000): number => {
  let count = 0;
  const outcome = evaluate(source, { budget, hooks: [{ onCall: (info) => void (info.name === fn && count++) }] });
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return count;
};

const pairsIn = (v: unknown): number => (Array.isArray(v) ? 1 + pairsIn(v[0]) + pairsIn(v[1]) : 0);

describe('section 2.2.1: representing sequences', () => {
  it('glues pairs of pairs, the closure property', () => {
    expect(stringify(value(closurePropertyProgram) as never)).toBe('[[[1, 2], [3, 4]], [[1, [2, 3]], 4]]');
    expect(pairsIn(value(closurePropertyProgram))).toBe(7);
  });

  it('builds list(1, 2, 3, 4) as nested pairs and prints it both ways', () => {
    expect(run(oneThroughFourProgram)).toMatchObject({
      value: true,
      output: ['[1, [2, [3, [4, null]]]]', '1', 'list(2, 3, 4)', '2', 'list(10, 1, 2, 3, 4)'],
    });
    expect(value(`${oneThroughFourProgram} tail(ten_through_four) === one_through_four;`)).toBe(true);
  });

  it('walks down lists with list_ref and length', () => {
    expect(run(listRefProgram)).toMatchObject({ value: 4, output: ['16'] });
    expect(calls(listRefProgram, 'list_ref')).toBe(4);
    expect(calls(listRefProgram, 'length')).toBe(5);
  });

  it('appends by copying the first list and sharing the second', () => {
    expect(notation(appendProgram)).toBe('list(1, 3, 5, 7, 1, 4, 9, 16, 25)');
    expect(notation(`${appendProgram} squares_then_odds;`)).toBe('list(1, 4, 9, 16, 25, 1, 3, 5, 7)');
    expect(pairsIn(value(`${appendProgram} squares_then_odds;`))).toBe(9);
    expect(value(`${appendProgram} tail(tail(tail(tail(tail(squares_then_odds))))) === odds;`)).toBe(true);
    expect(value(`${appendProgram} tail(tail(tail(tail(squares_then_odds)))) === tail(tail(tail(tail(squares))));`)).toBe(false);
  });

  it('scales and maps lists', () => {
    expect(notation(mapProgram)).toBe('list(1, 4, 9, 16)');
    expect(notation(`${mapProgram} scaled;`)).toBe('list(10, 20, 30, 40, 50)');
    expect(notation(`${mapProgram} absolutes;`)).toBe('list(10, 2.5, 11.6, 17)');
  });
});

describe('section 2.2.2: hierarchical structures', () => {
  it('a list of three items, the first a list', () => {
    expect(run(hierarchyProgram)).toMatchObject({ value: 2, output: ['3'] });
    expect(notation(`${hierarchyProgram} x;`)).toBe('list(list(1, 2), 3, 4)');
    expect(pairsIn(value(`${hierarchyProgram} x;`))).toBe(5);
  });

  it('counts leaves, one call per pair, leaf and empty list', () => {
    expect(value(countLeavesProgram)).toBe(4);
    expect(value(`${countLeavesProgram} count_leaves(list(x, x));`)).toBe(8);
    expect(value(`${countLeavesProgram} length(list(x, x));`)).toBe(2);
    expect(calls(countLeavesProgram, 'count_leaves')).toBe(11);
  });

  it('scales a tree both ways', () => {
    expect(notation(scaleTreeProgram)).toBe('list(10, list(20, list(30, 40), 50), list(60, 70))');
    expect(pairsIn(value(scaleTreeProgram))).toBe(10);
    expect(calls(scaleTreeProgram, 'scale_tree')).toBe(21);
    expect(notation(scaleTreeMapProgram)).toBe('list(10, list(20, 30), 40)');
    expect(calls(scaleTreeMapProgram, 'scale_tree')).toBe(2);
    const mapVersion = scaleTreeMapProgram.replace('scale_tree(list(1, list(2, 3), 4), 10);', '');
    expect(listToString(value(`${mapVersion} scale_tree(list(1, list(2, list(3, 4), 5), list(6, 7)), 10);`) as never)).toBe(
      'list(10, list(20, list(30, 40), 50), list(60, 70))',
    );
  });

  it('prints list(1, list(2, list(3, 4))) as in Exercise 2.24', () => {
    expect(stringify(value('list(1, list(2, list(3, 4)));') as never)).toBe('[1, [[2, [[3, [4, null]], null]], null]]');
  });

  it('Louis’s swapped pair in Exercise 2.22 is not a list', () => {
    const louis = `function square_list(items) {
      function iter(things, answer) {
        return is_null(things) ? answer : iter(tail(things), pair(answer, head(things) * head(things)));
      }
      return iter(items, null);
    }
    square_list(list(1, 2, 3));`;
    expect(stringify(value(louis) as never)).toBe('[[[null, 1], 4], 9]');
  });
});

describe('section 2.2.3: sequences as conventional interfaces', () => {
  it('sum_odd_squares, as a tree recursion and as a signal flow', () => {
    expect(value(sumOddSquaresProgram)).toBe(35);
    expect(value(signalFlowProgram)).toBe(35);
    expect(notation(`${signalFlowProgram} leaves;`)).toBe('list(1, 2, 3, 4, 5)');
    expect(notation(`${signalFlowProgram} odd_leaves;`)).toBe('list(1, 3, 5)');
    expect(notation(`${signalFlowProgram} odd_squares;`)).toBe('list(1, 9, 25)');
  });

  it('accumulates with plus, times and pair', () => {
    const defs = sequenceOperationDefinitions;
    expect(value(`${defs} accumulate(plus, 0, list(1, 2, 3, 4, 5));`)).toBe(15);
    expect(value(`${defs} accumulate(times, 1, list(1, 2, 3, 4, 5));`)).toBe(120);
    expect(notation(`${defs} accumulate(pair, null, list(1, 2, 3, 4, 5));`)).toBe('list(1, 2, 3, 4, 5)');
    expect(notation(`${defs} enumerate_interval(2, 7);`)).toBe('list(2, 3, 4, 5, 6, 7)');
  });

  it('mixes and matches the same components', () => {
    expect(run(mixAndMatchProgram)).toMatchObject({ output: ['225'] });
    expect(notation(mixAndMatchProgram)).toBe('list(0, 1, 1, 4, 9, 25, 64, 169, 441, 1156, 3025)');
    expect(notation(`${mixAndMatchProgram} evens;`)).toBe('list(0, 2, 8, 34, 144)');
  });

  it('finds the prime-sum pairs by nested mapping', () => {
    expect(notation(primeSumPairsProgram)).toBe(
      'list(list(2, 1, 3), list(3, 2, 5), list(4, 1, 5), list(4, 3, 7), list(5, 2, 7), list(6, 1, 7), list(6, 5, 11))',
    );
    expect(notation(`${primeSumPairsProgram} all_pairs;`)).toBe(
      'list(list(2, 1), list(3, 1), list(3, 2), list(4, 1), list(4, 2), list(4, 3))',
    );
  });

  it('generates permutations', () => {
    expect(notation(permutationsProgram)).toBe(
      'list(list(1, 2, 3), list(1, 3, 2), list(2, 1, 3), list(2, 3, 1), list(3, 1, 2), list(3, 2, 1))',
    );
    expect(pairsIn(value(permutationsProgram))).toBe(24);
  });

  it('solves the eight-queens puzzle, trying 15 720 positions', () => {
    const queens = `${queensBoardDefinitions}${queensDefinition}`;
    expect(value(`${queens} length(queens(4)) * 100 + length(queens(5)) * 10 + length(queens(6));`)).toBe(304);
    expect(value(`${queens} length(queens(8));`, 10_000_000)).toBe(92);
    expect(calls(`${queens} queens(8);`, 'adjoin_position', 10_000_000)).toBe(15720);
    expect(calls(`${queens} queens(8);`, 'queen_cols', 10_000_000)).toBe(9);
  }, 30_000);

  it('Louis’s queens applies queen_cols (nⁿ⁺¹ − 1) / (n − 1) times and runs 3.6, 11, 37 and 136 times slower', () => {
    const both = `${queensBoardDefinitions}${queensDefinition}${louisQueensDefinition}`;
    const base = run(`${both} 0;`).steps;
    const steps = (call: string): number => run(`${both} ${call};`, 100_000_000).steps - base;
    for (const n of [3, 4, 5]) {
      expect(calls(`${both} louis_queens(${n});`, 'queen_cols', 10_000_000)).toBe((n ** (n + 1) - 1) / (n - 1));
      expect(value(`${both} length(louis_queens(${n})) === length(queens(${n}));`, 10_000_000)).toBe(true);
    }
    const ratios = [3, 4, 5, 6].map((n) => steps(`louis_queens(${n})`) / steps(`queens(${n})`));
    expect(Math.round(ratios[0]! * 10) / 10).toBe(3.6);
    expect(ratios.slice(1).map(Math.round)).toEqual([11, 37, 136]);
    // The positions tried follow the count Σ n^(n−k) · n · |Q(k − 1)|: for n = 5, 8 160 against 220.
    expect(calls(`${both} louis_queens(5);`, 'adjoin_position', 10_000_000)).toBe(8160);
    expect(calls(`${both} queens(5);`, 'adjoin_position')).toBe(220);
  }, 60_000);

  it('count_leaves as an accumulation agrees with the recursion', () => {
    const acc = `${sequenceOperationDefinitions}
      function count_leaves(t) { return accumulate(plus, 0, map(sub => is_pair(sub) ? count_leaves(sub) : 1, t)); }
      count_leaves(list(1, list(2, list(3, 4)), 5));`;
    expect(value(acc)).toBe(5);
    expect(value(`${countLeavesDefinition} count_leaves(list(1, list(2, list(3, 4)), 5));`)).toBe(5);
  });
});
