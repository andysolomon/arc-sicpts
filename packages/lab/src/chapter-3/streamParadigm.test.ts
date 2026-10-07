import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import {
  paradigmAppendPairsProgram,
  paradigmDisplayStream,
  paradigmIntegralProgram,
  paradigmJointAccountProgram,
  paradigmMemoDefinition,
  paradigmMemoStreamMap,
  paradigmMonteCarloProgram,
  paradigmPairsDefinitions,
  paradigmPairsProgram,
  paradigmPiStreamProgram,
  paradigmPrimeSumPairsProgram,
  paradigmRandomStreamProgram,
  paradigmSolveDefinitions,
  paradigmSolveProgram,
  paradigmSolveUndelayedProgram,
  paradigmSqrtStreamProgram,
  paradigmWithdrawProgram,
} from './streamParadigm.ts';

const BIG = 2_000_000;

const run = (source: string, budget = BIG) => {
  const outcome = evaluate(source, { budget });
  if (outcome.status === 'error') throw new Error(outcome.error.message);
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return outcome;
};

/** The numbers printed after each `display("label")`, by label. */
const series = (output: readonly string[]): Record<string, number[]> => {
  const result: Record<string, number[]> = {};
  let label = '';
  for (const line of output) {
    if (line.startsWith('"')) {
      label = JSON.parse(line) as string;
      result[label] = [];
    } else {
      (result[label] ??= []).push(Number(line));
    }
  }
  return result;
};

describe('section 3.5.3: formulating iterations as stream processes', () => {
  it('prints the stream of guesses for the square root of 2 as the book does', () => {
    expect(run(paradigmSqrtStreamProgram).output.slice(0, 5)).toEqual([
      '1',
      '1.5',
      '1.4166666666666665',
      '1.4142156862745097',
      '1.4142135623746899',
    ]);
  });

  it('accelerates the π stream, and accelerates the acceleration', () => {
    const { output } = run(paradigmPiStreamProgram, 200_000);
    const s = series(output);
    expect(Object.keys(s)).toEqual(['pi_stream', 'euler', 'accelerated']);
    expect(s['pi_stream']?.[7]).toBe(3.017071817071818);
    expect(s['euler']?.[7]).toBe(3.1412548236077655);
    // Eight terms of the tableau give π to 13 decimal places and more.
    expect(s['accelerated']?.[7]).toBe(3.141592653589778);
    expect(Math.abs((s['accelerated']?.[7] ?? 0) - Math.PI)).toBeLessThan(5e-14);
  });

  it('memo runs its function once however often it is forced', () => {
    const source = `${paradigmMemoDefinition}
let runs = 0;
const once = memo(() => { runs = runs + 1; return runs; });
once(); once(); once();`;
    expect(run(source).value).toBe(1);
  });
});

describe('section 3.5.3: infinite streams of pairs', () => {
  it('interleaves the rows so that every pair turns up', () => {
    const { output } = run(paradigmPairsProgram);
    expect(output.slice(0, 8)).toEqual([
      'list(1, 1)',
      'list(1, 2)',
      'list(2, 2)',
      'list(1, 3)',
      'list(2, 3)',
      'list(1, 4)',
      'list(3, 3)',
      'list(1, 5)',
    ]);
    // All fifteen pairs with i ≤ j ≤ 5 are among the first 31, and (5, 5) is the last of them.
    expect(output).toHaveLength(31);
    expect(output[30]).toBe('list(5, 5)');
    for (let i = 1; i <= 5; i++) for (let j = i; j <= 5; j++) expect(output).toContain(`list(${i}, ${j})`);
  });

  it('places (i, j) after 2^i (j - i) + 2^(i-1) - 2 others, and (i, i) after 2^i - 2', () => {
    const position = (i: number, j: number) =>
      run(`${paradigmPairsDefinitions}
function position(s, n) {
  return head(head(s)) === ${i} && head(tail(head(s))) === ${j} ? n : position(stream_tail(s), n + 1);
}
position(pairs(integers, integers), 0);`).value;
    expect(position(1, 100)).toBe(197);
    expect(position(4, 4)).toBe(14);
    expect(position(3, 7)).toBe(2 ** 3 * 4 + 2 ** 2 - 2);
  });

  it('finds the pairs with a prime sum', () => {
    expect(run(paradigmPrimeSumPairsProgram).value).toEqual(run('list(list(1, 1), list(1, 2), list(2, 3), list(1, 4), list(1, 6), list(3, 4), list(2, 5), list(1, 10));').value);
  });

  it('never leaves the first row when the rows are appended', () => {
    const { output } = run(paradigmAppendPairsProgram);
    expect(output).toHaveLength(31);
    expect(output.every((line) => line.startsWith('list(1, '))).toBe(true);
  });
});

