import { parse, tokenize, type Expression, type Loc, type Program, type Statement, type StepRecord } from '@sicp/lab';
import type { Trace } from '../useTrace.ts';
import type { TreeInput } from './layout.ts';

/**
 * An expression as the tree the parser built from it, plus the moments in the
 * evaluator's trace when each node received its value.
 */

export type ExprKind = 'operator' | 'call' | 'conditional' | 'number' | 'string' | 'boolean' | 'name' | 'other';

export interface ExprNode {
  /** `start-end` of the node's text, which is how trace records find it. */
  id: string;
  kind: ExprKind;
  label: string;
  loc: Loc;
  /** Where the label's token starts in the source, for the flat (text) layout. */
  tokenStart: number;
  /** The token as written, shown while the statement is still flat text. */
  flatLabel: string;
}

export const locKey = (loc: Loc): string => `${loc.start}-${loc.end}`;

const operatorToken = (source: string, from: number, to: number, candidates: readonly string[]): number => {
  for (const token of tokenize(source.slice(from, to))) {
    if (candidates.includes(token.text)) return from + token.loc.start;
  }
  return from;
};

export function expressionTree(source: string, expr: Expression): TreeInput<ExprNode> {
  const node = (kind: ExprKind, label: string, tokenStart: number, children: TreeInput<ExprNode>[] = [], flatLabel = label): TreeInput<ExprNode> => ({
    data: { id: locKey(expr.loc), kind, label, loc: expr.loc, tokenStart, flatLabel },
    children,
  });
  switch (expr.kind) {
    case 'literal': {
      const text = source.slice(expr.loc.start, expr.loc.end);
      const kind: ExprKind = typeof expr.value === 'number' ? 'number' : typeof expr.value === 'string' ? 'string' : 'boolean';
      return node(kind, text, expr.loc.start);
    }
    case 'name':
      return node('name', expr.symbol, expr.loc.start);
    case 'binary':
    case 'logical':
      return node('operator', expr.operator, operatorToken(source, expr.left.loc.end, expr.right.loc.start, [expr.operator]), [
        expressionTree(source, expr.left),
        expressionTree(source, expr.right),
      ]);
    case 'unary':
      return node('operator', expr.operator, expr.loc.start, [expressionTree(source, expr.operand)]);
    case 'conditional':
      return node(
        'conditional',
        '? :',
        operatorToken(source, expr.test.loc.end, expr.consequent.loc.start, ['?']),
        [expressionTree(source, expr.test), expressionTree(source, expr.consequent), expressionTree(source, expr.alternative)],
        '?',
      );
    case 'application': {
      const name = expr.fun.kind === 'name' ? expr.fun.symbol : source.slice(expr.fun.loc.start, expr.fun.loc.end);
      return node('call', `${name}(…)`, expr.fun.loc.start, expr.args.map((arg) => expressionTree(source, arg)), name);
    }
    case 'lambda':
      return node('other', 'fn', expr.loc.start);
    case 'assignment':
      return node('other', `${expr.symbol} =`, expr.loc.start, [expressionTree(source, expr.value)]);
  }
}

export interface StatementTree {
  index: number;
  loc: Loc;
  text: string;
  root: TreeInput<ExprNode>;
}

const isExpression = (statement: Statement): statement is Expression =>
  statement.kind !== 'const' &&
  statement.kind !== 'let' &&
  statement.kind !== 'function' &&
  statement.kind !== 'return' &&
  statement.kind !== 'if' &&
  statement.kind !== 'block';

/** Every top-level expression statement as a tree, in order. Parse errors give no trees. */
export function statementTrees(source: string): StatementTree[] {
  let program: Program;
  try {
    program = parse(source);
  } catch {
    return [];
  }
  return program.body.flatMap((statement, index) =>
    isExpression(statement)
      ? [
          {
            index,
            loc: statement.loc,
            text: source.slice(statement.loc.start, statement.loc.end).replace(/;$/, ''),
            root: expressionTree(source, statement),
          },
        ]
      : [],
  );
}

export interface TreeKeyframe {
  /** Record number this keyframe follows; 0 before any record. */
  at: number;
  statement: number;
  /** The node the evaluator is working on. */
  focus: string | null;
  /** Values nodes have received so far, by node id. */
  values: ReadonlyMap<string, string>;
  caption: string;
}

/**
 * Keyframes for the evaluation of a program's expression statements: one per
 * trace record that touches a node of a top-level expression.
 */
export function treeKeyframes(trees: readonly StatementTree[], trace: Trace | null, source: string): TreeKeyframe[] {
  const first = trees[0];
  if (first === undefined) return [];
  const byStatement = new Map(trees.map((tree) => [tree.index, tree]));
  const nodeIds = new Map<number, Set<string>>();
  for (const tree of trees) {
    const ids = new Set<string>();
    const walk = (node: TreeInput<ExprNode>): void => {
      ids.add(node.data.id);
      node.children.forEach(walk);
    };
    walk(tree.root);
    nodeIds.set(tree.index, ids);
  }

  const frames: TreeKeyframe[] = [
    { at: 0, statement: first.index, focus: null, values: new Map(), caption: `Evaluate \`${first.text}\`: values start at the leaves.` },
  ];
  if (trace === null) return frames;

  let values = new Map<string, string>();
  let statement = first.index;
  const excerpt = (record: StepRecord): string => source.slice(record.loc.start, record.loc.end).replace(/\s+/g, ' ');

  for (const record of trace.records) {
    const tree = byStatement.get(record.statement);
    if (tree === undefined) continue;
    const ids = nodeIds.get(record.statement);
    const id = locKey(record.loc);
    if (ids === undefined || !ids.has(id)) continue;
    if (record.statement !== statement) {
      statement = record.statement;
      values = new Map();
    }
    const { event } = record;
    switch (event.kind) {
      case 'eval':
        frames.push({ at: record.n, statement, focus: id, values, caption: `Evaluate \`${excerpt(record)}\`: first its operands, then apply.` });
        break;
      case 'name':
        values = new Map(values).set(id, event.value);
        frames.push({ at: record.n, statement, focus: id, values, caption: `\`${event.symbol}\` is looked up in the environment: ${event.value}.` });
        break;
      case 'result':
      case 'return':
        values = new Map(values).set(id, event.value);
        frames.push({
          at: record.n,
          statement,
          focus: id,
          values,
          caption:
            id === locKey(tree.loc) || id === locKey(tree.root.data.loc)
              ? `\`${excerpt(record)}\` → ${event.value}: the value reaches the root.`
              : `\`${excerpt(record)}\` → ${event.value}: one node up.`,
        });
        break;
      default:
        break;
    }
  }
  return frames;
}

/** The keyframe to show for a stepper position: the last one at or before record `n`. */
export function keyframeAt<T extends { at: number }>(frames: readonly T[], n: number): number {
  let index = 0;
  for (let i = 0; i < frames.length; i++) {
    if ((frames[i]?.at ?? Number.POSITIVE_INFINITY) <= n) index = i;
    else break;
  }
  return index;
}
