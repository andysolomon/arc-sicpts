import { parse, type Expression, type FunctionDeclaration, type Lambda, type Node, type Program, type Statement } from '@sicp/lab';

/** Small walks over the syntax tree that the diagrams share. */

export function children(node: Node): Node[] {
  switch (node.kind) {
    case 'literal':
    case 'name':
      return [];
    case 'application':
      return [node.fun, ...node.args];
    case 'unary':
      return [node.operand];
    case 'binary':
    case 'logical':
      return [node.left, node.right];
    case 'conditional':
      return [node.test, node.consequent, node.alternative];
    case 'lambda':
      return [node.body];
    case 'assignment':
      return [node.value];
    case 'const':
    case 'let':
      return [node.init];
    case 'function':
      return [node.lambda];
    case 'return':
      return node.argument === null ? [] : [node.argument];
    case 'if':
      return [node.test, node.consequent, ...(node.alternative === null ? [] : [node.alternative])];
    case 'block':
    case 'program':
      return node.body;
  }
}

export function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  for (const child of children(node)) walk(child, visit);
}

/** Names of functions applied anywhere under `node`, in order of first appearance. */
export function calledNames(node: Node): string[] {
  const seen = new Set<string>();
  walk(node, (n) => {
    if (n.kind === 'application' && n.fun.kind === 'name') seen.add(n.fun.symbol);
  });
  return [...seen];
}

/** Operators used anywhere under `node`. */
export function operators(node: Node): string[] {
  const seen = new Set<string>();
  walk(node, (n) => {
    if (n.kind === 'binary' || n.kind === 'unary' || n.kind === 'logical') seen.add(n.operator);
  });
  return [...seen];
}

/** Names referred to anywhere under `node`. */
export function referencedNames(node: Node): Set<string> {
  const seen = new Set<string>();
  walk(node, (n) => {
    if (n.kind === 'name') seen.add(n.symbol);
  });
  return seen;
}

/** Names declared directly in a function body. */
export function localNames(lambda: Lambda): Set<string> {
  const names = new Set(lambda.params);
  if (lambda.body.kind === 'block') {
    for (const statement of lambda.body.body) {
      if (statement.kind === 'const' || statement.kind === 'let' || statement.kind === 'function') names.add(statement.symbol);
    }
  }
  return names;
}

export function innerFunctions(lambda: Lambda): FunctionDeclaration[] {
  if (lambda.body.kind !== 'block') return [];
  return lambda.body.body.filter((statement): statement is FunctionDeclaration => statement.kind === 'function');
}

export function topLevelFunctions(program: Program): FunctionDeclaration[] {
  return program.body.filter((statement): statement is FunctionDeclaration => statement.kind === 'function');
}

export const isExpression = (statement: Statement): statement is Expression =>
  statement.kind !== 'const' &&
  statement.kind !== 'let' &&
  statement.kind !== 'function' &&
  statement.kind !== 'return' &&
  statement.kind !== 'if' &&
  statement.kind !== 'block';

export function tryParse(source: string): Program | null {
  try {
    return parse(source);
  } catch {
    return null;
  }
}
