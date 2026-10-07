import { ambEvaluator, ambEvaluatorWith, ambOfficeMove, ambPrimeSumPair, ambSentenceParser, omit, pick } from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/**
 * Exercises of §4.3. Programs for the amb evaluator are strings, or lists of
 * strings that are their lines; the hidden tests run them with
 * `amb_solutions`, usually after declarations of the book's that the reader
 * does not see. Exercises that change the evaluator keep all of it in the
 * postlude, in the reader's frame, so that it uses the reader's versions.
 */

/** A string literal holding the text of an amb program, for a hidden test. */
const quoted = (program: string): string => JSON.stringify(program);

const anIntegerBetween = `function an_integer_between(low, high) {
    require(low <= high);
    return amb(low, an_integer_between(low + 1, high));
}
`;

const tripleBetween = `function a_pythagorean_triple_between(low, high) {
    const i = an_integer_between(low, high);
    const j = an_integer_between(i, high);
    const k = an_integer_between(j, high);
    require(i * i + j * j === k * k);
    return list(i, j, k);
}
`;

/** The book's `office_move` as a list of strings, for a starter to change. */
const asLines = (program: string, indent = '    '): string =>
  program
    .trimEnd()
    .split('\n')
    .map((line) => `${indent}${line.includes('"') && !line.includes("'") ? `'${line}'` : JSON.stringify(line)}`)
    .join(',\n');

const officeSolution = (alyssa: number, ben: number, cy: number, lem: number, louis: number): string =>
  `list(list("alyssa", ${alyssa}), list("ben", ${ben}), list("cy", ${cy}), list("lem", ${lem}), list("louis", ${louis}))`;

/** `analyze` of the amb evaluator with one more clause just before `before`. */
function analyzeWith(clause: string, before: string): string {
  const analyze = pick(ambEvaluator, 'analyze');
  const at = analyze.indexOf(`           : ${before}(component)`);
  if (at < 0) throw new Error(`analyze has no clause for ${before}`);
  return `${analyze.slice(0, at)}${clause}${analyze.slice(at)}\n`;
}

export const exercise_4_33: ExerciseSpec = {
  id: '4.33',
  prelude: ambEvaluator,
  starter: `// The amb evaluator is provided, with require, an_element_of and
// an_integer_starting_from declared in it. A program for it is a string,
// or a list of strings that are its lines.

const an_integer_between_program = list(
    "function an_integer_between(low, high) {",
    "    // your answer",
    "}");

`,
  tests: [
    {
      name: 'every integer from 3 to 6, in order',
      kind: 'value',
      expr: 'equal(amb_solutions(list(an_integer_between_program, "an_integer_between(3, 6);"), 10), list(3, 4, 5, 6))',
      expected: true,
    },
    {
      name: 'no integer between 5 and 4',
      kind: 'value',
      expr: 'is_null(amb_solutions(list(an_integer_between_program, "an_integer_between(5, 4);"), 10))',
      expected: true,
    },
    {
      name: 'the Pythagorean triples between 1 and 10',
      kind: 'value',
      expr: `equal(amb_solutions(list(an_integer_between_program, ${quoted(tripleBetween)}, "a_pythagorean_triple_between(1, 10);"), 10), list(list(3, 4, 5), list(6, 8, 10)))`,
      expected: true,
    },
  ],
  budget: 10_000_000,
  solution: `const an_integer_between_program = list(
    "function an_integer_between(low, high) {",
    "    require(low <= high);",
    "    return amb(low, an_integer_between(low + 1, high));",
    "}");

`,
};

/** True when `triples` are n different Pythagorean triples (i, j, k) with i ≤ j. */
const tripleChecks = `function is_triple(t) {
    return is_list(t) && length(t) === 3 &&
           list_ref(t, 0) >= 1 && list_ref(t, 0) <= list_ref(t, 1) &&
           list_ref(t, 0) * list_ref(t, 0) + list_ref(t, 1) * list_ref(t, 1)
           === list_ref(t, 2) * list_ref(t, 2);
}
function all_different(xs) {
    function occurs(x, ys) {
        return ! is_null(ys) && (equal(x, head(ys)) || occurs(x, tail(ys)));
    }
    return is_null(xs) ||
           (! occurs(head(xs), tail(xs)) && all_different(tail(xs)));
}
function are_triples(triples, n) {
    function all_triples(ts) {
        return is_null(ts) || (is_triple(head(ts)) && all_triples(tail(ts)));
    }
    return length(triples) === n && all_triples(triples) &&
           all_different(triples);
}
`;

