import { parse, type Expression, type FunctionDeclaration, type Lambda, type Loc, type Statement } from '@sicp/lab';
import type { Trace } from '../useTrace.ts';
import type { TreeInput } from './layout.ts';
import { locKey } from './tree.ts';

/**
 * A function body as a decision tree: conditionals and short-circuit
 * operators as questions, everything else as leaves. The trace lights the path
 * the evaluator took, and leaves the other branches dark.
 */

export type BranchKind = 'test' | 'gate' | 'leaf';

export interface BranchNode {
  id: string;
  kind: BranchKind;
  label: string;
  /** For `gate`, the operator. */
  operator?: '&&' | '||';
  loc: Loc;
  /** The id of the test expression that decides a `test` node. */
  testId?: string;
}

const text = (source: string, loc: Loc, max = 22): string => {
  const raw = source.slice(loc.start, loc.end).replace(/\s+/g, ' ');
  return raw.length <= max ? raw : `${raw.slice(0, max - 1)}…`;
};

export function branchTree(source: string, expr: Expression): TreeInput<BranchNode> {
  switch (expr.kind) {
    case 'conditional':
      return {
        data: { id: locKey(expr.loc), kind: 'test', label: text(source, expr.test.loc), loc: expr.loc, testId: locKey(expr.test.loc) },
        children: [branchTree(source, expr.consequent), branchTree(source, expr.alternative)],
      };
    case 'logical':
      return {
        data: { id: locKey(expr.loc), kind: 'gate', label: expr.operator, operator: expr.operator, loc: expr.loc },
        children: [branchTree(source, expr.left), branchTree(source, expr.right)],
      };
    default:
      return { data: { id: locKey(expr.loc), kind: 'leaf', label: text(source, expr.loc), loc: expr.loc }, children: [] };
  }
}

export interface FunctionBranches {
  name: string;
  params: string[];
  loc: Loc;
  root: TreeInput<BranchNode>;
}

function returnExpression(lambda: Lambda): Expression | null {
  if (lambda.body.kind !== 'block') return lambda.body;
  const last = lambda.body.body[lambda.body.body.length - 1];
  return last !== undefined && last.kind === 'return' ? last.argument : null;
}

/** Every top-level function whose body is a single return, as a decision tree. */
export function functionBranches(source: string): FunctionBranches[] {
  let statements: Statement[];
  try {
    statements = parse(source).body;
  } catch {
    return [];
  }
  return statements.flatMap((statement) => {
    if (statement.kind !== 'function') return [];
    const declaration: FunctionDeclaration = statement;
    const body = returnExpression(declaration.lambda);
    if (body === null) return [];
    return [{ name: declaration.symbol, params: [...declaration.lambda.params], loc: declaration.lambda.loc, root: branchTree(source, body) }];
  });
}

export interface BranchKeyframe {
  at: number;
  /** Which function's tree is on screen. */
  fn: string | null;
  /** The call being evaluated, e.g. `abs(-12)`. */
  call: string | null;
  /** The node the evaluator is at. */
  active: string | null;
  /** Decisions taken so far: test or gate node id → the boolean that decided it. */
  decided: ReadonlyMap<string, boolean>;
  /** Values leaves have produced. */
  values: ReadonlyMap<string, string>;
  caption: string;
}

