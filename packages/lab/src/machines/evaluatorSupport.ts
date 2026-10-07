import { invoke } from '../evaluator/invoke.ts';
import {
  arrayToList,
  isClosure,
  isPair,
  isPrimitive,
  listToArray,
  stringify,
  typeName,
  type Primitive,
  type Value,
} from '../evaluator/values.ts';
import { SourceError } from '../syntax/errors.ts';
import { parseComponent } from './components.ts';

/**
 * The functions of §4.1 that chapter 5 takes for granted: syntax predicates
 * and selectors over the tagged-list representation, the evaluator's data
 * structures (functions, frames, environments), and the global environment of
 * the language being evaluated. The explicit-control evaluator uses them as
 * machine operations and the compiler of §5.5 calls them directly, so they are
 * written here, in TypeScript, with the names and behaviour the book gives them.
 */

const fail = (message: string): never => {
  throw new SourceError('runtime', message, null);
};

const list = (...items: Value[]): Value => arrayToList(items);

function at(component: Value, index: number): Value {
  let rest = component;
  for (let i = 0; i < index; i++) {
    if (!isPair(rest)) return fail(`list_ref: index ${index} is beyond the end of ${stringify(component)}`);
    rest = rest[1];
  }
  if (!isPair(rest)) return fail(`list_ref: index ${index} is beyond the end of ${stringify(component)}`);
  return rest[0];
}

const elements = (value: Value, what: string): Value[] => {
  const items = listToArray(value);
  return items ?? fail(`${what} expects a list, got ${stringify(value)}`);
};

export const isTaggedList = (component: Value, tag: string): boolean => isPair(component) && component[0] === tag;

