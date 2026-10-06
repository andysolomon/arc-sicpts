import { AnimatePresence } from 'motion/react';
import { useMemo, useRef } from 'react';
import { callTree, type CallNode } from '../model/calls.ts';
import { monoWidth, tidy } from '../model/layout.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Edge, FONT, inlineCode, NODE_HEIGHT, Pill, Stage, type Tone } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Compound function calls as a tree: each call opens under the one that made
 * it and closes with its value. A call built from other calls looks exactly
 * like a call of a primitive from the outside, which is the point of §1.1.4.
 */

export interface CallsSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
  /** Mark calls that repeat an earlier call exactly, as tree recursion does (§1.2.2). */
  repeats?: boolean;
}

const LEVEL = 58;
const finalLabel = (node: CallNode): string => (node.value === null ? node.label : `${node.label} → ${node.value}`);
/** Room for the label once the value has arrived, so closing a box never crowds its neighbours. */
const nodeWidth = (node: CallNode): number => Math.max(36, monoWidth(finalLabel(node), FONT) + 20);
const PAD = 22;

export function CallsScene({ source, trace, title = 'Calls within calls', repeats = false }: CallsSceneProps) {
  const tree = useMemo(() => {
    const built = callTree(source, trace);
    if (!repeats || built.calls === 0) return built;
    const last = built.keyframes[built.keyframes.length - 1];
    const summary = `${built.calls} calls in all, and ${built.repeats} of them (in red) repeat a call that had already been made with the same argument${built.repeats === 1 ? '' : 's'}.`;
    return { ...built, keyframes: [...built.keyframes, { at: last?.at ?? 0, active: null, caption: summary }] };
  }, [repeats, source, trace]);
  const layout = useMemo(() => tidy(tree.root, { nodeWidth, gap: 18, level: LEVEL }), [tree]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(tree.keyframes.length, { stage, resetKey: trace, ...(repeats && { msPerStep: 700 }) });
  const keyframe = tree.keyframes[player.index];
  const at = keyframe?.at ?? 0;

  if (tree.calls === 0) {
    return (
      <SceneFrame title={title} provenance="trace" caption={trace === null ? 'Tracing the program…' : 'No compound function was called. Declare one and apply it.'} empty="No calls to draw">
        <div />
      </SceneFrame>
    );
  }

  const width = layout.width + PAD * 2;
  const height = layout.height + NODE_HEIGHT + PAD * 2 + 14;
  const offset = PAD;
  const top = PAD + NODE_HEIGHT / 2;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(keyframe?.caption ?? '')}>
      <div ref={stage}>
        <Stage width={width} height={height} label={`Call tree with ${tree.calls} calls`}>
          {layout.nodes.map((node) => {
            if (node.parent === null) return null;
            const shown = node.data.calledAt <= at;
            return (
              <Edge
                key={`e-${node.data.id}`}
                x1={offset + node.parent.x}
                y1={top + node.parent.y + NODE_HEIGHT / 2}
                x2={offset + node.x}
                y2={top + node.y - NODE_HEIGHT / 2}
                opacity={shown ? 1 : 0}
                dashed={node.data.tail}
                tone={keyframe?.active === node.data.id ? 'accent' : 'line'}
              />
            );
          })}
          <AnimatePresence>
            {layout.nodes.map((node) => {
              const { data } = node;
              if (data.calledAt > at) return null;
              const returned = data.returnedAt !== null && data.returnedAt <= at;
              const active = keyframe?.active === data.id;
              const repeated = repeats && data.repeatOf !== null;
              const tone: Tone = active ? 'focus' : repeated ? 'bad' : returned ? 'value' : data.id === 'program' ? 'dim' : 'plain';
              const label = returned && data.value !== null ? `${data.label} → ${data.value}` : data.label;
              const width_ = Math.max(36, monoWidth(label, FONT) + 20);
              return (
                <g key={data.id}>
                  <Pill x={offset + node.x} y={top + node.y} width={width_} text={label} tone={tone} testId={repeated ? 'repeated-call' : 'call'} />
                  {data.tail && (
                    <text x={offset + node.x} y={top + node.y - NODE_HEIGHT / 2 - 4} textAnchor="middle" fontSize={9.5} className="fill-ink-3">
                      tail call
                    </text>
                  )}
                </g>
              );
            })}
          </AnimatePresence>
        </Stage>
      </div>
    </SceneFrame>
  );
}
