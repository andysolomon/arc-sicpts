import { AnimatePresence } from 'motion/react';
import { useMemo, useRef } from 'react';
import { monoWidth, tidy, type TreeInput } from '../model/layout.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, FONT, inlineCode, NODE_HEIGHT, Pill, Stage, type Tone } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { huffmanFrames, type HuffNode } from '../model/huffman.ts';

/**
 * Huffman code trees as trees (§2.3.4): leaves with their symbol and weight,
 * other nodes with their set of symbols and total weight, and a 0 or a 1 on
 * every branch. When the program decodes a message, the path of each symbol
 * lights up in turn.
 */

export interface HuffmanSceneProps {
  trace: Trace | null;
  title?: string;
}

interface NodeData {
  /** The tree's index in its forest, then the bits from its root, e.g. `t0101`. */
  id: string;
  label: string;
  leaf: boolean;
  /** The branch taken from the parent; null for a root. */
  bit: '0' | '1' | null;
}

const LEVEL = 62;
const PAD = 18;
const nodeWidth = (d: NodeData): number => (d.id === '' ? 0 : Math.max(34, monoWidth(d.label, FONT) + 18));

function input(node: HuffNode, id: string, bit: NodeData['bit']): TreeInput<NodeData> {
  if (node.kind === 'leaf') return { data: { id, label: `${node.symbol} ${node.weight}`, leaf: true, bit }, children: [] };
  return {
    data: { id, label: `${node.symbols.join(' ')} · ${node.weight}`, leaf: false, bit },
    children: [input(node.left, `${id}0`, '0'), input(node.right, `${id}1`, '1')],
  };
}

export function HuffmanScene({ trace, title = 'Huffman code trees' }: HuffmanSceneProps) {
  const frames = useMemo(() => huffmanFrames(trace), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames.length, { stage, resetKey: trace, msPerStep: 1600 });
  const frame = frames[player.index];
  const nodes = frame?.nodes;
  const layout = useMemo(() => {
    if (nodes === undefined) return null;
    // A forest hangs from an invisible root, which is then dropped.
    const root: TreeInput<NodeData> = { data: { id: '', label: '', leaf: false, bit: null }, children: nodes.map((n, i) => input(n, `t${i}`, null)) };
    return tidy(root, { nodeWidth, gap: 16, level: LEVEL });
  }, [nodes]);

  if (frame === undefined || layout === null) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : trace.outcome.status === 'error'
          ? `The program stopped with an error: ${trace.outcome.error.message}`
          : 'Nothing to draw: declare a name at the top level whose value is a Huffman tree, made with `make_leaf` and `make_code_tree`.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No Huffman tree yet">
        <div />
      </SceneFrame>
    );
  }

  const target = frame.path === null ? null : `t0${frame.path.bits}`;
  const onPath = (id: string): boolean => target !== null && target.startsWith(id);
  const drawn = layout.nodes.filter((n) => n.data.id !== '');
  const width = layout.width + PAD * 2;
  const height = layout.height - LEVEL + NODE_HEIGHT + PAD * 2;
  const x = (n: { x: number }) => PAD + n.x;
  const y = (n: { y: number }) => PAD + NODE_HEIGHT / 2 + n.y - LEVEL;
  // Path keyframes of one tree keep its nodes in place; a new structure redraws.
  const key = frame.label;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(frame.caption)}>
      <div ref={stage} className="flex flex-col gap-2">
        <span data-testid="structure-label" className="font-mono text-[12.5px] text-ink-2">
          {frame.label}
        </span>
        <Stage width={width} height={height} label={`Huffman tree of ${frame.label}`} maxHeight={440}>
          {drawn.map((n) => {
            if (n.parent === null || n.parent.data.id === '') return null;
            const lit = onPath(n.data.id);
            const [x1, y1, x2, y2] = [x(n.parent), y(n.parent) + NODE_HEIGHT / 2, x(n), y(n) - NODE_HEIGHT / 2];
            return (
              <g key={`e-${key}-${n.data.id}`}>
                <Edge x1={x1} y1={y1} x2={x2} y2={y2} tone={lit ? 'accent' : 'line'} />
                <text
                  data-testid="huffman-bit"
                  x={(x1 + x2) / 2 + (n.data.bit === '0' ? -9 : 9)}
                  y={(y1 + y2) / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  className={lit ? 'fill-accent-ink font-semibold' : 'fill-ink-3'}
                >
                  {n.data.bit}
                </text>
              </g>
            );
          })}
          <AnimatePresence>
            {drawn.map((n) => {
              const lit = onPath(n.data.id);
              const tone: Tone = lit ? 'focus' : n.data.leaf ? 'value' : 'plain';
              return (
                <Pill
                  key={`n-${key}-${n.data.id}`}
                  x={x(n)}
                  y={y(n)}
                  width={nodeWidth(n.data)}
                  text={n.data.label}
                  tone={tone}
                  testId={n.data.leaf ? 'huffman-leaf' : 'huffman-node'}
                />
              );
            })}
          </AnimatePresence>
        </Stage>
      </div>
      {new Set(frames.map((f) => f.label)).size > 1 && (
        <ol className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-mono text-[11.5px] text-ink-3" aria-label="Structures">
          {[...new Set(frames.map((f) => f.label))].map((label) => (
            <li key={label} className={label === frame.label ? 'text-accent-ink' : ''}>
              {label}
            </li>
          ))}
        </ol>
      )}
    </SceneFrame>
  );
}
