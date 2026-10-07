import { lookup } from '../evaluator/environment.ts';
import type { MachineHooks } from '../evaluator/machine.ts';
import { stringify } from '../evaluator/values.ts';
import type { Loc, Node } from '../syntax/ast.ts';
import { excerpt } from './sourceText.ts';

/**
 * A readable log of what the evaluator did, one record per interesting step.
 * The Book's stepper walks this log forwards and backwards, and the Book's
 * animations rebuild pictures (trees, frames, call stacks) from the structured
 * `event` each record carries.
 */

/** What a step was, with the values involved already in their text form. */
export type StepEvent =
  /** A combination, conditional or return is about to be evaluated. */
  | { kind: 'eval' }
  /** A name was looked up. */
  | { kind: 'name'; symbol: string; value: string }
  /** A compound function was applied and a frame was made for it. */
  | {
      kind: 'call';
      name: string;
      params: string[];
      args: string[];
      /** The frame the function was declared in, which the new frame extends. */
      closureEnv: string;
      /** The frame the call was made from. */
      callerEnv: string;
      /** Depth of the stack of pending calls, this one included. */
      depth: number;
      tail: boolean;
      recursive: boolean;
    }
  /** A compound function call produced its value. */
  | { kind: 'return'; value: string; depth: number }
  /** An operator combination or primitive application produced its value. */
  | { kind: 'result'; value: string }
  /** A declaration or assignment bound a name. */
  | { kind: 'define'; symbol: string; value: string; assignment: boolean; parentEnv: string | null }
  /** `concurrent_execute` started a thread, or a thread's function returned (§3.4). */
  | { kind: 'thread'; thread: number; change: 'spawn' | 'end' };

export interface StepRecord {
  /** 1-based position in the log. */
  n: number;
  text: string;
  /** Id of the frame the step happened in, e.g. `E1`. */
  env: string;
  /** The syntax node the step is about. */
  loc: Loc;
  nodeKind: Node['kind'];
  /** Index of the top-level statement the step belongs to. */
  statement: number;
  /** The thread the step ran in, once `concurrent_execute` has started any; 0 is the program. */
  thread?: number;
  event: StepEvent;
}

export interface StepTracer {
  hooks: MachineHooks;
  records: StepRecord[];
  /** True when the log stopped at its limit before the program finished. */
  truncated(): boolean;
}

const LOGGED: ReadonlySet<Node['kind']> = new Set(['application', 'name', 'conditional', 'if', 'return']);

export function createStepTracer(source: string, maxRecords = 400): StepTracer {
  const records: StepRecord[] = [];
  let truncated = false;
  let statement = 0;
  let thread: number | null = null;
  let lastNode: Node | null = null;
  let lastEnv = 'E0';

  const record = (text: string, env: string, node: Node, event: StepEvent): void => {
    lastNode = node;
    lastEnv = env;
    records.push({
      n: records.length + 1,
      text,
      env,
      loc: node.loc,
      nodeKind: node.kind,
      statement,
      ...(thread !== null && { thread }),
      event,
    });
  };

  /**
   * True once the log is full. Hooks check it before building a record, so a
   * long run past the limit does not pay for writing out values nobody keeps.
   */
  const full = (): boolean => {
    if (records.length < maxRecords) return false;
    truncated = true;
    return true;
  };

  return {
    records,
    truncated: () => truncated,
    hooks: {
      onThread(id, change) {
        if (change === 'switch') {
          thread = id;
          return;
        }
        thread ??= 0;
        // Spawns happen at the concurrent_execute call; ends after the thread's last step.
        if (lastNode !== null && !full()) {
          record(`thread ${id} ${change === 'spawn' ? 'starts' : 'ends'}`, lastEnv, lastNode, { kind: 'thread', thread: id, change });
        }
      },
      onTopLevelStatement(index) {
        statement = index;
      },
      onEval(node, env) {
        // Only these kinds of node are logged; others must not mark the log truncated.
        if (!LOGGED.has(node.kind) || full()) return;
        const id = env.frame.id;
        switch (node.kind) {
          case 'application':
            record(`evaluate application ${excerpt(source, node)}`, id, node, { kind: 'eval' });
            return;
          case 'name': {
            const found = lookup(env, node.symbol);
            if (found.status === 'found' && found.binding.assigned) {
              const value = stringify(found.binding.value);
              record(`evaluate name ${node.symbol} → ${value}`, id, node, {
                kind: 'name',
                symbol: node.symbol,
                value,
              });
            }
            return;
          }
          case 'conditional':
            record(`evaluate conditional, test ${excerpt(source, node.test, 32)}`, id, node, { kind: 'eval' });
            return;
          case 'if':
            record(`evaluate if, test ${excerpt(source, node.test, 32)}`, id, node, { kind: 'eval' });
            return;
          case 'return':
            record(
              node.argument === null ? 'return' : `return ${excerpt(source, node.argument, 40)}`,
              id,
              node,
              { kind: 'eval' },
            );
            return;
          default:
            return;
        }
      },
      onCall(info) {
        if (full()) return;
        const args = info.args.map((arg) => stringify(arg));
        const params = [...info.closure.lambda.params];
        const bindings = params.map((param, i) => `${param}: ${args[i]}`).join(', ');
        record(
          `apply ${stringify(info.closure)} → extend ${info.closure.env.frame.id} with {${bindings}} = ${info.env.frame.id}`,
          info.env.frame.id,
          info.node,
          {
            kind: 'call',
            name: info.name,
            params,
            args,
            closureEnv: info.closure.env.frame.id,
            callerEnv: info.callerEnv.frame.id,
            depth: info.depth,
            tail: info.tail,
            recursive: info.recursive,
          },
        );
      },
      onReturn(info) {
        if (full()) return;
        const value = stringify(info.value);
        record(`${excerpt(source, info.node, 32)} → ${value}`, info.callerEnv.frame.id, info.node, {
          kind: 'return',
          value,
          depth: info.depth,
        });
      },
      onResult(node, value, env) {
        if (full()) return;
        const text = stringify(value);
        record(`${excerpt(source, node, 32)} → ${text}`, env.frame.id, node, { kind: 'result', value: text });
      },
      onDefine(symbol, value, env, node) {
        if (full()) return;
        const assignment = node.kind === 'assignment';
        const text = stringify(value);
        record(`${assignment ? 'assign' : 'declare'} ${symbol} = ${text}`, env.frame.id, node, {
          kind: 'define',
          symbol,
          value: text,
          assignment,
          parentEnv: env.parent?.frame.id ?? null,
        });
      },
    },
  };
}
