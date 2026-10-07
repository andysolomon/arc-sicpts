import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import {
  delayedPrimeProgram,
  doubleStreamProgram,
  fibgenProgram,
  implicitFibsProgram,
  implicitIntegersProgram,
  memoizedStreamProgram,
  noSevensProgram,
  primesFromPrimesProgram,
  secondPrimeListProgram,
  sieveProgram,
  streamMap2Definition,
  streamMemoDefinition,
  streamOperationsProgram,
  sumPrimesProgram,
} from './streams.ts';

const run = (source: string, budget = 1_000_000) => {
  const outcome = evaluate(source, { budget });
  if (outcome.status !== 'done') throw new Error(`${outcome.status}`);
  return outcome;
};

describe('section 3.5.1: streams are delayed lists', () => {
  it('sums the primes between 10 and 100 both ways', () => {
    expect(run(sumPrimesProgram)).toMatchObject({ value: 1043, output: ['1043'] });
  });

  it('with lists, tests every number of the interval to find the second prime', () => {
    expect(run(secondPrimeListProgram, 2_000_000)).toMatchObject({ value: 1001, output: ['10009'] });
    // The interval of the book, up to a million, does not fit in the default budget at all.
    expect(evaluate(secondPrimeListProgram.replace('11000', '1000000')).status).toBe('budget-exhausted');
  });

  it('declares the stream operations and uses them', () => {
    expect(run(streamOperationsProgram)).toMatchObject({ value: 25, output: ['1', '4', '9', '16', '25', '36'] });
  });

  it('with streams, makes only the elements up to the second prime', () => {
    const outcome = run(delayedPrimeProgram, 100_000);
    expect(outcome.value).toBe(10009);
    expect(outcome.output).toEqual(['10000', '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10008', '10009']);
  });

  it('memoized tails compute each element once', () => {
    expect(run(memoizedStreamProgram).output).toEqual([
      '"stream_map"', '1', '4', '9', '16', '25', '4', '9', '16', '25',
      '"stream_map_optimized"', '1', '4', '9', '16', '25',
    ]);
  });

  it('memo runs its function once', () => {
    const outcome = run(`${streamMemoDefinition}
let runs = 0;
const once = memo(() => { runs = runs + 1; return 42; });
once() + once() + once() + runs;`);
    expect(outcome.value).toBe(127);
  });
});

describe('section 3.5.2: infinite streams', () => {
  it('finds the 100th integer not divisible by 7, and the 50th Fibonacci number', () => {
    expect(run(noSevensProgram).value).toBe(117);
    expect(run(fibgenProgram)).toMatchObject({
      value: 12586269025,
      output: ['list(0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377)'],
    });
  });

  it('sieves out the 51st prime', () => {
    expect(run(sieveProgram).value).toBe(233);
  });

  it('defines integers, powers of two and primes implicitly', () => {
    expect(run(implicitIntegersProgram)).toMatchObject({ value: 31, output: ['list(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)'] });
    expect(run(doubleStreamProgram)).toMatchObject({ value: 2 ** 50, output: ['list(1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024)'] });
    expect(run(primesFromPrimesProgram).value).toBe(233);
  });

  it('unmemoized implicit fibs repeat additions: F(n + 3) - n - 2 of them for the nth number', () => {
    const outcome = run(implicitFibsProgram);
    expect(outcome.value).toBe(21);
    // n = 8: F(11) - 10 = 79 additions, though only 7 different sums.
    expect(outcome.output).toHaveLength(79);
    expect(new Set(outcome.output)).toEqual(new Set(['1', '2', '3', '5', '8', '13', '21']));
  });

  it('memoized fibs need n - 1 additions', () => {
    const count = (memoized: boolean, n: number): unknown =>
      run(`${streamMemoDefinition}${streamMap2Definition}
let adds = 0;
function stream_map_2_optimized(f, s1, s2) {
  return is_null(s1) || is_null(s2)
    ? null
    : pair(f(head(s1), head(s2)), memo(() => stream_map_2_optimized(f, stream_tail(s1), stream_tail(s2))));
}
function add_streams(s1, s2) {
  return ${memoized ? 'stream_map_2_optimized' : 'stream_map_2'}((x, y) => { adds = adds + 1; return x + y; }, s1, s2);
}
const fibs = pair(0, ${memoized ? 'memo(' : ''}() => pair(1, ${memoized ? 'memo(' : ''}() => add_streams(stream_tail(fibs), fibs))${memoized ? ')' : ''})${memoized ? ')' : ''};
stream_ref(fibs, ${n});
adds;`).value;
    expect([2, 10, 20].map((n) => count(true, n))).toEqual([1, 9, 19]);
    expect([2, 5, 10, 12].map((n) => count(false, n))).toEqual([1, 14, 221, 596]);
  });
});