export function branchKeyframes(source: string, functions: readonly FunctionBranches[], trace: Trace | null): BranchKeyframe[] {
  const frames: BranchKeyframe[] = [];
  const first = functions[0];
  frames.push({
    at: 0,
    fn: first?.name ?? null,
    call: null,
    active: null,
    decided: new Map(),
    values: new Map(),
    caption: first === undefined ? 'No function with a conditional body to draw.' : `The body of \`${first.name}\` as a decision tree. Run it to light a path.`,
  });
  if (trace === null) return frames;

  const byName = new Map(functions.map((fn) => [fn.name, fn]));
  // Which function each frame id belongs to, so records inside a body can be attributed.
  const frameFn = new Map<string, { fn: FunctionBranches; call: string }>();
  // Node lookup by id per function: tests by their test expression, gates and leaves by their own loc.
  const nodeIndex = new Map<string, Map<string, { node: BranchNode; parentGate: BranchNode | null; side: 0 | 1 | null }>>();
  for (const fn of functions) {
    const index = new Map<string, { node: BranchNode; parentGate: BranchNode | null; side: 0 | 1 | null }>();
    const walk = (node: TreeInput<BranchNode>, parentGate: BranchNode | null, side: 0 | 1 | null): void => {
      index.set(node.data.id, { node: node.data, parentGate, side });
      if (node.data.testId !== undefined) index.set(node.data.testId, { node: node.data, parentGate, side });
      node.children.forEach((child, i) => walk(child, node.data.kind === 'gate' ? node.data : null, i === 0 ? 0 : 1));
    };
    walk(fn.root, null, null);
    nodeIndex.set(fn.name, index);
  }

  let current: { fn: FunctionBranches; call: string } | null = null;
  let decided = new Map<string, boolean>();
  let values = new Map<string, string>();

  for (const record of trace.records) {
    const { event } = record;
    if (event.kind === 'call') {
      const fn = byName.get(event.name);
      if (fn === undefined) continue;
      const call = `${event.name}(${event.args.join(', ')})`;
      frameFn.set(record.env, { fn, call });
      current = { fn, call };
      decided = new Map();
      values = new Map();
      frames.push({ at: record.n, fn: fn.name, call, active: fn.root.data.id, decided, values, caption: `Apply \`${call}\`: start at the top of its body.` });
      continue;
    }
    const owner = frameFn.get(record.env);
    if (owner === undefined || current === null || owner.fn !== current.fn) continue;
    const index = nodeIndex.get(owner.fn.name);
    if (index === undefined) continue;
    const id = locKey(record.loc);
    const hit = index.get(id);
    if (hit === undefined) continue;
    const { node } = hit;
    if (event.kind === 'eval' && node.kind === 'test' && node.id === id) {
      frames.push({ at: record.n, fn: owner.fn.name, call: owner.call, active: node.id, decided, values, caption: `Ask the question \`${node.label}\`.` });
    } else if ((event.kind === 'result' || event.kind === 'return' || event.kind === 'name') && node.kind === 'test' && node.testId === id) {
      const answer = event.value === 'true';
      decided = new Map(decided).set(node.id, answer);
      frames.push({
        at: record.n,
        fn: owner.fn.name,
        call: owner.call,
        active: node.id,
        decided,
        values,
        caption: `\`${node.label}\` is ${event.value}: take the ${answer ? 'left' : 'right'} branch. The other branch is never evaluated.`,
      });
    } else if (event.kind === 'result' && node.kind === 'gate') {
      // The gate itself only produces a value when it short-circuits.
      const answer = event.value === 'true';
      decided = new Map(decided).set(node.id, answer);
      values = new Map(values).set(node.id, event.value);
      frames.push({
        at: record.n,
        fn: owner.fn.name,
        call: owner.call,
        active: node.id,
        decided,
        values,
        caption: `\`${node.operator}\` already knows its answer from the left side: ${event.value}. The right side is never looked at.`,
      });
    } else if ((event.kind === 'result' || event.kind === 'return' || event.kind === 'name') && node.kind === 'leaf') {
      values = new Map(values).set(node.id, event.value);
      let caption = `\`${node.label}\` → ${event.value}.`;
      if (hit.parentGate !== null && hit.parentGate.operator !== undefined) {
        const answer = event.value === 'true';
        const decides = (hit.parentGate.operator === '&&') !== answer;
        if (hit.side === 0) {
          decided = new Map(decided).set(hit.parentGate.id, answer);
          caption = decides
            ? `The left side of \`${hit.parentGate.operator}\` is ${event.value}, which settles it.`
            : `The left side of \`${hit.parentGate.operator}\` is ${event.value}: the right side decides.`;
        } else {
          values = new Map(values).set(hit.parentGate.id, event.value);
          caption = `The right side is ${event.value}, so \`${hit.parentGate.operator}\` is ${event.value}.`;
        }
      }
      frames.push({ at: record.n, fn: owner.fn.name, call: owner.call, active: node.id, decided, values, caption });
    }
  }
  return frames;
}
