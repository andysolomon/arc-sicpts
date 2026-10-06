import {
  createGlobalEnvironment,
  isPrimitive,
  lookup,
  parse,
  SourceError,
  stringify,
  type Expression,
  type Lambda,
  type Primitive,
  type Statement,
  type Value,
} from '@sicp/lab';

/**
 * The substitution model of §1.1.5, as a rewriting system on the program text.
 * It is a model of evaluation, not the evaluator: the Laboratory's machine
 * never rewrites anything. The Book draws these rewrites beside what the
 * machine actually does, and tests check that the two agree on every value.
 */

export type Order = 'applicative' | 'normal';

export type LiteralValue = number | string | boolean | null | undefined;

export type Term =
  | { id: number; kind: 'lit'; value: LiteralValue }
  | { id: number; kind: 'name'; symbol: string }
  | { id: number; kind: 'binary'; operator: string; left: Term; right: Term }
  | { id: number; kind: 'unary'; operator: string; operand: Term }
  | { id: number; kind: 'logical'; operator: string; left: Term; right: Term }
  | { id: number; kind: 'conditional'; test: Term; consequent: Term; alternative: Term }
  | { id: number; kind: 'application'; fun: Term; args: Term[] }
  /** A part of the program the model does not describe, shown as text. */
  | { id: number; kind: 'opaque'; text: string };

export type Rule = 'start' | 'operator' | 'primitive' | 'apply' | 'conditional' | 'logical' | 'name' | 'done' | 'stuck';

export interface RewriteStep {
  /** The expression after this many rewrites. */
  term: Term;
  /** Id of the sub-term that the next rewrite replaces; null when finished or stuck. */
  redex: number | null;
  /** How this step's term came about. */
  rule: Rule;
  caption: string;
  /** Everything `display` has printed so far. */
  output: string[];
}

export interface Rewrite {
  /** Text of the statement, as written. */
  label: string;
  steps: RewriteStep[];
  /** True when the step limit stopped the rewriting. */
  truncated: boolean;
  /** Why rewriting could not continue, when it could not. */
  stuck: string | null;
}

export interface SubstitutionResult {
  statements: Rewrite[];
  /** A parse error, which leaves no statements. */
  error: string | null;
}

type Known =
  | { kind: 'constant'; value: LiteralValue }
  | { kind: 'function'; name: string; params: string[]; body: Expression | null }
  | { kind: 'primitive'; primitive: Primitive };

const isLiteralValue = (value: Value): value is LiteralValue =>
  value === null || value === undefined || typeof value !== 'object';

/** Operator precedence, as the grammar has it; higher binds tighter. */
export function precedence(term: Term): number {
  switch (term.kind) {
    case 'conditional':
      return 1;
    case 'logical':
      return term.operator === '||' ? 2 : 3;
    case 'binary':
      switch (term.operator) {
        case '===':
        case '!==':
          return 4;
        case '<':
        case '>':
        case '<=':
        case '>=':
          return 5;
        case '+':
        case '-':
          return 6;
        default:
          return 7;
      }
    case 'unary':
      return 8;
    default:
      return 9;
  }
}

export type TokenRole = 'num' | 'str' | 'bool' | 'name' | 'op' | 'punct' | 'opaque';

export interface Token {
  /** Stable across rewrites for text that survives them. */
  key: string;
  text: string;
  role: TokenRole;
  /** The term the token belongs to. */
  id: number;
}

export function literalText(value: LiteralValue): string {
  return stringify(value);
}

const isNegative = (term: Term): boolean => term.kind === 'lit' && typeof term.value === 'number' && term.value < 0;