/** The operators of the language, by the names `operator_combination_to_application` gives them. */
function operatorFunctions(): [string, Primitive][] {
  const numbers = (op: string, f: (a: number, b: number) => Value) =>
    (a: Value, b: Value): Value =>
      typeof a === 'number' && typeof b === 'number'
        ? f(a, b)
        : fail(`${op} expects two numbers, got ${typeName(a)} and ${typeName(b)}`);
  const ordered = (op: string, f: (a: number | string, b: number | string) => boolean) =>
    (a: Value, b: Value): Value =>
      (typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string')
        ? f(a, b)
        : fail(`${op} expects two numbers or two strings, got ${typeName(a)} and ${typeName(b)}`);
  const table: [string, number, (...args: Value[]) => Value][] = [
    [
      '+',
      2,
      (a, b) =>
        typeof a === 'number' && typeof b === 'number'
          ? a + b
          : typeof a === 'string' && typeof b === 'string'
            ? a + b
            : fail(`+ expects two numbers or two strings, got ${typeName(a)} and ${typeName(b)}`),
    ],
    ['-', 2, numbers('-', (a, b) => a - b)],
    ['*', 2, numbers('*', (a, b) => a * b)],
    ['/', 2, numbers('/', (a, b) => a / b)],
    ['%', 2, numbers('%', (a, b) => a % b)],
    ['===', 2, (a, b) => a === b],
    ['!==', 2, (a, b) => a !== b],
    ['<', 2, ordered('<', (a, b) => a < b)],
    ['>', 2, ordered('>', (a, b) => a > b)],
    ['<=', 2, ordered('<=', (a, b) => a <= b)],
    ['>=', 2, ordered('>=', (a, b) => a >= b)],
    ['-unary', 1, (a) => (typeof a === 'number' ? -a : fail(`- expects a number, got ${typeName(a)}`))],
    ['!', 1, (a) => (typeof a === 'boolean' ? !a : fail(`! expects a boolean, got ${typeName(a)}`))],
  ];
  return table.map(([name, arity, impl]) => [name, { tag: 'primitive', name, arity, impl }]);
}

export interface SupportOptions {
  /** The primitives of the host language, which the evaluated language shares. */
  primitives: readonly Primitive[];
  /** Constants of the global environment, such as `math_PI`. */
  constants: readonly [string, Value][];
  display: (text: string) => void;
  /** The next input for `user_read` and `prompt`, or `null` when there is none. */
  read: () => string | null;
}

/** Every support function, by name, as primitives of the host language. */
export function evaluatorSupport({ primitives, constants, display, read }: SupportOptions): Map<string, Value> {
  const support = new Map<string, Value>();
  const define = (name: string, arity: number | null, impl: (...args: Value[]) => Value): void => {
    support.set(name, { tag: 'primitive', name, arity, impl });
  };
  const selector = (name: string, index: number): void => define(name, 1, (component) => at(component, index));
  const predicate = (name: string, ...tags: string[]): void =>
    define(name, 1, (component) => tags.some((tag) => isTaggedList(component, tag)));
  const symbolOfName = (component: Value): Value => at(component, 1);

  define('is_tagged_list', 2, (component, tag) => isTaggedList(component, String(tag)));
  define('parse', 1, (text) => (typeof text === 'string' ? parseComponent(text) : fail(`parse expects a string, got ${typeName(text)}`)));

  // Literals and names
  predicate('is_literal', 'literal');
  selector('literal_value', 1);
  define('make_literal', 1, (value) => list('literal', value));
  predicate('is_name', 'name');
  selector('symbol_of_name', 1);
  define('make_name', 1, (symbol) => list('name', symbol));

  // Applications
  predicate('is_application', 'application');
  selector('function_expression', 1);
  selector('arg_expressions', 2);
  define('make_application', 2, (fun, args) => list('application', fun, args));

  // Conditionals
  predicate('is_conditional', 'conditional_expression', 'conditional_statement');
  selector('conditional_predicate', 1);
  selector('conditional_consequent', 2);
  selector('conditional_alternative', 3);

  // Lambda expressions
  predicate('is_lambda_expression', 'lambda_expression');
  define('lambda_parameter_symbols', 1, (component) => arrayToList(elements(at(component, 1), 'lambda_parameter_symbols').map(symbolOfName)));
  selector('lambda_body', 2);
  define('make_lambda_expression', 2, (parameters, body) => list('lambda_expression', parameters, body));

  // Sequences and blocks
  predicate('is_sequence', 'sequence');
  selector('sequence_statements', 1);
  define('first_statement', 1, (stmts) => at(stmts, 0));
  define('rest_statements', 1, (stmts) => (isPair(stmts) ? stmts[1] : fail(`rest_statements expects a non-empty list, got ${stringify(stmts)}`)));
  define('is_empty_sequence', 1, (stmts) => stmts === null);
  define('is_last_statement', 1, (stmts) => (isPair(stmts) ? stmts[1] === null : fail(`is_last_statement expects a non-empty list, got ${stringify(stmts)}`)));
  predicate('is_block', 'block');
  selector('block_body', 1);
  define('make_block', 1, (body) => list('block', body));

  // Return statements
  predicate('is_return_statement', 'return_statement');
  selector('return_expression', 1);
  define('make_return_statement', 1, (expression) => list('return_statement', expression));

  // Assignments and declarations
  predicate('is_assignment', 'assignment');
  define('assignment_symbol', 1, (component) => symbolOfName(at(component, 1)));
  selector('assignment_value_expression', 2);
  predicate('is_declaration', 'constant_declaration', 'variable_declaration', 'function_declaration');
  predicate('is_constant_declaration', 'constant_declaration');
  predicate('is_variable_declaration', 'variable_declaration');
  define('declaration_symbol', 1, (component) => symbolOfName(at(component, 1)));
  selector('declaration_value_expression', 2);
  define('make_constant_declaration', 2, (name, value) => list('constant_declaration', name, value));
  predicate('is_function_declaration', 'function_declaration');
  selector('function_declaration_name', 1);
  selector('function_declaration_parameters', 2);
  selector('function_declaration_body', 3);
  define('function_decl_to_constant_decl', 1, (component) =>
    list('constant_declaration', at(component, 1), list('lambda_expression', at(component, 2), at(component, 3))),
  );

  // Operator combinations and logical compositions
  predicate('is_operator_combination', 'unary_operator_combination', 'binary_operator_combination');
  predicate('is_unary_operator_combination', 'unary_operator_combination');
  predicate('is_binary_operator_combination', 'binary_operator_combination');
  predicate('is_logical_composition', 'logical_composition');
  selector('operator_symbol', 1);
  selector('first_operand', 2);
  selector('second_operand', 3);
  define('operator_combination_to_application', 1, (component) => {
    const operator = list('name', at(component, 1));
    return isTaggedList(component, 'unary_operator_combination')
      ? list('application', operator, list(at(component, 2)))
      : list('application', operator, list(at(component, 2), at(component, 3)));
  });

  // Scanning out declarations (§4.1.1)
  const scan = (component: Value): Value[] =>
    isTaggedList(component, 'sequence')
      ? elements(at(component, 1), 'scan_out_declarations').flatMap(scan)
      : isTaggedList(component, 'constant_declaration') ||
          isTaggedList(component, 'variable_declaration') ||
          isTaggedList(component, 'function_declaration')
        ? [symbolOfName(at(component, 1))]
        : [];
  define('scan_out_declarations', 1, (component) => arrayToList(scan(component)));
  define('list_of_unassigned', 1, (symbols) => arrayToList(elements(symbols, 'list_of_unassigned').map(() => '*unassigned*')));

  // Truthiness and functions (§4.1.3)
  const isTruthy = (x: Value): boolean => (typeof x === 'boolean' ? x : fail(`boolean expected, received ${stringify(x)}`));
  define('is_truthy', 1, isTruthy);
  define('is_falsy', 1, (x) => !isTruthy(x));
  define('make_function', 3, (parameters, body, env) => list('compound_function', parameters, body, env));
  predicate('is_compound_function', 'compound_function');
  selector('function_parameters', 1);
  selector('function_body', 2);
  selector('function_environment', 3);

  // Environments as lists of frames, a frame as a pair of lists (§4.1.3)
  define('enclosing_environment', 1, (env) => (isPair(env) ? env[1] : fail('enclosing_environment of the empty environment')));
  define('first_frame', 1, (env) => (isPair(env) ? env[0] : fail('first_frame of the empty environment')));
  define('make_frame', 2, (symbols, values) => [symbols, values]);
  define('frame_symbols', 1, (frame) => (isPair(frame) ? frame[0] : fail(`frame_symbols expects a frame, got ${stringify(frame)}`)));
  define('frame_values', 1, (frame) => (isPair(frame) ? frame[1] : fail(`frame_values expects a frame, got ${stringify(frame)}`)));
  const extendEnvironment = (symbols: Value, values: Value, base: Value): Value => {
    const s = elements(symbols, 'extend_environment');
    const v = elements(values, 'extend_environment');
    if (s.length !== v.length) fail(s.length < v.length ? 'too many arguments supplied' : 'too few arguments supplied');
    return [[symbols, values], base];
  };
  define('extend_environment', 3, extendEnvironment);
  /** The pair whose head holds the symbol's value, searching outward from `env`. */
  const locate = (symbol: Value, env: Value): Value[] | null => {
    for (let e = env; isPair(e); e = e[1]) {
      const frame = e[0];
      if (!isPair(frame)) break;
      let symbols = frame[0];
      let values = frame[1];
      while (isPair(symbols) && isPair(values)) {
        if (symbols[0] === symbol) return values;
        symbols = symbols[1];
        values = values[1];
      }
    }
    return null;
  };
  define('lookup_symbol_value', 2, (symbol, env) => {
    const cell = locate(symbol, env);
    return cell === null ? fail(`Unbound name: ${String(symbol)}`) : (cell[0] as Value);
  });
  define('assign_symbol_value', 3, (symbol, value, env) => {
    const cell = locate(symbol, env);
    if (cell === null) return fail(`Unbound name -- assignment: ${String(symbol)}`);
    cell[0] = value;
    return undefined;
  });
  support.set('the_empty_environment', null);

  // The global environment of the evaluated language (§4.1.4)
  define('is_primitive_function', 1, (fun) => isTaggedList(fun, 'primitive'));
  selector('primitive_implementation', 1);
  define('apply_primitive_function', 2, (fun, argl) => invoke(at(fun, 1), elements(argl, 'apply_primitive_function')));
  const functions: [string, Value][] = [
    ...primitives.map((p): [string, Value] => [p.name, p]),
    ...operatorFunctions(),
  ];
  const setupEnvironment = (): Value =>
    extendEnvironment(
      arrayToList([...functions.map(([name]) => name), 'undefined', ...constants.map(([name]) => name)]),
      arrayToList([...functions.map(([, impl]) => list('primitive', impl)), undefined, ...constants.map(([, value]) => value)]),
      null,
    );
  define('setup_environment', 0, setupEnvironment);
  const theGlobalEnvironment = setupEnvironment();
  support.set('the_global_environment', theGlobalEnvironment);
  let currentEnvironment = theGlobalEnvironment;
  define('get_current_environment', 0, () => currentEnvironment);
  define('set_current_environment', 1, (env) => {
    currentEnvironment = env;
    return undefined;
  });

  // Reading and printing (§4.1.4, §5.4.4)
  define('prompt', null, () => read());
  define('user_read', null, () => read());
  const prepare = (object: Value): Value =>
    isTaggedList(object, 'compound_function')
      ? '< compound-function >'
      : isTaggedList(object, 'compiled_function')
        ? '< compiled-function >'
        : isTaggedList(object, 'primitive')
          ? '< primitive-function >'
          : isPair(object)
            ? [prepare(object[0]), prepare(object[1])]
            : object;
  define('user_print', 2, (prompt, object) => {
    display(`${String(prompt)} ${stringify(prepare(object))}`);
    return undefined;
  });

  // Argument lists (§5.4.1)
  define('empty_arglist', 0, () => null);
  define('adjoin_arg', 2, (value, argl) => arrayToList([...elements(argl, 'adjoin_arg'), value]));
  define('is_last_argument_expression', 1, (args) => (isPair(args) ? args[1] === null : fail('is_last_argument_expression of an empty list')));

  // Compiled functions (§5.5.2)
  define('make_compiled_function', 2, (entry, env) => list('compiled_function', entry, env));
  predicate('is_compiled_function', 'compiled_function');
  selector('compiled_function_entry', 1);
  selector('compiled_function_env', 2);

  return support;
}

/** The operation names of `eceval_operations`, in the order §5.4.4 and §5.5.7 list them. */
export const ECEVAL_OPERATION_NAMES: readonly string[] = [
  'arg_expressions',
  'function_expression',
  'is_null',
  'head',
  'is_last_argument_expression',
  'tail',
  'empty_arglist',
  'adjoin_arg',
  'first_statement',
  'rest_statements',
  'is_last_statement',
  'is_empty_sequence',
  'sequence_statements',
  'is_literal',
  'literal_value',
  'is_name',
  'symbol_of_name',
  'is_assignment',
  'assignment_symbol',
  'assignment_value_expression',
  'assign_symbol_value',
  'is_declaration',
  'declaration_symbol',
  'declaration_value_expression',
  'is_lambda_expression',
  'lambda_parameter_symbols',
  'lambda_body',
  'is_return_statement',
  'return_expression',
  'is_conditional',
  'conditional_predicate',
  'conditional_consequent',
  'conditional_alternative',
  'is_sequence',
  'is_block',
  'block_body',
  'scan_out_declarations',
  'list_of_unassigned',
  'is_application',
  'is_primitive_function',
  'apply_primitive_function',
  'is_compound_function',
  'function_parameters',
  'function_environment',
  'function_body',
  'extend_environment',
  'make_function',
  'lookup_symbol_value',
  'get_current_environment',
  'set_current_environment',
  'is_function_declaration',
  'function_decl_to_constant_decl',
  'is_operator_combination',
  'operator_combination_to_application',
  'is_truthy',
  'is_falsy',
  'parse',
  'user_read',
  'user_print',
  'display',
  'list',
  'pair',
  'make_compiled_function',
  'is_compiled_function',
  'compiled_function_entry',
  'compiled_function_env',
];

export const isFunctionValue = (value: Value): boolean => isClosure(value) || isPrimitive(value);
