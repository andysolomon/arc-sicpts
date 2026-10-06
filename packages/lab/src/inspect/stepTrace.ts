import { lookup } from '../evaluator/environment.ts';
import type { MachineHooks } from '../evaluator/machine.ts';
import { stringify } from '../evaluator/values.ts';
import type { Loc, Node } from '../syntax/ast.ts';
import { excerpt } from './sourceText.ts';

/**
 * A readable log of what the evaluator did, one record per interesting step.
 * The Book's stepper walks this log forwards and backwards.
 */

export interface StepRecord {
  /** 1-based position in the log. */
  n: number;
  text: string;
  /** Id of the frame the step happened in, e.g. `E1`. */
  env: string;
  /** The syntax node the step is about. */
  loc: Loc;
  nodeKind: Node['kind'];
}

export interface StepTracer {
  hooks: MachineHooks;
  records: StepRecord[];
  /** True when the log stopped at its limit before the program finished. */
  truncated(): boolean;
}

export function createStepTracer(source: string, maxRecords = 400): StepTracer {
  const records: StepRecord[] = [];
  let truncated = false;

  const record = (text: string, env: string, node: Node): void => {
    if (records.length >= maxRecords) {
      truncated = true;
      return;
    }
    records.push({ n: records.length + 1, text, env, loc: node.loc, nodeKind: node.kind });
  };

  return {
    records,
    truncated: () => truncated,
    hooks: {
      onEval(node, env) {
        const id = env.frame.id;
        switch (node.kind) {
          case 'application':
            record(`evaluate application ${excerpt(source, node)}`, id, node);
            return;
          case 'name': {
            const found = lookup(env, node.symbol);
            if (found.status === 'found' && found.binding.assigned) {
              record(`evaluate name ${node.symbol} → ${stringify(found.binding.value)}`, id, node);
            }
            return;
          }
          case 'conditional':
            record(`evaluate conditional, test ${excerpt(source, node.test, 32)}`, id, node);
            return;
          case 'if':
            record(`evaluate if, test ${excerpt(source, node.test, 32)}`, id, node);
            return;
          case 'return':
            record(
              node.argument === null ? 'return' : `return ${excerpt(source, node.argument, 40)}`,
              id,
              node,
            );
            return;
          default:
            return;
        }
      },
      onCall(info) {
        const bindings = info.closure.lambda.params
          .map((param, i) => `${param}: ${stringify(info.args[i])}`)
          .join(', ');
        record(
          `apply ${stringify(info.closure)} → extend ${info.closure.env.frame.id} with {${bindings}} = ${info.env.frame.id}`,
          info.env.frame.id,
          info.node,
        );
      },
      onReturn(info) {
        record(
          `${excerpt(source, info.node, 32)} → ${stringify(info.value)}`,
          info.callerEnv.frame.id,
          info.node,
        );
      },
      onResult(node, value, env) {
        record(`${excerpt(source, node, 32)} → ${stringify(value)}`, env.frame.id, node);
      },
      onDefine(symbol, value, env, node) {
        const verb = node.kind === 'assignment' ? 'assign' : 'declare';
        record(`${verb} ${symbol} = ${stringify(value)}`, env.frame.id, node);
      },
    },
  };
}
