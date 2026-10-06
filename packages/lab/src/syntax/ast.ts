/**
 * Syntax tree for the Source subset the Laboratory evaluates.
 * Every node carries the span of text it was parsed from.
 */

/** Offsets are 0-based and end-exclusive; lines and columns are 1-based. */
export interface Loc {
  start: number;
  end: number;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
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

export interface Application {
  kind: 'application';
  fun: Expression;
  args: Expression[];
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

export type LogicalOperator = '&&' | '||';

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
  body: Expression | Block;
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
  | Assignment;

export type Declaration = ConstDeclaration | LetDeclaration | FunctionDeclaration;

export type Statement = Expression | Declaration | Return | If | Block;

export type Node = Statement | Program;

export function isDeclaration(node: Node): node is Declaration {
  return node.kind === 'const' || node.kind === 'let' || node.kind === 'function';
}