export const exercise_4_34: ExerciseSpec = {
  id: '4.34',
  prelude: `${ambEvaluatorWith(anIntegerBetween)}\n${tripleChecks}`,
  starter: `// The amb evaluator is provided, with require, an_element_of,
// an_integer_starting_from and an_integer_between declared in it.

// Every Pythagorean triple, list(i, j, k) with i <= j, should be among
// the values of a_pythagorean_triple() sooner or later.
const pythagorean_triples_program = list(
    "function a_pythagorean_triple() {",
    "    // your answer",
    "}");

`,
  tests: [
    {
      name: 'three different triples come out',
      kind: 'value',
      expr: 'are_triples(amb_solutions(list(pythagorean_triples_program, "a_pythagorean_triple();"), 3), 3)',
      expected: true,
    },
    {
      name: 'the first is 3, 4, 5',
      kind: 'value',
      expr: 'equal(head(amb_solutions(list(pythagorean_triples_program, "a_pythagorean_triple();"), 1)), list(3, 4, 5))',
      expected: true,
    },
  ],
  budget: 15_000_000,
  solution: `// Choose the largest number first, from an infinite range; the other
// two then come from finite ranges, so every triple is reached.
const pythagorean_triples_program = list(
    "function a_pythagorean_triple() {",
    "    const k = an_integer_starting_from(1);",
    "    const i = an_integer_between(1, k);",
    "    const j = an_integer_between(i, k);",
    "    require(i * i + j * j === k * k);",
    "    return list(i, j, k);",
    "}");

`,
};

export const exercise_4_35: ExerciseSpec = {
  id: '4.35',
  prelude: ambEvaluatorWith(anIntegerBetween),
  starter: `// The amb evaluator is provided, with an_integer_between declared in it.
// The values of a program without its require are the candidates the
// search goes through, so amb_solutions can count them.

// For low = 1 and high = 10: how many candidates (i, j, k) does the
// program of exercise 4.33 test with its require, and how many (i, j)
// does Ben's?
const original_candidates = 0;
const ben_candidates = 0;

// Is Ben right that his program is more efficient?
const ben_is_right = undefined;
`,
  tests: [
    { name: 'candidates of exercise 4.33', kind: 'value', expr: 'original_candidates', expected: 220 },
    { name: 'candidates of Ben’s method', kind: 'value', expr: 'ben_candidates', expected: 55 },
    { name: 'Ben is right', kind: 'value', expr: 'ben_is_right', expected: true },
  ],
  budget: 5_000_000,
  solution: `const original_candidates = length(amb_solutions(list(
    "const i = an_integer_between(1, 10);",
    "const j = an_integer_between(i, 10);",
    "const k = an_integer_between(j, 10);",
    "list(i, j, k);"), 1000));

const ben_candidates = length(amb_solutions(list(
    "const i = an_integer_between(1, 10);",
    "const j = an_integer_between(i, 10);",
    "list(i, j);"), 1000));

// 220 against 55, and the gap grows as the cube against the square of high.
const ben_is_right = true;
`,
};

const officeMoveWithoutLouisCy = ambOfficeMove.replace('    require(math_abs(louis - cy) !== 1);\n', '');

export const exercise_4_36: ExerciseSpec = {
  id: '4.36',
  prelude: ambEvaluator,
  starter: `// The amb evaluator is provided, with distinct as a primitive.
// Here is the book's office_move: drop the requirement that Louis's
// office is not next to Cy's.
const office_move_program = list(
${asLines(ambOfficeMove)});

// How many solutions are there now?
const number_of_solutions = 0;
`,
  tests: [
    {
      name: 'the solutions without the requirement',
      kind: 'value',
      expr: `equal(amb_solutions(list(office_move_program, "office_move();"), 10), list(${officeSolution(1, 2, 4, 3, 5)}, ${officeSolution(1, 2, 4, 5, 3)}, ${officeSolution(1, 4, 2, 5, 3)}, ${officeSolution(3, 2, 4, 5, 1)}, ${officeSolution(3, 4, 2, 5, 1)}))`,
      expected: true,
    },
    { name: 'how many there are', kind: 'value', expr: 'number_of_solutions', expected: 5 },
  ],
  budget: 30_000_000,
  solution: `const office_move_program = list(
${asLines(officeMoveWithoutLouisCy)});

// length(amb_solutions(list(office_move_program, "office_move();"), 10))
const number_of_solutions = 5;
`,
};

export const exercise_4_37: ExerciseSpec = {
  id: '4.37',
  starter: `// Does the order of the requirements in office_move change the answer?
const order_changes_answer = undefined;

// Does it change the time taken to find it?
const order_changes_time = undefined;

// However the requirements are ordered, how many complete assignments
// of offices does the search build before it reaches the answer?
const assignments_built = 0;

// Which requirement is it best to impose first in our evaluator, where
// distinct is a primitive? "distinct", "alyssa", "ben", "cy", "lem",
// "louis next to cy" or "cy next to ben".
const best_first_requirement = "";
`,
  tests: [
    { name: 'the answer', kind: 'value', expr: 'order_changes_answer', expected: false },
    { name: 'the time', kind: 'value', expr: 'order_changes_time', expected: true },
    { name: 'assignments built in any order', kind: 'value', expr: 'assignments_built', expected: 1471 },
    { name: 'the best first requirement', kind: 'value', expr: 'best_first_requirement', expected: 'distinct' },
  ],
  solution: `// The requirements are all checked after all five choices are made, and
// an assignment is a solution only if it meets every one of them.
const order_changes_answer = false;

// The order decides how many requirements each rejected assignment is
// tested against before one fails.
const order_changes_time = true;

// Depth-first order reaches alyssa 3, ben 2, cy 4, lem 5, louis 1 after
// (3-1)·625 + (2-1)·125 + (4-1)·25 + (5-1)·5 + 0 = 1470 others.
const assignments_built = 1471;

// distinct rejects 3005 of the 3125 assignments at the first test.
const best_first_requirement = "distinct";
`,
};

