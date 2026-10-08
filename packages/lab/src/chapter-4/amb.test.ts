import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import type { MachineHooks } from '../evaluator/machine.ts';
import { createCallLogTracer } from '../inspect/callLog.ts';
import {
  ambChoicesProgram,
  ambEvaluator,
  ambEvaluatorWith,
  ambevalProgram,
  ambiguousSentenceProgram,
  ambOfficeMove,
  ambOfficePrelude,
  ambParserPrelude,
  ambPrelude,
  ambProbeNames,
  ambPythagoreanTriples,
  ambSearchProgram,
  ambSentenceParser,
  integersProgram,
  officeMoveProgram,
  primeSumPairProgram,
  sentenceProgram,
  undoProgram,
  withSearchProbe,
} from './amb.ts';

const BUDGET = 50_000_000;

function run(prelude: string, source: string, hooks: MachineHooks[] = []) {
  const outcome = evaluate(source, { prelude, budget: BUDGET, hooks });
  if (outcome.status === 'error') throw new Error(outcome.error.message);
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return outcome;
}

const text = (prelude: string, source: string): string => run(prelude, source).text;

/** The probe's events for a program, as `name args…` lines. */
function events(prelude: string, source: string): string[] {
  const probed = withSearchProbe(prelude);
  if (probed === null) throw new Error('not an amb prelude');
  const tracer = createCallLogTracer([...ambProbeNames]);
  run(probed, source, [tracer.hooks]);
  return tracer.calls.map((call) => [call.name, ...call.args.slice(0, call.name === 'solution_found' ? 1 : undefined)].join(' '));
}

describe('section 4.3.1: amb and search', () => {
  it('finds the six values of two choices, the last choice varying fastest', () => {
    expect(text(ambPrelude, ambChoicesProgram)).toBe(
      '[[1, ["a", null]], [[1, ["b", null]], [[2, ["a", null]], [[2, ["b", null]], [[3, ["a", null]], [[3, ["b", null]], null]]]]]]',
    );
    expect(text(ambPrelude, ambChoicesProgram.replace('10);', '4);'))).toBe(
      '[[1, ["a", null]], [[1, ["b", null]], [[2, ["a", null]], [[2, ["b", null]], null]]]]',
    );
  });

  it('chooses from an infinite range, and never stops when nothing qualifies', () => {
    expect(text(ambPrelude, integersProgram)).toBe('[8, [9, [10, null]]]');
    const endless = evaluate(integersProgram.replace('n * n > 50', 'n * n < 0'), { prelude: ambPrelude, budget: 2_000_000 });
    expect(endless.status).toBe('budget-exhausted');
  });

  it('runs the book’s interaction with the driver loop', () => {
    const { output } = run(ambPrelude, primeSumPairProgram);
    expect(output).toEqual([
      'amb-evaluate input: "prime_sum_pair(list(1, 3, 5, 8), list(20, 35, 110));"',
      '"Starting a new problem"',
      'amb-evaluate value: [3, [20, null]]',
      'amb-evaluate input: "retry"',
      'amb-evaluate value: [3, [110, null]]',
      'amb-evaluate input: "retry"',
      'amb-evaluate value: [8, [35, null]]',
      'amb-evaluate input: "retry"',
      '"There are no more values of"',
      '"prime_sum_pair(list(1, 3, 5, 8), list(20, 35, 110));"',
      'amb-evaluate input: "prime_sum_pair(list(19, 27, 30), list(11, 36, 58));"',
      '"Starting a new problem"',
      'amb-evaluate value: [30, [11, null]]',
      '"evaluator terminated"',
    ]);
  });

  it('searches depth first, as the search tree shows', () => {
    expect(text(ambPrelude, ambSearchProgram)).toBe('[[2, [5, null]], [[3, [4, null]], null]]');
    expect(events(ambPrelude, ambSearchProgram)).toEqual([
      'amb_tried 1 0 3 "amb(1, 2, 3)" "1"',
      'amb_chose 1 0 1',
      'amb_tried 2 0 2 "amb(4, 5)" "4"',
      'amb_chose 2 0 4',
      'amb_exhausted 3 0',
      'amb_tried 2 1 2 "amb(4, 5)" "5"',
      'amb_chose 2 1 5',
      'amb_exhausted 4 0',
      'amb_exhausted 2 2',
      'amb_tried 1 1 3 "amb(1, 2, 3)" "2"',
      'amb_chose 1 1 2',
      'amb_tried 5 0 2 "amb(4, 5)" "4"',
      'amb_chose 5 0 4',
      'amb_exhausted 6 0',
      'amb_tried 5 1 2 "amb(4, 5)" "5"',
      'amb_chose 5 1 5',
      'solution_found [2, [5, null]]',
      'amb_exhausted 5 2',
      'amb_tried 1 2 3 "amb(1, 2, 3)" "3"',
      'amb_chose 1 2 3',
      'amb_tried 7 0 2 "amb(4, 5)" "4"',
      'amb_chose 7 0 4',
      'solution_found [3, [4, null]]',
      'amb_tried 7 1 2 "amb(4, 5)" "5"',
      'amb_chose 7 1 5',
      'amb_exhausted 8 0',
      'amb_exhausted 7 2',
      'amb_exhausted 1 3',
    ]);
  });

  it('probes only an amb evaluator, and the probe changes no values', () => {
    expect(withSearchProbe('const x = 1;')).toBeNull();
    const probed = withSearchProbe(ambPrelude);
    if (probed === null) throw new Error('no probe');
    expect(text(probed, primeSumPairProgram)).toBe(text(ambPrelude, primeSumPairProgram));
  });

  it('finds Pythagorean triples with an_integer_between (exercise 4.33)', () => {
    expect(text(ambEvaluatorWith(ambPythagoreanTriples), 'amb_solutions("a_pythagorean_triple_between(1, 13);", 10);')).toBe(
      '[[3, [4, [5, null]]], [[5, [12, [13, null]]], [[6, [8, [10, null]]], null]]]',
    );
  });

  it('is about seven hundred lines of Source', () => {
    const lines = ambEvaluator.split('\n').length;
    expect(lines).toBeGreaterThan(650);
    expect(lines).toBeLessThan(800);
  });
});

