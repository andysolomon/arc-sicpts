import { operationTableDefinitions, typeTagDefinitions } from '@sicp/lab';
import { close, type ExerciseSpec } from './spec.ts';

/** Exercises of §2.4. Each export is an ExerciseSpec. */

/** §2.3.2's variables and simplifying constructors, and a way to evaluate an expression at a point. */
const derivSupport = `${operationTableDefinitions}
// An expression is a number, a variable, or a list of an operator and its operands.
type Expression = number | string | ExpressionList;
type ExpressionList = null | [Expression, ExpressionList];

const is_variable = (x: Expression): boolean => is_string(x);

const is_same_variable = (v1: Expression, v2: Expression): boolean =>
  is_variable(v1) && is_variable(v2) && v1 === v2;

const number_equal = (exp: Expression, num: number): boolean =>
  is_number(exp) && exp === num;

const make_sum = (a1: Expression, a2: Expression): Expression =>
  number_equal(a1, 0)
    ? a2
    : number_equal(a2, 0)
    ? a1
    : is_number(a1) && is_number(a2)
    ? a1 + a2
    : list("+", a1, a2);

const make_product = (m1: Expression, m2: Expression): Expression =>
  number_equal(m1, 0) || number_equal(m2, 0)
    ? 0
    : number_equal(m1, 1)
    ? m2
    : number_equal(m2, 1)
    ? m1
    : is_number(m1) && is_number(m2)
    ? m1 * m2
    : list("*", m1, m2);

// The value of an expression in x and y at the given point; the checker's own tool.
const value_at = (exp: Expression, x: number, y: number): number => {
  const arg = (n: number): number => value_at(list_ref(exp, n), x, y);
  return is_number(exp)
    ? exp
    : exp === "x"
    ? x
    : exp === "y"
    ? y
    : head(exp) === "+"
    ? arg(1) + arg(2)
    : head(exp) === "*"
    ? arg(1) * arg(2)
    : head(exp) === "**"
    ? math_pow(arg(1), arg(2))
    : error(exp, "unknown expression -- value_at");
};
`;

const derivDispatch = `const deriv = (exp: Expression, variable: string): Expression =>
  is_number(exp)
    ? 0
    : is_variable(exp)
    ? is_same_variable(exp, variable) ? 1 : 0
    : get("deriv", operator(exp))(operands(exp), variable);

const operator = (exp: Expression): string => head(exp);

const operands = (exp: Expression): List<Expression> => tail(exp);
`;

const derivSwapped = `const deriv_swapped = (exp: Expression, variable: string): Expression =>
  is_number(exp)
    ? 0
    : is_variable(exp)
    ? is_same_variable(exp, variable) ? 1 : 0
    : get(operator(exp), "deriv")(operands(exp), variable);
`;

const reasons = `// (a) Why can't is_number and is_variable be assimilated into the
// data-directed dispatch? Set why to the true reason, one of
//   "a number or a variable has no operator to dispatch on"
//   "the table cannot hold predicates"
//   "numbers and variables have no derivative rules"`;

/** (x y)(x + 3), the book's example, and its derivative's value at x = 2, y = 5. */
const bookExample = 'list("*", list("*", "x", "y"), list("+", "x", 3))';