describe('section 3.5.3: streams as signals', () => {
  it('integrates t from 0 to 3 to within dt', () => {
    const { value, output } = run(paradigmIntegralProgram);
    expect(value).toBeCloseTo(4.485, 9);
    const s = series(output);
    expect(s['integral']).toHaveLength(13);
    expect(s['t² / 2']?.[12]).toBeCloseTo(4.5, 9);
  });
});

describe('section 3.5.4: streams and delayed evaluation', () => {
  it('cannot solve dy/dt = f(y) while integral wants its integrand at once', () => {
    expect(evaluate(paradigmSolveUndelayedProgram)).toMatchObject({
      status: 'error',
      error: { message: expect.stringContaining('Name dy used before its declaration') },
    });
  });

  it('solves dy/dt = y with a delayed integrand and finds e as the book does', () => {
    const { value, output } = run(paradigmSolveProgram);
    expect(value).toBe(2.716923932235896);
    const s = series(output);
    expect(s['solve']).toHaveLength(11);
    expect(s['e^t']).toHaveLength(11);
    s['solve']?.forEach((y, k) => expect(Math.abs(y - Math.exp(k / 10))).toBeLessThan(0.002));
  });

  it('memoizes the integral, so 1000 steps cost linear time', () => {
    const steps = (n: number) => run(`${paradigmSolveDefinitions} stream_ref(solve(y => y, 1, 0.001), ${n});`).steps;
    expect(steps(1000) / steps(500)).toBeLessThan(2.2);
  });
});

describe('section 3.5.5: modularity of functional programs and modularity of objects', () => {
  it('produces the same random numbers on every run, and Dirichlet outcomes from them', () => {
    const first = run(paradigmRandomStreamProgram);
    expect(first.output[0]).toMatch(/^list\(20220301, \d+, \d+, \d+, \d+\)$/);
    expect(run(paradigmRandomStreamProgram).output).toEqual(first.output);
  });

  it('estimates π from a stream of experiments, with no assignment anywhere', () => {
    const { value, output } = run(paradigmMonteCarloProgram);
    expect(Math.abs((value as number) - Math.PI)).toBeLessThan(0.05);
    expect(series(output)['estimate of π']).toHaveLength(100);
  });

  it('models a withdrawal processor as an object and as a function of streams, with the same balances', () => {
    const { output, value } = run(paradigmWithdrawProgram);
    expect(output).toEqual(['150', '50', '10']);
    expect(value).toEqual(run('list(200, 150, 50, 10);').value);
  });

  it('makes Peter wait for Paul when requests merely alternate', () => {
    expect(run(paradigmJointAccountProgram).value).toEqual(run('list(500, 490, 390, 370);').value);
  });

  it('shares the helpers it declares', () => {
    expect(run(`${paradigmMemoDefinition}${paradigmMemoStreamMap}${paradigmDisplayStream} display_stream(stream_map(x => x * x, integers_from(1)), 3);`).output).toEqual(['1', '4', '9']);
  });
});
