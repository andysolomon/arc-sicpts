import { useMemo, useRef } from 'react';
import { branchKeyframes, functionBranches, type BranchNode } from '../model/branches.ts';
import { monoWidth, tidy } from '../model/layout.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, FONT, inlineCode, NODE_HEIGHT, Pill, Stage, type Tone } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * A function body as a decision tree. Each conditional is a question with two
 * ways down; the evaluator lights one and never looks at the other.
 */

export interface BranchesSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
}

const LEVEL = 62;
const PAD = 22;
const nodeWidth = (node: BranchNode): number => Math.max(40, monoWidth(node.label, FONT) + 22);

export function BranchesScene({ source, trace, title = 'Which branch runs' }: BranchesSceneProps) {
  const functions = useMemo(() => functionBranches(source), [source]);
  const keyframes = useMemo(() => branchKeyframes(source, functions, trace), [functions, source, trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(keyframes.length, { stage, resetKey: trace });
  const keyframe = keyframes[player.index];
  const fn = useMemo(() => functions.find((candidate) => candidate.name === keyframe?.fn) ?? functions[0], [functions, keyframe]);
  const layout = useMemo(() => (fn === undefined ? null : tidy(fn.root, { nodeWidth, gap: 20, level: LEVEL })), [fn]);

  if (fn === undefined || layout === null || keyframe === undefined) {
    return (
      <SceneFrame title={title} provenance="trace" caption="Declare a function whose body is a single return with a conditional in it." empty="No conditional body to draw">
        <div />
      </SceneFrame>
    );
  }

  const width = layout.width + PAD * 2;
  const height = layout.height + NODE_HEIGHT + PAD * 2 + 20;
  const top = PAD + NODE_HEIGHT / 2 + 10;
  const { decided, values, active } = keyframe;

  /** Is a node on a branch the evaluator ruled out? */
  const ruledOut = new Set<string>();
  for (const node of layout.nodes) {
    const parent = node.parent;
    if (parent === null) continue;
    const decision = decided.get(parent.data.id);
    const side = parent.children.indexOf(node);
    if (parent.data.kind === 'test' && decision !== undefined && (decision ? 1 : 0) === side) ruledOut.add(node.data.id);
    if (parent.data.kind === 'gate' && decision !== undefined && side === 1) {
      const decides = (parent.data.operator === '&&') !== decision;
      if (decides) ruledOut.add(node.data.id);
    }
    if (ruledOut.has(parent.data.id)) ruledOut.add(node.data.id);
  }

  return (
    <SceneFrame
      title={keyframe.call === null ? `${title}: ${fn.name}(${fn.params.join(', ')})` : `${title}: ${keyframe.call}`}
      provenance="trace"
      player={player}
      caption={inlineCode(keyframe.caption)}
    >
      <div ref={stage}>
        <Stage width={width} height={height} label={`Decision tree for ${fn.name}`}>
          {layout.nodes.map((node) => {
            if (node.parent === null) return null;
            const parent = node.parent;
            const side = parent.children.indexOf(node);
            const decision = decided.get(parent.data.id);
            const taken = decision !== undefined && (parent.data.kind === 'test' ? (decision ? 0 : 1) === side : side === 0 || !((parent.data.operator === '&&') !== decision));
            const label = parent.data.kind === 'test' ? (side === 0 ? 'true' : 'false') : side === 0 ? 'first' : 'then';
            const mx = (PAD + parent.x + PAD + node.x) / 2;
            const my = (top + parent.y + NODE_HEIGHT / 2 + top + node.y - NODE_HEIGHT / 2) / 2;
            return (
              <g key={`e-${node.data.id}`}>
                <Edge
                  x1={PAD + parent.x}
                  y1={top + parent.y + NODE_HEIGHT / 2}
                  x2={PAD + node.x}
                  y2={top + node.y - NODE_HEIGHT / 2}
                  tone={taken ? 'accent' : ruledOut.has(node.data.id) ? 'dim' : 'line'}
                  opacity={ruledOut.has(node.data.id) ? 0.5 : 1}
                />
                <text x={mx + (side === 0 ? -6 : 6)} y={my} textAnchor={side === 0 ? 'end' : 'start'} dominantBaseline="central" fontSize={10} className={taken ? 'fill-accent-ink' : 'fill-ink-3'}>
                  {label}
                </text>
              </g>
            );
          })}
          {layout.nodes.map((node) => {
            const { data } = node;
            const value = values.get(data.id);
            const out = ruledOut.has(data.id);
            const tone: Tone = active === data.id ? 'focus' : value !== undefined ? 'value' : data.kind === 'leaf' ? 'plain' : 'plain';
            const label = value !== undefined && data.kind === 'leaf' ? `${data.label} → ${value}` : data.kind === 'test' ? `${data.label} ?` : data.label;
            return (
              <Pill
                key={data.id}
                x={PAD + node.x}
                y={top + node.y}
                width={Math.max(40, monoWidth(label, FONT) + 22)}
                text={label}
                tone={tone}
                opacity={out ? 0.3 : 1}
                enter={false}
                testId={`branch-${data.kind}`}
              />
            );
          })}
        </Stage>
      </div>
    </SceneFrame>
  );
}