export const exercise_4_38: ExerciseSpec = {
  id: '4.38',
  prelude: ambEvaluator,
  starter: `// The amb evaluator is provided, with distinct as a primitive.

// How many assignments of the five people to five offices are there,
// before and after requiring that the offices be distinct?
const assignments_before = 0;
const assignments_after = 0;

// The office-move puzzle again, generating only the possibilities not
// already ruled out by the requirements on the people chosen so far.
const office_move_program = list(
    "function office_move() {",
    "    // your answer",
    "}");

`,
  tests: [
    { name: 'assignments before', kind: 'value', expr: 'assignments_before', expected: 3125 },
    { name: 'assignments after', kind: 'value', expr: 'assignments_after', expected: 120 },
    {
      name: 'the one solution',
      kind: 'value',
      expr: `equal(amb_solutions(list(office_move_program, "office_move();"), 2), list(${officeSolution(3, 2, 4, 5, 1)}))`,
      expected: true,
    },
    {
      name: 'far fewer alternatives tried than the book’s 7810',
      kind: 'calls',
      call: 'amb_solutions(list(office_move_program, "office_move();"), 2)',
      fn: 'try_next',
      atMost: 1000,
    },
  ],
  budget: 25_000_000,
  solution: `// 5^5 assignments, of which 5! give everyone a different office.
const assignments_before = 5 * 5 * 5 * 5 * 5;
const assignments_after = 5 * 4 * 3 * 2 * 1;

// Each person's own restrictions narrow the choices before they are
// made, and each requirement is imposed as soon as its names are chosen.
const office_move_program = list(
    "function office_move() {",
    "    const cy = amb(2, 3, 4);",
    "    const ben = amb(2, 3, 4, 5);",
    "    require(math_abs(cy - ben) > 1);",
    "    const lem = amb(1, 2, 3, 4, 5);",
    "    require(lem > ben);",
    "    require(lem !== cy);",
    "    const alyssa = amb(1, 2, 3, 4);",
    "    require(distinct(list(alyssa, ben, cy, lem)));",
    "    const louis = amb(1, 2, 3, 4, 5);",
    "    require(math_abs(louis - cy) !== 1);",
    "    require(distinct(list(alyssa, ben, cy, lem, louis)));",
    '    return list(list("alyssa", alyssa), list("ben", ben),',
    '                list("cy", cy), list("lem", lem),',
    '                list("louis", louis));',
    "}");

`,
};

export const exercise_4_39: ExerciseSpec = {
  id: '4.39',
  starter: `// map, filter, accumulate, for_each and enum_list are provided; no amb.
// Return the assignment in the form office_move gives it:
// list(list("alyssa", 3), list("ben", 2), ...).
function office_move() {
    // your answer
}

office_move();
`,
  tests: [
    {
      name: 'the solution',
      kind: 'value',
      expr: `equal(office_move(), ${officeSolution(3, 2, 4, 5, 1)})`,
      expected: true,
    },
  ],
  budget: 5_000_000,
  solution: `// The permutations of a list, as in section 2.2.3.
function permutations(s) {
    return is_null(s)
           ? list(null)
           : accumulate(append, null,
                        map(x => map(p => pair(x, p),
                                     permutations(remove(x, s))),
                            s));
}
function remove(item, sequence) {
    return filter(x => x !== item, sequence);
}

function office_move() {
    function satisfies(p) {
        const alyssa = list_ref(p, 0);
        const ben = list_ref(p, 1);
        const cy = list_ref(p, 2);
        const lem = list_ref(p, 3);
        const louis = list_ref(p, 4);
        return alyssa !== 5 && ben !== 1 && cy !== 5 && cy !== 1 &&
               lem > ben && math_abs(louis - cy) !== 1 &&
               math_abs(cy - ben) !== 1;
    }
    const p = head(filter(satisfies, permutations(enum_list(1, 5))));
    return list(list("alyssa", list_ref(p, 0)), list("ben", list_ref(p, 1)),
                list("cy", list_ref(p, 2)), list("lem", list_ref(p, 3)),
                list("louis", list_ref(p, 4)));
}

office_move();
`,
};

export const exercise_4_40: ExerciseSpec = {
  id: '4.40',
  prelude: ambEvaluator,
  starter: `// The amb evaluator is provided, with distinct as a primitive.
// liars() should return the order of arrival in the form
// list(list("alyssa", a), list("cy", c), list("eva", e),
//      list("lem", l), list("louis", o)), where 1 is first.
const liars_program = list(
    "function liars() {",
    "    // your answer",
    "}");

`,
  tests: [
    {
      name: 'the one order that fits',
      kind: 'value',
      expr: 'equal(amb_solutions(list(liars_program, "liars();"), 10), list(list(list("alyssa", 3), list("cy", 5), list("eva", 2), list("lem", 1), list("louis", 4))))',
      expected: true,
    },
  ],
  budget: 40_000_000,
  solution: `// Each diner makes one true and one false statement: exactly one of the
// two is true, so the two truth values differ.
const liars_program = list(
    "function liars() {",
    "    function one_of(p, q) {",
    "        return p !== q;",
    "    }",
    "    const alyssa = amb(1, 2, 3, 4, 5);",
    "    const lem = amb(1, 2, 3, 4, 5);",
    "    require(one_of(lem === 2, alyssa === 3));",
    "    const louis = amb(1, 2, 3, 4, 5);",
    "    require(one_of(lem === 2, louis === 4));",
    "    require(one_of(louis === 4, alyssa === 1));",
    "    const cy = amb(1, 2, 3, 4, 5);",
    "    const eva = amb(1, 2, 3, 4, 5);",
    "    require(one_of(cy === 1, eva === 2));",
    "    require(one_of(eva === 3, cy === 5));",
    "    require(distinct(list(alyssa, cy, eva, lem, louis)));",
    '    return list(list("alyssa", alyssa), list("cy", cy),',
    '                list("eva", eva), list("lem", lem),',
    '                list("louis", louis));',
    "}");

`,
};

