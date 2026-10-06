import type { Node } from '../syntax/ast.ts';

/** The text a node was parsed from, on one line, shortened to `max` characters. */
export function excerpt(source: string, node: Node, max = 48): string {
  const text = source.slice(node.loc.start, node.loc.end).replace(/\s+/g, ' ').replace(/;$/, '');
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
