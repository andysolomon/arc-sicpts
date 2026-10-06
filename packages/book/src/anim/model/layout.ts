/**
 * A small tidy-tree layout: every subtree gets a span wide enough for its
 * children, children sit side by side, and a parent is centred over them.
 */

export interface TreeInput<T> {
  data: T;
  children: TreeInput<T>[];
}

export interface Placed<T> {
  data: T;
  /** Centre of the node. */
  x: number;
  y: number;
  width: number;
  depth: number;
  parent: Placed<T> | null;
  children: Placed<T>[];
}

export interface TidyOptions<T> {
  nodeWidth(data: T): number;
  /** Horizontal space between sibling subtrees. */
  gap: number;
  /** Vertical distance between levels. */
  level: number;
}

export interface Tidy<T> {
  nodes: Placed<T>[];
  width: number;
  height: number;
}

export function tidy<T>(root: TreeInput<T>, options: TidyOptions<T>): Tidy<T> {
  const spans = new Map<TreeInput<T>, number>();
  const span = (node: TreeInput<T>): number => {
    const own = options.nodeWidth(node.data);
    const inner = node.children.reduce((sum, child, i) => sum + span(child) + (i > 0 ? options.gap : 0), 0);
    const result = Math.max(own, inner);
    spans.set(node, result);
    return result;
  };
  const total = span(root);

  const nodes: Placed<T>[] = [];
  let height = 0;
  const place = (node: TreeInput<T>, left: number, depth: number, parent: Placed<T> | null): Placed<T> => {
    const width = spans.get(node) ?? 0;
    const placed: Placed<T> = {
      data: node.data,
      x: left + width / 2,
      y: depth * options.level,
      width: options.nodeWidth(node.data),
      depth,
      parent,
      children: [],
    };
    nodes.push(placed);
    height = Math.max(height, placed.y);
    const inner = node.children.reduce((sum, child, i) => sum + (spans.get(child) ?? 0) + (i > 0 ? options.gap : 0), 0);
    let cursor = left + (width - inner) / 2;
    for (const child of node.children) {
      const childSpan = spans.get(child) ?? 0;
      placed.children.push(place(child, cursor, depth + 1, placed));
      cursor += childSpan + options.gap;
    }
    return placed;
  };
  place(root, 0, 0, null);
  return { nodes, width: total, height };
}

/** Approximate width of monospace text at a given font size. */
export const monoWidth = (text: string, fontSize: number): number => text.length * fontSize * 0.62;

/** Shorten text in the middle so it fits `max` characters. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const keep = Math.max(1, Math.floor((max - 1) / 2));
  return `${text.slice(0, keep)}…${text.slice(text.length - (max - 1 - keep))}`;
}
