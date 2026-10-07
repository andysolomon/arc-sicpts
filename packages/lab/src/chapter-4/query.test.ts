import { describe, expect, it } from 'vitest';
import { evaluate, type Outcome } from '../evaluator/evaluate.ts';
import { createCallLogTracer } from '../inspect/callLog.ts';
import {
  andQueryProgram,
  andSeriesProgram,
  appendToFormProgram,
  assertRuleProgram,
  clauseOrderProgram,
  closedWorldProgram,
  dependsOnProgram,
  driverStepsProgram,
  livesNearProgram,
  marriedProgram,
  notOrderProgram,
  notQueryProgram,
  pairPatternProgram,
  patternMatchProgram,
  predicateQueryProgram,
  queryPrelude,
  ruleApplicationProgram,
  simpleQueryProgram,
  unifyProgram,
} from './query.ts';

const run = (program: string, budget = 5_000_000, prelude = queryPrelude): Outcome => evaluate(program, { budget, prelude });

/** The lines displayed and the value of a program that must finish. */
function done(program: string): { output: string[]; value: unknown } {
  const outcome = run(program);
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return { output: outcome.output, value: outcome.value };
}

const answers = (query: string): string[] => done(`query('${query}');`).output;

/** How many times `check_an_assertion` runs for a program. */
function matchesTried(program: string): number {
  const log = createCallLogTracer(['check_an_assertion'], { maxCalls: 100_000 });
  evaluate(program, { budget: 5_000_000, prelude: queryPrelude, hooks: [log.hooks] });
  return log.calls.length;
}

describe('section 4.4.1: deductive information retrieval', () => {
  it('finds the computer programmers, and says how many', () => {
    expect(done(simpleQueryProgram)).toEqual({
      output: [`"job(list('Hacker', 'Alyssa', 'P'), list('computer', 'programmer'))"`, `"job(list('Fect', 'Cy', 'D'), list('computer', 'programmer'))"`],
      value: 2,
    });
  });

  it('matches lists of any length with pair, and of two elements with list', () => {
    expect(done(pairPatternProgram).output).toHaveLength(5);
    expect(done(pairPatternProgram).output[4]).toBe(`"job(list('Reasoner', 'Louis'), list('computer', 'programmer', 'trainee'))"`);
    expect(answers('job($x, list("computer", $type))')).toHaveLength(4);
    expect(answers('supervisor($x, $x)')).toEqual([]);
    expect(answers('address($x, $y)')).toHaveLength(9);
  });

  it('combines queries with and, or, not and javascript_predicate', () => {
    expect(done(andQueryProgram).output).toEqual([
      `"and(job(list('Hacker', 'Alyssa', 'P'), list('computer', 'programmer')), address(list('Hacker', 'Alyssa', 'P'), list('Cambridge', list('Mass', 'Ave'), 78)))"`,
      `"and(job(list('Fect', 'Cy', 'D'), list('computer', 'programmer')), address(list('Fect', 'Cy', 'D'), list('Cambridge', list('Ames', 'Street'), 3)))"`,
    ]);
    expect(answers('or(supervisor($x, list("Bitdiddle", "Ben")), supervisor($x, list("Hacker", "Alyssa", "P")))')).toHaveLength(4);
    expect(done(notQueryProgram).output).toEqual([
      `"and(supervisor(list('Tweakit', 'Lem', 'E'), list('Bitdiddle', 'Ben')), not(job(list('Tweakit', 'Lem', 'E'), list('computer', 'programmer'))))"`,
    ]);
    expect(done(predicateQueryProgram).output).toEqual([
      `"and(salary(list('Bitdiddle', 'Ben'), 122000), javascript_predicate((122000 > 100000)))"`,
      `"and(salary(list('Warbucks', 'Oliver'), 314159), javascript_predicate((314159 > 100000)))"`,
      `"and(salary(list('Scrooge', 'Eben'), 141421), javascript_predicate((141421 > 100000)))"`,
    ]);
  });

  it('deduces answers from rules', () => {
    expect(done(livesNearProgram).output).toEqual([
      `"lives_near(list('Reasoner', 'Louis'), list('Bitdiddle', 'Ben'))"`,
      `"lives_near(list('Aull', 'DeWitt'), list('Bitdiddle', 'Ben'))"`,
    ]);
    expect(answers('and(job($x, list("computer", "programmer")), lives_near($x, list("Bitdiddle", "Ben")))')).toEqual([]);
    expect(answers('outranked_by(list("Reasoner", "Louis"), $who)')).toEqual([
      `"outranked_by(list('Reasoner', 'Louis'), list('Hacker', 'Alyssa', 'P'))"`,
      `"outranked_by(list('Reasoner', 'Louis'), list('Bitdiddle', 'Ben'))"`,
      `"outranked_by(list('Reasoner', 'Louis'), list('Warbucks', 'Oliver'))"`,
    ]);
  });

  it('adds a rule with assert and uses it', () => {
    expect(done(assertRuleProgram)).toEqual({
      output: [
        '"Assertion added to data base."',
        `"big_earner(list('Bitdiddle', 'Ben'))"`,
        `"big_earner(list('Warbucks', 'Oliver'))"`,
        `"big_earner(list('Scrooge', 'Eben'))"`,
      ],
      value: 3,
    });
  });

  it('runs append_to_form in every direction', () => {
    expect(answers('append_to_form(list("a", "b"), list("c", "d"), $z)')).toEqual([
      `"append_to_form(list('a', 'b'), list('c', 'd'), list('a', 'b', 'c', 'd'))"`,
    ]);
    expect(answers('append_to_form(list("a", "b"), $y, list("a", "b", "c", "d"))')).toEqual([
      `"append_to_form(list('a', 'b'), list('c', 'd'), list('a', 'b', 'c', 'd'))"`,
    ]);
    expect(done(appendToFormProgram).output).toEqual([
      `"append_to_form(null, list('a', 'b', 'c', 'd'), list('a', 'b', 'c', 'd'))"`,
      `"append_to_form(list('a'), list('b', 'c', 'd'), list('a', 'b', 'c', 'd'))"`,
      `"append_to_form(list('a', 'b'), list('c', 'd'), list('a', 'b', 'c', 'd'))"`,
      `"append_to_form(list('a', 'b', 'c'), list('d'), list('a', 'b', 'c', 'd'))"`,
      `"append_to_form(list('a', 'b', 'c', 'd'), null, list('a', 'b', 'c', 'd'))"`,
    ]);
  });

  it('lists Oliver Warbucks four times as a wheel', () => {
    const wheels = answers('wheel($who)');
    expect(wheels).toHaveLength(5);
    expect(wheels.filter((w) => w.includes('Warbucks'))).toHaveLength(4);
  });
});

