/**
 * Reading Source values back from their text form, and describing the tagged
 * lists of §4.1.2. The Laboratory sends values to the page as text (`[1, [2,
 * null]]`), possibly cut short with `...`; scenes about Chapter 4's
 * evaluators need the structure back.
 */

/** A value as read from text. Functions keep their text, e.g. `fn[E3]`. */
export type Read = number | string | boolean | null | undefined | { fn: string } | { cut: true } | [Read, Read];

/** Read a value written by `stringify`. Text cut short reads as `{ cut: true }` where it stops. */
export function readValue(text: string): Read {
  let i = 0;
  const skip = (): void => {
    while (text[i] === ' ') i++;
  };
  const value = (): Read => {
    skip();
    if (i >= text.length || text.startsWith('...', i)) {
      i = text.length;
      return { cut: true };
    }
    const ch = text[i];
    if (ch === '[') {
      i++;
      const first = value();
      skip();
      if (text[i] !== ',') {
        i = text.length;
        return [first, { cut: true }];
      }
      i++;
      const second = value();
      skip();
      if (text[i] === ']') i++;
      return [first, second];
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      if (j >= text.length) {
        i = text.length;
        return { cut: true };
      }
      const literal = text.slice(i, j + 1);
      i = j + 1;
      return JSON.parse(literal) as string;
    }
    const word = /^(fn\[[^\]]*\]|primitive\[[^\]]*\]|-?[\d.e+-]+|true|false|null|undefined|NaN|-?Infinity)/.exec(text.slice(i));
    if (word === null) {
      i = text.length;
      return { cut: true };
    }
    i += word[0].length;
    const w = word[0];
    if (w === 'true' || w === 'false') return w === 'true';
    if (w === 'null') return null;
    if (w === 'undefined') return undefined;
    if (w.startsWith('fn[') || w.startsWith('primitive[')) return { fn: w };
    return Number(w);
  };
  return value();
}

export const isPairRead = (v: Read): v is [Read, Read] => Array.isArray(v);
export const isCut = (v: Read): boolean => typeof v === 'object' && v !== null && !Array.isArray(v) && 'cut' in v;

/** The items of a list; a list cut short gives the items read so far. */
export function itemsOf(v: Read): Read[] {
  const items: Read[] = [];
  let rest = v;
  while (isPairRead(rest)) {
    items.push(rest[0]);
    rest = rest[1];
  }
  return items;
}

/** Short text for a value, in the book's notation where it can be: `list(1, 2)`, `"a"`, `null`. */
export function show(v: Read, max = 40): string {
  const text = ((): string => {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (isPairRead(v)) {
      const tag = v[0];
      if (tag === 'compound_function') return 'compound function';
      if (tag === 'primitive') return 'primitive function';
      if (tag === 'return_value') return `return value ${show(itemsOf(v)[1] ?? null, max)}`;
      const items = itemsOf(v);
      return `[${items.map((item) => show(item, max)).join(', ')}]`;
    }
    if ('fn' in v) return v.fn;
    return '…';
  })();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** What `parse` produces for one component, as a tree for drawing. */
export interface ComponentNode {
  id: string;
  tag: string;
  /** The non-component parts shown with the tag, e.g. the symbol of a name. */
  detail: string | null;
  children: ComponentNode[];
}

const COMPONENT_TAGS = new Set([
  'literal',
  'name',
  'application',
  'unary_operator_combination',
  'binary_operator_combination',
  'logical_composition',
  'conditional_expression',
  'conditional_statement',
  'lambda_expression',
  'sequence',
  'block',
  'return_statement',
  'assignment',
  'constant_declaration',
  'variable_declaration',
  'function_declaration',
]);

export const isComponent = (v: Read): v is [Read, Read] => isPairRead(v) && typeof v[0] === 'string' && COMPONENT_TAGS.has(v[0]);

/** The tree of components in a tagged list, or `null` when it is not one. */
export function componentTree(value: Read): ComponentNode | null {
  let next = 0;
  const build = (v: Read): ComponentNode | null => {
    if (!isComponent(v)) return null;
    const [tag, ...parts] = itemsOf(v) as [string, ...Read[]];
    const id = `c${next++}`;
    const first = parts[0] as Read;
    if (tag === 'literal' || tag === 'name') return { id, tag, detail: show(first, 24), children: [] };
    const detail = tag.endsWith('operator_combination') || tag === 'logical_composition' ? show(first) : null;
    const children: ComponentNode[] = [];
    for (const part of detail === null ? parts : parts.slice(1)) {
      // Lists of components (arguments, statements, parameters) contribute their items.
      const inner = isComponent(part) ? [part] : itemsOf(part);
      for (const item of inner) {
        const child = build(item);
        if (child !== null) children.push(child);
      }
    }
    return { id, tag, detail, children };
  };
  return build(value);
}

/** The syntax predicate of §4.1.2 that recognizes a tag, and what `evaluate` then does. */
export const SYNTAX: Readonly<Record<string, { predicate: string; does: string }>> = {
  literal: { predicate: 'is_literal', does: '`literal_value` is its value.' },
  name: { predicate: 'is_name', does: '`symbol_of_name` gives the string to look up.' },
  application: {
    predicate: 'is_application',
    does: '`function_expression` and `arg_expressions` give the parts to evaluate before `apply`.',
  },
  unary_operator_combination: {
    predicate: 'is_operator_combination',
    does: 'a derived component: `operator_combination_to_application` makes it an application of the operator’s name.',
  },
  binary_operator_combination: {
    predicate: 'is_operator_combination',
    does: 'a derived component: `operator_combination_to_application` makes it an application of the operator’s name.',
  },
  logical_composition: {
    predicate: 'none yet',
    does: 'the evaluator of §4.1.1 has no clause for it: that is exercise 4.4.',
  },
  conditional_expression: {
    predicate: 'is_conditional',
    does: '`conditional_predicate`, `conditional_consequent` and `conditional_alternative` select its parts.',
  },
  conditional_statement: {
    predicate: 'is_conditional',
    does: 'the same selectors as a conditional expression: the evaluator treats both alike.',
  },
  lambda_expression: {
    predicate: 'is_lambda_expression',
    does: '`lambda_parameter_symbols` and `lambda_body` are what `make_function` keeps.',
  },
  sequence: { predicate: 'is_sequence', does: '`sequence_statements` is the list `eval_sequence` walks.' },
  block: { predicate: 'is_block', does: '`block_body` is scanned for declarations, then evaluated in a new frame.' },
  return_statement: { predicate: 'is_return_statement', does: '`return_expression` is evaluated and wrapped as a return value.' },
  assignment: { predicate: 'is_assignment', does: '`assignment_symbol` and `assignment_value_expression` select its parts.' },
  constant_declaration: {
    predicate: 'is_declaration',
    does: '`declaration_symbol` and `declaration_value_expression` select its parts.',
  },
  variable_declaration: {
    predicate: 'is_declaration',
    does: '`declaration_symbol` and `declaration_value_expression` select its parts.',
  },
  function_declaration: {
    predicate: 'is_function_declaration',
    does: 'a derived component: `function_decl_to_constant_decl` makes it a constant declared as a lambda expression.',
  },
};

/** A tagged list in the notation of §4.1.2, e.g. `list("name", "x")`, cut to `max` characters. */
export function listNotation(v: Read, max = 120): string {
  const write = (x: Read): string => {
    if (isPairRead(x)) {
      const items = itemsOf(x);
      return `list(${items.map(write).join(', ')})`;
    }
    return show(x, 1000);
  };
  const text = write(v);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
