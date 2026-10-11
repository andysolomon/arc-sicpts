import type {
  Argument,
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

/** Keywords that are also the types of their own values, such as `null` in `List<T> | null`. */
const TYPE_KEYWORDS: readonly string[] = ['true', 'false', 'null', 'undefined'];

interface Parameters {
  params: string[];
  rest?: string;
}

/**
 * Parse a program in the Source subset. TypeScript annotations are accepted
 * wherever this subset can use them, checked for syntax, and dropped: types
 * are stripped, never checked, as Node does when it runs a `.ts` file.
 */
export function parse(source: string): Program {
  const tokens = tokenize(source);
  let index = 0;
  /** For each function being parsed, innermost last: whether it is `async`. */
  const functions: boolean[] = [];
  /** Expressions written in parentheses, which `??` may sit next to `&&` and `||`. */
  const parenthesized = new WeakSet<Expression>();
  /** Set while the consequent of `a ? b : c` is parsed again without return types, see `parseConditional`. */
  let noReturnTypes = false;

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

  const isKeyword = (text: string, offset = 0): boolean => {
    const token = peek(offset);
    return token.type === 'keyword' && token.text === text;
  };

  const isName = (text: string, offset = 0): boolean => {
    const token = peek(offset);
    return token.type === 'name' && token.text === text;
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

  /** Run `parse` from the cursor; if it fails, put the cursor back and return `null`. */
  const attempt = <T>(parse: () => T): T | null => {
    const saved = index;
    try {
      return parse();
    } catch (error) {
      if (!(error instanceof SourceError)) throw error;
      index = saved;
      return null;
    }
  };

  /** Whether `parse` succeeds from the cursor; the cursor moves only if it does. */
  const succeeds = (parse: () => void): boolean =>
    attempt(() => {
      parse();
      return true;
    }) !== null;

  /** Offset of the `)` that closes the `(` at `offset`, or `null` when nothing closes it. */
  const closingParen = (offset: number): number | null => {
    let depth = 0;
    for (let at = offset; ; at++) {
      const token = peek(at);
      if (token.type === 'eof') return null;
      if (token.type !== 'punct') continue;
      if (token.text === '(') depth++;
      if (token.text === ')' && --depth === 0) return at;
    }
  };

  // Types. They are parsed only so that a mistake in one is reported; nothing is kept.

  function parseType(): void {
    if (isPunct('<')) {
      parseTypeParams();
      parseFunctionType();
      return;
    }
    if (isPunct('(') && succeeds(parseFunctionType)) return;
    if (isPunct('|')) next();
    parseIntersectionType();
    while (isPunct('|')) {
      next();
      parseIntersectionType();
    }
  }

  const parseIntersectionType = (): void => {
    parseArrayType();
    while (isPunct('&')) {
      next();
      parseArrayType();
    }
  };

  const parseArrayType = (): void => {
    parsePrimaryType();
    while (isPunct('[') && isPunct(']', 1)) {
      next();
      next();
    }
  };

  const parsePrimaryType = (): void => {
    const token = peek();
    if (token.type === 'name') {
      next();
      while (isPunct('.')) {
        next();
        expectName('in a qualified type name');
      }
      if (isPunct('<')) parseTypeArgs();
      return;
    }
    if (token.type === 'string' || token.type === 'number') {
      next();
      return;
    }
    if (token.type === 'keyword' && TYPE_KEYWORDS.includes(token.text)) {
      next();
      return;
    }
    if (isPunct('-') && peek(1).type === 'number') {
      next();
      next();
      return;
    }
    if (isPunct('(')) {
      next();
      parseType();
      expectPunct(')', 'to close the type');
      return;
    }
    if (isPunct('[')) {
      next();
      while (!isPunct(']')) {
        if (isPunct('...')) next();
        // A named member, as in `[head: H, tail: T]`.
        if (peek().type === 'name' && (isPunct(':', 1) || (isPunct('?', 1) && isPunct(':', 2)))) {
          next();
          if (isPunct('?')) next();
          next();
        }
        parseType();
        if (isPunct('?')) next();
        if (!isPunct(']')) expectPunct(',', 'between the members of a tuple type');
      }
      next();
      return;
    }
    if (isPunct('{')) {
      next();
      while (!isPunct('}')) {
        const key = peek();
        if (key.type !== 'name' && key.type !== 'string') fail(`Expected a property name in an object type, found ${describe(key)}`);
        next();
        if (isPunct('?')) next();
        expectPunct(':', 'after a property name in an object type');
        parseType();
        if (isPunct(',') || isPunct(';')) next();
        else if (!isPunct('}')) fail(`Expected ',' or '}' in an object type, found ${describe(peek())}`);
      }
      next();
      return;
    }
    fail(`Expected a type, found ${describe(token)}`);
  };

  const parseTypeArgs = (): void => {
    expectPunct('<', 'before type arguments');
    parseType();
    while (isPunct(',')) {
      next();
      parseType();
    }
    expectPunct('>', 'to close the type arguments');
  };

  /** `<T, U extends Base = Default>` before the parameters of a generic function. */
  function parseTypeParams(): void {
    expectPunct('<', 'before type parameters');
    while (!isPunct('>')) {
      expectName('as a type parameter');
      if (isName('extends')) {
        next();
        parseType();
      }
      if (isPunct('=')) {
        next();
        parseType();
      }
      if (!isPunct('>')) expectPunct(',', 'between type parameters');
    }
    next();
  }

  /** `(x: A, ...rest: B[]) => R`, the type of a function. */
  function parseFunctionType(): void {
    expectPunct('(', 'before the parameters of a function type');
    while (!isPunct(')')) {
      if (isPunct('...')) next();
      expectName('as a parameter of a function type');
      if (isPunct('?')) next();
      if (isPunct(':')) {
        next();
        parseType();
      }
      if (!isPunct(')')) expectPunct(',', 'between parameters');
    }
    next();
    expectPunct('=>', 'in a function type');
    parseType();
  }

  /** `: Type` after a name or a parameter list, when there is one. */
  const parseAnnotation = (): void => {
    if (!isPunct(':')) return;
    next();
    parseType();
  };

  // Functions.

  const parseParams = (): Parameters => {
    const params: string[] = [];
    let rest: string | undefined;
    expectPunct('(', 'before parameters');
    while (!isPunct(')')) {
      if (rest !== undefined) fail('A rest parameter must be the last parameter');
      const spread = isPunct('...') ? next() : null;
      const param = expectName('as a parameter');
      if (params.includes(param.text) || rest === param.text) fail(`Duplicate parameter '${param.text}'`, param);
      if (isPunct('?')) fail('Optional parameters are not part of this Source subset: every argument must be given');
      parseAnnotation();
      if (isPunct('=')) fail('Default parameter values are not part of this Source subset');
      if (spread === null) params.push(param.text);
      else rest = param.text;
      if (!isPunct(')')) expectPunct(',', 'between parameters');
    }
    expectPunct(')', 'after parameters');
    return rest === undefined ? { params } : { params, rest };
  };

  /** True when the token at `offset` is the contextual keyword `async` of an async function. */
  const isAsyncAt = (offset: number): boolean =>
    isName('async', offset) && (isPunct('(', offset + 1) || isPunct('<', offset + 1) || (peek(offset + 1).type === 'name' && isPunct('=>', offset + 2)));

  /**
   * True when the tokens at the cursor begin a lambda expression: `x =>`,
   * `(a, b) =>`, `(a: A): R =>`, `<T>(x: T) =>`, or any of these after `async`.
   */
  const isLambdaAhead = (): boolean => {
    const at = isAsyncAt(0) ? 1 : 0;
    if (peek(at).type === 'name') return isPunct('=>', at + 1);
    // `<` cannot begin any other expression.
    if (isPunct('<', at)) return true;
    if (!isPunct('(', at)) return false;
    const close = closingParen(at);
    if (close === null) return false;
    if (isPunct('=>', close + 1)) return true;
    if (!isPunct(':', close + 1) || noReturnTypes) return false;
    // `(a) : b` may be a lambda with a return type, or the start of the
    // branches of a conditional. It is a lambda if it reads as one up to `=>`.
    const saved = index;
    index += at;
    const arrow = succeeds(() => {
      parseParams();
      parseAnnotation();
      expectPunct('=>', 'in lambda expression');
    });
    index = saved;
    return arrow;
  };

  const parseFunctionBody = <T extends Block | Expression>(isAsync: boolean, body: () => T): T => {
    functions.push(isAsync);
    try {
      return body();
    } finally {
      functions.pop();
    }
  };

  const parseLambda = (): Lambda => {
    const first = peek();
    const isAsync = isAsyncAt(0);
    if (isAsync) next();
    let parameters: Parameters;
    if (peek().type === 'name') {
      parameters = { params: [next().text] };
    } else {
      if (isPunct('<')) parseTypeParams();
      parameters = parseParams();
      if (!noReturnTypes) parseAnnotation();
    }
    expectPunct('=>', 'in lambda expression');
    const body = parseFunctionBody(isAsync, () => (isPunct('{') ? parseBlock() : parseExpression()));
    return {
      kind: 'lambda',
      name: null,
      ...parameters,
      ...(isAsync && { async: true }),
      body,
      loc: span(first.loc, body.loc),
    };
  };

  // Expressions.

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
          const widened = { ...inner, loc: span(token.loc, close.loc) };
          parenthesized.add(widened);
          return widened;
        }
        if (token.text === '[') return fail('Array literals are not part of this Source subset: use pair and list');
        if (token.text === '{') return fail('Object literals are not part of this Source subset: use pairs, lists and functions');
        return fail(`Unexpected ${describe(token)}`);
      case 'eof':
        return fail('Unexpected end of program');
    }
  };

  /** The arguments of a call, after its `(`, up to and including the `)`. */
  const parseArguments = (): { args: Argument[]; close: Token } => {
    const args: Argument[] = [];
    while (!isPunct(')')) {
      if (isPunct('...')) {
        const start = next();
        const argument = parseExpression();
        args.push({ kind: 'spread', argument, loc: span(start.loc, argument.loc) });
      } else {
        args.push(parseExpression());
      }
      if (!isPunct(')')) expectPunct(',', 'between arguments');
    }
    return { args, close: expectPunct(')', 'after arguments') };
  };

  const parseCall = (): Expression => {
    let expression = parsePrimary();
    // True once a `?.` has begun an optional chain: the calls after it belong to the chain.
    let chain = false;
    for (;;) {
      if (isPunct('?.')) {
        next();
        if (!isPunct('(')) fail("Only a call can follow '?.': this Source subset has no objects or properties");
        next();
        const { args, close } = parseArguments();
        expression = { kind: 'application', fun: expression, args, optional: true, loc: span(expression.loc, close.loc) };
        chain = true;
      } else if (isPunct('(')) {
        next();
        const { args, close } = parseArguments();
        expression = {
          kind: 'application',
          fun: expression,
          args,
          ...(chain && { chained: true }),
          loc: span(expression.loc, close.loc),
        };
      } else if (isPunct('.')) {
        fail('Property access is not part of this Source subset: it has no objects. Use the library functions instead');
      } else {
        return expression;
      }
    }
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
    if (token.type === 'keyword' && token.text === 'await') {
      if (functions.length > 0 && functions[functions.length - 1] !== true) {
        fail("'await' is only allowed in an async function or at the top level of a program");
      }
      next();
      const argument = parseUnary();
      return { kind: 'await', argument, loc: span(token.loc, argument.loc) };
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

  /** `a ?? b`. As in JavaScript, it cannot sit next to `&&` or `||` without parentheses. */
  const parseCoalesce = (): Expression => {
    let left = parseOr();
    const mixed = (operand: Expression): boolean =>
      operand.kind === 'logical' && operand.operator !== '??' && !parenthesized.has(operand);
    while (isPunct('??')) {
      const operator = next();
      const right = parseOr();
      if (mixed(left) || mixed(right)) {
        fail("'??' cannot be combined with '&&' or '||' without parentheses", operator);
      }
      left = { kind: 'logical', operator: '??', left, right, loc: span(left.loc, right.loc) };
    }
    return left;
  };

  const parseConditional = (): Expression => {
    const test = parseCoalesce();
    if (!isPunct('?')) return test;
    next();
    const start = index;
    let consequent = parseExpression();
    if (!isPunct(':') && !noReturnTypes) {
      // In `a ? (b) : c => d`, `(b) : c => d` looked like a lambda with a
      // return type. Read the consequent again without return types.
      index = start;
      noReturnTypes = true;
      try {
        consequent = parseExpression();
      } finally {
        noReturnTypes = false;
      }
    }
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

  // Statements.

  /** The statements of a block or program, without the type declarations, which leave nothing behind. */
  const parseStatements = (isEnd: () => boolean): Statement[] => {
    const body: Statement[] = [];
    while (!isEnd()) {
      const statement = parseStatement();
      if (statement !== null) body.push(statement);
    }
    return body;
  };

  function parseBlock(): Block {
    const open = expectPunct('{', 'to open a block');
    const body = parseStatements(() => {
      if (peek().type === 'eof') fail("Expected '}' to close the block");
      return isPunct('}');
    });
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

  const parseFunctionDeclaration = (start: Token, isAsync: boolean): Statement => {
    next();
    const name = expectName("after 'function'");
    if (isPunct('<')) parseTypeParams();
    const parameters = parseParams();
    parseAnnotation();
    const body = parseFunctionBody(isAsync, parseBlock);
    const loc = span(start.loc, body.loc);
    return {
      kind: 'function',
      symbol: name.text,
      lambda: { kind: 'lambda', name: name.text, ...parameters, ...(isAsync && { async: true }), body, loc },
      loc,
    };
  };

  /** A statement, or `null` for a type alias, which declares nothing a program can use. */
  function parseStatement(): Statement | null {
    const token = peek();

    if (token.type === 'keyword') {
      switch (token.text) {
        case 'const':
        case 'let': {
          next();
          const name = expectName(`after '${token.text}'`);
          parseAnnotation();
          expectPunct('=', `after '${name.text}'`);
          const init = parseExpression();
          const end = expectPunct(';', 'after declaration');
          if (init.kind === 'lambda' && init.name === null) init.name = name.text;
          return { kind: token.text, symbol: name.text, init, loc: span(token.loc, end.loc) };
        }
        case 'function':
          return parseFunctionDeclaration(token, false);
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

    // `async` and `type` are names everywhere else, as in TypeScript.
    if (isName('async') && isKeyword('function', 1)) {
      next();
      return parseFunctionDeclaration(token, true);
    }
    if (isName('type') && peek(1).type === 'name' && (isPunct('=', 2) || isPunct('<', 2))) {
      next();
      next();
      if (isPunct('<')) parseTypeParams();
      expectPunct('=', 'in type declaration');
      parseType();
      expectPunct(';', 'after type declaration');
      return null;
    }

    if (isPunct('{')) return parseBlock();

    const expression = parseExpression();
    expectPunct(';', 'after expression');
    return expression;
  }

  const body = parseStatements(() => peek().type === 'eof');

  const first = tokens[0];
  const last = peek();
  return {
    kind: 'program',
    body,
    loc: span((first ?? last).loc, last.loc),
  };
}