export const exercise_2_73: ExerciseSpec = {
  id: '2.73',
  prelude: derivSupport,
  starter: `// put and get, is_variable and is_same_variable, and the simplifying
// make_sum and make_product of section 2.3.2 are provided.

${derivDispatch}
${reasons}
const why = "";

// (b) Install the rules for sums, list("+", u, v), and products,
// list("*", u, v). A rule receives the operands and the variable.
const install_sum_and_product = (): "done" => {
  // your answer
};

// (c) Install the rule for exponentiation, list("**", u, n), with n a
// number: the derivative of u to the n is n times u to the n - 1 times
// the derivative of u. Anything to the power 0 is 1, and to the power 1
// is itself.
const install_exponentiation = (): "done" => {
  // your answer
};

install_sum_and_product();
install_exponentiation();

// (d) Suppose the dispatch line looked up get(operator(exp), "deriv"),
// as deriv_swapped does. Make it work by installing the same rules
// under swapped keys, without rewriting them.
${derivSwapped}
const install_swapped = (): "done" => {
  // your answer
};

install_swapped();
`,
  tests: [
    { name: '(a) the reason', kind: 'value', expr: 'why', expected: 'a number or a variable has no operator to dispatch on' },
    { name: '(b) a sum', kind: 'value', expr: 'deriv(list("+", "x", 3), "x")', expected: 1 },
    { name: '(b) a product', kind: 'value', expr: 'deriv(list("*", "x", "y"), "x")', expected: 'y' },
    {
      name: '(b) the book’s example',
      kind: 'value',
      expr: `value_at(deriv(${bookExample}, "x"), 2, 5) + 100 * value_at(deriv(${bookExample}, "y"), 2, 5)`,
      expected: 35 + 100 * 10,
    },
    { name: '(c) x to the 1 and to the 0', kind: 'value', expr: 'deriv(list("**", "x", 1), "x") * 10 + deriv(list("**", "x", 0), "x")', expected: 10 },
    { name: '(c) x squared', kind: 'value', expr: 'equal(deriv(list("**", "x", 2), "x"), list("*", 2, "x"))', expected: true },
    {
      name: '(c) the chain rule',
      kind: 'value',
      expr: 'value_at(deriv(list("**", list("+", list("*", 2, "x"), 1), 3), "x"), 2, 0)',
      expected: 150,
    },
    {
      name: '(d) the same rules under swapped keys',
      kind: 'value',
      expr: 'is_function(get("+", "deriv")) && get("+", "deriv") === get("deriv", "+") && get("*", "deriv") === get("deriv", "*") && get("**", "deriv") === get("deriv", "**")',
      expected: true,
    },
    {
      name: '(d) deriv_swapped differentiates',
      kind: 'value',
      expr: 'value_at(deriv_swapped(list("*", "x", list("**", "x", 3)), "x"), 2, 0)',
      expected: 32,
    },
  ],
  solution: `${derivDispatch}
const why = "a number or a variable has no operator to dispatch on";

const deriv_sum = (operands: List<Expression>, variable: string): Expression =>
  make_sum(deriv(head(operands), variable),
           deriv(head(tail(operands)), variable));

const deriv_product = (operands: List<Expression>, variable: string): Expression => {
  const u = head(operands);
  const v = head(tail(operands));
  return make_sum(make_product(u, deriv(v, variable)),
                  make_product(deriv(u, variable), v));
};

const install_sum_and_product = (): "done" => {
  put("deriv", "+", deriv_sum);
  put("deriv", "*", deriv_product);
  return "done";
};

const make_exp = (base: Expression, exponent: number): Expression =>
  number_equal(exponent, 0)
    ? 1
    : number_equal(exponent, 1)
    ? base
    : list("**", base, exponent);

const deriv_exponentiation = (operands: List<Expression>, variable: string): Expression => {
  const u = head(operands);
  const n = head(tail(operands));
  return make_product(make_product(n, make_exp(u, n - 1)),
                      deriv(u, variable));
};

const install_exponentiation = (): "done" => {
  put("deriv", "**", deriv_exponentiation);
  return "done";
};

install_sum_and_product();
install_exponentiation();

${derivSwapped}
const install_swapped = (): "done" => {
  put("+", "deriv", deriv_sum);
  put("*", "deriv", deriv_product);
  put("**", "deriv", deriv_exponentiation);
  return "done";
};

install_swapped();
`,
};

