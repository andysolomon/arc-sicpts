import type { Value } from '../evaluator/values.ts';
import { isDeclaration, type Block, type Expression, type Lambda, type Program, type Statement } from './ast.ts';

/**
 * The tagged-list representation of a program that SICP JS's `parse` returns
 * (§4.1.2): every component is a list whose head names its kind, such as
 * `list("name", "x")` or `list("application", fun, list(arg, ...))`. The
 * evaluators of Chapter 4 are written against this representation.
 */

const list = (...items: Value[]): Value => items.reduceRight<Value>((rest, item) => [item, rest], null);

const name = (symbol: string): Value => list('name', symbol);

/** A sequence of one statement is just that statement, as in Source's `parse`. */
function sequence(statements: readonly Statement[]): Value {
  const [only] = statements;
  if (statements.length === 1 && only !== undefined) return statement(only);
  return list('sequence', list(...statements.map(statement)));
}

/**
 * As Source's `parse` does, a block that declares no names is represented by
 * its statements alone; the book's footnote in §4.1.2 allows this, and the
 * compiled code of §5.5.5 and the stack figures of §5.4.4 assume it.
 */
const block = (node: Block): Value => (node.body.some(isDeclaration) ? list('block', sequence(node.body)) : sequence(node.body));

function lambda(node: Lambda): Value {
  const body = node.body.kind === 'block' ? block(node.body) : list('return_statement', expression(node.body));
  return list('lambda_expression', list(...node.params.map(name)), body);
}

function expression(node: Expression): Value {
  switch (node.kind) {
    case 'literal':
      return list('literal', node.value);
    case 'name':
      return name(node.symbol);
    case 'application':
      return list('application', expression(node.fun), list(...node.args.map(expression)));
    case 'unary':
      return list('unary_operator_combination', node.operator === '-' ? '-unary' : '!', expression(node.operand));
    case 'binary':
      return list('binary_operator_combination', node.operator, expression(node.left), expression(node.right));
    case 'logical':
      return list('logical_composition', node.operator, expression(node.left), expression(node.right));
    case 'conditional':
      return list(
        'conditional_expression',
        expression(node.test),
        expression(node.consequent),
        expression(node.alternative),
      );
    case 'lambda':
      return lambda(node);
    case 'assignment':
      return list('assignment', name(node.symbol), expression(node.value));
  }
}

function statement(node: Statement): Value {
  switch (node.kind) {
    case 'const':
      return list('constant_declaration', name(node.symbol), expression(node.init));
    case 'let':
      return list('variable_declaration', name(node.symbol), expression(node.init));
    case 'function':
      return list(
        'function_declaration',
        name(node.symbol),
        list(...node.lambda.params.map(name)),
        node.lambda.body.kind === 'block' ? block(node.lambda.body) : list('return_statement', expression(node.lambda.body)),
      );
    case 'return':
      return list('return_statement', node.argument === null ? list('literal', undefined) : expression(node.argument));
    case 'if':
      return list(
        'conditional_statement',
        expression(node.test),
        block(node.consequent),
        node.alternative === null
          ? list('sequence', null)
          : node.alternative.kind === 'if'
            ? statement(node.alternative)
            : block(node.alternative),
      );
    case 'block':
      return block(node);
    default:
      return expression(node);
  }
}

export function toTaggedList(program: Program): Value {
  return sequence(program.body);
}