export const exercise_4_41: ExerciseSpec = {
  id: '4.41',
  prelude: ambEvaluator,
  starter: `// The amb evaluator is provided, with distinct as a primitive.
// The chapters are "Functions", "Data", "State", "Meta" and
// "Register Machines"; the people are "alyssa", "ben", "cy", "eva" and
// "louis".
const puzzle_program = list(
    "// your answer");

// Who checks the exercises in the Data chapter?
const data_checker = undefined;

// How many solutions are there if we are not told that Alyssa checks
// the exercises in the Meta chapter?
const solutions_without_alyssa_meta = 0;
`,
  tests: [
    { name: 'who checks Data', kind: 'value', expr: 'data_checker', expected: 'ben' },
    { name: 'solutions without the clue about Alyssa', kind: 'value', expr: 'solutions_without_alyssa_meta', expected: 2 },
  ],
  budget: 20_000_000,
  solution: `// Who solves what is given; the search is over who checks what. Fixing
// the checks we are told first leaves few possibilities to try.
function puzzle(alyssa_checks) {
    return list(
        'const chapters = list("Functions", "Data", "State", "Meta",',
        '                      "Register Machines");',
        'const solvers = list("louis", "alyssa", "cy", "eva", "ben");',
        "function solver_of(chapter) {",
        "    function find(cs, ss) {",
        "        return head(cs) === chapter ? head(ss) : find(tail(cs), tail(ss));",
        "    }",
        "    return find(chapters, solvers);",
        "}",
        "const alyssa = " + alyssa_checks + ";",
        'require(alyssa !== "Data");',
        'const louis = "Register Machines";',
        "const ben = an_element_of(chapters);",
        'require(ben !== "Register Machines");',
        "const cy = an_element_of(chapters);",
        'require(cy !== "State");',
        "const eva = an_element_of(chapters);",
        'require(eva !== "Meta");',
        "require(distinct(list(alyssa, ben, cy, eva, louis)));",
        'const checkers = list("alyssa", "ben", "cy", "eva", "louis");',
        "const checks = list(alyssa, ben, cy, eva, louis);",
        "function checker_of(chapter) {",
        "    function find(cs, ps) {",
        "        return head(cs) === chapter ? head(ps) : find(tail(cs), tail(ps));",
        "    }",
        "    return find(checks, checkers);",
        "}",
        'require(checker_of("Functions") === solver_of(eva));',
        'checker_of("Data");');
}

const puzzle_program = puzzle('"Meta"');

const data_checker = head(amb_solutions(puzzle_program, 10));

const solutions_without_alyssa_meta =
    length(amb_solutions(puzzle("an_element_of(chapters)"), 10));
`,
};

/** True when `boards` are `count` different solutions of the n-queens puzzle. */
const queensChecks = `function is_board(rows, n) {
    function safe(row, rest, distance) {
        return is_null(rest) ||
               (head(rest) !== row &&
                math_abs(head(rest) - row) !== distance &&
                safe(row, tail(rest), distance + 1));
    }
    function all_safe(rows) {
        return is_null(rows) ||
               (head(rows) >= 1 && head(rows) <= n &&
                safe(head(rows), tail(rows), 1) && all_safe(tail(rows)));
    }
    return is_list(rows) && length(rows) === n && all_safe(rows);
}
function are_boards(boards, n, count) {
    function occurs(x, ys) {
        return ! is_null(ys) && (equal(x, head(ys)) || occurs(x, tail(ys)));
    }
    function check(bs) {
        return is_null(bs) ||
               (is_board(head(bs), n) && ! occurs(head(bs), tail(bs)) &&
                check(tail(bs)));
    }
    return length(boards) === count && check(boards);
}
`;