describe('section 4.4.2: how the query system works', () => {
  it('matches patterns against data in a frame', () => {
    expect(done(patternMatchProgram)).toEqual({
      output: [`"$x = list('a', 'b')"`, `"$x = list('a', 'b'), $y = 'c', $z = list('a', 'b')"`, `"$x = 'a', $y = 'b'"`],
      value: 'failed',
    });
    const third = `pattern_match(pattern_of('list(list($x, $y), "c", list($x, $y))'), list(list("a", "b"), "c", list("a", "b")), list(pair(pattern_of('$y'), `;
    expect(done(`frame_text(${third}"a"))));`).value).toBe('failed');
    expect(done(`frame_text(${third}"b"))));`).value).toBe(`$y = 'b', $x = 'a'`);
  });

  it('extends the frames of the first conjunct of an and with the second', () => {
    expect(done(andSeriesProgram).output).toHaveLength(2);
    expect(done(andSeriesProgram).output[0]).toContain(`job(list('Hacker', 'Alyssa', 'P'), list('computer', 'programmer'))`);
  });

  it('unifies patterns with variables on both sides', () => {
    expect(done(unifyProgram)).toEqual({
      output: [
        `"$x = $y, $z = 'a', $y = 'a'"`,
        '"failed"',
        `"$x = list('b', $y), $z = 'a'"`,
        `"$x = list('a', $y, 'c'), $y = 'b', $z = 'c'"`,
      ],
      value: `list('a', 'b', 'c')`,
    });
  });

  it('renames a rule’s variables each time it is applied', () => {
    const log = createCallLogTracer(['unify_match'], { maxCalls: 10_000 });
    evaluate(ruleApplicationProgram, { budget: 5_000_000, prelude: queryPrelude, hooks: [log.hooks] });
    expect(log.calls.find((c) => c.parent === null || c.args[1]?.startsWith('["lives_near"'))?.args[1]).toMatch(/\$person_1_\d+/);
    expect(done(ruleApplicationProgram).output).toEqual([`"lives_near(list('Fect', 'Cy', 'D'), list('Hacker', 'Alyssa', 'P'))"`]);
  });
});

describe('section 4.4.3: is logic programming mathematical logic?', () => {
  it('scans the data base far less with the narrowing clause first', () => {
    const swapped = `query('and(supervisor($x, $y), job($x, list("computer", "programmer")))');`;
    expect(matchesTried(clauseOrderProgram)).toBe(25);
    expect(matchesTried(swapped)).toBe(80);
    expect(done(swapped).output.map((a) => a.includes('Hacker') || a.includes('Fect'))).toEqual([true, true]);
  });

  it('loops on the married rule, repeating its one answer', () => {
    const outcome = run(marriedProgram, 300_000);
    expect(outcome.status).toBe('budget-exhausted');
    expect(outcome.output.slice(0, 2)).toEqual(['"Assertion added to data base."', '"Assertion added to data base."']);
    expect(new Set(outcome.output.slice(2))).toEqual(new Set([`"married('Mickey', 'Minnie')"`]));
    expect(outcome.output.length).toBeGreaterThan(5);
    expect(answers('married("Mickey", $who)')).toEqual([]);
  });

  it('gives different answers when not comes first', () => {
    expect(done(notOrderProgram).output.slice(-2)).toEqual(['answers: 6', 'answers: 0']);
  });

  it('assumes a closed world', () => {
    expect(done(closedWorldProgram)).toEqual({ output: [`"not(baseball_fan(list('Bitdiddle', 'Ben')))"`], value: 1 });
  });
});

describe('section 4.4.4: implementing the query system', () => {
  it('goes from text to answer through the driver’s steps', () => {
    expect(done(driverStepsProgram)).toEqual({
      output: ['["job", [["name", ["$x", null]], [["computer", ["wizard", null]], null]]]', `"$x = list('Bitdiddle', 'Ben')"`],
      value: `job(list('Bitdiddle', 'Ben'), list('computer', 'wizard'))`,
    });
  });

  it('refuses to bind a variable to a pattern that contains it', () => {
    expect(done(dependsOnProgram).output).toEqual(['"failed"', 'true', '"$x = $y"']);
  });

  it('loads the data base and system within the prelude’s budget', () => {
    expect(evaluate(queryPrelude, { budget: 1_000_000 }).status).toBe('done');
  });
});
