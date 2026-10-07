import {
  isDeclaration,
  type Application,
  type Assignment,
  type Binary,
  type Block,
  type Conditional,
  type ConstDeclaration,
  type If,
  type Lambda,
  type LetDeclaration,
  type Logical,
  type Node,
  type Program,
  type Statement,
  type Unary,
} from '../syntax/ast.ts';
import { SourceError } from '../syntax/errors.ts';
import { assign, declare, define, extend, lookup, type Environment } from './environment.ts';
import { isLibraryLoc } from './library.ts';
import { isClosure, isPrimitive, stringify, typeName, type Closure, type Value } from './values.ts';

/**
 * An explicit-control evaluator. Instead of recursing on the JavaScript stack,
 * it keeps its own stack of continuations and advances one small step at a time.
 * That gives us, for free:
 *   - a step budget and cooperative pausing (nothing can freeze the host),
 *   - proper tail calls (an iterative process really runs in constant space),
 *   - an exact measure of call depth for `inspect/processShape`.
 */

export type MachineStatus = 'ready' | 'paused' | 'done' | 'error' | 'budget-exhausted';

export interface CallInfo {
  /** Number of pending calls once this one has started; the first call is depth 1. */
  depth: number;
  name: string;
  /** True when the call replaced its caller instead of stacking on top of it. */
  tail: boolean;
  /** True when the same function is already pending further down the stack. */
  recursive: boolean;
  node: Application;
  closure: Closure;
  args: readonly Value[];
  /** The environment the call was made from. */
  callerEnv: Environment;
  /** The new environment whose frame binds the parameters. */
  env: Environment;
}

export interface ReturnInfo {
  /** Depth of the call that is returning. */
  depth: number;
  value: Value;
  node: Application;
  callerEnv: Environment;
}

export interface MachineHooks {
  /** A top-level statement of the program is about to be evaluated. */
  onTopLevelStatement?(index: number, node: Statement): void;
  /** A node is about to be evaluated in an environment. */
  onEval?(node: Node, env: Environment): void;
  /** A compound function has been applied; its body is about to run. */
  onCall?(info: CallInfo): void;
  /** A compound function call has produced its value. */
  onReturn?(info: ReturnInfo): void;
  /** An operator combination or primitive application has produced its value. */
  onResult?(node: Node, value: Value, env: Environment): void;
  /** A declaration or assignment has bound a name. */
  onDefine?(symbol: string, value: Value, env: Environment, node: Node): void;
}

export const DEFAULT_BUDGET = 100_000;

export interface FrameIds {
  next(): string;
}

export function createFrameIds(): FrameIds {
  let n = 0;
  return { next: () => `E${n++}` };
}

export interface MachineOptions {
  /** The environment the program frame extends. */
  parent: Environment;
  budget?: number;
  hooks?: readonly MachineHooks[];
  frameIds?: FrameIds;
  /** Id and label for the program frame; defaults to the next `E` id and `program`. */
  programFrame?: { id: string; label: string };
}

type Continuation =
  | { k: 'seq'; stmts: readonly Statement[]; i: number; env: Environment; last: Value; top: boolean }
  | { k: 'fun'; node: Application; env: Environment }
  | { k: 'arg'; node: Application; env: Environment; fn: Value; args: Value[]; i: number }
  | { k: 'unary'; node: Unary; env: Environment }
  | { k: 'left'; node: Binary; env: Environment }
  | { k: 'right'; node: Binary; env: Environment; left: Value }
  | { k: 'logical'; node: Logical; env: Environment }
  | { k: 'cond'; node: Conditional | If; env: Environment }
  | { k: 'define'; node: ConstDeclaration | LetDeclaration; env: Environment }
  | { k: 'assign'; node: Assignment; env: Environment }
  | { k: 'call'; node: Application; lambda: Lambda; callerEnv: Environment }
  | { k: 'fallthrough' };

export class Machine {
  steps = 0;
  depth = 0;
  status: MachineStatus = 'ready';
  /** The value of the program, once `status` is `done`. */
  value: Value = undefined;
  error: SourceError | null = null;
  readonly budget: number;
  readonly programEnv: Environment;

  private readonly hooks: readonly MachineHooks[];
  private readonly frameIds: FrameIds;
  private readonly stack: Continuation[] = [];
  /** How many pending calls each function currently has. */
  private readonly pending = new Map<Lambda, number>();
  private evaluating = true;
  private node: Node;
  private env: Environment;
  private val: Value = undefined;