describe('section 4.3.2: examples of nondeterministic programs', () => {
  it('solves the office move with one solution, in fewer than 12 million steps', () => {
    const tracer = createCallLogTracer(['amb_exhausted'], { maxCalls: 10_000 });
    const probed = withSearchProbe(ambOfficePrelude);
    if (probed === null) throw new Error('no probe');
    const first = run(probed, officeMoveProgram, [tracer.hooks]);
    expect(first.text).toBe(
      '[[["alyssa", [3, null]], [["ben", [2, null]], [["cy", [4, null]], [["lem", [5, null]], [["louis", [1, null]], null]]]]], null]',
    );
    // Every assignment but the solution ends at one dead end: amb() with no choices.
    expect(tracer.calls.filter((call) => call.args[1] === '0').length + 1).toBe(1471);
    expect(run(ambOfficePrelude, officeMoveProgram).steps).toBeLessThan(12_000_000);
    expect(text(ambOfficePrelude, 'amb_solutions("office_move();", 2);')).toBe(first.text);
  }, 30_000); // Several complete searches; retain the step bound independently of host speed.

  it('declares office_move as the book writes it', () => {
    expect(ambOfficePrelude).toContain(JSON.stringify(ambOfficeMove).slice(1, -1));
  });

  it('parses sentences, two ways when they are ambiguous', () => {
    expect(text(ambParserPrelude, sentenceProgram)).toBe(
      '[["sentence", [["noun-phrase", [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["student", null]], null]]], [["prep-phrase", [["prep", ["with", null]], [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["cat", null]], null]]], null]]], null]]], [["verb-phrase", [["verb", ["sleeps", null]], [["prep-phrase", [["prep", ["in", null]], [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["class", null]], null]]], null]]], null]]], null]]], null]',
    );
    const { output } = run(ambParserPrelude, ambiguousSentenceProgram);
    expect(output.filter((line) => line.startsWith('amb-evaluate value:'))).toEqual([
      'amb-evaluate value: ["sentence", [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["professor", null]], null]]], [["verb-phrase", [["verb-phrase", [["verb", ["lectures", null]], [["prep-phrase", [["prep", ["to", null]], [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["student", null]], null]]], null]]], null]]], [["prep-phrase", [["prep", ["with", null]], [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["cat", null]], null]]], null]]], null]]], null]]]',
      'amb-evaluate value: ["sentence", [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["professor", null]], null]]], [["verb-phrase", [["verb", ["lectures", null]], [["prep-phrase", [["prep", ["to", null]], [["noun-phrase", [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["student", null]], null]]], [["prep-phrase", [["prep", ["with", null]], [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["cat", null]], null]]], null]]], null]]], null]]], null]]], null]]]',
    ]);
    expect(output).toContain('"There are no more values of"');
  });

  it('undoes every assignment to not_yet_parsed when a parse fails', () => {
    expect(text(ambParserPrelude, 'amb_solutions(\'parse_input(list("the", "cat", "eats", "the"));\', 1);')).toBe('null');
    expect(text(ambParserPrelude, 'amb_solutions(\'parse_input(list("the", "cat", "eats", "the"));\', 1); amb_solutions("not_yet_parsed;", 1);')).toBe('[null, null]');
  });

  it('generates boring sentences when parse_word ignores its input (exercise 4.47)', () => {
    const generator = 'function parse_word(word_list) { return list(head(word_list), an_element_of(tail(word_list))); }';
    const sentences = text(ambEvaluator, `amb_solutions(list(${JSON.stringify(ambSentenceParser)}, ${JSON.stringify(generator)}, "parse_sentence();"), 3);`);
    expect(sentences.startsWith('[["sentence", [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["student", null]], null]]], [["verb", ["studies", null]], null]]]')).toBe(true);
    expect(sentences.match(/"for"/g)?.length).toBe(3);
  });
});

