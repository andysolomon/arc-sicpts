import {
  assertAll,
  gargleAssertions,
  louisSimpleQuery,
  omit,
  pick,
  queryDriver,
  queryEvaluator,
  queryPrelude,
  querySystem,
  queryTable,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/**
 * Exercises of §4.4. Each runs the reader's queries and rules through the
 * query system with the Gargle data base loaded, and compares the answers as
 * data, in any order, so that any query that finds the right answers passes.
 */

const ben = 'list("Bitdiddle", "Ben")';
const alyssa = 'list("Hacker", "Alyssa", "P")';
const cy = 'list("Fect", "Cy", "D")';
const lem = 'list("Tweakit", "Lem", "E")';
const louis = 'list("Reasoner", "Louis")';
const oliver = 'list("Warbucks", "Oliver")';
const eben = 'list("Scrooge", "Eben")';
const robert = 'list("Cratchit", "Robert")';
const dewitt = 'list("Aull", "DeWitt")';

/** A test that the values of `variable` in the answers to `query` are exactly `expected`, in any order. */
const answersAre = (name: string, variable: string, query: string, expected: readonly string[]) => ({
  name,
  kind: 'value' as const,
  expr: `same_elements(values_of("${variable}", ${query}), list(${expected.join(', ')}))`,
  expected: true,
});

/** The same, for a query written out here rather than named by the reader. */
const literalAnswersAre = (name: string, variable: string, query: string, expected: readonly string[]) =>
  answersAre(name, variable, `'${query}'`, expected);

const countIs = (name: string, query: string, expected: number) => ({
  name,
  kind: 'value' as const,
  expr: `count_answers(${query})`,
  expected,
});

/** Queries run interpreted twice over: a few hundred thousand steps each. */
const BUDGET = 4_000_000;

export const exercise_4_53: ExerciseSpec = {
  id: '4.53',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// The Gargle data base is loaded. Write each query as a string,
// and call the person each answer is about $person.

// All people supervised by Ben Bitdiddle.
const supervised_by_ben = ''; // your answer

// The names and jobs of all people in the accounting division.
const accounting_division = ''; // your answer

// The names and addresses of all people who live in Slumerville.
const in_slumerville = ''; // your answer
`,
  tests: [
    answersAre('supervised by Ben', '$person', 'supervised_by_ben', [alyssa, cy, lem]),
    answersAre('the accounting division', '$person', 'accounting_division', [eben, robert]),
    answersAre('living in Slumerville', '$person', 'in_slumerville', [ben, louis, dewitt]),
  ],
  solution: `const supervised_by_ben = 'supervisor($person, list("Bitdiddle", "Ben"))';

const accounting_division = 'job($person, pair("accounting", $type))';

const in_slumerville = 'address($person, pair("Slumerville", $rest))';
`,
};

export const exercise_4_54: ExerciseSpec = {
  id: '4.54',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// Call the person each answer is about $person.

// Everyone supervised by Ben Bitdiddle, with their $address.
const ben_staff_addresses = ''; // your answer

// Everyone whose salary is less than Ben Bitdiddle's, with their
// salary $amount and Ben's salary $ben_amount.
const paid_less_than_ben = ''; // your answer

// Everyone supervised by someone not in the computer division, with
// the supervisor's name $boss and job $job.
const outside_supervisors = ''; // your answer
`,
  tests: [
    answersAre('supervised by Ben', '$person', 'ben_staff_addresses', [alyssa, cy, lem]),
    answersAre('with their addresses', '$address', 'ben_staff_addresses', [
      'list("Cambridge", list("Mass", "Ave"), 78)',
      'list("Cambridge", list("Ames", "Street"), 3)',
      'list("Boston", list("Bay", "State", "Road"), 22)',
    ]),
    answersAre('paid less than Ben', '$person', 'paid_less_than_ben', [alyssa, cy, lem, louis, robert, dewitt]),
    answersAre('with their salaries', '$amount', 'paid_less_than_ben', ['81000', '70000', '51000', '62000', '26100', '42195']),
    answersAre('and Ben’s', '$ben_amount', 'paid_less_than_ben', Array(6).fill('122000')),
    answersAre('supervised from outside computing', '$person', 'outside_supervisors', [ben, eben, dewitt, robert]),
    answersAre('by whom', '$boss', 'outside_supervisors', [oliver, oliver, oliver, eben]),
    answersAre('doing what', '$job', 'outside_supervisors', [
      'list("administration", "big", "wheel")',
      'list("administration", "big", "wheel")',
      'list("administration", "big", "wheel")',
      'list("accounting", "chief", "accountant")',
    ]),
  ],
  solution: `const ben_staff_addresses =
    'and(supervisor($person, list("Bitdiddle", "Ben")), address($person, $address))';

const paid_less_than_ben =
    'and(salary(list("Bitdiddle", "Ben"), $ben_amount), salary($person, $amount), javascript_predicate($amount < $ben_amount))';

const outside_supervisors =
    'and(supervisor($person, $boss), not(job($boss, pair("computer", $type))), job($boss, $job))';
`,
};

export const exercise_4_55: ExerciseSpec = {
  id: '4.55',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// Add the rule to the data base. A rule with no body holds for
// everyone: give it the body the exercise describes.
query('assert(rule(can_replace($person_1, $person_2)))'); // your answer

// All people who can replace Cy D. Fect; call them $person.
const can_replace_cy = ''; // your answer

// All people who can replace someone paid more than they are, called
// $person, with their salary $amount and the other salary $other_amount.
const cheaper_replacements = ''; // your answer
`,
  tests: [
    literalAnswersAre('the rule: who can replace Cy', '$who', `can_replace($who, ${cy})`, [ben, alyssa]),
    literalAnswersAre('the rule: whom Alyssa can replace', '$whom', `can_replace(${alyssa}, $whom)`, [cy, louis]),
    countIs('the rule: no one replaces themselves', `'can_replace($x, $x)'`, 0),
    answersAre('your query for Cy', '$person', 'can_replace_cy', [ben, alyssa]),
    answersAre('your query for cheaper replacements', '$person', 'cheaper_replacements', [cy, dewitt]),
    answersAre('with their salaries', '$amount', 'cheaper_replacements', ['70000', '42195']),
    answersAre('and the other salaries', '$other_amount', 'cheaper_replacements', ['81000', '314159']),
  ],
  solution: `query('assert(rule(can_replace($person_1, $person_2), and(job($person_1, $job_1), job($person_2, $job_2), or(same($job_1, $job_2), can_do_job($job_1, $job_2)), not(same($person_1, $person_2)))))');

const can_replace_cy = 'can_replace($person, list("Fect", "Cy", "D"))';

const cheaper_replacements =
    'and(can_replace($person, $other), salary($person, $amount), salary($other, $other_amount), javascript_predicate($amount < $other_amount))';
`,
};

export const exercise_4_56: ExerciseSpec = {
  id: '4.56',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// A rule for big_shot($person, $division). The body below says only
// that the person works in the division.
query('assert(rule(big_shot($person, $division), job($person, pair($division, $type))))'); // your answer
`,
  tests: [
    literalAnswersAre('the big shots', '$person', 'big_shot($person, $division)', [ben, eben, oliver]),
    literalAnswersAre('their divisions', '$division', 'big_shot($person, $division)', [
      '"computer"',
      '"accounting"',
      '"administration"',
    ]),
    literalAnswersAre('in computing', '$who', 'big_shot($who, "computer")', [ben]),
  ],
  solution: `query('assert(rule(big_shot($person, $division), and(job($person, pair($division, $type)), not(and(supervisor($person, $boss), job($boss, pair($division, $boss_type)))))))');
`,
};

const meetings = assertAll([
  'meeting("accounting", list("Monday", "9am"))',
  'meeting("administration", list("Monday", "10am"))',
  'meeting("computer", list("Wednesday", "3pm"))',
  'meeting("administration", list("Friday", "1pm"))',
  'meeting("whole-company", list("Wednesday", "4pm"))',
]);

export const exercise_4_57: ExerciseSpec = {
  id: '4.57',
  prelude: `${queryPrelude}\n${meetings}`,
  budget: BUDGET,
  starter: `// Ben's meetings are in the data base.

// All meetings on Friday; call the division $division.
const friday_meetings = ''; // your answer

// Alyssa's rule. The body below finds only the whole-company meeting.
query('assert(rule(meeting_time($person, $day_and_time), meeting("whole-company", $day_and_time)))'); // your answer

// Alyssa's meetings on Wednesday; call the time $time.
const alyssa_on_wednesday = ''; // your answer
`,
  tests: [
    answersAre('Friday', '$division', 'friday_meetings', ['"administration"']),
    literalAnswersAre('the rule, for Alyssa', '$when', `meeting_time(${alyssa}, $when)`, [
      'list("Wednesday", "3pm")',
      'list("Wednesday", "4pm")',
    ]),
    literalAnswersAre('the rule, for Robert Cratchit', '$when', `meeting_time(${robert}, $when)`, [
      'list("Monday", "9am")',
      'list("Wednesday", "4pm")',
    ]),
    answersAre('Alyssa on Wednesday', '$time', 'alyssa_on_wednesday', ['"3pm"', '"4pm"']),
  ],
  solution: `const friday_meetings = 'meeting($division, list("Friday", $time))';

query('assert(rule(meeting_time($person, $day_and_time), or(meeting("whole-company", $day_and_time), and(job($person, pair($division, $type)), meeting($division, $day_and_time)))))');

const alyssa_on_wednesday =
    'meeting_time(list("Hacker", "Alyssa", "P"), list("Wednesday", $time))';
`,
};

export const exercise_4_58: ExerciseSpec = {
  id: '4.58',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// This lists each pair twice. Change it so that each pair of people
// who live near each other appears once.
const pairs_once = 'lives_near($person_1, $person_2)'; // your answer
`,
  tests: [
    countIs('four pairs', 'pairs_once', 4),
    {
      name: 'each person as often as they have neighbours',
      kind: 'value',
      expr: `same_elements(append(values_of("$person_1", pairs_once), values_of("$person_2", pairs_once)), list(${[ben, ben, louis, louis, dewitt, dewitt, alyssa, cy].join(', ')}))`,
      expected: true,
    },
  ],
  solution: `// Order each pair, here by surname, and keep only one of its two orders.
const pairs_once =
    'and(lives_near($person_1, $person_2), javascript_predicate(head($person_1) < head($person_2)))';
`,
};

const nextToIn = assertAll([
  'rule(next_to_in($x, $y, pair($x, pair($y, $u))))',
  'rule(next_to_in($x, $y, pair($v, $z)), next_to_in($x, $y, $z))',
]);

export const exercise_4_59: ExerciseSpec = {
  id: '4.59',
  prelude: `${queryPrelude}\n${nextToIn}`,
  budget: BUDGET,
  starter: `// The next_to_in rules are in the data base. Predict, then check.

// The answers to next_to_in($x, $y, list(1, list(2, 3), 4)),
// each as list($x, $y).
const first_answers = list(); // your answer

// The values of $x in the answers to next_to_in($x, 1, list(2, 1, 3, 1)).
const second_answers = list(); // your answer
`,
  tests: [
    {
      name: 'the first query',
      kind: 'value',
      expr: `same_elements(first_answers, bindings_of(list("$x", "$y"), 'next_to_in($x, $y, list(1, list(2, 3), 4))'))`,
      expected: true,
    },
    {
      name: 'the second query',
      kind: 'value',
      expr: `same_elements(second_answers, values_of("$x", 'next_to_in($x, 1, list(2, 1, 3, 1))'))`,
      expected: true,
    },
  ],
  solution: `const first_answers = list(list(1, list(2, 3)), list(list(2, 3), 4));

const second_answers = list(2, 3);
`,
};

export const exercise_4_60: ExerciseSpec = {
  id: '4.60',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// Add rules for last_pair with query('assert(rule(...))').
// your answer
`,
  tests: [
    literalAnswersAre('last_pair(list(3), $x)', '$x', 'last_pair(list(3), $x)', ['list(3)']),
    literalAnswersAre('last_pair(list(1, 2, 3), $x)', '$x', 'last_pair(list(1, 2, 3), $x)', ['list(3)']),
    literalAnswersAre('last_pair(list(2, $x), list(3))', '$x', 'last_pair(list(2, $x), list(3))', ['3']),
    literalAnswersAre('last_pair(list("a", "b"), $x)', '$x', 'last_pair(list("a", "b"), $x)', ['list("b")']),
  ],
  solution: `query('assert(rule(last_pair(list($x), list($x))))');
query('assert(rule(last_pair(pair($u, $v), $x), last_pair($v, $x)))');
`,
};

const genesis = assertAll([
  'son("Adam", "Cain")',
  'son("Cain", "Enoch")',
  'son("Enoch", "Irad")',
  'son("Irad", "Mehujael")',
  'son("Mehujael", "Methushael")',
  'son("Methushael", "Lamech")',
  'wife("Lamech", "Ada")',
  'son("Ada", "Jabal")',
  'son("Ada", "Jubal")',
]);

export const exercise_4_61: ExerciseSpec = {
  id: '4.61',
  prelude: `${queryPrelude}\n${genesis}`,
  budget: BUDGET,
  starter: `// The genealogy of Genesis 4 is in the data base. Add two rules:
// grandson($g, $s), and son($m, $s) for the sons of a man's wife.
// your answer
`,
  tests: [
    literalAnswersAre('the grandson of Cain', '$s', 'grandson("Cain", $s)', ['"Irad"']),
    literalAnswersAre('the sons of Lamech', '$s', 'son("Lamech", $s)', ['"Jabal"', '"Jubal"']),
    literalAnswersAre('the grandsons of Methushael', '$s', 'grandson("Methushael", $s)', ['"Jabal"', '"Jubal"']),
  ],
  solution: `query('assert(rule(grandson($g, $s), and(son($g, $f), son($f, $s))))');
query('assert(rule(son($m, $s), and(wife($m, $w), son($w, $s))))');
`,
};

export const exercise_4_64: ExerciseSpec = {
  id: '4.64',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// Ben's accumulation scheme: the sum of the values of a variable over
// the frames that satisfy a query. Salvage it.
function sum_of(variable, input) {
    const frames = stream_to_list(query_frames(input));
    return accumulate((frame, total) =>
                          instantiate_term(make_name(variable), frame) + total,
                      0,
                      frames);
}
`,
  tests: [
    {
      name: 'the programmers’ salaries',
      kind: 'value',
      expr: `sum_of("$amount", 'and(job($x, list("computer", "programmer")), salary($x, $amount))')`,
      expected: 151000,
    },
    {
      name: 'the wheels’ salaries',
      kind: 'value',
      expr: `sum_of("$amount", 'and(wheel($who), salary($who, $amount))')`,
      expected: 436159,
    },
    {
      name: 'two people, one salary each',
      kind: 'value',
      expr: `sum_of("$amount", 'and(lives_near($x, list("Hacker", "Alyssa", "P")), salary($x, $amount))')`,
      expected: 70000,
    },
  ],
  solution: `// One answer can be deduced in several ways, and each way gives a frame.
// Keep one frame for each distinct instantiation of the query.
function sum_of(variable, input) {
    const query_syntax = convert_to_query_syntax(parse(input + ";"));
    function distinct(frames, seen) {
        if (is_null(frames)) {
            return null;
        } else {
            const answer = instantiate_term(query_syntax, head(frames));
            return is_seen(answer, seen)
                   ? distinct(tail(frames), seen)
                   : pair(head(frames),
                          distinct(tail(frames), pair(answer, seen)));
        }
    }
    function is_seen(answer, seen) {
        return ! is_null(seen) &&
               (equal(answer, head(seen)) || is_seen(answer, tail(seen)));
    }
    const frames = distinct(stream_to_list(query_frames(input)), null);
    return accumulate((frame, total) =>
                          instantiate_term(make_name(variable), frame) + total,
                      0,
                      frames);
}
`,
};

/** The data base with Louis's version of `outranked_by` in place of the book's, and the Mickey and Minnie loop. */
const louisAssertions = [
  ...gargleAssertions.filter((a) => !a.startsWith('rule(outranked_by')),
  'rule(outranked_by($staff_person, $boss), or(supervisor($staff_person, $boss), and(outranked_by($middle_manager, $boss), supervisor($staff_person, $middle_manager))))',
  'married("Minnie", "Mickey")',
  'rule(married($x, $y), married($y, $x))',
];

export const exercise_4_65: ExerciseSpec = {
  id: '4.65',
  prelude: `${querySystem}\n${assertAll(louisAssertions)}`,
  postlude: `${omit(queryEvaluator, 'apply_a_rule')}\n${queryDriver}`,
  budget: BUDGET,
  starter: `// The data base has Louis's outranked_by rule and the married rule.
// Rewrite apply_a_rule (and add any helpers you need) so that it does
// not start on a query that the chain of deductions leading to it is
// already working on. The rest of the evaluator uses your version.
function apply_a_rule(rule, query_pattern, query_frame) {
    const clean_rule = rename_variables_in(rule);
    const unify_result = unify_match(query_pattern,
                                     conclusion(clean_rule),
                                     query_frame);
    return unify_result === "failed"
           ? null
           : evaluate_query(rule_body(clean_rule),
                            singleton_stream(unify_result));
}
`,
  tests: [
    literalAnswersAre('Mickey is married to Minnie, once', '$who', 'married("Mickey", $who)', ['"Minnie"']),
    literalAnswersAre('who outranks Ben, with Louis’s rule', '$who', `outranked_by(${ben}, $who)`, [oliver]),
    countIs('the wheels are still found', `'wheel($who)'`, 5),
    literalAnswersAre('append_to_form still works', '$z', 'append_to_form(list("a", "b"), list("c", "d"), $z)', [
      'list("a", "b", "c", "d")',
    ]),
  ],
  solution: `// The history is a list of the patterns whose rules are being applied
// in this chain of deductions. It travels in the frame, under a name
// that cannot be a pattern variable, and is put back as it was when a
// frame leaves the rule body.
const history_name = make_name("*history*");

function history(frame) {
    const binding = binding_in_frame(history_name, frame);
    return is_undefined(binding) ? null : binding_value(binding);
}

// The pattern as the frame instantiates it, with its variables numbered
// in order of appearance, so that renamed copies of a query look alike.
function canonical(pattern, frame) {
    let seen = null;
    function number_of(variable, vars, n) {
        return is_null(vars)
               ? undefined
               : equal(variable, head(vars))
               ? n
               : number_of(variable, tail(vars), n + 1);
    }
    function walk(term) {
        if (is_variable(term)) {
            if (is_undefined(number_of(term, seen, 0))) {
                seen = append(seen, list(term));
            } else {}
            return list("var", number_of(term, seen, 0));
        } else {
            return is_pair(term)
                   ? pair(walk(head(term)), walk(tail(term)))
                   : term;
        }
    }
    return walk(instantiate_term(pattern, frame));
}

function is_in_progress(key, patterns) {
    return ! is_null(patterns) &&
           (equal(key, head(patterns)) || is_in_progress(key, tail(patterns)));
}

function apply_a_rule(rule, query_pattern, query_frame) {
    const key = canonical(query_pattern, query_frame);
    const in_progress = history(query_frame);
    if (is_in_progress(key, in_progress)) {
        return null;
    } else {
        const clean_rule = rename_variables_in(rule);
        const unify_result = unify_match(query_pattern,
                                         conclusion(clean_rule),
                                         query_frame);
        return unify_result === "failed"
               ? null
               : stream_map(frame => extend(history_name, in_progress, frame),
                            evaluate_query(rule_body(clean_rule),
                                           singleton_stream(
                                               extend(history_name,
                                                      pair(key, in_progress),
                                                      unify_result))));
    }
}
`,
};

export const exercise_4_66: ExerciseSpec = {
  id: '4.66',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// Add rules for reverse, using append_to_form, which is in the data base.
// your answer
`,
  tests: [
    literalAnswersAre('reverse(list(1, 2, 3), $x)', '$x', 'reverse(list(1, 2, 3), $x)', ['list(3, 2, 1)']),
    literalAnswersAre('reverse(null, $x)', '$x', 'reverse(null, $x)', ['null']),
    literalAnswersAre('reverse(list("a", list("b", "c")), $x)', '$x', 'reverse(list("a", list("b", "c")), $x)', [
      'list(list("b", "c"), "a")',
    ]),
  ],
  solution: `query('assert(rule(reverse(null, null)))');
query('assert(rule(reverse(pair($first, $rest), $reversed), and(reverse($rest, $reversed_rest), append_to_form($reversed_rest, list($first), $reversed))))');
`,
};

const related = assertAll([
  'related("son", "Adam", "Cain")',
  'related("son", "Cain", "Enoch")',
  'related("son", "Enoch", "Irad")',
  'related("son", "Irad", "Mehujael")',
  'related("son", "Mehujael", "Methushael")',
  'related("son", "Methushael", "Lamech")',
  'related("wife", "Lamech", "Ada")',
  'related("son", "Ada", "Jabal")',
  'related("son", "Ada", "Jubal")',
]);

export const exercise_4_67: ExerciseSpec = {
  id: '4.67',
  prelude: `${queryPrelude}\n${related}`,
  budget: BUDGET,
  starter: `// The genealogy is in the data base as related("son", ...) and
// related("wife", ...). Add rules: sons of a man's wife are his sons;
// a grandson is list("grandson"); and pair("great", $rel) relates $x
// and $y when $rel is a list ending in "grandson".
// your answer
`,
  tests: [
    literalAnswersAre('the great-grandson of Adam', '$ggs', 'related(list("great", "grandson"), "Adam", $ggs)', ['"Irad"']),
    literalAnswersAre(
      'great-great-great-great-great-grandsons of Adam',
      '$who',
      'related(list("great", "great", "great", "great", "great", "grandson"), "Adam", $who)',
      ['"Jabal"', '"Jubal"'],
    ),
    literalAnswersAre('the great-grandfather of Jubal', '$g', 'related(list("great", "grandson"), $g, "Jubal")', ['"Mehujael"']),
    {
      name: 'how Irad is related to Adam',
      kind: 'value',
      expr: `equal(first_values_of(1, "$relationship", 'related($relationship, "Adam", "Irad")'), list(list("great", "grandson")))`,
      expected: true,
    },
  ],
  solution: `query('assert(rule(related("son", $m, $s), and(related("wife", $m, $w), related("son", $w, $s))))');
query('assert(rule(related(list("grandson"), $g, $s), and(related("son", $g, $f), related("son", $f, $s))))');
// A new rule goes in front of the older ones, so the base case,
// asserted last, is tried first.
query('assert(rule(ends_in_grandson(pair($x, $rest)), ends_in_grandson($rest)))');
query('assert(rule(ends_in_grandson(list("grandson"))))');
query('assert(rule(related(pair("great", $rel), $x, $y), and(ends_in_grandson($rel), related("son", $x, $z), related($rel, $z, $y))))');
`,
};

/** The three filters with `stream_flatmap` replaced by the reader's `simple_stream_flatmap`. */
const simpleFilters = pick(queryEvaluator, 'find_assertions', 'negate', 'javascript_predicate').replaceAll(
  'stream_flatmap(',
  'simple_stream_flatmap(',
);

export const exercise_4_71: ExerciseSpec = {
  id: '4.71',
  prelude: queryPrelude,
  postlude: `${simpleFilters}\n${omit(queryEvaluator, 'find_assertions', 'negate', 'javascript_predicate')}\n${queryDriver}`,
  budget: BUDGET,
  starter: `// find_assertions, negate and javascript_predicate use this version.
function simple_stream_flatmap(fun, s) {
    return simple_flatten(stream_map(fun, s));
}
function simple_flatten(stream) {
    // your answer: stream_map(??, stream_filter(??, stream))
}
`,
  tests: [
    {
      name: 'simple_flatten',
      kind: 'value',
      expr: 'equal(stream_to_list(simple_flatten(list_to_stream(list(null, singleton_stream(1), null, singleton_stream(2), null)))), list(1, 2))',
      expected: true,
    },
    countIs('a simple query', `'job($x, list("computer", "programmer"))'`, 2),
    countIs('with not', `'and(supervisor($x, $y), not(job($x, list("computer", "programmer"))))'`, 6),
    countIs('with javascript_predicate', `'and(salary($person, $amount), javascript_predicate($amount > 100000))'`, 3),
    { name: 'the filters use it', kind: 'calls', call: `count_answers('job($x, list("computer", "programmer"))')`, fn: 'simple_flatten', atMost: 10 },
  ],
  solution: `function simple_stream_flatmap(fun, s) {
    return simple_flatten(stream_map(fun, s));
}
function simple_flatten(stream) {
    return stream_map(s => head(s),
                      stream_filter(s => ! is_null(s), stream));
}
`,
};

export const exercise_4_72: ExerciseSpec = {
  id: '4.72',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `function uniquely_asserted(exps, frame_stream) {
    // your answer
}
put("unique", "evaluate_query", uniquely_asserted);

// Everyone who supervises precisely one person; call them $boss.
const supervises_one = ''; // your answer
`,
  tests: [
    countIs('one wizard', `'unique(job($x, list("computer", "wizard")))'`, 1),
    countIs('two programmers', `'unique(job($x, list("computer", "programmer")))'`, 0),
    countIs('jobs held by one person', `'and(job($x, $j), unique(job($anyone, $j)))'`, 7),
    answersAre('supervisors of precisely one person', '$boss', 'supervises_one', [alyssa, eben]),
  ],
  solution: `function uniquely_asserted(exps, frame_stream) {
    return stream_flatmap(
               frame => {
                   const extensions = evaluate_query(head(exps),
                                                     singleton_stream(frame));
                   return ! is_null(extensions) &&
                          is_null(stream_tail(extensions))
                          ? extensions
                          : null;
               },
               frame_stream);
}
put("unique", "evaluate_query", uniquely_asserted);

const supervises_one =
    'and(supervisor($someone, $boss), unique(supervisor($anyone, $boss)))';
`,
};

export const exercise_4_73: ExerciseSpec = {
  id: '4.73',
  prelude: queryPrelude,
  postlude: `${omit(queryEvaluator, 'conjoin')}\n${queryDriver}`,
  budget: BUDGET,
  starter: `// Merge two frames: "failed" if their bindings are incompatible,
// otherwise a frame with the bindings of both.
function merge_frames(frame1, frame2) {
    // your answer
}

// and as a series combination. Rewrite it to evaluate each conjunct
// separately on the incoming frame, then merge the results.
function conjoin(conjuncts, frame_stream) {
    return is_empty_conjunction(conjuncts)
           ? frame_stream
           : conjoin(rest_conjuncts(conjuncts),
                     evaluate_query(first_conjunct(conjuncts),
                                    frame_stream));
}
`,
  tests: [
    {
      name: 'merging compatible frames',
      kind: 'value',
      expr: 'equal(instantiate_term(list(make_name("$x"), make_name("$y")), merge_frames(list(pair(make_name("$x"), 1)), list(pair(make_name("$y"), 2)))), list(1, 2))',
      expected: true,
    },
    {
      name: 'merging through a variable',
      kind: 'value',
      expr: 'equal(instantiate_term(make_name("$y"), merge_frames(list(pair(make_name("$x"), make_name("$y"))), list(pair(make_name("$x"), 3)))), 3)',
      expected: true,
    },
    {
      name: 'incompatible frames',
      kind: 'value',
      expr: 'merge_frames(list(pair(make_name("$x"), 1)), list(pair(make_name("$x"), 2)))',
      expected: 'failed',
    },
    countIs('programmers and their addresses', `'and(job($person, list("computer", "programmer")), address($person, $where))'`, 2),
    countIs('the wheels', `'wheel($who)'`, 5),
    countIs('everyone’s job and address', `'and(job($x, $j), address($x, $a))'`, 9),
    { name: 'one scan of the data base per conjunct', kind: 'calls', call: `count_answers('and(job($x, $j), address($x, $a))')`, fn: 'check_an_assertion', atMost: 30 },
  ],
  solution: `function merge_frames(frame1, frame2) {
    return frame2 === "failed" || is_null(frame1)
           ? frame2
           : merge_frames(tail(frame1),
                          unify_match(binding_variable(head(frame1)),
                                      binding_value(head(frame1)),
                                      frame2));
}

function conjoin(conjuncts, frame_stream) {
    return stream_flatmap(frame => conjoin_from(conjuncts, frame),
                          frame_stream);
}

// Each conjunct extends the same frame; the extensions are then merged.
function conjoin_from(conjuncts, frame) {
    return is_empty_conjunction(conjuncts)
           ? singleton_stream(frame)
           : merge_streams(evaluate_query(first_conjunct(conjuncts),
                                          singleton_stream(frame)),
                           conjoin_from(rest_conjuncts(conjuncts), frame));
}

// Every compatible pair of a frame from s1 and a frame from s2. The
// frames of s2 are listed once, so that its queries are not re-run.
function merge_streams(s1, s2) {
    const frames2 = stream_to_list(s2);
    return stream_flatmap(
               frame1 => list_to_stream(
                   filter(frame => frame !== "failed",
                          map(frame2 => merge_frames(frame1, frame2),
                              frames2))),
               s1);
}
`,
};

/**
 * A second query system beside the real one, for exercises about changing
 * the system. The program frame gets its own evaluator, with `replacement`
 * in place of the named functions and its own dispatch table, but it reads
 * the real data base through `real_get`, so assertions the reader adds with
 * `query` reach both. The real system stays reachable as `real_…`.
 */
const realAliases = `const real_get = get;
const real_first_values_of = first_values_of;
const real_query_frames = query_frames;
`;

const variantPostlude = (replacement: string, ...replaced: string[]): string => `${queryTable}
${replacement}
${omit(queryEvaluator, ...replaced, 'get_stream')}
function get_stream(key1, key2) {
    const s = real_get(key1, key2);
    return is_undefined(s) ? null : s;
}
${omit(queryDriver, 'query', 'assert_all', 'display_answers')}`;

/** `apply_a_rule` that gives up, with an error, after a fixed number of rule applications. */
const givingUpApplyARule = `let rule_applications = 0;
function apply_a_rule(rule, query_pattern, query_frame) {
    rule_applications = rule_applications + 1;
    if (rule_applications > 100) {
        error("gave up after 100 rule applications");
    } else {}
    const clean_rule = rename_variables_in(rule);
    const unify_result = unify_match(query_pattern,
                                     conclusion(clean_rule),
                                     query_frame);
    return unify_result === "failed"
           ? null
           : evaluate_query(rule_body(clean_rule),
                            singleton_stream(unify_result));
}
`;

/** The data base with Louis's `outranked_by` in place of the book's. */
const louisOutrankedPrelude = `${querySystem}\n${assertAll(louisAssertions.slice(0, -2))}`;

export const exercise_4_62: ExerciseSpec = {
  id: '4.62',
  prelude: louisOutrankedPrelude,
  budget: BUDGET,
  starter: `// Louis's rule is in the data base in place of the original.
// For outranked_by(list("Bitdiddle", "Ben"), $who):

// The values of $who the system displays before it loops, as a list.
const displayed = list(); // your answer

// Why it loops: "a", "b" or "c".
//  "a": supervisor(list("Bitdiddle", "Ben"), $boss) has infinitely
//       many answers.
//  "b": the and first evaluates outranked_by($middle_manager, $boss)
//       with neither variable bound, and every way of deducing it
//       applies the same rule to a query just as unbound, without end.
//  "c": the or interleaves its two streams, so the first disjunct is
//       retried for ever.
const why = ""; // your answer
`,
  tests: [
    { name: 'what is displayed', kind: 'value', expr: `equal(displayed, list(${oliver}))`, expected: true },
    {
      name: 'which is what the system finds first',
      kind: 'value',
      expr: `equal(displayed, first_values_of(1, "$who", 'outranked_by(list("Bitdiddle", "Ben"), $who)'))`,
      expected: true,
    },
    { name: 'why it loops', kind: 'value', expr: 'why', expected: 'b' },
  ],
  solution: `const displayed = list(list("Warbucks", "Oliver"));

const why = "b";
`,
};

export const exercise_4_63: ExerciseSpec = {
  id: '4.63',
  prelude: queryPrelude,
  budget: BUDGET,
  starter: `// wheel($who) lists Oliver Warbucks four times. For each of those four
// answers, the middle manager through whom it was deduced, in any order.
const middle_managers = list(); // your answer

// How many times Ben Bitdiddle is listed.
const times_ben_listed = 0; // your answer
`,
  tests: [
    {
      name: 'the four deductions about Oliver',
      kind: 'value',
      expr: `same_elements(middle_managers, values_of("$m", 'and(supervisor($m, list("Warbucks", "Oliver")), supervisor($x, $m))'))`,
      expected: true,
    },
    {
      name: 'Ben',
      kind: 'value',
      expr: `times_ben_listed === length(filter(w => equal(w, ${ben}), values_of("$who", 'wheel($who)')))`,
      expected: true,
    },
  ],
  solution: `// Ben supervises three people and Eben Scrooge one, and each of them
// gives a separate deduction.
const middle_managers = list(list("Bitdiddle", "Ben"), list("Bitdiddle", "Ben"),
                             list("Bitdiddle", "Ben"), list("Scrooge", "Eben"));

// Through Alyssa, who supervises Louis.
const times_ben_listed = 1;
`,
};

const louisPostlude = variantPostlude(`${louisSimpleQuery}\n${givingUpApplyARule}`, 'simple_query', 'disjoin', 'apply_a_rule');

export const exercise_4_68: ExerciseSpec = {
  id: '4.68',
  prelude: `${queryPrelude}\n${realAliases}`,
  postlude: louisPostlude,
  budget: 3 * BUDGET,
  starter: `// Give an example of a query that has an answer, but for which Louis's
// simple_query and disjoin cannot produce even the first one. Assert any
// assertions and rules it needs with query('assert(...)').
// your answer

const example = ''; // your answer
`,
  tests: [
    { name: 'the real system answers it', kind: 'value', expr: '! is_null(real_query_frames(example))', expected: true },
    { name: 'Louis’s system never does', kind: 'error', call: 'query_frames(example)', message: 'gave up' },
  ],
  solution: `query('assert(married("Minnie", "Mickey"))');
query('assert(rule(married($x, $y), married($y, $x)))');

// stream_append evaluates apply_rules at once, and the rule's body
// applies the rule again, before any frame can be returned.
const example = 'married("Mickey", $who)';
`,
};

const appendingPostlude = variantPostlude(
  `function disjoin(disjuncts, frame_stream) {
    return is_empty_disjunction(disjuncts)
           ? null
           : stream_append_delayed(
                 evaluate_query(first_disjunct(disjuncts), frame_stream),
                 () => disjoin(rest_disjuncts(disjuncts), frame_stream));
}
function flatten_stream(stream) {
    return is_null(stream)
           ? null
           : stream_append_delayed(
                 head(stream),
                 () => flatten_stream(stream_tail(stream)));
}`,
  'disjoin',
  'flatten_stream',
);

export const exercise_4_69: ExerciseSpec = {
  id: '4.69',
  prelude: `${queryPrelude}\n${realAliases}`,
  postlude: appendingPostlude,
  budget: BUDGET,
  starter: `// Give an example where appending instead of interleaving loses
// answers: a query, one of its variables, and a value of that variable
// that the real system gives among its first 20 answers but a system
// that appends never does. Assert any assertions and rules it needs.
// your answer

const example = ''; // your answer
const variable = "$x"; // your answer
const lost_value = undefined; // your answer
`,
  tests: [
    {
      name: 'interleaving finds it',
      kind: 'value',
      expr: '! is_null(filter(v => equal(v, lost_value), real_first_values_of(20, variable, example)))',
      expected: true,
    },
    {
      name: 'appending does not, in its first 20 answers either',
      kind: 'value',
      expr: 'is_null(filter(v => equal(v, lost_value), first_values_of(20, variable, example)))',
      expected: true,
    },
  ],
  solution: `// Infinitely many natural numbers, and one colour.
query('assert(rule(natural(list("s", $n)), natural($n)))');
query('assert(rule(natural(0)))');
query('assert(colour("red"))');

// Appending never gets past the first disjunct.
const example = 'or(natural($x), colour($x))';
const variable = "$x";
const lost_value = "red";
`,
};

const eagerFlattenPostlude = variantPostlude(
  `function flatten_stream(stream) {
    return is_null(stream)
           ? null
           : interleave(head(stream),
                        flatten_stream(stream_tail(stream)));
}
function interleave(s1, s2) {
    return is_null(s1)
           ? s2
           : pair(head(s1),
                  () => interleave(s2, stream_tail(s1)));
}
${givingUpApplyARule}`,
  'flatten_stream',
  'apply_a_rule',
);

export const exercise_4_70: ExerciseSpec = {
  id: '4.70',
  prelude: `${queryPrelude}\n${realAliases}`,
  postlude: eagerFlattenPostlude,
  budget: BUDGET,
  starter: `// With the undelayed flatten_stream, the whole stream of streams is
// flattened before the first frame is returned. Give an example of a
// query that has an answer that this version cannot produce. Assert
// any assertions and rules it needs with query('assert(...)').
// your answer

const example = ''; // your answer
`,
  tests: [
    { name: 'the real system answers it', kind: 'value', expr: '! is_null(real_query_frames(example))', expected: true },
    { name: 'the undelayed version never does', kind: 'error', call: 'query_frames(example)', message: 'gave up' },
  ],
  solution: `query('assert(rule(natural(list("s", $n)), natural($n)))');
query('assert(rule(natural(0)))');

// The frames for natural($x) are infinitely many, and flatten_stream
// would have to reach the end of them to return the first.
const example = 'natural($x)';
`,
};

export const exercise_4_74: ExerciseSpec = {
  id: '4.74',
  prelude: queryPrelude,
  postlude: `${omit(queryEvaluator, 'negate', 'javascript_predicate', 'simple_query', 'conjoin')}\n${queryDriver}`,
  budget: BUDGET,
  starter: `// Rewrite these four functions so that a not or javascript_predicate
// whose variables are not yet all bound waits in the frame until they
// are, as a promise to filter, and is checked as soon as possible.
// Filters still waiting at the end of an and are checked there.
function negate(exps, frame_stream) {
    return stream_flatmap(
               frame =>
                 is_null(evaluate_query(negated_query(exps),
                                        singleton_stream(frame)))
                 ? singleton_stream(frame)
                 : null,
               frame_stream);
}
function javascript_predicate(exps, frame_stream) {
    return stream_flatmap(
               frame =>
                 evaluate(instantiate_expression(
                              javascript_predicate_expression(exps),
                              frame),
                          the_global_environment)
                 ? singleton_stream(frame)
                 : null,
               frame_stream);
}
function simple_query(query_pattern, frame_stream) {
    return stream_flatmap(
               frame =>
                 stream_append_delayed(
                     find_assertions(query_pattern, frame),
                     () => apply_rules(query_pattern, frame)),
               frame_stream);
}
function conjoin(conjuncts, frame_stream) {
    return is_empty_conjunction(conjuncts)
           ? frame_stream
           : conjoin(rest_conjuncts(conjuncts),
                     evaluate_query(first_conjunct(conjuncts),
                                    frame_stream));
}
`,
  tests: [
    countIs('not before the pattern that binds it', `'and(not(job($x, list("computer", "programmer"))), supervisor($x, $y))'`, 6),
    countIs('not after it, as before', `'and(supervisor($x, $y), not(job($x, list("computer", "programmer"))))'`, 6),
    countIs('javascript_predicate before the pattern that binds it', `'and(javascript_predicate($amount > 100000), salary($person, $amount))'`, 3),
    countIs('rules with not still work', `'lives_near($x, list("Bitdiddle", "Ben"))'`, 2),
    countIs('a not with nothing to wait for', `'not(baseball_fan(list("Bitdiddle", "Ben")))'`, 1),
  ],
  solution: `// The filters waiting in a frame, under a name no query can use.
const pending_name = make_name("*pending*");

function pending(frame) {
    const binding = binding_in_frame(pending_name, frame);
    return is_undefined(binding) ? null : binding_value(binding);
}

function has_variable(term) {
    return is_variable(term) ||
           (is_pair(term) && (has_variable(head(term)) ||
                              has_variable(tail(term))));
}

// True when every variable in exp has a value without variables.
function is_ready(exp, frame) {
    return is_variable(exp)
           ? ! has_variable(instantiate_term(exp, frame))
           : is_pair(exp)
           ? is_ready(head(exp), frame) && is_ready(tail(exp), frame)
           : true;
}

// A filter is pair("not", query) or pair("javascript_predicate", expression).
function passes(filter, frame) {
    return head(filter) === "not"
           ? is_null(evaluate_query(tail(filter), singleton_stream(frame)))
           : evaluate(instantiate_expression(tail(filter), frame),
                      the_global_environment);
}

function filter_or_wait(filter, frame) {
    return is_ready(tail(filter), frame)
           ? (passes(filter, frame) ? singleton_stream(frame) : null)
           : singleton_stream(extend(pending_name,
                                     pair(filter, pending(frame)),
                                     frame));
}

// Check the waiting filters that have become ready, or with force all
// of them, in the frame without them, so that none checks itself.
function check_pending(frame, force) {
    const waiting = pending(frame);
    const ready = filter(f => force || is_ready(tail(f), frame), waiting);
    if (is_null(ready)) {
        return singleton_stream(frame);
    } else {
        const rest = filter(f => ! force && ! is_ready(tail(f), frame), waiting);
        const cleared = extend(pending_name, rest, frame);
        return accumulate((f, ok) => ok && passes(f, cleared), true, ready)
               ? singleton_stream(cleared)
               : null;
    }
}

function negate(exps, frame_stream) {
    return stream_flatmap(
               frame => filter_or_wait(pair("not", negated_query(exps)), frame),
               frame_stream);
}
function javascript_predicate(exps, frame_stream) {
    return stream_flatmap(
               frame => filter_or_wait(
                            pair("javascript_predicate",
                                 javascript_predicate_expression(exps)),
                            frame),
               frame_stream);
}
function simple_query(query_pattern, frame_stream) {
    return stream_flatmap(
               frame =>
                 stream_flatmap(
                     extended => check_pending(extended, false),
                     stream_append_delayed(
                         find_assertions(query_pattern, frame),
                         () => apply_rules(query_pattern, frame))),
               frame_stream);
}
function conjoin(conjuncts, frame_stream) {
    function conjoin_all(conjuncts, frame_stream) {
        return is_empty_conjunction(conjuncts)
               ? frame_stream
               : conjoin_all(rest_conjuncts(conjuncts),
                             evaluate_query(first_conjunct(conjuncts),
                                            frame_stream));
    }
    return stream_flatmap(frame => check_pending(frame, true),
                          conjoin_all(conjuncts, frame_stream));
}
`,
};

/** The query language on `amb` explores depth first, as a query system that appends its streams does. */
const naturals = assertAll(['rule(natural(0))', 'rule(natural(list("s", $n)), natural($n))', 'colour("red")']);

export const exercise_4_75: ExerciseSpec = {
  id: '4.75',
  prelude: `${queryPrelude}\n${naturals}\n${realAliases}`,
  postlude: appendingPostlude,
  budget: BUDGET,
  starter: `// The data base has rules for the natural numbers, natural(0),
// natural(list("s", 0)), ..., and the assertion colour("red").
// Consider or(natural($x), colour($x)).

// The value of $x in the first answer of the amb version.
const amb_first = undefined; // your answer

// Whether retrying the amb version again and again ever gives "red".
const amb_reaches_red = undefined; // your answer

// Whether the stream version of this section ever gives "red".
const streams_reach_red = undefined; // your answer
`,
  tests: [
    {
      name: 'the first answer by amb',
      kind: 'value',
      expr: `equal(amb_first, head(first_values_of(1, "$x", 'or(natural($x), colour($x))')))`,
      expected: true,
    },
    {
      name: 'amb, retried',
      kind: 'value',
      expr: `amb_reaches_red === ! is_null(member("red", first_values_of(30, "$x", 'or(natural($x), colour($x))')))`,
      expected: true,
    },
    {
      name: 'streams',
      kind: 'value',
      expr: `streams_reach_red === ! is_null(member("red", real_first_values_of(30, "$x", 'or(natural($x), colour($x))')))`,
      expected: true,
    },
  ],
  solution: `// amb tries the first disjunct's alternatives, depth first, before the
// second's, and the first disjunct never runs out.
const amb_first = 0;
const amb_reaches_red = false;

// The stream version interleaves the two disjuncts.
const streams_reach_red = true;
`,
};

const noRenamingPostlude = variantPostlude('function rename_variables_in(rule) {\n    return rule;\n}', 'rename_variables_in');

export const exercise_4_76: ExerciseSpec = {
  id: '4.76',
  prelude: `${queryPrelude}\n${realAliases}`,
  postlude: noRenamingPostlude,
  budget: BUDGET,
  starter: `// Suppose apply_a_rule did not rename the rule's variables, as an
// evaluator without local environments would not rename parameters.
// Predict how many answers each query gets.

// append_to_form(list("a"), list("b"), $z): the real system gets 1.
const append_answers = 1; // your answer

// outranked_by(list("Reasoner", "Louis"), $who): the real system gets 3.
const outranked_answers = 3; // your answer

// wheel($who): the real system gets 5.
const wheel_answers = 5; // your answer
`,
  tests: [
    { name: 'append_to_form', kind: 'value', expr: `append_answers === count_answers('append_to_form(list("a"), list("b"), $z)')`, expected: true },
    { name: 'outranked_by', kind: 'value', expr: `outranked_answers === count_answers('outranked_by(list("Reasoner", "Louis"), $who)')`, expected: true },
    { name: 'wheel', kind: 'value', expr: `wheel_answers === count_answers('wheel($who)')`, expected: true },
  ],
  solution: `// The recursive application meets the bindings of the outer one:
// its $u must be "a" and "b" at once.
const append_answers = 0;

// The second application's $staff_person is the first's, already Louis.
const outranked_answers = 1;

// wheel does not use itself, and its variables do not clash with $who.
const wheel_answers = 5;
`,
};