  constructor(program: Program, options: MachineOptions) {
    this.budget = options.budget ?? DEFAULT_BUDGET;
    this.hooks = options.hooks ?? [];
    this.frameIds = options.frameIds ?? createFrameIds();
    const frame = options.programFrame ?? { id: this.frameIds.next(), label: 'program' };
    this.programEnv = extend(options.parent, frame.id, frame.label);
    this.node = program;
    this.env = this.programEnv;
  }

  /**
   * Advance by at most `maxSteps` steps. Returns `paused` when the slice ran out
   * before the program finished; call `run` again to continue.
   */
  run(maxSteps = Number.POSITIVE_INFINITY): MachineStatus {
    if (this.status === 'done' || this.status === 'error' || this.status === 'budget-exhausted') {
      return this.status;
    }
    let taken = 0;
    try {
      for (;;) {
        if (!this.evaluating && this.stack.length === 0) {
          this.status = 'done';
          this.value = this.val;
          break;
        }
        if (this.steps >= this.budget) {
          this.status = 'budget-exhausted';
          break;
        }
        if (taken >= maxSteps) {
          this.status = 'paused';
          break;
        }
        this.step();
        this.steps++;
        taken++;
      }
    } catch (error) {
      this.status = 'error';
      this.error =
        error instanceof SourceError
          ? this.locate(error)
          : new SourceError('runtime', error instanceof Error ? error.message : String(error), null);
    }
    return this.status;
  }