/** The term as tokens, with the fewest parentheses that keep its structure. */
export function tokens(term: Term, out: Token[] = []): Token[] {
  const child = (node: Term, needParens: boolean): void => {
    if (needParens) out.push({ key: `${node.id}:(`, text: '(', role: 'punct', id: node.id });
    tokens(node, out);
    if (needParens) out.push({ key: `${node.id}:)`, text: ')', role: 'punct', id: node.id });
  };
  const own = precedence(term);
  switch (term.kind) {
    case 'lit': {
      const role: TokenRole = typeof term.value === 'number' ? 'num' : typeof term.value === 'string' ? 'str' : 'bool';
      out.push({ key: `${term.id}:v`, text: literalText(term.value), role, id: term.id });
      return out;
    }
    case 'name':
      out.push({ key: `${term.id}:n`, text: term.symbol, role: 'name', id: term.id });
      return out;
    case 'opaque':
      out.push({ key: `${term.id}:o`, text: term.text, role: 'opaque', id: term.id });
      return out;
    case 'unary':
      out.push({ key: `${term.id}:op`, text: term.operator, role: 'op', id: term.id });
      child(term.operand, precedence(term.operand) < own || isNegative(term.operand));
      return out;
    case 'binary':
    case 'logical':
      child(term.left, precedence(term.left) < own);
      out.push({ key: `${term.id}:op`, text: ` ${term.operator} `, role: 'op', id: term.id });
      // Operators group from the left, so an equal-strength right operand keeps its parentheses.
      child(term.right, precedence(term.right) <= own || (isNegative(term.right) && (term.operator === '-' || term.operator === '+')));
      return out;
    case 'conditional':
      child(term.test, precedence(term.test) <= own);
      out.push({ key: `${term.id}:?`, text: ' ? ', role: 'op', id: term.id });
      child(term.consequent, false);
      out.push({ key: `${term.id}::`, text: ' : ', role: 'op', id: term.id });
      child(term.alternative, false);
      return out;
    case 'application':
      child(term.fun, precedence(term.fun) < own);
      out.push({ key: `${term.id}:(`, text: '(', role: 'punct', id: term.id });
      term.args.forEach((arg, i) => {
        if (i > 0) out.push({ key: `${term.id}:,${i}`, text: ', ', role: 'punct', id: term.id });
        child(arg, false);
      });
      out.push({ key: `${term.id}:)`, text: ')', role: 'punct', id: term.id });
      return out;
  }
}

export const print = (term: Term): string => tokens(term).map((token) => token.text).join('');

/** Every id in the term, for telling what a rewrite removed. */
export function ids(term: Term, out = new Set<number>()): Set<number> {
  out.add(term.id);
  switch (term.kind) {
    case 'binary':
    case 'logical':
      ids(term.left, out);
      ids(term.right, out);
      break;
    case 'unary':
      ids(term.operand, out);
      break;
    case 'conditional':
      ids(term.test, out);
      ids(term.consequent, out);
      ids(term.alternative, out);
      break;
    case 'application':
      ids(term.fun, out);
      for (const arg of term.args) ids(arg, out);
      break;
    default:
      break;
  }
  return out;
}

export function find(term: Term, id: number): Term | null {
  if (term.id === id) return term;
  switch (term.kind) {
    case 'binary':
    case 'logical':
      return find(term.left, id) ?? find(term.right, id);
    case 'unary':
      return find(term.operand, id);
    case 'conditional':
      return find(term.test, id) ?? find(term.consequent, id) ?? find(term.alternative, id);
    case 'application':
      return find(term.fun, id) ?? term.args.reduce<Term | null>((found, arg) => found ?? find(arg, id), null);
    default:
      return null;
  }
}

export interface SubstitutionOptions {
  order?: Order;
  /** Rewrites allowed per statement before giving up. */
  maxSteps?: number;
}

class Stuck extends Error {}

/** The single `return` expression of a function body, or null when the model does not cover the body. */
function returnExpression(lambda: Lambda): Expression | null {
  if (lambda.body.kind !== 'block') return lambda.body;
  const statements = lambda.body.body;
  const last = statements[statements.length - 1];
  if (statements.length !== 1 || last === undefined || last.kind !== 'return') return null;
  return last.argument;
}