/** Insatiable's two divisions, each with its own file structure and its own installed package. */
const divisionSupport = `${operationTableDefinitions}
${typeTagDefinitions}
// London: a list of records, each list(name, address, salary).
type LondonRecord = List<string | number>;

const london_records = list(
  list("Ben Bitdiddle", "Slumerville", 60000),
  list("Alyssa P. Hacker", "Cambridge", 40000),
  list("Louis Reasoner", "Slumerville", 30000));

const install_london_package = (): "done" => {
  const get_record = (name: string, file: List<LondonRecord>): LondonRecord | null =>
    is_null(file)
      ? null
      : head(head(file)) === name
      ? head(file)
      : get_record(name, tail(file));
  const get_salary = (record: LondonRecord): number => head(tail(tail(record)));
  put("get_record", list("london"), get_record);
  put("get_salary", list("london"), get_salary);
  return "done";
};

// Tokyo: a binary tree ordered by name, each node list(record, left, right),
// and each record a list of pairs keyed "name", "address" and "salary".
type TokyoRecord = List<Pair<string, string | number>>;
type TokyoTree = null | [TokyoRecord | TokyoTree, TokyoTree];

const tokyo_record = (name: string, address: string, salary: number): TokyoRecord =>
  list(pair("name", name), pair("address", address), pair("salary", salary));

const tokyo_records = list(
  tokyo_record("Eva Lu Ator", "Weston", 40000),
  list(tokyo_record("Cy D. Fect", "Cambridge", 35000), null, null),
  list(tokyo_record("Lem E. Tweakit", "Boston", 25000), null, null));

const install_tokyo_package = (): "done" => {
  const lookup = (key: string, record: TokyoRecord): string | number =>
    head(head(record)) === key ? tail(head(record)) : lookup(key, tail(record));
  const get_record = (name: string, tree: TokyoTree): TokyoRecord | null => {
    if (is_null(tree)) {
      return null;
    } else {
      const record = head(tree);
      const here = lookup("name", record);
      return name === here
        ? record
        : name < here
        ? get_record(name, head(tail(tree)))
        : get_record(name, head(tail(tail(tree))));
    }
  };
  put("get_record", list("tokyo"), get_record);
  put("get_salary", list("tokyo"), record => lookup("salary", record));
  return "done";
};

install_london_package();
install_tokyo_package();

// Lagos, newly acquired: a list of pairs, each pair(name, pair(salary, address)).
const lagos_records = list(
  pair("Oliver Warbucks", pair(150000, "Swellesley")),
  pair("Robert Cratchet", pair(18000, "Allston")));
`;

