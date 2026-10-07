import { parse, toTaggedList, type Expression, type Node, type Statement } from '@sicp/lab';
import { useMemo, useRef } from 'react';
import { monoWidth, tidy, type Placed, type TreeInput } from '../model/layout.ts';
import { componentTree, listNotation, SYNTAX, type ComponentNode, type Read } from '../model/taggedList.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, inlineCode, Pill, Stage } from '../svg.tsx';

/**
 * What `parse` makes of a program: the tagged lists of §4.1.2 drawn as a tree,
 * one box per component. Keyframes visit the components in the order a
 * reader would classify them, naming the syntax predicate that recognizes
 * each one and the selectors `evaluate` uses on it.
 */

export interface TaggedListSceneProps {
  source: string;
  prelude?: string | undefined;
}

const FONT = 11.5;
const LEVEL = 54;
const GAP = 12;
const PAD = 18;
/** Programs bigger than this are drawn only in part. */
const MAX_NODES = 48;

const label = (node: ComponentNode): string => (node.detail === null ? node.tag : `${node.tag} ${node.detail}`);
const nodeWidth = (node: ComponentNode): number => Math.max(40, monoWidth(label(node), FONT) + 18);

/** The program text in the first `parse("…")` of the source, if there is one. */
export function parsedText(source: string): string | null {
  let program;
  try {
    program = parse(source);
  } catch {
    return null;
  }
  let found: string | null = null;
  const visit = (node: Node | Expression | Statement | null | undefined): void => {
    if (found !== null || node === null || node === undefined) return;
    if (node.kind === 'application') {
      const [arg] = node.args;
      if (node.fun.kind === 'name' && node.fun.symbol === 'parse' && arg?.kind === 'literal' && typeof arg.value === 'string') {
        found = arg.value;
        return;
      }
      visit(node.fun);
      node.args.forEach(visit);
      return;
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach((c) => typeof c === 'object' && visit(c as Node));
      else if (typeof child === 'object' && child !== null && 'kind' in child) visit(child as Node);
    }
  };
  visit(program);
  return found;
}

function treeOf(text: string): { root: ComponentNode | null; error: string | null } {
  try {
    return { root: componentTree(toTaggedList(parse(text)) as Read), error: null };
  } catch (error) {
    return { root: null, error: error instanceof Error ? error.message : String(error) };
  }
}

/** Pre-order, the order in which the components are visited. */
function preorder(root: ComponentNode): ComponentNode[] {
  return [root, ...root.children.flatMap(preorder)];
}

function limit(root: ComponentNode, max: number): { tree: TreeInput<ComponentNode>; shown: number } {
  let shown = 0;
  const build = (node: ComponentNode): TreeInput<ComponentNode> | null => {
    if (shown >= max) return null;
    shown++;
    return { data: node, children: node.children.map(build).filter((c): c is TreeInput<ComponentNode> => c !== null) };
  };
  return { tree: build(root) ?? { data: root, children: [] }, shown };
}

/** The part of the tagged list that a node stands for. */
function subList(text: string, node: ComponentNode): string {
  const value = toTaggedList(parse(text)) as Read;
  let next = 0;
  let found: Read = null;
  const walk = (v: Read): void => {
    if (!Array.isArray(v)) return;
    if (typeof v[0] === 'string' && SYNTAX[v[0]] !== undefined) {
      if (`c${next++}` === node.id) {
        found = v;
        return;
      }
    }
    for (let rest: Read = v; Array.isArray(rest); rest = rest[1]) walk(rest[0]);
  };
  walk(value);
  return listNotation(found, 160);
}

export function TaggedListScene({ source }: TaggedListSceneProps) {
  const text = useMemo(() => parsedText(source), [source]);
  const { root, error } = useMemo(() => (text === null ? { root: null, error: null } : treeOf(text)), [text]);
  const order = useMemo(() => (root === null ? [] : preorder(root)), [root]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(order.length + 1, { stage, resetKey: text, msPerStep: 1300 });
  const limited = useMemo(() => (root === null ? null : limit(root, MAX_NODES)), [root]);
  const layout = useMemo(() => (limited === null ? null : tidy(limited.tree, { nodeWidth, gap: GAP, level: LEVEL })), [limited]);

  const title = 'What parse returns';
  if (text === null || root === null || layout === null || limited === null) {
    const why =
      error !== null
        ? `The string does not parse: ${error}`
        : 'Apply `parse` to a program string, as in `parse("1 + 2;")`, to see its tagged lists.';
    return (
      <SceneFrame title={title} provenance="parse" caption={inlineCode(why)} empty="No program string to parse">
        <div />
      </SceneFrame>
    );
  }

  const k = player.index;
  const focus = k === 0 ? null : (order[k - 1] ?? null);
  const visited = new Set(order.slice(0, k).map((n) => n.id));
  const width = layout.width + PAD * 2;
  const height = layout.height + 26 + PAD * 2;
  const at = (node: Placed<ComponentNode>) => ({ x: PAD + node.x, y: PAD + 13 + node.y });
  const syntax = focus === null ? undefined : SYNTAX[focus.tag];
  const caption =
    focus === null
      ? `\`parse\` turns the text into ${order.length} tagged list${order.length === 1 ? '' : 's'}, one per component. Each is a list whose head names its kind.`
      : syntax === undefined
        ? `A \`${focus.tag}\`.`
        : syntax.predicate === 'none yet'
          ? `A \`${focus.tag}\`: ${syntax.does}`
          : `\`${syntax.predicate}\` recognizes a \`${focus.tag}\`${focus.detail === null ? '' : ` (${focus.detail})`}: ${syntax.does}`;

  return (
    <SceneFrame title={title} provenance="parse" player={player} caption={inlineCode(caption)}>
      <div ref={stage} className="flex flex-col gap-2">
        <Stage width={width} height={height} label={`The tagged lists of ${text}`} maxHeight={460}>
          {layout.nodes.map((node) =>
            node.parent === null ? null : (
              <Edge
                key={`e-${node.data.id}`}
                x1={at(node.parent).x}
                y1={at(node.parent).y + 13}
                x2={at(node).x}
                y2={at(node).y - 13}
                tone={focus?.id === node.data.id ? 'accent' : 'line'}
              />
            ),
          )}
          {layout.nodes.map((node) => (
            <Pill
              key={node.data.id}
              testId="component"
              x={at(node).x}
              y={at(node).y}
              width={nodeWidth(node.data)}
              text={label(node.data)}
              fontSize={FONT}
              enter={false}
              tone={focus?.id === node.data.id ? 'focus' : visited.has(node.data.id) || k === 0 ? 'plain' : 'dim'}
            />
          ))}
        </Stage>
        {limited.shown < order.length && (
          <p className="m-0 text-center font-mono text-[11.5px] text-ink-3">
            {limited.shown} of {order.length} components drawn
          </p>
        )}
        <code data-testid="tagged-list" className="block overflow-x-auto rounded-md bg-paper-2 px-3 py-2 text-[12.5px] whitespace-pre text-ink-2">
          {focus === null ? listNotation(toTaggedList(parse(text)) as Read, 160) : subList(text, focus)}
        </code>
      </div>
    </SceneFrame>
  );
}