describe('section 4.3.2: the answers to the discussion exercises', () => {
  const requirements = (office: string): string[] => office.split('\n').filter((line) => line.includes('require('));
  const reordered = (order: (lines: string[]) => string[]): string => {
    const lines = requirements(ambOfficeMove);
    let body = ambOfficeMove;
    for (const line of lines) body = body.replace(`${line}\n`, '');
    return body.replace('    return list(', `${order(lines).join('\n')}\n    return list(`);
  };
  function applications(office: string): { text: string; count: number; deadEnds: number } {
    let count = 0;
    const tracer = createCallLogTracer(['amb_exhausted'], { maxCalls: 10_000 });
    const probed = withSearchProbe(ambEvaluator);
    if (probed === null) throw new Error('no probe');
    const outcome = run(probed, `amb_solutions(list(${JSON.stringify(office)}, "office_move();"), 1);`, [
      tracer.hooks,
      { onCall: (info) => void (info.name === 'execute_application' && count++) },
    ]);
    return { text: outcome.text, count, deadEnds: tracer.calls.filter((call) => call.args[1] === '0').length };
  }

  it('exercise 4.37: the order changes the time, not the answer or the assignments built', () => {
    const book = applications(ambOfficeMove);
    const distinctLast = applications(reordered((lines) => [...lines.slice(1), lines[0] ?? '']));
    expect(distinctLast.text).toBe(book.text);
    expect(book.deadEnds + 1).toBe(1471);
    expect(distinctLast.deadEnds + 1).toBe(1471);
    expect(distinctLast.count).toBeGreaterThan(2 * book.count);
  }, 60_000);

  it('exercise 4.43: five parses, in this order', () => {
    const value = text(
      ambParserPrelude,
      'amb_solutions(\'parse_input(list("the", "professor", "lectures", "to", "the", "student", "in", "the", "class", "with", "the", "cat"));\', 10);',
    );
    // Which phrase each prepositional phrase extends, read from the tree.
    type Tree = string | Tree[];
    const items = (pair: unknown): Tree[] => {
      const out: Tree[] = [];
      for (let p = pair; Array.isArray(p); p = p[1]) out.push(toTree(p[0]));
      return out;
    };
    const toTree = (value: unknown): Tree => (Array.isArray(value) ? items(value) : String(value));
    const parses = items(JSON.parse(value)) as Tree[][];
    expect(parses).toHaveLength(5);
    const headWord = (t: Tree): string => {
      if (typeof t === 'string') return t;
      if (t[0] === 'verb' || t[0] === 'noun') return String(t[1]);
      if (t[0] === 'simple-noun-phrase') return headWord(t[2] ?? '');
      return headWord(t[1] ?? '');
    };
    const extended = (t: Tree, prep: string): string | null => {
      if (typeof t === 'string') return null;
      const [tag, first, second] = t;
      if ((tag === 'verb-phrase' || tag === 'noun-phrase') && Array.isArray(second) && Array.isArray(second[1]) && second[1][1] === prep) {
        return headWord(first ?? '');
      }
      for (const child of t) {
        const found = extended(child, prep);
        if (found !== null) return found;
      }
      return null;
    };
    expect(parses.map((p) => [extended(p, 'in'), extended(p, 'with')])).toEqual([
      ['lectures', 'lectures'],
      ['lectures', 'class'],
      ['student', 'lectures'],
      ['student', 'student'],
      ['student', 'class'],
    ]);
  });

  it('exercise 4.44: right-to-left arguments parse sentences backwards', () => {
    const rightToLeft = ambParserPrelude.replace(
      'function get_args(afuns, env, succeed, fail) {',
      `function get_args(afuns, env, succeed, fail) {
    return is_null(afuns)
           ? succeed(null, fail)
           : get_args(tail(afuns), env,
                      (args, fail2) => head(afuns)(env, (arg, fail3) => succeed(pair(arg, args), fail3), fail2),
                      fail);
}
function get_args_left_to_right(afuns, env, succeed, fail) {`,
    );
    expect(text(rightToLeft, 'amb_solutions(\'parse_input(list("the", "cat", "eats"));\', 1);')).toBe('null');
    expect(text(rightToLeft, 'amb_solutions(\'parse_input(list("eats", "cat", "the"));\', 2);')).toBe(
      '[["sentence", [["simple-noun-phrase", [["article", ["the", null]], [["noun", ["cat", null]], null]]], [["verb", ["eats", null]], null]]], null]',
    );
  });

  it('exercise 4.45: Louis’s verb phrases find one parse, then loop', () => {
    const louis = `function parse_verb_phrase() {
    return amb(parse_word(verbs),
               list("verb-phrase", parse_verb_phrase(), parse_prepositional_phrase()));
}`;
    const swapped = `function parse_verb_phrase() {
    return amb(list("verb-phrase", parse_verb_phrase(), parse_prepositional_phrase()),
               parse_word(verbs));
}`;
    const query = (grammar: string, n: number) =>
      `amb_solutions(list(${JSON.stringify(ambSentenceParser)}, ${JSON.stringify(grammar)}, "parse_input(list('the', 'professor', 'lectures', 'to', 'the', 'student'));"), ${n});`;
    expect(text(ambEvaluator, query(louis, 1))).toBe(text(ambParserPrelude, 'amb_solutions("parse_input(list(\'the\', \'professor\', \'lectures\', \'to\', \'the\', \'student\'));", 1);'));
    expect(evaluate(query(louis, 2), { prelude: ambEvaluator, budget: 5_000_000 }).status).toBe('budget-exhausted');
    expect(evaluate(query(swapped, 1), { prelude: ambEvaluator, budget: 5_000_000 }).status).toBe('budget-exhausted');
  });
});