export const exercise_2_74: ExerciseSpec = {
  id: '2.74',
  prelude: divisionSupport,
  starter: `// Provided: put, get, attach_tag, type_tag and contents, and two
// divisions' untagged files, london_records and tokyo_records.
// London keeps a list of records list(name, address, salary); Tokyo keeps
// a binary tree of records ordered by name. Each division has installed,
// under its own type, list("london") or list("tokyo"):
//   "get_record": (name, file) => the employee's record, or null
//   "get_salary": record => the salary in that record
// Both work on the division's own, untagged, data.

// (a) Headquarters' files carry the type information: tag each one with
// its division's name. Then write get_record, which returns the record,
// itself tagged with the division's name, or null.
const london_file = london_records;  // your answer
const tokyo_file = tokyo_records;    // your answer

const get_record = (name: string, file: Tagged<unknown>): Tagged<unknown> | null => {
  // your answer
};

// (b) The salary in a record that get_record returned, from any division.
const get_salary = (record: Tagged<unknown>): number => {
  // your answer
};

// (c) Search a list of division files; return the record, or null.
const find_employee_record = (name: string, files: List<Tagged<unknown>>): Tagged<unknown> | null => {
  // your answer
};

// (d) Insatiable takes over a company in Lagos. Its file, lagos_records,
// is a list of pairs, each pair(name, pair(salary, address)). Bring it
// into the system without changing anything above.
const install_lagos_package = (): "done" => {
  // your answer
};

install_lagos_package();
const lagos_file = lagos_records;    // your answer
`,
  tests: [
    {
      name: '(a) a record from London, tagged',
      kind: 'value',
      expr: 'type_tag(get_record("Alyssa P. Hacker", london_file)) === "london" && is_null(get_record("Eva Lu Ator", london_file))',
      expected: true,
    },
    {
      name: '(a) a record from Tokyo, tagged',
      kind: 'value',
      expr: 'type_tag(get_record("Lem E. Tweakit", tokyo_file)) === "tokyo" && is_null(get_record("Ben Bitdiddle", tokyo_file))',
      expected: true,
    },
    {
      name: '(b) salaries from both divisions',
      kind: 'value',
      expr: 'get_salary(get_record("Ben Bitdiddle", london_file)) + get_salary(get_record("Cy D. Fect", tokyo_file))',
      expected: 95000,
    },
    {
      name: '(c) found in whichever division has the employee',
      kind: 'value',
      expr: 'get_salary(find_employee_record("Eva Lu Ator", list(london_file, tokyo_file))) + get_salary(find_employee_record("Louis Reasoner", list(london_file, tokyo_file)))',
      expected: 70000,
    },
    {
      name: '(c) null for someone nobody employs',
      kind: 'value',
      expr: 'find_employee_record("Alonzo Church", list(london_file, tokyo_file))',
      expected: null,
    },
    {
      name: '(d) Lagos joins the search',
      kind: 'value',
      expr: 'get_salary(find_employee_record("Robert Cratchet", list(london_file, tokyo_file, lagos_file))) + get_salary(find_employee_record("Cy D. Fect", list(lagos_file, tokyo_file)))',
      expected: 53000,
    },
  ],
  solution: `const london_file = attach_tag("london", london_records);
const tokyo_file = attach_tag("tokyo", tokyo_records);

const get_record = (name: string, file: Tagged<unknown>): Tagged<unknown> | null => {
  const division = type_tag(file);
  const record = get("get_record", list(division))(name, contents(file));
  return is_null(record) ? null : attach_tag(division, record);
};

const get_salary = (record: Tagged<unknown>): number =>
  get("get_salary", list(type_tag(record)))(contents(record));

const find_employee_record = (name: string, files: List<Tagged<unknown>>): Tagged<unknown> | null => {
  if (is_null(files)) {
    return null;
  } else {
    const record = get_record(name, head(files));
    return is_null(record)
      ? find_employee_record(name, tail(files))
      : record;
  }
};

// Lagos keeps each record as pair(salary, address), filed under the name.
type LagosRecord = Pair<number, string>;

const install_lagos_package = (): "done" => {
  const get_record = (name: string, file: List<Pair<string, LagosRecord>>): LagosRecord | null =>
    is_null(file)
      ? null
      : head(head(file)) === name
      ? tail(head(file))
      : get_record(name, tail(file));
  put("get_record", list("lagos"), get_record);
  put("get_salary", list("lagos"), record => head(record));
  return "done";
};

install_lagos_package();
const lagos_file = attach_tag("lagos", lagos_records);
`,
};

/** Message-passing complex numbers from rectangular parts, and the generic selectors. */
const messagePassingSupport = `// A complex number is a function that answers the name of an operation.
type Complex = (op: string) => number;

const square = (x: number): number => x * x;

const make_from_real_imag = (x: number, y: number): Complex => {
  const dispatch = (op: string): number =>
    op === "real_part"
      ? x
      : op === "imag_part"
      ? y
      : op === "magnitude"
      ? math_sqrt(square(x) + square(y))
      : op === "angle"
      ? math_atan2(y, x)
      : error(op, "unknown op -- make_from_real_imag");
  return dispatch;
};

const apply_generic = (op: string, ...args: List<Complex>): number => head(args)(op);

const real_part = (z: Complex): number => apply_generic("real_part", z);

const imag_part = (z: Complex): number => apply_generic("imag_part", z);

const magnitude = (z: Complex): number => apply_generic("magnitude", z);

const angle = (z: Complex): number => apply_generic("angle", z);
`;