export const exercise_4_42: ExerciseSpec = {
  id: '4.42',
  prelude: `${ambEvaluatorWith(anIntegerBetween)}\n${queensChecks}`,
  starter: `// The amb evaluator is provided, with an_integer_between declared in it.
// queens(n) should place n queens on an n-by-n board, none attacking
// another, and return the list of their rows, column by column.
const queens_program = list(
    "function queens(board_size) {",
    "    // your answer",
    "}");

`,
  tests: [
    {
      name: 'both placements on a 4-by-4 board',
      kind: 'value',
      expr: 'are_boards(amb_solutions(list(queens_program, "queens(4);"), 20), 4, 2)',
      expected: true,
    },
    {
      name: 'all ten on a 5-by-5 board',
      kind: 'value',
      expr: 'are_boards(amb_solutions(list(queens_program, "queens(5);"), 20), 5, 10)',
      expected: true,
    },
  ],
  budget: 20_000_000,
  solution: `// Choose a row for each column in turn, and require at once that the
// new queen is safe from those already placed.
const queens_program = list(
    "function queens(board_size) {",
    "    function is_safe(row, positions) {",
    "        function safe_from(rest, distance) {",
    "            return is_null(rest) ||",
    "                   (head(rest) !== row &&",
    "                    math_abs(head(rest) - row) !== distance &&",
    "                    safe_from(tail(rest), distance + 1));",
    "        }",
    "        return safe_from(positions, 1);",
    "    }",
    "    function place(k, positions) {",
    "        if (k === 0) {",
    "            return reverse(positions);",
    "        } else {",
    "            const row = an_integer_between(1, board_size);",
    "            require(is_safe(row, positions));",
    "            return place(k - 1, pair(row, positions));",
    "        }",
    "    }",
    "    return place(board_size, null);",
    "}");

`,
};

/** The number of parses of a sentence, given as a string of words, under `grammar`. */
const parseCount = (grammar: string, words: string, n = 5): string =>
  `length(amb_solutions(list(${quoted(ambSentenceParser)}, ${grammar}, "parse_input(list(${words.split(' ').map((w) => `\\"${w}\\"`).join(', ')}));"), ${n}))`;

const attachmentChecks = `function same_rows(xs, ys) {
    function occurs(x, zs) {
        return ! is_null(zs) && (equal(x, head(zs)) || occurs(x, tail(zs)));
    }
    function all_in(ps, qs) {
        return is_null(ps) || (occurs(head(ps), qs) && all_in(tail(ps), qs));
    }
    return is_list(xs) && length(xs) === length(ys) &&
           all_in(xs, ys) && all_in(ys, xs);
}
`;

const fiveParses =
  'list(list("lectures", "lectures"), list("lectures", "class"), list("student", "lectures"), list("student", "student"), list("student", "class"))';

export const exercise_4_43: ExerciseSpec = {
  id: '4.43',
  prelude: attachmentChecks,
  starter: `// For each parse of "The professor lectures to the student in the class
// with the cat", in the order the evaluator finds them: what does "in the
// class" extend, and what does "with the cat" extend? Answer with the
// head word of the phrase extended: "lectures", "student" or "class".
const parses = list(
    list("", ""),
    list("", ""),
    list("", ""),
    list("", ""),
    list("", ""));
`,
  tests: [
    { name: 'the five readings', kind: 'value', expr: `same_rows(parses, ${fiveParses})`, expected: true },
    { name: 'in the order they are found', kind: 'value', expr: `equal(parses, ${fiveParses})`, expected: true },
  ],
  solution: `// 1. The lecturing is in the class and with the cat.
// 2. The lecturing is in the class, the class with the cat in it.
// 3. The student in the class; the lecturing with the cat.
// 4. The student in the class, and the student with the cat.
// 5. The student in the class that has the cat.
const parses = list(
    list("lectures", "lectures"),
    list("lectures", "class"),
    list("student", "lectures"),
    list("student", "student"),
    list("student", "class"));
`,
};

export const exercise_4_44: ExerciseSpec = {
  id: '4.44',
  starter: `// The rest of the amb evaluator follows your declarations, and the
// checks add the grammar of section 4.3.2 to the programs that parse.
// Make get_args evaluate the argument expressions from right to left.

${pick(ambEvaluator, 'get_args')}

// Which order of the three words "the", "cat" and "eats" does the
// parser accept once arguments are evaluated from right to left?
const words_it_accepts = list();
`,
  postlude: omit(ambEvaluator, 'get_args'),
  tests: [
    {
      name: 'arguments from right to left',
      kind: 'value',
      expr: 'equal(amb_solutions("list(amb(1, 2), amb(3, 4));", 5), list(list(1, 3), list(2, 3), list(1, 4), list(2, 4)))',
      expected: true,
    },
    {
      name: 'the cat eats no longer parses',
      kind: 'value',
      expr: `is_null(amb_solutions(list(${quoted(ambSentenceParser)}, "parse_input(list('the', 'cat', 'eats'));"), 1))`,
      expected: true,
    },
    { name: 'the words it accepts', kind: 'value', expr: 'equal(words_it_accepts, list("eats", "cat", "the"))', expected: true },
  ],
  budget: 3_000_000,
  solution: `// Evaluate the rest of the arguments first, then this one.
function get_args(afuns, env, succeed, fail) {
    return is_null(afuns)
           ? succeed(null, fail)
           : get_args(tail(afuns),
                      env,
                      (args, fail2) =>
                        head(afuns)(env,
                                    (arg, fail3) =>
                                      succeed(pair(arg, args), fail3),
                                    fail2),
                      fail);
}

// parse_sentence now parses its verb phrase before its noun phrase, and
// a simple noun phrase its noun before its article: the parser reads the
// sentence from the wrong end, because parse_word always takes the next
// word of not_yet_parsed.
const words_it_accepts = list("eats", "cat", "the");
`,
};

