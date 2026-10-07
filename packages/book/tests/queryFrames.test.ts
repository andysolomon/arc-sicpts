import {
  andQueryProgram,
  createCallLogTracer,
  evaluate,
  livesNearProgram,
  queryPrelude,
  simpleQueryProgram,
} from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { formatData, formatQuery, QUERY_WATCH, queryStepsOf, readFrame, ruleBodies } from '../src/anim/model/queryFrames.ts';
import { readValue } from '../src/anim/model/taggedList.ts';

function stepsOf(program: string) {
  const log = createCallLogTracer(QUERY_WATCH, { maxCalls: 4000 });
  const outcome = evaluate(program, { budget: 5_000_000, prelude: queryPrelude, hooks: [log.hooks] });
  return queryStepsOf(log.calls, outcome.output, { bodies: ruleBodies(queryPrelude, program) });
}

describe('reading the query system’s data back', () => {
  it('writes data and patterns in the book’s notation', () => {
    expect(formatData(readValue('[["name", ["$x", null]], ["computer", null]]'))).toBe('list($x, "computer")');
    expect(formatData(readValue('["computer", ["name", ["$type", null]]]'))).toBe('pair("computer", $type)');
    expect(formatQuery(readValue('["job", [["name", ["$x", null]], [["computer", ["wizard", null]], null]]]'))).toBe(
      'job($x, list("computer", "wizard"))',
    );
  });

  it('reads a frame, oldest binding first, and notices when it was cut short', () => {
    expect(readFrame('[[["name", ["$y", null]], 2], [[["name", ["$x", null]], 1], null]]')).toEqual({
      bindings: [
        { variable: '$x', value: '1' },
        { variable: '$y', value: '2' },
      ],
      earlier: false,
    });
    expect(readFrame('[[["name", ["$y", null]], 2], [[["name", ["$x", nu...').earlier).toBe(true);
  });

  it('finds rule bodies in the text they were asserted in', () => {
    expect(ruleBodies(`query('assert(rule(same($x, $x)))'); 'rule(f($a), g($a, "b)"))'`)).toEqual(
      new Map([
        ['same($x,$x)', null],
        ['f($a)', 'g($a, "b)")'],
      ]),
    );
  });
});

describe('the steps of a query', () => {
  it('matches each job assertion, groups failures, and ends with two answers', () => {
    const steps = stepsOf(simpleQueryProgram);
    expect(steps.map((s) => (s.kind === 'match' ? `${s.ok ? 'ok' : 'no'}×${s.assertions.length}` : s.kind))).toEqual([
      'query',
      'no×1',
      'ok×1',
      'answer',
      'ok×1',
      'answer',
      'no×6',
      'done',
    ]);
    const first = steps.find((s) => s.kind === 'match' && s.ok);
    expect(first?.kind === 'match' && first.added).toEqual([{ variable: '$x', value: 'list("Hacker", "Alyssa", "P")' }]);
    expect(steps.at(-1)?.tally).toEqual({ matches: 9, matched: 2, rules: 0, unified: 0, answers: 2 });
  });

  it('feeds the frames of the first conjunct of an and to the second', () => {
    const steps = stepsOf(andQueryProgram);
    const address = steps.find((s) => s.kind === 'match' && s.ok && s.pattern.startsWith('address'));
    expect(address?.kind === 'match' && address.frame.bindings).toEqual([{ variable: '$person', value: 'list("Hacker", "Alyssa", "P")' }]);
    expect(steps.at(-1)?.tally).toMatchObject({ matches: 27, matched: 4, answers: 2 });
  });

  it('shows a rule unified with its variables renamed, and its body', () => {
    const rule = stepsOf(livesNearProgram).find((s) => s.kind === 'rule' && s.ok);
    expect(rule?.kind === 'rule' && rule.conclusion).toMatch(/^lives_near\(\$person_1_\d+, \$person_2_\d+\)$/);
    expect(rule?.kind === 'rule' && rule.body).toMatch(/^and\(address\(\$person_1_\d+, pair\(\$town_\d+, \$rest_1_\d+\)\)/);
  });
});
