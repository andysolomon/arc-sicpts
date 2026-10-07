import { isDeclaration, type Block, type Expression, type Program, type Statement } from '../syntax/ast.ts';
import { parse } from '../syntax/parse.ts';
import { arrayToList, isPair, listToArray, type Value } from '../evaluator/values.ts';

/**
 * Programs as data, in the tagged-list representation of §4.1.2: what `parse`
 * returns in the book, and what the explicit-control evaluator and the
 * compiler of chapter 5 take apart with syntax predicates and selectors.
 *
 *   x + 1;            list("binary_operator_combination", "+", list("name", "x"), list("literal", 1))
 *   x => x;           list("lambda_expression", list(list("name", "x")), list("return_statement", list("name", "x")))
 *
 * As the book allows, a block without declarations is represented by its
 * statements alone, and a sequence of one statement by that statement.
 */

const list = (...items: Value[]): Value => arrayToList(items);
const name = (symbol: string): Value => list('name', symbol);

function sequence(statements: readonly Statement[]): Value {
  if (statements.length === 1) return statement(statements[0] as Statement);
  return list('sequence', arrayToList(statements.map(statement)));
}

function block(node: Block): Value {
  const body = sequence(node.body);
  return node.body.some(isDeclaration) ? list('block', body) : body;
}

function expression(node: Expression): Value {
  switch (node.kind) {
    case 'literal':
      return list('literal', node.value);
    case 'name':
      return name(node.symbol);
    case 'application':
      return list('application', expression(node.fun), arrayToList(node.args.map(expression)));
    case 'unary':
      return list('unary_operator_combination', node.operator === '-' ? '-unary' : '!', expression(node.operand));
    case 'binary':
      return list('binary_operator_combination', node.operator, expression(node.left), expression(node.right));
    case 'logical':
      return list('logical_composition', node.operator, expression(node.left), expression(node.right));
    case 'conditional':
      return list('conditional_expression', expression(node.test), expression(node.consequent), expression(node.alternative));
    case 'lambda':
      return list(
        'lambda_expression',
        arrayToList(node.params.map(name)),
        node.body.kind === 'block' ? block(node.body) : list('return_statement', expression(node.body)),
      );
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
        arrayToList(node.lambda.params.map(name)),
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

/** The tagged-list representation of a parsed program. */
export function programComponent(program: Program): Value {
  return sequence(program.body);
}

/** `parse` as in the book: program text to its tagged-list representation. */
export function parseComponent(source: string): Value {
  return programComponent(parse(source));
}

// Turning components back into text, for showing what a register holds.

const PRECEDENCE: Readonly<Record<string, number>> = {
  '||': 1,
  '&&': 2,
  '===': 3,
  '!==': 3,
  '<': 4,
  '>': 4,
  '<=': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
};

const items = (value: Value): Value[] => listToArray(value) ?? [];
const tagOf = (value: Value): string | null => (isPair(value) && typeof value[0] === 'string' ? value[0] : null);

function literalText(value: Value): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

/** One line of text for a component; long components are best clipped by the caller. */
export function unparse(component: Value, context = 0): string {
  const parts = items(component);
  const symbolOf = (named: Value): string => String(items(named)[1]);
  const wrap = (text: string, precedence: number): string => (precedence < context ? `(${text})` : text);
  switch (tagOf(component)) {
    case 'literal':
      return literalText(parts[1]);
    case 'name':
      return String(parts[1]);
    case 'application':
      return `${unparse(parts[1], 9)}(${items(parts[2] ?? null).map((arg) => unparse(arg)).join(', ')})`;
    case 'binary_operator_combination':
    case 'logical_composition': {
      const operator = String(parts[1]);
      const precedence = PRECEDENCE[operator] ?? 5;
      return wrap(`${unparse(parts[2], precedence)} ${operator} ${unparse(parts[3], precedence + 1)}`, precedence);
    }
    case 'unary_operator_combination':
      return `${parts[1] === '-unary' ? '-' : '!'}${unparse(parts[2], 8)}`;
    case 'conditional_expression':
      return wrap(`${unparse(parts[1], 1)} ? ${unparse(parts[2])} : ${unparse(parts[3])}`, 0.5);
    case 'conditional_statement':
      return `if (${unparse(parts[1])}) { ${unparse(parts[2])} } else { ${unparse(parts[3])} }`;
    case 'lambda_expression': {
      const params = items(parts[1] ?? null).map(symbolOf);
      const body = parts[2] ?? null;
      const head = params.length === 1 ? (params[0] ?? '') : `(${params.join(', ')})`;
      return wrap(
        tagOf(body) === 'return_statement' ? `${head} => ${unparse(items(body)[1], 1)}` : `${head} => { ${unparse(body)} }`,
        0.5,
      );
    }
    case 'sequence':
      return items(parts[1] ?? null)
        .map((statement) => unparse(statement))
        .join(' ');
    case 'block':
      return `{ ${unparse(parts[1])} }`;
    case 'return_statement':
      return `return ${unparse(parts[1])};`;
    case 'assignment':
      return wrap(`${symbolOf(parts[1])} = ${unparse(parts[2])}`, 0.5);
    case 'constant_declaration':
      return `const ${symbolOf(parts[1])} = ${unparse(parts[2])};`;
    case 'variable_declaration':
      return `let ${symbolOf(parts[1])} = ${unparse(parts[2])};`;
    case 'function_declaration':
      return `function ${symbolOf(parts[1])}(${items(parts[2] ?? null)
        .map(symbolOf)
        .join(', ')}) { ${unparse(parts[3])} }`;
    default:
      return literalText(component);
  }
}