export const exercise_4_45: ExerciseSpec = {
  id: '4.45',
  starter: `// With Louis's parse_verb_phrase, we parse
// list("the", "professor", "lectures", "to", "the", "student").

// Is the first value the correct parse?
const first_value_correct = undefined;

// Does asking for a second value (retry) ever give an answer, or say
// that there are no more?
const retry_terminates = undefined;

// With the two expressions of the amb interchanged, is any parse found?
const swapped_finds_a_parse = undefined;
`,
  tests: [
    { name: 'the first value', kind: 'value', expr: 'first_value_correct', expected: true },
    { name: 'retry', kind: 'value', expr: 'retry_terminates', expected: false },
    { name: 'the expressions interchanged', kind: 'value', expr: 'swapped_finds_a_parse', expected: false },
  ],
  solution: `// "lectures" alone leaves words over, so the search backs into the amb:
// its second alternative parses a verb phrase again from "lectures"
// (the assignment to not_yet_parsed was undone), whose first alternative
// is "lectures", then the prepositional phrase. Right.
const first_value_correct = true;

// After that, every retry goes deeper into the second alternative, which
// calls parse_verb_phrase before consuming a word: an endless recursion.
const retry_terminates = false;

// Interchanged, that recursion comes first, before any word is parsed.
const swapped_finds_a_parse = false;
`,
};

export const exercise_4_46: ExerciseSpec = {
  id: '4.46',
  prelude: ambEvaluator,
  starter: `// The amb evaluator is provided. Your declarations come after the
// book's grammar of section 4.3.2, and a function you declare again
// replaces the book's. Add adjectives "lazy", "clever" and "old", any
// number of which may come between an article and a noun.
const grammar_extension = list(
    "// your answer");

`,
  tests: [
    { name: 'the lazy cat eats', kind: 'value', expr: `${parseCount('grammar_extension', 'the lazy cat eats')} >= 1`, expected: true },
    {
      name: 'the clever old professor lectures to the lazy student',
      kind: 'value',
      expr: `${parseCount('grammar_extension', 'the clever old professor lectures to the lazy student')} >= 1`,
      expected: true,
    },
    {
      name: 'the old grammar still holds',
      kind: 'value',
      expr: parseCount('grammar_extension', 'the professor lectures to the student with the cat'),
      expected: 2,
    },
    { name: 'the cat lazy eats is not a sentence', kind: 'value', expr: parseCount('grammar_extension', 'the cat lazy eats'), expected: 0 },
  ],
  budget: 10_000_000,
  solution: `const grammar_extension = list(
    'const adjectives = list("adjective", "lazy", "clever", "old");',
    "",
    "// A noun, or an adjective followed by what may follow an article.",
    "function parse_described_noun() {",
    "    return amb(parse_word(nouns),",
    '               list("described-noun",',
    "                    parse_word(adjectives),",
    "                    parse_described_noun()));",
    "}",
    "function parse_simple_noun_phrase() {",
    '    return list("simple-noun-phrase",',
    "                parse_word(articles),",
    "                parse_described_noun());",
    "}");

`,
};

/** True when the first n sentences generated are different and all parse. */
const generationChecks = `function words_of(tree) {
    return is_string(head(tail(tree)))
           ? tail(tree)
           : accumulate(append, null, map(words_of, tail(tree)));
}
function quoted_words(words) {
    return is_null(tail(words))
           ? "\\"" + head(words) + "\\""
           : "\\"" + head(words) + "\\", " + quoted_words(tail(words));
}
function parses(words) {
    return ! is_null(amb_solutions(list(book_grammar,
        "parse_input(list(" + quoted_words(words) + "));"), 1));
}
function generated_sentences_parse(sentences, n) {
    function occurs(x, ys) {
        return ! is_null(ys) && (equal(x, head(ys)) || occurs(x, tail(ys)));
    }
    function check(ss) {
        return is_null(ss) ||
               (head(head(ss)) === "sentence" && parses(words_of(head(ss))) &&
                ! occurs(head(ss), tail(ss)) && check(tail(ss)));
    }
    return length(sentences) === n && check(sentences);
}
`;

export const exercise_4_47: ExerciseSpec = {
  id: '4.47',
  prelude: `${ambEvaluator}\nconst book_grammar = ${quoted(ambSentenceParser)};\n${generationChecks}`,
  starter: `// The amb evaluator is provided, and book_grammar is the text of the
// grammar of section 4.3.2. Your declarations come after it, and a
// function you declare again replaces the book's.
const generator = list(
    "function parse_word(word_list) {",
    "    require(! is_null(not_yet_parsed));",
    "    require(! is_null(member(head(not_yet_parsed), tail(word_list))));",
    "    const found_word = head(not_yet_parsed);",
    "    not_yet_parsed = tail(not_yet_parsed);",
    "    return list(head(word_list), found_word);",
    "}");

`,
  tests: [
    {
      name: 'six different sentences, each one the grammar accepts',
      kind: 'value',
      expr: 'generated_sentences_parse(amb_solutions(list(book_grammar, generator, "parse_sentence();"), 6), 6)',
      expected: true,
    },
  ],
  budget: 20_000_000,
  solution: `// Ignore the input: any word of the right part of speech will do.
const generator = list(
    "function parse_word(word_list) {",
    "    return list(head(word_list), an_element_of(tail(word_list)));",
    "}");

`,
};

