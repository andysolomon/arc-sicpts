import type { StepRecord } from '@sicp/lab';

/**
 * The sieve of §3.5.2 as a cascade of filters, rebuilt from the trace. Every
 * filter the sieve builds calls `is_divisible(x, p)`, so the calls, in order,
 * say which candidate met which filter and whether it was stopped there.
 * A candidate that no filter stops comes out of the last one as the next prime,
 * and the sieve grows a filter for it.
 */

export interface DivisibilityTest {
  candidate: number;
  divisor: number;
  divisible: boolean;
}

/** Each completed call of `fn(candidate, divisor)`, with what it returned. */
export function divisibilityTests(records: readonly StepRecord[], fn = 'is_divisible'): DivisibilityTest[] {
  const tests: DivisibilityTest[] = [];
  records.forEach((record, i) => {
    const { event } = record;
    if (event.kind !== 'call' || event.name !== fn || event.args.length !== 2) return;
    const candidate = Number(event.args[0]);
    const divisor = Number(event.args[1]);
    if (!Number.isFinite(candidate) || !Number.isFinite(divisor)) return;
    for (let j = i + 1; j < records.length; j++) {
      const later = records[j]?.event;
      if (later?.kind === 'return' && later.depth === event.depth) {
        if (later.value === 'true' || later.value === 'false') tests.push({ candidate, divisor, divisible: later.value === 'true' });
        return;
      }
    }
  });
  return tests;
}

export interface SieveCandidate {
  value: number;
  /** The filters it went through, in order. */
  passed: number[];
  /** The filter that stopped it, or null when it came out as a prime. */
  stoppedBy: number | null;
  /** How many filters the sieve had when the candidate entered it. */
  filters: number;
}

export interface Sieve {
  /** The divisor of every filter, in the order the sieve built them: the primes found. */
  filters: number[];
  candidates: SieveCandidate[];
}

/**
 * Group the tests by candidate. `complete` is false when the trace stopped
 * early, in which case the last candidate may be cut short and is dropped.
 */
export function sieveCascade(tests: readonly DivisibilityTest[], complete = true): Sieve {
  const filters: number[] = [];
  const candidates: SieveCandidate[] = [];
  const groups: DivisibilityTest[][] = [];
  for (const test of tests) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last[0]?.candidate === test.candidate && !last.some((t) => t.divisible)) last.push(test);
    else groups.push([test]);
  }
  if (!complete) groups.pop();
  for (const group of groups) {
    const first = group[0];
    if (first === undefined) continue;
    for (const test of group) if (!filters.includes(test.divisor)) filters.push(test.divisor);
    const stop = group.find((t) => t.divisible);
    const before = filters.length;
    if (stop === undefined && !filters.includes(first.candidate)) filters.push(first.candidate);
    candidates.push({
      value: first.candidate,
      passed: group.filter((t) => !t.divisible).map((t) => t.divisor),
      stoppedBy: stop?.divisor ?? null,
      filters: before,
    });
  }
  return { filters, candidates };
}

/** One sentence about candidate `k`. */
export function sieveCaption(sieve: Sieve, k: number): string {
  const c = sieve.candidates[k];
  if (c === undefined) return '';
  const list = (ps: readonly number[]): string =>
    ps.length <= 1 ? ps.join('') : `${ps.slice(0, -1).join(', ')} or ${ps[ps.length - 1]}`;
  if (c.stoppedBy !== null) {
    return c.passed.length === 0
      ? `${c.value} is a multiple of ${c.stoppedBy}: the first filter drops it.`
      : `${c.value} gets through the filter${c.passed.length > 1 ? 's' : ''} for ${list(c.passed)}, but it is a multiple of ${c.stoppedBy}: dropped.`;
  }
  return `${c.value} is not a multiple of ${list(c.passed)}: it comes out of the last filter as the next prime, and the sieve grows a filter for ${c.value}.`;
}