  /** An error inside a library function is reported at the program's call into the library. */
  private locate(error: SourceError): SourceError {
    if (error.loc === null || !isLibraryLoc(error.loc)) return error;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const frame = this.stack[i];
      if (frame?.k === 'call' && !isLibraryLoc(frame.node.loc)) {
        return new SourceError(error.phase, error.reason, frame.node.loc);
      }
    }
    return new SourceError(error.phase, error.reason, null);
  }

  private step(): void {
    if (this.evaluating) this.evaluate(this.node, this.env);
    else this.resume(this.val);
  }

  private setEval(node: Node, env: Environment): void {
    this.evaluating = true;
    this.node = node;
    this.env = env;
  }

  private setValue(value: Value): void {
    this.evaluating = false;
    this.val = value;
  }

  private fail(message: string, node: Node): never {
    throw new SourceError('runtime', message, node.loc);
  }

  private evaluate(node: Node, env: Environment): void {
    for (const hook of this.hooks) hook.onEval?.(node, env);

    switch (node.kind) {
      case 'literal':
        this.setValue(node.value);
        return;

      case 'name': {
        const found = lookup(env, node.symbol);
        if (found.status === 'unbound') this.fail(`Name ${node.symbol} not declared`, node);
        else if (!found.binding.assigned) {
          this.fail(`Name ${node.symbol} used before its declaration was evaluated`, node);
        } else this.setValue(found.binding.value);
        return;
      }

      case 'application':
        this.stack.push({ k: 'fun', node, env });
        this.setEval(node.fun, env);
        return;

      case 'unary':
        this.stack.push({ k: 'unary', node, env });
        this.setEval(node.operand, env);
        return;

      case 'binary':
        this.stack.push({ k: 'left', node, env });
        this.setEval(node.left, env);
        return;

      case 'logical':
        this.stack.push({ k: 'logical', node, env });
        this.setEval(node.left, env);
        return;

      case 'conditional':
      case 'if':
        this.stack.push({ k: 'cond', node, env });
        this.setEval(node.test, env);
        return;

      case 'lambda':
        this.setValue({ tag: 'closure', lambda: node, env });
        return;

      case 'assignment':
        this.stack.push({ k: 'assign', node, env });
        this.setEval(node.value, env);
        return;

      case 'const':
      case 'let':
        this.stack.push({ k: 'define', node, env });
        this.setEval(node.init, env);
        return;

      case 'function': {
        const closure: Closure = { tag: 'closure', lambda: node.lambda, env };
        define(env, node.symbol, closure);
        for (const hook of this.hooks) hook.onDefine?.(node.symbol, closure, env, node);
        this.setValue(undefined);
        return;
      }

      case 'return': {
        // Discard everything the current call still had pending. What remains on
        // top is the call marker, so the returned expression is in tail position.
        let top = this.stack.length - 1;
        while (top >= 0 && this.stack[top]?.k !== 'call') top--;
        if (top < 0) this.fail('return is only allowed inside a function', node);
        this.stack.length = top + 1;
        if (node.argument === null) this.setValue(undefined);
        else this.setEval(node.argument, env);
        return;
      }

      case 'block':
        this.enterSequence(node, this.scan(node, env, false), false);
        return;

      case 'program':
        this.enterSequence(node, this.scan(node, env, true), true);
        return;
    }
  }

  /**
   * Scan out the declarations of a block. Names exist from the start of the
   * block but stay unassigned until their declaration is evaluated.
   */
  private scan(block: Block | Program, env: Environment, isProgram: boolean): Environment {
    const declarations = block.body.filter(isDeclaration);
    // The program frame was created with the machine; other blocks get a frame
    // only when they declare something.
    const target =
      isProgram || declarations.length === 0 ? env : extend(env, this.frameIds.next(), 'block');
    for (const declaration of declarations) {
      if (!declare(target, declaration.symbol, declaration.kind === 'let')) {
        this.fail(`Name ${declaration.symbol} declared more than once`, declaration);
      }
    }
    return target;
  }

  private enterSequence(block: Block | Program, env: Environment, top: boolean): void {
    const first = block.body[0];
    if (first === undefined) {
      this.setValue(undefined);
      return;
    }
    this.stack.push({ k: 'seq', stmts: block.body, i: 0, env, last: undefined, top });
    if (top) for (const hook of this.hooks) hook.onTopLevelStatement?.(0, first);
    this.setEval(first, env);
  }

  private resume(value: Value): void {
    const frame = this.stack.pop();
    if (frame === undefined) return;

    switch (frame.k) {
      case 'seq': {
        const finished = frame.stmts[frame.i];
        // Declarations do not contribute to the value of a sequence.
        if (finished !== undefined && !isDeclaration(finished)) frame.last = value;
        frame.i++;
        const following = frame.stmts[frame.i];
        if (following === undefined) {
          this.setValue(frame.last);
          return;
        }
        this.stack.push(frame);
        if (frame.top) for (const hook of this.hooks) hook.onTopLevelStatement?.(frame.i, following);
        this.setEval(following, frame.env);
        return;
      }

      case 'fun': {
        const first = frame.node.args[0];
        if (first === undefined) {
          this.apply(value, [], frame.node, frame.env);
          return;
        }
        this.stack.push({ k: 'arg', node: frame.node, env: frame.env, fn: value, args: [], i: 0 });
        this.setEval(first, frame.env);
        return;
      }

      case 'arg': {
        frame.args.push(value);
        frame.i++;
        const following = frame.node.args[frame.i];
        if (following === undefined) {
          this.apply(frame.fn, frame.args, frame.node, frame.env);
          return;
        }
        this.stack.push(frame);
        this.setEval(following, frame.env);
        return;
      }

      case 'unary': {
        const { node } = frame;
        let result: Value;
        if (node.operator === '!') {
          if (typeof value !== 'boolean') this.fail(`! expects a boolean, got ${typeName(value)}`, node);
          result = !value;
        } else {
          if (typeof value !== 'number') this.fail(`- expects a number, got ${typeName(value)}`, node);
          result = -(value as number);
        }
        this.finish(node, result, frame.env);
        return;
      }

      case 'left':
        this.stack.push({ k: 'right', node: frame.node, env: frame.env, left: value });
        this.setEval(frame.node.right, frame.env);
        return;

      case 'right':
        this.finish(frame.node, this.binary(frame.node, frame.left, value), frame.env);
        return;

      case 'logical': {
        const { node } = frame;
        if (typeof value !== 'boolean') {
          this.fail(`${node.operator} expects a boolean on the left, got ${typeName(value)}`, node);
        }
        // `a && b` is `a ? b : false`; `a || b` is `a ? true : b`. The right
        // operand needs no continuation, so it stays in tail position.
        if ((node.operator === '&&') === value) this.setEval(node.right, frame.env);
        else this.finish(node, value, frame.env);
        return;
      }

      case 'cond': {
        const { node } = frame;
        if (typeof value !== 'boolean') {
          this.fail(`Expected a boolean as the test, got ${typeName(value)}`, node.test);
        }
        const branch = value ? node.consequent : node.alternative;
        if (branch === null) this.setValue(undefined);
        else this.setEval(branch, frame.env);
        return;
      }

      case 'define': {
        const { node } = frame;
        define(frame.env, node.symbol, value, node.kind === 'let');
        for (const hook of this.hooks) hook.onDefine?.(node.symbol, value, frame.env, node);
        this.setValue(undefined);
        return;
      }

      case 'assign': {
        const { node } = frame;
        const outcome = assign(frame.env, node.symbol, value);
        if (outcome === 'unbound') this.fail(`Name ${node.symbol} not declared`, node);
        if (outcome === 'unassigned') {
          this.fail(`Name ${node.symbol} assigned before its declaration was evaluated`, node);
        }
        if (outcome === 'constant') this.fail(`Cannot assign to constant ${node.symbol}`, node);
        for (const hook of this.hooks) hook.onDefine?.(node.symbol, value, frame.env, node);
        this.setValue(value);
        return;
      }

      case 'call': {
        const depth = this.depth;
        this.leave(frame.lambda);
        this.depth--;
        for (const hook of this.hooks) {
          hook.onReturn?.({ depth, value, node: frame.node, callerEnv: frame.callerEnv });
        }
        this.setValue(value);
        return;
      }

      case 'fallthrough':
        // The body ran off its end without a return statement.
        this.setValue(undefined);
        return;
    }
  }

  private finish(node: Node, value: Value, env: Environment): void {
    for (const hook of this.hooks) hook.onResult?.(node, value, env);
    this.setValue(value);
  }

  private binary(node: Binary, left: Value, right: Value): Value {
    const { operator } = node;
    if (operator === '===') return left === right;
    if (operator === '!==') return left !== right;

    if (typeof left === 'number' && typeof right === 'number') {
      switch (operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '%':
          return left % right;
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
      }
    }

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

    const expected =
      operator === '-' || operator === '*' || operator === '/' || operator === '%'
        ? 'two numbers'
        : 'two numbers or two strings';
    return this.fail(
      `${operator} expects ${expected}, got ${typeName(left)} and ${typeName(right)}`,
      node,
    );
  }

  private apply(fn: Value, args: Value[], node: Application, callerEnv: Environment): void {
    if (isPrimitive(fn)) {
      if (fn.arity !== null && fn.arity !== args.length) {
        this.fail(`${fn.name} expects ${fn.arity} argument(s), got ${args.length}`, node);
      }
      if (fn.tailApply !== undefined) {
        let target: { fn: Value; args: Value[] };
        try {
          target = fn.tailApply(...args);
        } catch (error) {
          if (error instanceof SourceError && error.loc === null) {
            throw new SourceError('runtime', error.message, node.loc);
          }
          throw error;
        }
        this.apply(target.fn, target.args, node, callerEnv);
        return;
      }
      let result: Value;
      try {
        result = fn.impl(...args);
      } catch (error) {
        // Primitives do not know where they were called from; add the location.
        if (error instanceof SourceError && error.loc === null) {
          throw new SourceError('runtime', error.message, node.loc);
        }
        throw error;
      }
      this.finish(node, result, callerEnv);
      return;
    }

    if (!isClosure(fn)) {
      this.fail(`Cannot apply ${stringify(fn)}: it is not a function`, node.fun);
    }

    const { lambda } = fn;
    const name = lambda.name ?? 'lambda';
    if (lambda.params.length !== args.length) {
      this.fail(`${name} expects ${lambda.params.length} argument(s), got ${args.length}`, node);
    }

    const env = extend(
      fn.env,
      this.frameIds.next(),
      `${name}(${args.map((arg) => stringify(arg)).join(', ')})`,
    );
    lambda.params.forEach((param, i) => define(env, param, args[i], true));

    // A call marker on top of the stack means the caller has nothing left to do
    // but return this call's value: a tail call. Reuse the caller's place.
    const top = this.stack[this.stack.length - 1];
    const tail = top !== undefined && top.k === 'call';
    if (tail) {
      this.stack.pop();
      this.leave(top.lambda);
    } else {
      this.depth++;
    }
    this.stack.push({ k: 'call', node, lambda, callerEnv });
    const pending = (this.pending.get(lambda) ?? 0) + 1;
    this.pending.set(lambda, pending);

    for (const hook of this.hooks) {
      hook.onCall?.({
        depth: this.depth,
        name,
        tail,
        recursive: pending > 1,
        node,
        closure: fn,
        args,
        callerEnv,
        env,
      });
    }

    if (lambda.body.kind === 'block') this.stack.push({ k: 'fallthrough' });
    this.setEval(lambda.body, env);
  }

  private leave(lambda: Lambda): void {
    const pending = (this.pending.get(lambda) ?? 1) - 1;
    if (pending === 0) this.pending.delete(lambda);
    else this.pending.set(lambda, pending);
  }
}