export function substitution(source: string, { order = 'applicative', maxSteps = 120 }: SubstitutionOptions = {}): SubstitutionResult {
  let program;
  try {
    program = parse(source);
  } catch (error) {
    return { statements: [], error: error instanceof SourceError ? error.message : String(error) };
  }

  let nextId = 1;
  const fresh = (): number => nextId++;
  const output: string[] = [];
  const globals = createGlobalEnvironment((text) => output.push(text));
  const known = new Map<string, Known>();
  const text = (node: { loc: { start: number; end: number } }): string =>
    source.slice(node.loc.start, node.loc.end).replace(/\s+/g, ' ').replace(/;$/, '');

  const resolve = (symbol: string): Known | null => {
    const own = known.get(symbol);
    if (own !== undefined) return own;
    const found = lookup(globals, symbol);
    if (found.status === 'found' && isPrimitive(found.binding.value)) {
      return { kind: 'primitive', primitive: found.binding.value };
    }
    return null;
  };

  /** Convert syntax to a term, replacing parameters by copies of their arguments. */
  const toTerm = (node: Expression, env: ReadonlyMap<string, Term>): Term => {
    switch (node.kind) {
      case 'literal':
        return { id: fresh(), kind: 'lit', value: node.value };
      case 'name': {
        const bound = env.get(node.symbol);
        return bound !== undefined ? copy(bound) : { id: fresh(), kind: 'name', symbol: node.symbol };
      }
      case 'binary':
        return { id: fresh(), kind: 'binary', operator: node.operator, left: toTerm(node.left, env), right: toTerm(node.right, env) };
      case 'logical':
        return { id: fresh(), kind: 'logical', operator: node.operator, left: toTerm(node.left, env), right: toTerm(node.right, env) };
      case 'unary':
        return { id: fresh(), kind: 'unary', operator: node.operator, operand: toTerm(node.operand, env) };
      case 'conditional':
        return {
          id: fresh(),
          kind: 'conditional',
          test: toTerm(node.test, env),
          consequent: toTerm(node.consequent, env),
          alternative: toTerm(node.alternative, env),
        };
      case 'application':
        return { id: fresh(), kind: 'application', fun: toTerm(node.fun, env), args: node.args.map((arg) => toTerm(arg, env)) };
      case 'lambda':
      case 'assignment':
        return { id: fresh(), kind: 'opaque', text: text(node) };
    }
  };

  const copy = (term: Term): Term => {
    const id = fresh();
    switch (term.kind) {
      case 'lit':
      case 'name':
      case 'opaque':
        return { ...term, id };
      case 'binary':
      case 'logical':
        return { ...term, id, left: copy(term.left), right: copy(term.right) };
      case 'unary':
        return { ...term, id, operand: copy(term.operand) };
      case 'conditional':
        return { ...term, id, test: copy(term.test), consequent: copy(term.consequent), alternative: copy(term.alternative) };
      case 'application':
        return { ...term, id, fun: copy(term.fun), args: term.args.map(copy) };
    }
  };

  const isLit = (term: Term): term is Extract<Term, { kind: 'lit' }> => term.kind === 'lit';

  const compoundName = (fun: Term): string | null => {
    if (fun.kind !== 'name') return null;
    const target = resolve(fun.symbol);
    return target?.kind === 'function' ? fun.symbol : null;
  };

  /** The sub-term the next rewrite replaces, or null when there is none. */
  const redex = (term: Term): Term | null => {
    switch (term.kind) {
      case 'lit':
      case 'opaque':
        return null;
      case 'name': {
        const target = resolve(term.symbol);
        if (target === null) throw new Stuck(`Name ${term.symbol} not declared`);
        return target.kind === 'constant' ? term : null;
      }
      case 'unary': {
        const inner = redex(term.operand);
        if (inner !== null) return inner;
        return isLit(term.operand) ? term : null;
      }
      case 'binary': {
        const left = redex(term.left);
        if (left !== null) return left;
        const right = redex(term.right);
        if (right !== null) return right;
        return isLit(term.left) && isLit(term.right) ? term : null;
      }
      case 'logical': {
        const left = redex(term.left);
        if (left !== null) return left;
        return isLit(term.left) ? term : null;
      }
      case 'conditional': {
        const test = redex(term.test);
        if (test !== null) return test;
        return isLit(term.test) ? term : null;
      }
      case 'application': {
        const fun = redex(term.fun);
        if (fun !== null) return fun;
        if (order === 'normal' && compoundName(term.fun) !== null) return term;
        for (const arg of term.args) {
          const inner = redex(arg);
          if (inner !== null) return inner;
        }
        return term.args.every(isLit) ? term : null;
      }
    }
  };

  const expectNumber = (value: LiteralValue, operator: string, side?: string): number => {
    if (typeof value !== 'number') {
      throw new Stuck(`${operator} expects ${side ?? 'a number'}, got ${typeof value}`);
    }
    return value;
  };

  const operate = (operator: string, left: LiteralValue, right: LiteralValue): LiteralValue => {
    if (operator === '===') return left === right;
    if (operator === '!==') return left !== right;
    if (typeof left === 'string' && typeof right === 'string') {
      switch (operator) {
        case '+':
          return left + right;
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
        default:
          break;
      }
    }
    const a = expectNumber(left, operator, 'two numbers');
    const b = expectNumber(right, operator, 'two numbers');
    switch (operator) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '*':
        return a * b;
      case '/':
        return a / b;
      case '%':
        return a % b;
      case '<':
        return a < b;
      case '>':
        return a > b;
      case '<=':
        return a <= b;
      default:
        return a >= b;
    }
  };

  /** Replace the sub-term `id` by `replacement`. */
  const replace = (term: Term, id: number, replacement: Term): Term => {
    if (term.id === id) return replacement;
    switch (term.kind) {
      case 'binary':
      case 'logical':
        return { ...term, left: replace(term.left, id, replacement), right: replace(term.right, id, replacement) };
      case 'unary':
        return { ...term, operand: replace(term.operand, id, replacement) };
      case 'conditional':
        return {
          ...term,
          test: replace(term.test, id, replacement),
          consequent: replace(term.consequent, id, replacement),
          alternative: replace(term.alternative, id, replacement),
        };
      case 'application':
        return { ...term, fun: replace(term.fun, id, replacement), args: term.args.map((arg) => replace(arg, id, replacement)) };
      default:
        return term;
    }
  };

  const lit = (value: LiteralValue, id: number): Term => ({ id, kind: 'lit', value });
  const q = (term: Term): string => `\`${print(term)}\``;

  /** One rewrite of `target` inside `whole`; returns the new term and a caption. */
  const rewrite = (whole: Term, target: Term): { term: Term; rule: Rule; caption: string } => {
    switch (target.kind) {
      case 'name': {
        const target_ = resolve(target.symbol);
        if (target_?.kind !== 'constant') throw new Stuck(`Name ${target.symbol} is not a constant`);
        return {
          term: replace(whole, target.id, lit(target_.value, fresh())),
          rule: 'name',
          caption: `\`${target.symbol}\` names ${literalText(target_.value)}: look it up in the environment.`,
        };
      }
      case 'unary': {
        if (!isLit(target.operand)) throw new Stuck('operand is not a value');
        const value = target.operator === '!' ? !target.operand.value : -expectNumber(target.operand.value, '-');
        if (target.operator === '!' && typeof target.operand.value !== 'boolean') throw new Stuck('! expects a boolean');
        return {
          term: replace(whole, target.id, lit(value, fresh())),
          rule: 'operator',
          caption: `Apply \`${target.operator}\` to ${literalText(target.operand.value)}: ${q(target)} → ${literalText(value)}.`,
        };
      }
      case 'binary': {
        if (!isLit(target.left) || !isLit(target.right)) throw new Stuck('operands are not values');
        const value = operate(target.operator, target.left.value, target.right.value);
        return {
          term: replace(whole, target.id, lit(value, fresh())),
          rule: 'operator',
          caption: `Apply the primitive \`${target.operator}\` to ${literalText(target.left.value)} and ${literalText(target.right.value)}: ${q(target)} → ${literalText(value)}.`,
        };
      }
      case 'logical': {
        if (!isLit(target.left) || typeof target.left.value !== 'boolean') throw new Stuck(`${target.operator} expects a boolean on the left`);
        const decides = (target.operator === '&&') !== target.left.value;
        const replacement = decides ? lit(target.left.value, fresh()) : target.right;
        return {
          term: replace(whole, target.id, replacement),
          rule: 'logical',
          caption: decides
            ? `\`${target.operator}\` with a ${target.left.value ? 'true' : 'false'} left side is ${literalText(target.left.value)}. The right side, ${q(target.right)}, is never looked at.`
            : `\`${target.operator}\` with a ${target.left.value ? 'true' : 'false'} left side is whatever the right side is: keep ${q(target.right)}.`,
        };
      }
      case 'conditional': {
        if (!isLit(target.test) || typeof target.test.value !== 'boolean') throw new Stuck('the test of a conditional must be a boolean');
        const taken = target.test.value ? target.consequent : target.alternative;
        const dropped = target.test.value ? target.alternative : target.consequent;
        return {
          term: replace(whole, target.id, taken),
          rule: 'conditional',
          caption: `The test is ${target.test.value ? 'true' : 'false'}: keep ${q(taken)} and drop ${q(dropped)}, which is never evaluated.`,
        };
      }
      case 'application': {
        const name = target.fun.kind === 'name' ? target.fun.symbol : null;
        const target_ = name === null ? null : resolve(name);
        if (target_ === null || name === null) throw new Stuck(`${q(target.fun)} is not a function the model knows`);
        if (target_.kind === 'constant') throw new Stuck(`Cannot apply ${literalText(target_.value)}: it is not a function`);
        if (target_.kind === 'primitive') {
          if (!target.args.every(isLit)) throw new Stuck('arguments are not values');
          const args = target.args.map((arg) => arg.value);
          const before = output.length;
          let value: Value;
          try {
            value = target_.primitive.impl(...args);
          } catch (error) {
            throw new Stuck(error instanceof Error ? error.message : String(error));
          }
          if (!isLiteralValue(value)) throw new Stuck(`${name} returned a value the model does not draw`);
          const printed = output.length > before ? ` It prints ${output.slice(before).join(', ')}.` : '';
          return {
            term: replace(whole, target.id, lit(value, fresh())),
            rule: 'primitive',
            caption: `Apply the primitive \`${name}\`: ${q(target)} → ${literalText(value)}.${printed}`,
          };
        }
        if (target_.params.length !== target.args.length) {
          throw new Stuck(`${name} expects ${target_.params.length} argument(s), got ${target.args.length}`);
        }
        if (target_.body === null) {
          return {
            term: replace(whole, target.id, { id: fresh(), kind: 'opaque', text: `⟨body of ${name}⟩` }),
            rule: 'stuck',
            caption: `The body of \`${name}\` is more than a single return, which the substitution model does not describe.`,
          };
        }
        const env = new Map(target_.params.map((param, i) => [param, target.args[i] as Term]));
        const body = toTerm(target_.body, env);
        const bindings = target_.params.map((param, i) => `\`${param}\` by ${q(target.args[i] as Term)}`).join(', ');
        const unevaluated = target.args.some((arg) => !isLit(arg));
        return {
          term: replace(whole, target.id, body),
          rule: 'apply',
          caption:
            bindings === ''
              ? `Apply \`${name}\`, which takes no arguments: its return expression is ${q(body)}.`
              : `Apply \`${name}\`: replace ${bindings} in its return expression${unevaluated ? ', unevaluated' : ''}, giving ${q(body)}.`,
        };
      }
      default:
        throw new Stuck('nothing to rewrite');
    }
  };

  const statements: Rewrite[] = [];

  const declareFunction = (symbol: string, lambda: Lambda): void => {
    known.set(symbol, { kind: 'function', name: symbol, params: [...lambda.params], body: returnExpression(lambda) });
  };

  const reduceStatement = (label: string, start: Term): Rewrite => {
    const steps: RewriteStep[] = [];
    let term = start;
    let truncated = false;
    let stuck: string | null = null;
    let pending: { rule: Rule; caption: string } = { rule: 'start', caption: `Evaluate \`${label}\`.` };
    for (;;) {
      let next: Term | null;
      try {
        next = redex(term);
      } catch (error) {
        stuck = error instanceof Stuck ? error.message : String(error);
        steps.push({ term, redex: null, rule: 'stuck', caption: `Stuck: ${stuck}.`, output: [...output] });
        break;
      }
      if (next === null) {
        const finished = isLit(term);
        steps.push({
          term,
          redex: null,
          rule: finished ? 'done' : pending.rule === 'stuck' ? 'stuck' : pending.rule,
          caption: finished ? `${pending.caption} Nothing is left to rewrite: the value is ${print(term)}.` : pending.caption,
          output: [...output],
        });
        break;
      }
      if (steps.length >= maxSteps) {
        truncated = true;
        steps.push({ term, redex: next.id, rule: pending.rule, caption: `${pending.caption} Stopped after ${maxSteps} rewrites.`, output: [...output] });
        break;
      }
      steps.push({ term, redex: next.id, rule: pending.rule, caption: pending.caption, output: [...output] });
      try {
        const result = rewrite(term, next);
        term = result.term;
        pending = { rule: result.rule, caption: result.caption };
        if (result.rule === 'stuck') stuck = result.caption;
      } catch (error) {
        stuck = error instanceof Stuck ? error.message : String(error);
        steps.push({ term, redex: null, rule: 'stuck', caption: `Stuck: ${stuck}.`, output: [...output] });
        break;
      }
    }
    return { label, steps, truncated, stuck };
  };

  for (const statement of program.body as Statement[]) {
    switch (statement.kind) {
      case 'function':
        declareFunction(statement.symbol, statement.lambda);
        break;
      case 'const':
      case 'let': {
        if (statement.init.kind === 'lambda') {
          declareFunction(statement.symbol, statement.init);
          break;
        }
        const rewritten = reduceStatement(text(statement), toTerm(statement.init, new Map()));
        const final = rewritten.steps[rewritten.steps.length - 1];
        if (final !== undefined && final.term.kind === 'lit') {
          known.set(statement.symbol, { kind: 'constant', value: final.term.value });
          final.caption = `${final.rule === 'done' && rewritten.steps.length === 1 ? '' : `${final.caption} `}The declaration binds \`${statement.symbol}\` to ${print(final.term)}.`.trim();
        }
        statements.push({ ...rewritten, label: `${statement.kind} ${statement.symbol} = …` });
        break;
      }
      case 'return':
      case 'if':
      case 'block':
        statements.push({
          label: text(statement),
          steps: [{ term: { id: fresh(), kind: 'opaque', text: text(statement) }, redex: null, rule: 'stuck', caption: 'The substitution model describes expressions only.', output: [...output] }],
          truncated: false,
          stuck: 'not an expression',
        });
        break;
      default:
        statements.push(reduceStatement(text(statement), toTerm(statement, new Map())));
    }
    if (statements[statements.length - 1]?.stuck !== null && statements.length > 0 && statement.kind !== 'function') break;
  }

  return { statements, error: null };
}
