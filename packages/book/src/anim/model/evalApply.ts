import type { WatchedCall } from '@sicp/lab';
import { isPairRead, itemsOf, readValue, show, type Read } from './taggedList.ts';

/**
 * The calls of the metacircular evaluator's `evaluate` and `apply`, as the
 * steps of the cycle of §4.1.1: what each call was given, in the book's terms,
 * and what it produced.
 */

export interface CycleStep {
  n: number;
  kind: 'evaluate' | 'apply';
  /** Number of watched calls pending below this one. */
  level: number;
  /** Short description of the argument, e.g. `name "x"` or `compound (x) to 3`. */
  summary: string;
  /** What the evaluator does with it, for the caption. */
  explanation: string;
  /** The value the call produced, or `null` when a tail call replaced it. */
  value: string | null;
  /** Calls still pending when this one started, outermost first. */
  ancestors: number[];
}

const nameOf = (v: Read): string => {
  const items = itemsOf(v);
  return typeof items[1] === 'string' ? items[1] : '?';
};

function describeComponent(text: string): { summary: string; explanation: string } {
  const v = readValue(text);
  if (!isPairRead(v) || typeof v[0] !== 'string') return { summary: text, explanation: '`evaluate` is given a component.' };
  const tag = v[0];
  const items = itemsOf(v);
  switch (tag) {
    case 'literal':
      return { summary: `literal ${show(items[1] as Read)}`, explanation: `a literal: its value is \`${show(items[1] as Read)}\`, with no more work.` };
    case 'name':
      return { summary: `name ${nameOf(v)}`, explanation: `a name: \`lookup_symbol_value\` finds \`${nameOf(v)}\` in the environment.` };
    case 'application': {
      const fun = items[1] as Read;
      const what = isPairRead(fun) && fun[0] === 'name' ? `\`${nameOf(fun)}\`` : 'the function expression';
      return {
        summary: `application of ${isPairRead(fun) && fun[0] === 'name' ? nameOf(fun) : '…'}`,
        explanation: `an application: evaluate ${what} and each argument expression, then hand the results to \`apply\`.`,
      };
    }
    case 'binary_operator_combination':
    case 'unary_operator_combination':
      return {
        summary: `operator combination ${show(items[1] as Read)}`,
        explanation: `an operator combination: rewritten as an application of the name ${show(items[1] as Read)} and evaluated again.`,
      };
    case 'conditional_expression':
    case 'conditional_statement':
      return { summary: 'conditional', explanation: 'a conditional: evaluate the predicate, then only the branch it chooses.' };
    case 'lambda_expression':
      return {
        summary: 'lambda expression',
        explanation: 'a lambda expression: `make_function` packages its parameters and body with the current environment.',
      };
    case 'sequence':
      return { summary: 'sequence', explanation: 'a sequence: evaluate the statements in order, stopping at a return value.' };
    case 'block':
      return {
        summary: 'block',
        explanation: 'a block: scan out its declarations, extend the environment with a frame for them, and evaluate the body there.',
      };
    case 'return_statement':
      return { summary: 'return statement', explanation: 'a return statement: evaluate the expression and wrap it as a return value.' };
    case 'function_declaration':
      return {
        summary: `function declaration ${nameOf(items[1] ?? null) === '?' ? '' : nameOf(items[1] ?? null)}`.trim(),
        explanation: 'a function declaration: a derived component, rewritten as a constant declared as a lambda expression.',
      };
    case 'constant_declaration':
    case 'variable_declaration':
      return {
        summary: `declaration of ${nameOf(items[1] ?? null)}`,
        explanation: `a declaration: evaluate the value expression and put it in place of \`"*unassigned*"\` for \`${nameOf(items[1] ?? null)}\`.`,
      };
    case 'assignment':
      return { summary: `assignment to ${nameOf(items[1] ?? null)}`, explanation: 'an assignment: evaluate the value and change the binding.' };
    default:
      return { summary: tag, explanation: `a \`${tag}\`.` };
  }
}

const argList = (text: string | undefined): string =>
  text === undefined ? '' : itemsOf(readValue(text)).map((v) => show(v, 24)).join(', ');

function describeApplication(funText: string, argsText: string | undefined): { summary: string; explanation: string } {
  const fun = readValue(funText);
  const args = argList(argsText);
  if (isPairRead(fun) && fun[0] === 'compound_function') {
    const params = itemsOf(itemsOf(fun)[1] ?? null).map((p) => (typeof p === 'string' ? p : '?'));
    return {
      summary: `compound (${params.join(', ')}) to ${args === '' ? 'no arguments' : args}`,
      explanation: `\`apply\` a compound function: extend its environment by a frame binding ${
        params.length === 0 ? 'no parameters' : params.map((p) => `\`${p}\``).join(', ')
      } to ${args === '' ? 'nothing' : `\`${args}\``}, and evaluate its body there.`,
    };
  }
  return {
    summary: `primitive to ${args === '' ? 'no arguments' : args}`,
    explanation: `\`apply\` a primitive function: the underlying JavaScript applies it to \`${args}\`.`,
  };
}

export function cycleSteps(calls: readonly WatchedCall[]): CycleStep[] {
  const byNumber = new Map(calls.map((call) => [call.n, call]));
  return calls.map((call) => {
    const ancestors: number[] = [];
    for (let p = call.parent; p !== null; p = byNumber.get(p)?.parent ?? null) ancestors.unshift(p);
    const kind = call.name === 'apply' ? 'apply' : 'evaluate';
    const { summary, explanation } =
      kind === 'apply' ? describeApplication(call.args[0] ?? '', call.args[1]) : describeComponent(call.args[0] ?? '');
    return {
      n: call.n,
      kind,
      level: ancestors.length,
      summary,
      explanation,
      value: call.value === undefined ? null : show(readValue(call.value), 32),
      ancestors,
    };
  });
}
