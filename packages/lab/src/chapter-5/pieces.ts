/**
 * Taking the book's programs apart by top-level declaration, so that an
 * exercise can hand the reader a few functions of the simulator or the
 * compiler and run the rest around the reader's versions (see the `context`
 * of a check). Declarations start at the beginning of a line.
 */

const DECLARATION = /^(?:function\s+(\w+)\s*\(|const\s+(\w+)\b|let\s+(\w+)\b)/;

function chunks(source: string): { name: string | null; text: string }[] {
  return source.split(/\n(?=function\s|const\s|let\s)/).map((text) => {
    const match = DECLARATION.exec(text.trimStart());
    return { name: match?.[1] ?? match?.[2] ?? match?.[3] ?? null, text };
  });
}

/** Names declared at the top level of a program, in order. */
export function declaredNames(source: string): string[] {
  return chunks(source).flatMap((chunk) => (chunk.name === null ? [] : [chunk.name]));
}

/** The program without the named top-level declarations. */
export function withoutDeclarations(source: string, names: readonly string[]): string {
  const missing = names.filter((name) => !declaredNames(source).includes(name));
  if (missing.length > 0) throw new Error(`not declared: ${missing.join(', ')}`);
  return chunks(source)
    .filter((chunk) => chunk.name === null || !names.includes(chunk.name))
    .map((chunk) => chunk.text)
    .join('\n');
}

/** Just the named top-level declarations, in the order the program has them. */
export function onlyDeclarations(source: string, names: readonly string[]): string {
  const missing = names.filter((name) => !declaredNames(source).includes(name));
  if (missing.length > 0) throw new Error(`not declared: ${missing.join(', ')}`);
  return chunks(source)
    .filter((chunk) => chunk.name !== null && names.includes(chunk.name))
    .map((chunk) => chunk.text.trim())
    .join('\n\n');
}
