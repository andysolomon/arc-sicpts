import { isDeclaration } from '../syntax/ast.ts';
import { parse } from '../syntax/parse.ts';

/**
 * Tools for handing parts of a Source program to a page: the evaluators of
 * Chapter 4 are long, and an exercise usually asks for one or two of their
 * declarations while the rest stay hidden.
 */

/** The names a program declares at its top level, in order. */
export function declaredNames(source: string): string[] {
  return parse(source).body.filter(isDeclaration).map((d) => d.symbol);
}

/**
 * The program with the named top-level declarations removed. Throws when a
 * name is not declared, so a renamed function cannot be dropped silently.
 */
export function omit(source: string, ...names: string[]): string {
  const declarations = parse(source).body.filter(isDeclaration);
  for (const name of names) {
    if (!declarations.some((d) => d.symbol === name)) throw new Error(`omit: ${name} is not declared at the top level`);
  }
  const removed = declarations.filter((d) => names.includes(d.symbol)).sort((a, b) => b.loc.start - a.loc.start);
  let text = source;
  for (const declaration of removed) {
    // Take the line break after the declaration too, so no blank gap is left.
    const end = text[declaration.loc.end] === '\n' ? declaration.loc.end + 1 : declaration.loc.end;
    text = text.slice(0, declaration.loc.start) + text.slice(end);
  }
  return text;
}

/** Only the named top-level declarations of the program, in the order given. */
export function pick(source: string, ...names: string[]): string {
  const declarations = parse(source).body.filter(isDeclaration);
  return names
    .map((name) => {
      const declaration = declarations.find((d) => d.symbol === name);
      if (declaration === undefined) throw new Error(`pick: ${name} is not declared at the top level`);
      return source.slice(declaration.loc.start, declaration.loc.end);
    })
    .join('\n');
}