const ambEvaluatorWithout = (...names: string[]): string => omit(ambEvaluator, ...names);

const isApplicationOf = (name: string, fn: string): string => `function ${fn}(component) {
    return is_tagged_list(component, "application") &&
           is_name(function_expression(component)) &&
           symbol_of_name(function_expression(component)) === "${name}";
}`;

/** True when xs and ys hold the same numbers, in any order. */
const sameNumbers = `function same_numbers(xs, ys) {
    function remove_one(x, zs) {
        return is_null(zs)
               ? null
               : head(zs) === x
               ? tail(zs)
               : pair(head(zs), remove_one(x, tail(zs)));
    }
    return is_null(xs)
           ? is_null(ys)
           : ! is_null(member(head(xs), ys)) &&
             same_numbers(tail(xs), remove_one(head(xs), ys));
}
`;

const rambClause = `           : is_ramb(component)
           ? analyze_ramb(component)
`;

export const exercise_4_48: ExerciseSpec = {
  id: '4.48',
  prelude: sameNumbers,
  starter: `// The rest of the amb evaluator follows your declarations.

function is_ramb(component) {
    // your answer
}

function analyze_ramb(component) {
    // your answer
}

// analyze, with a clause for ramb.
${analyzeWith(rambClause, 'is_application')}
`,
  postlude: ambEvaluatorWithout('analyze'),
  tests: [
    {
      name: 'every alternative, once each',
      kind: 'value',
      expr: 'same_numbers(amb_solutions("ramb(1, 2, 3, 4, 5);", 10), list(1, 2, 3, 4, 5))',
      expected: true,
    },
    {
      name: 'not always the same first choice',
      kind: 'value',
      expr: `(() => {
    const first = head(amb_solutions("ramb(1, 2, 3, 4, 5, 6, 7, 8);", 1));
    function differs(k) {
        return k > 0 &&
               (head(amb_solutions("ramb(1, 2, 3, 4, 5, 6, 7, 8);", 1)) !== first ||
                differs(k - 1));
    }
    return differs(15);
})()`,
      expected: true,
    },
    { name: 'ramb() fails', kind: 'value', expr: 'is_null(amb_solutions("ramb();", 1))', expected: true },
    {
      name: 'with a requirement',
      kind: 'value',
      expr: 'same_numbers(amb_solutions("const x = ramb(1, 2, 3, 4); require(x > 2); x;", 10), list(3, 4))',
      expected: true,
    },
    { name: 'amb is unchanged', kind: 'value', expr: 'equal(amb_solutions("amb(1, 2, 3);", 10), list(1, 2, 3))', expected: true },
  ],
  budget: 2_000_000,
  solution: `${isApplicationOf('ramb', 'is_ramb')}

// Like analyze_amb, but each time it picks one of the alternatives left at
// random, and the failure continuation tries the others.
function analyze_ramb(component) {
    const cfuns = map(analyze, amb_choices(component));
    return (env, succeed, fail) => {
               function try_next(choices) {
                   if (is_null(choices)) {
                       return fail();
                   } else {
                       const chosen = list_ref(choices,
                                          math_floor(math_random() *
                                                     length(choices)));
                       return chosen(env,
                                     succeed,
                                     () => try_next(filter(c => c !== chosen,
                                                           choices)));
                   }
               }
               return try_next(cfuns);
           };
}

${analyzeWith(rambClause, 'is_application')}
`,
};

const countingProgram = `let count = 0;
let x = an_element_of(list("a", "b", "c"));
let y = an_element_of(list("a", "b", "c"));
count = count + 1;
require(x !== y);
list(x, y, count);`;

export const exercise_4_49: ExerciseSpec = {
  id: '4.49',
  starter: `// The rest of the amb evaluator follows your declarations.
// Make assignment permanent: not undone when the search backtracks.

${pick(ambEvaluator, 'analyze_assignment')}

const counting = list(
${asLines(countingProgram)});

// The first two values with the original, undoable assignment:
const with_undoable_assignment = null;
`,
  postlude: ambEvaluatorWithout('analyze_assignment'),
  tests: [
    {
      name: 'the trials are counted',
      kind: 'value',
      expr: 'equal(amb_solutions(counting, 2), list(list("a", "b", 2), list("a", "c", 3)))',
      expected: true,
    },
    {
      name: 'the values with undoable assignment',
      kind: 'value',
      expr: 'equal(with_undoable_assignment, list(list("a", "b", 1), list("a", "c", 1)))',
      expected: true,
    },
  ],
  budget: 2_000_000,
  solution: `// The success continuation passes the failure continuation it was given,
// instead of one that restores the old value first.
function analyze_assignment(component) {
    const symbol = assignment_symbol(component);
    const vfun = analyze(assignment_value_expression(component));
    return (env, succeed, fail) =>
             vfun(env,
                  (val, fail2) => {
                      assign_symbol_value(symbol, val, env);
                      return succeed(val, fail2);
                  },
                  fail);
}

const counting = list(
${asLines(countingProgram)});

// Each failure undoes count = count + 1, so count is 1 whenever it is read.
const with_undoable_assignment = list(list("a", "b", 1), list("a", "c", 1));
`,
};

