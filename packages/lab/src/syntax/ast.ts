/**
 * Syntax tree for the Source subset the Laboratory evaluates.
 * Every node carries the span of text it was parsed from. TypeScript type
 * annotations are checked for syntax and then dropped: no node records them.
 */

/** Offsets are 0-based and end-exclusive; lines and columns are 1-based. */
export interface Loc {
  start: number;
  end: number;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  /** Set on code the reader does not see, such as a prelude, so errors there say so. */
  hidden?: boolean;
}

export type LiteralValue = number | string | boolean | null | undefined;

export interface Literal {
  kind: 'literal';
  value: LiteralValue;
  loc: Loc;
}

export interface Name {
  kind: 'name';
  symbol: string;
  loc: Loc;
}

/** `...xs` in the arguments of a call: the elements of the list `xs`, one argument each. */
export interface Spread {
  kind: 'spread';
  argument: Expression;
  loc: Loc;
}

export type Argument = Expression | Spread;

/** The expression an argument evaluates: for `...xs`, the list `xs`. */
export const argumentExpression = (argument: Argument): Expression =>
  argument.kind === 'spread' ? argument.argument : argument;

export interface Application {
  kind: 'application';
  fun: Expression;
  args: Argument[];
  /** `f?.(x)`: when `fun` is `null` or `undefined`, the call and the rest of its chain are skipped. */
  optional?: boolean;
  /** A later link of a chain that began with `?.`, such as the second call in `f?.(x)(y)`. */
  chained?: boolean;
  loc: Loc;
}

export type UnaryOperator = '!' | '-';

export interface Unary {
  kind: 'unary';
  operator: UnaryOperator;
  operand: Expression;
  loc: Loc;
}

export type BinaryOperator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '%'
  | '==='
  | '!=='
  | '<'
  | '>'
  | '<='
  | '>=';

export interface Binary {
  kind: 'binary';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
  loc: Loc;
}

export type LogicalOperator = '&&' | '||' | '??';

export interface Logical {
  kind: 'logical';
  operator: LogicalOperator;
  left: Expression;
  right: Expression;
  loc: Loc;
}

export interface Conditional {
  kind: 'conditional';
  test: Expression;
  consequent: Expression;
  alternative: Expression;
  loc: Loc;
}

export interface Lambda {
  kind: 'lambda';
  /** The declared name, when the lambda is the value of a declaration. */
  name: string | null;
  params: string[];
  /** `...rest`: the name bound to the list of the arguments after `params`. */
  rest?: string;
  /** An `async` function: applying it returns a promise. */
  async?: boolean;
  body: Expression | Block;
  loc: Loc;
}

/** `await promise`, inside an `async` function or at the top level of a program. */
export interface Await {
  kind: 'await';
  argument: Expression;
  loc: Loc;
}

export interface Assignment {
  kind: 'assignment';
  symbol: string;
  value: Expression;
  loc: Loc;
}

export interface ConstDeclaration {
  kind: 'const';
  symbol: string;
  init: Expression;
  loc: Loc;
}

export interface LetDeclaration {
  kind: 'let';
  symbol: string;
  init: Expression;
  loc: Loc;
}

export interface FunctionDeclaration {
  kind: 'function';
  symbol: string;
  lambda: Lambda;
  loc: Loc;
}

export interface Return {
  kind: 'return';
  argument: Expression | null;
  loc: Loc;
}

export interface If {
  kind: 'if';
  test: Expression;
  consequent: Block;
  alternative: Block | If | null;
  loc: Loc;
}

export interface Block {
  kind: 'block';
  body: Statement[];
  loc: Loc;
}

export interface Program {
  kind: 'program';
  body: Statement[];
  loc: Loc;
}

export type Expression =
  | Literal
  | Name
  | Application
  | Unary
  | Binary
  | Logical
  | Conditional
  | Lambda
  | Assignment
  | Await;

export type Declaration = ConstDeclaration | LetDeclaration | FunctionDeclaration;

export type Statement = Expression | Declaration | Return | If | Block;

export type Node = Statement | Program;

export function isDeclaration(node: Node): node is Declaration {
  return node.kind === 'const' || node.kind === 'let' || node.kind === 'function';
}

/** A declaration that names a function: `function f() {}`, or `const f = () => …`. */
export interface FunctionBinding {
  symbol: string;
  lambda: Lambda;
  loc: Loc;
}

/** The function a statement declares, in either form, or `null` when it declares none. */
export function functionBinding(node: Node): FunctionBinding | null {
  if (node.kind === 'function') return node;
  if (node.kind === 'const' && node.init.kind === 'lambda') return { symbol: node.symbol, lambda: node.init, loc: node.loc };
  return null;
}