describe('section 4.3.3: implementing the amb evaluator', () => {
  it('calls ambeval with continuations of our own', () => {
    const outcome = run(ambPrelude, ambevalProgram);
    expect(outcome.output).toEqual(['1', '20']);
    expect(outcome.text).toBe('"failed"');
  });

  it('undoes an assignment on backtracking', () => {
    expect(text(ambPrelude, undoProgram)).toBe('[[3, [1, null]], null]');
    expect(events(ambPrelude, undoProgram).filter((e) => e.startsWith('amb_exhausted')).slice(0, 2)).toEqual([
      'amb_exhausted 2 0',
      'amb_exhausted 3 0',
    ]);
  });

  it('needs an empty sequence to succeed, or require cannot', () => {
    const fixed = '(env, succeed, fail) => succeed(undefined, fail)';
    expect(ambPrelude).toContain(fixed);
    expect(text(ambPrelude, 'amb_solutions("require(true); 1;", 1);')).toBe('[1, null]');
    const book = evaluate('amb_solutions("require(true); 1;", 1);', { prelude: ambPrelude.replace(fixed, 'env => undefined'), budget: BUDGET });
    expect(book.status === 'error' && book.error.message).toContain('expects 1 argument(s), got 3');
  });

  it('has no current problem to retry at first', () => {
    expect(run(ambPrelude, 'driver_loop(the_global_environment, list("retry"));').output).toEqual([
      'amb-evaluate input: "retry"',
      '"There is no current problem"',
      '"evaluator terminated"',
    ]);
  });
});