const ifFailClause = `           : is_if_fail(component)
           ? analyze_if_fail(component)
`;

const allOdd = (items: string): string =>
  quoted(`function is_even(n) {
    return n % 2 === 0;
}
if (evaluation_succeeds_take) {
    const x = an_element_of(list(${items}));
    require(is_even(x));
    x;
} else {
    "all odd";
}`);

export const exercise_4_50: ExerciseSpec = {
  id: '4.50',
  starter: `// The rest of the amb evaluator follows your declarations.

function is_if_fail(component) {
    // your answer
}

function analyze_if_fail(component) {
    // your answer
}

// analyze, with a clause for the new form before the one for conditionals.
${analyzeWith(ifFailClause, 'is_conditional')}
`,
  postlude: ambEvaluatorWithout('analyze'),
  tests: [
    { name: 'the failure is caught', kind: 'value', expr: `head(amb_solutions(${allOdd('1, 3, 5')}, 1))`, expected: 'all odd' },
    { name: 'a success is not', kind: 'value', expr: `head(amb_solutions(${allOdd('1, 3, 5, 8')}, 1))`, expected: 8 },
    {
      name: 'ordinary conditionals still work',
      kind: 'value',
      expr: 'equal(amb_solutions("const x = amb(1, 2, 3); if (x === 2) { \\"two\\"; } else { x; }", 5), list(1, "two", 3))',
      expected: true,
    },
  ],
  budget: 2_000_000,
  solution: `function is_if_fail(component) {
    return is_tagged_list(component, "conditional_statement") &&
           is_name(conditional_predicate(component)) &&
           symbol_of_name(conditional_predicate(component)) ===
             "evaluation_succeeds_take";
}

// Run the consequent with a failure continuation that runs the
// alternative instead of failing.
function analyze_if_fail(component) {
    const sfun = analyze(conditional_consequent(component));
    const ffun = analyze(conditional_alternative(component));
    return (env, succeed, fail) =>
             sfun(env, succeed, () => ffun(env, succeed, fail));
}

${analyzeWith(ifFailClause, 'is_conditional')}
`,
};

export const exercise_4_51: ExerciseSpec = {
  id: '4.51',
  starter: `// The value of the program, as a list of lists of numbers:
const pairs_result = null;
`,
  tests: [
    {
      name: 'the value of the program',
      kind: 'value',
      expr: 'equal(pairs_result, list(list(8, 35), list(3, 110), list(3, 20)))',
      expected: true,
    },
  ],
  solution: `// Every pair prime_sum_pair finds is added to pairs, permanently; amb()
// then asks for another, until there are none and the if fails over to
// its alternative. Each new pair goes on the front.
const pairs_result = list(list(8, 35), list(3, 110), list(3, 20));
`,
};

const requireClause = `           : is_require(component)
           ? analyze_require(component)
`;

export const exercise_4_52: ExerciseSpec = {
  id: '4.52',
  starter: `// The rest of the amb evaluator follows your declarations. Since parse
// reads require(...) as an application, require is recognized as amb is.

${isApplicationOf('require', 'is_require')}
function require_predicate(component) {
    return head(arg_expressions(component));
}

function analyze_require(component) {
    const pfun = analyze(require_predicate(component));
    return (env, succeed, fail) =>
             pfun(env,
                  (pred_value, fail2) =>
                    false // your answer
                    ? undefined // your answer
                    : succeed("ok", fail2),
                  fail);
}

// analyze, with a clause for require.
${analyzeWith(requireClause, 'is_application')}
`,
  postlude: ambEvaluatorWithout('analyze'),
  tests: [
    {
      name: 'only the pairs that sum to 7',
      kind: 'value',
      expr: 'equal(amb_solutions("const x = amb(1, 2, 3); const y = amb(4, 5); require(x + y === 7); list(x, y);", 10), list(list(2, 5), list(3, 4)))',
      expected: true,
    },
    { name: 'a false requirement fails', kind: 'value', expr: 'is_null(amb_solutions("require(1 > 2);", 1))', expected: true },
    { name: 'a true one succeeds', kind: 'value', expr: 'equal(amb_solutions("require(2 > 1);", 1), list("ok"))', expected: true },
    {
      name: 'prime_sum_pair',
      kind: 'value',
      expr: `equal(amb_solutions(list(${quoted(ambPrimeSumPair)}, "prime_sum_pair(list(1, 3, 5, 8), list(20, 35, 110));"), 5), list(list(3, 20), list(3, 110), list(8, 35)))`,
      expected: true,
    },
  ],
  budget: 3_000_000,
  solution: `${isApplicationOf('require', 'is_require')}
function require_predicate(component) {
    return head(arg_expressions(component));
}

// A false predicate fails with the failure continuation that came with
// its value, so the search backs up to the most recent choice.
function analyze_require(component) {
    const pfun = analyze(require_predicate(component));
    return (env, succeed, fail) =>
             pfun(env,
                  (pred_value, fail2) =>
                    is_falsy(pred_value)
                    ? fail2()
                    : succeed("ok", fail2),
                  fail);
}

${analyzeWith(requireClause, 'is_application')}
`,
};
