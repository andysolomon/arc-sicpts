import type {
  BinaryOperator,
  Block,
  Expression,
  If,
  Lambda,
  Loc,
  Program,
  Statement,
} from './ast.ts';
import { SourceError } from './errors.ts';
import { tokenize, type Token } from './tokenize.ts';

/** Binary operators by precedence level, loosest first. */
const BINARY_LEVELS: readonly (readonly BinaryOperator[])[] = [
  ['===', '!=='],
  ['<', '>', '<=', '>='],
  ['+', '-'],
  ['*', '/', '%'],
];

export function parse(source: string): Program {
  const tokens = tokenize(source);
  let index = 0;

  const peek = (offset = 0): Token => {
    const token = tokens[Math.min(index + offset, tokens.length - 1)];
    if (token === undefined) throw new Error('tokenize always emits an eof token');
    return token;
  };

  const previous = (): Token => {
    const token = tokens[Math.max(index - 1, 0)];
    if (token === undefined) throw new Error('tokenize always emits an eof token');
    return token;
  };

  const next = (): Token => {
    const token = peek();
    if (token.type !== 'eof') index++;
    return token;
  };

  const describe = (token: Token): string => (token.type === 'eof' ? 'end of program' : `'${token.text}'`);

  const fail = (message: string, token: Token = peek()): never => {
    throw new SourceError('parse', message, token.loc);
  };

  const isPunct = (text: string, offset = 0): boolean => {
    const token = peek(offset);
    return token.type === 'punct' && token.text === text;
  };

  const isKeyword = (text: string): boolean => {
    const token = peek();
    return token.type === 'keyword' && token.text === text;
  };

  const expectPunct = (text: string, context: string): Token => {
    if (!isPunct(text)) {
      if (text === ';') {
        // Report a missing semicolon where it belongs: right after the statement.
        const after = previous().loc;
        throw new SourceError('parse', `Missing semicolon ${context}`, {
          ...after,
          start: after.end,
          line: after.endLine,
          col: after.endCol,
        });
      }
      fail(`Expected '${text}' ${context}, found ${describe(peek())}`);
    }
    return next();
  };

  const expectName = (context: string): Token => {
    const token = peek();
    if (token.type !== 'name') fail(`Expected a name ${context}, found ${describe(token)}`);
    return next();
  };

  const span = (from: Loc, to: Loc): Loc => ({
    start: from.start,
    end: to.end,
    line: from.line,
    col: from.col,
    endLine: to.endLine,
    endCol: to.endCol,
  });

  /** True when the tokens at the cursor begin `x =>` or `(a, b) =>`. */
  const isLambdaAhead = (): boolean => {
    if (peek().type === 'name') return isPunct('=>', 1);
    if (!isPunct('(')) return false;
    let depth = 0;
    for (let offset = 0; ; offset++) {
      const token = peek(offset);
      if (token.type === 'eof') return false;
      if (token.type !== 'punct') continue;
      if (token.text === '(') depth++;
      if (token.text === ')') {
        depth--;
        if (depth === 0) return isPunct('=>', offset + 1);
      }
    }
  };

  const parseParams = (): string[] => {
    const params: string[] = [];
    expectPunct('(', 'before parameters');
    while (!isPunct(')')) {
      const param = expectName('as a parameter');
      if (params.includes(param.text)) fail(`Duplicate parameter '${param.text}'`, param);
      params.push(param.text);
      if (!isPunct(')')) expectPunct(',', 'between parameters');
    }
    expectPunct(')', 'after parameters');
    return params;
  };

  const parseLambda = (): Lambda => {
    const first = peek();
    const params = first.type === 'name' ? [next().text] : parseParams();
    expectPunct('=>', 'in lambda expression');
    const body = isPunct('{') ? parseBlock() : parseExpression();
    return { kind: 'lambda', name: null, params, body, loc: span(first.loc, body.loc) };
  };

  const parsePrimary = (): Expression => {
    const token = peek();
    switch (token.type) {
      case 'number':
      case 'string':
        next();
        return { kind: 'literal', value: token.value ?? 0, loc: token.loc };
      case 'name':
        next();
        return { kind: 'name', symbol: token.text, loc: token.loc };
      case 'keyword':
        switch (token.text) {
          case 'true':
            next();
            return { kind: 'literal', value: true, loc: token.loc };
          case 'false':
            next();
            return { kind: 'literal', value: false, loc: token.loc };
          case 'null':
            next();
            return { kind: 'literal', value: null, loc: token.loc };
          case 'undefined':
            next();
            return { kind: 'literal', value: undefined, loc: token.loc };
          default:
            return fail(`Unexpected ${describe(token)}`);
        }
      case 'punct':
        if (token.text === '(') {
          next();
          const inner = parseExpression();
          const close = expectPunct(')', 'to close the parenthesis');
          // Widen the span so that highlights cover the parentheses too.
          return { ...inner, loc: span(token.loc, close.loc) };
        }
        return fail(`Unexpected ${describe(token)}`);
      case 'eof':
        return fail('Unexpected end of program');
    }
  };

  const parseCall = (): Expression => {
    let expression = parsePrimary();
    while (isPunct('(')) {
      next();
      const args: Expression[] = [];
      while (!isPunct(')')) {
        args.push(parseExpression());
        if (!isPunct(')')) expectPunct(',', 'between arguments');
      }
      const close = expectPunct(')', 'after arguments');
      expression = {
        kind: 'application',
        fun: expression,
        args,
        loc: span(expression.loc, close.loc),
      };
    }
    return expression;
  };

  const parseUnary = (): Expression => {
    const token = peek();
    if (token.type === 'punct' && (token.text === '!' || token.text === '-')) {
      next();
      const operand = parseUnary();
      return {
        kind: 'unary',
        operator: token.text,
        operand,
        loc: span(token.loc, operand.loc),
      };
    }
    return parseCall();
  };

  const parseBinary = (level: number): Expression => {
    const operators = BINARY_LEVELS[level];
    if (operators === undefined) return parseUnary();
    let left = parseBinary(level + 1);
    for (;;) {
      const token = peek();
      const operator = operators.find((op) => token.type === 'punct' && token.text === op);
      if (operator === undefined) return left;
      next();
      const right = parseBinary(level + 1);
      left = { kind: 'binary', operator, left, right, loc: span(left.loc, right.loc) };
    }
  };

  const parseAnd = (): Expression => {
    let left = parseBinary(0);
    while (isPunct('&&')) {
      next();
      const right = parseBinary(0);
      left = { kind: 'logical', operator: '&&', left, right, loc: span(left.loc, right.loc) };
    }
    return left;
  };

  const parseOr = (): Expression => {
    let left = parseAnd();
    while (isPunct('||')) {
      next();
      const right = parseAnd();
      left = { kind: 'logical', operator: '||', left, right, loc: span(left.loc, right.loc) };
    }
    return left;
  };

  const parseConditional = (): Expression => {
    const test = parseOr();
    if (!isPunct('?')) return test;
    next();
    const consequent = parseExpression();
    expectPunct(':', 'in conditional expression');
    const alternative = parseExpression();
    return {
      kind: 'conditional',
      test,
      consequent,
      alternative,
      loc: span(test.loc, alternative.loc),
    };
  };

  function parseExpression(): Expression {
    if (isLambdaAhead()) return parseLambda();
    const target = peek();
    if (target.type === 'name' && isPunct('=', 1)) {
      next();
      next();
      const value = parseExpression();
      return {
        kind: 'assignment',
        symbol: target.text,
        value,
        loc: span(target.loc, value.loc),
      };
    }
    return parseConditional();
  }

  function parseBlock(): Block {
    const open = expectPunct('{', 'to open a block');
    const body: Statement[] = [];
    while (!isPunct('}')) {
      if (peek().type === 'eof') fail("Expected '}' to close the block");
      body.push(parseStatement());
    }
    const close = next();
    return { kind: 'block', body, loc: span(open.loc, close.loc) };
  }

  const parseIf = (): If => {
    const start = next();
    expectPunct('(', "after 'if'");
    const test = parseExpression();
    expectPunct(')', 'after the condition');
    const consequent = parseBlock();
    let alternative: Block | If | null = null;
    if (isKeyword('else')) {
      next();
      alternative = isKeyword('if') ? parseIf() : parseBlock();
    }
    return {
      kind: 'if',
      test,
      consequent,
      alternative,
      loc: span(start.loc, (alternative ?? consequent).loc),
    };
  };

  function parseStatement(): Statement {
    const token = peek();

    if (token.type === 'keyword') {
      switch (token.text) {
        case 'const':
        case 'let': {
          next();
          const name = expectName(`after '${token.text}'`);
          expectPunct('=', `after '${name.text}'`);
          const init = parseExpression();
          const end = expectPunct(';', 'after declaration');
          if (init.kind === 'lambda' && init.name === null) init.name = name.text;
          return { kind: token.text, symbol: name.text, init, loc: span(token.loc, end.loc) };
        }
        case 'function': {
          next();
          const name = expectName("after 'function'");
          const params = parseParams();
          const body = parseBlock();
          const loc = span(token.loc, body.loc);
          return {
            kind: 'function',
            symbol: name.text,
            lambda: { kind: 'lambda', name: name.text, params, body, loc },
            loc,
          };
        }
        case 'return': {
          next();
          const argument = isPunct(';') ? null : parseExpression();
          const end = expectPunct(';', 'after return statement');
          return { kind: 'return', argument, loc: span(token.loc, end.loc) };
        }
        case 'if':
          return parseIf();
        case 'else':
          return fail("'else' without a matching 'if'");
        default:
          break;
      }
    }

    if (isPunct('{')) return parseBlock();

    const expression = parseExpression();
    expectPunct(';', 'after expression');
    return expression;
  }

  const body: Statement[] = [];
  while (peek().type !== 'eof') body.push(parseStatement());

  const first = tokens[0];
  const last = peek();
  return {
    kind: 'program',
    body,
    loc: span((first ?? last).loc, last.loc),
  };
}