export const exercise_2_75: ExerciseSpec = {
  id: '2.75',
  prelude: messagePassingSupport,
  starter: `// square, the message-passing make_from_real_imag, apply_generic, and the
// selectors real_part, imag_part, magnitude and angle are provided.

const make_from_mag_ang = (r: number, a: number): Complex => {
  // your answer
};
`,
  tests: [
    { name: 'magnitude and angle as given', kind: 'value', expr: 'magnitude(make_from_mag_ang(5, 0.5)) * 10 + angle(make_from_mag_ang(5, 0.5))', expected: 50.5 },
    { name: 'the real part', kind: 'value', expr: close('real_part(make_from_mag_ang(2, math_PI / 3))', 1, 1e-12), expected: true },
    { name: 'the imaginary part', kind: 'value', expr: close('imag_part(make_from_mag_ang(2, math_PI / 3))', Math.sqrt(3), 1e-12), expected: true },
    { name: 'an unknown operation is an error', kind: 'error', call: 'make_from_mag_ang(1, 0)("conjugate")', message: 'unknown op' },
    { name: 'a data object is a function', kind: 'value', expr: 'is_function(make_from_mag_ang(1, 0)) && make_from_mag_ang(3, 1)("magnitude") === 3', expected: true },
    {
      name: 'i times i, multiplied in polar form',
      kind: 'value',
      expr: close(
        'real_part(make_from_mag_ang(magnitude(make_from_real_imag(0, 1)) * magnitude(make_from_real_imag(0, 1)), angle(make_from_real_imag(0, 1)) + angle(make_from_real_imag(0, 1))))',
        -1,
        1e-12,
      ),
      expected: true,
    },
  ],
  solution: `const make_from_mag_ang = (r: number, a: number): Complex => {
  const dispatch = (op: string): number =>
    op === "real_part"
      ? r * math_cos(a)
      : op === "imag_part"
      ? r * math_sin(a)
      : op === "magnitude"
      ? r
      : op === "angle"
      ? a
      : error(op, "unknown op -- make_from_mag_ang");
  return dispatch;
};
`,
};

const strategies = 'list("explicit dispatch", "data-directed", "message passing")';

export const exercise_2_76: ExerciseSpec = {
  id: '2.76',
  starter: `// The strategies are "explicit dispatch", "data-directed" and "message passing";
// the additions are "new type" and "new operation". For each strategy and
// addition, say what existing code must be edited, as one of
//   "nothing"                  only new code is written
//   "every generic operation"  each generic operation gains a clause
//   "every type"               each type's code gains a case
// Take a data-directed package's internal functions to be local to its
// installation function, as Ben's and Alyssa's are.
const edits = (strategy: string, addition: string): string => {
  // your answer
  return "";
};

// Which organization suits a system to which new types must often be
// added? Which suits one to which new operations must often be added?
const for_new_types = "";       // your answer
const for_new_operations = "";  // your answer
`,
  tests: [
    {
      name: 'explicit dispatch',
      kind: 'value',
      expr: 'edits("explicit dispatch", "new type") === "every generic operation" && edits("explicit dispatch", "new operation") === "nothing"',
      expected: true,
    },
    {
      name: 'data-directed style',
      kind: 'value',
      expr: 'edits("data-directed", "new type") === "nothing" && edits("data-directed", "new operation") === "every type"',
      expected: true,
    },
    {
      name: 'message passing',
      kind: 'value',
      expr: 'edits("message passing", "new type") === "nothing" && edits("message passing", "new operation") === "every type"',
      expected: true,
    },
    {
      name: 'frequent new types',
      kind: 'value',
      expr: `member(for_new_types, ${strategies}) !== null && edits(for_new_types, "new type") === "nothing"`,
      expected: true,
    },
    {
      name: 'frequent new operations',
      kind: 'value',
      expr: `member(for_new_operations, ${strategies}) !== null && edits(for_new_operations, "new operation") === "nothing"`,
      expected: true,
    },
  ],
  solution: `const edits = (strategy: string, addition: string): string =>
  strategy === "explicit dispatch"
    ? (addition === "new type" ? "every generic operation" : "nothing")
    : addition === "new type"
    ? "nothing"
    : "every type";

const for_new_types = "message passing";
const for_new_operations = "explicit dispatch";
`,
};
