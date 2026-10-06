import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { environmentStates, type EnvState, type FrameView } from '../model/environment.ts';
import { clip } from '../model/layout.ts';
import { keyframeAt } from '../model/tree.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Arrow, inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Environment frames as the evaluator created them: boxes of bindings, each
 * with an arrow to the frame it extends, in the manner of SICP's diagrams.
 * Lookups draw a second arrow from the frame that asked to the frame that
 * answered.
 */

export interface EnvironmentSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
  stepIndex?: number;
  /** Frames that have returned stay faintly on screen; this is how many. */
  keepReturned?: number;
}

const BOX_W = 168;
const ROW = 19;
const HEAD = 24;
const COL = 210;
const GAP_Y = 18;
const PAD = 16;
const GLOBAL_H = 26;

interface Placed {
  frame: FrameView;
  x: number;
  y: number;
  height: number;
}

function place(frames: FrameView[], keepReturned: number): { boxes: Placed[]; width: number; height: number } {
  const finished = frames.filter((f) => f.status !== 'live').sort((a, b) => a.order - b.order);
  const dropped = new Set(finished.slice(0, Math.max(0, finished.length - keepReturned)).map((f) => f.id));
  // A returned frame is still needed while a frame on screen extends it, or a
  // function on screen was made in it (§1.3.4): keep those.
  for (let changed = true; changed; ) {
    changed = false;
    for (const frame of frames) {
      if (dropped.has(frame.id)) continue;
      const needed = [frame.parent, ...frame.bindings.flatMap((b) => [...(b.value ?? '').matchAll(/fn\[(E\d+)\]/g)].map((m) => m[1]))];
      for (const id of needed) {
        if (id !== null && id !== undefined && dropped.delete(id)) changed = true;
      }
    }
  }
  const shown = frames.filter((f) => !dropped.has(f.id));
  const depth = new Map<string, number>();
  const depthOf = (frame: FrameView): number => {
    const known = depth.get(frame.id);
    if (known !== undefined) return known;
    const parent = frame.parent === null ? undefined : shown.find((f) => f.id === frame.parent) ?? frames.find((f) => f.id === frame.parent);
    const d = parent === undefined ? 0 : depthOf(parent) + 1;
    depth.set(frame.id, d);
    return d;
  };
  const columns = new Map<number, Placed[]>();
  for (const frame of shown.sort((a, b) => a.order - b.order)) {
    const d = depthOf(frame);
    const column = columns.get(d) ?? [];
    const y = column.reduce((sum, box) => sum + box.height + GAP_Y, PAD + GLOBAL_H + GAP_Y + (d === 0 ? 0 : 0));
    const height = HEAD + Math.max(1, frame.bindings.length) * ROW + 6;
    column.push({ frame, x: PAD + d * COL, y, height });
    columns.set(d, column);
  }
  const boxes = [...columns.values()].flat();
  const width = PAD * 2 + Math.max(1, columns.size) * COL - (COL - BOX_W);
  const height = Math.max(120, ...boxes.map((box) => box.y + box.height)) + PAD;
  return { boxes, width, height };
}

export function EnvironmentScene({ source, trace, title = 'Environment frames', stepIndex, keepReturned = 3 }: EnvironmentSceneProps) {
  const states = useMemo(() => environmentStates(source, trace), [source, trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(states.length, { stage, resetKey: trace, autoplay: stepIndex === undefined });
  const index = stepIndex === undefined ? player.index : keyframeAt(states, stepIndex);
  const state: EnvState | undefined = states[index];
  const layout = useMemo(() => (state === undefined ? null : place(state.frames, keepReturned)), [keepReturned, state]);
  const ease = useEase();

  if (state === undefined || layout === null) {
    return (
      <SceneFrame title={title} provenance="trace" caption="No frames yet." empty="No frames to draw">
        <div />
      </SceneFrame>
    );
  }

  const byId = new Map(layout.boxes.map((box) => [box.frame.id, box]));
  const globalBox = { x: PAD, y: PAD, w: BOX_W, h: GLOBAL_H };
  const caption = stepIndex !== undefined && stepIndex === 0 ? `Press step above. ${state.caption}` : state.caption;

  return (
    <SceneFrame title={title} provenance={stepIndex === undefined ? 'trace' : 'stepper'} player={stepIndex === undefined ? player : undefined} caption={inlineCode(caption)} step={index}>
      <div ref={stage}>
        <Stage width={layout.width} height={layout.height} label={`Environment with ${state.frames.length} frames`} maxHeight={520}>
          <g>
            <rect x={globalBox.x} y={globalBox.y} width={globalBox.w} height={globalBox.h} rx={6} className="fill-paper stroke-line" strokeDasharray="4 3" />
            <text x={globalBox.x + 10} y={globalBox.y + globalBox.h / 2} dominantBaseline="central" fontSize={11} className="fill-ink-3">
              global · the primitives
            </text>
          </g>
          {layout.boxes.map((box) => {
            const parent = box.frame.parent === null ? null : byId.get(box.frame.parent);
            if (box.frame.parent !== null && parent === undefined) return null;
            // The program frame points up at the global frame; every other frame points left at the frame it extends.
            const from: [number, number] = parent === null || parent === undefined ? [box.x + BOX_W / 2, box.y] : [box.x, box.y + HEAD / 2];
            const to: [number, number] =
              parent === null || parent === undefined ? [globalBox.x + globalBox.w / 2, globalBox.y + globalBox.h] : [parent.x + BOX_W, parent.y + HEAD / 2];
            return <Arrow key={`a-${box.frame.id}`} id={box.frame.id} from={from} to={to} opacity={box.frame.status === 'live' ? 0.9 : 0.3} />;
          })}
          {state.lookup !== null && state.lookup.found !== state.lookup.from && (() => {
            const from = byId.get(state.lookup.from);
            const found = state.lookup.found === null ? null : byId.get(state.lookup.found);
            if (from === undefined) return null;
            const row = found === null || found === undefined ? -1 : found.frame.bindings.findIndex((b) => b.name === state.lookup?.symbol);
            const to: [number, number] =
              found === null || found === undefined
                ? [globalBox.x + globalBox.w, globalBox.y + globalBox.h / 2]
                : [found.x + BOX_W, found.y + HEAD + 3 + Math.max(0, row) * ROW + ROW / 2];
            return <Arrow id="lookup" tone="accent" from={[from.x, from.y + HEAD + 3 + ROW / 2]} to={to} />;
          })()}
          <AnimatePresence>
            {layout.boxes.map((box) => {
              const { frame } = box;
              const live = frame.status === 'live';
              const current = frame.id === state.current;
              return (
                <motion.g
                  key={frame.id}
                  data-testid="frame"
                  data-frame={frame.id}
                  data-status={frame.status}
                  initial={{ x: box.x, y: box.y, opacity: 0, scale: 0.9 }}
                  animate={{ x: box.x, y: box.y, opacity: live ? 1 : 0.4, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={ease}
                >
                  <rect width={BOX_W} height={box.height} rx={8} className={current ? 'fill-paper stroke-accent' : 'fill-paper stroke-line'} strokeWidth={current ? 2 : 1.2} />
                  <rect width={BOX_W} height={HEAD} rx={8} className={current ? 'fill-accent-soft' : 'fill-paper-2'} />
                  <rect y={HEAD - 8} width={BOX_W} height={8} className={current ? 'fill-accent-soft' : 'fill-paper-2'} />
                  <text x={10} y={HEAD / 2} dominantBaseline="central" fontSize={11.5} className={current ? 'fill-accent-ink font-semibold' : 'fill-ink-2 font-semibold'}>
                    {frame.id}
                  </text>
                  <text x={BOX_W - 10} y={HEAD / 2} dominantBaseline="central" textAnchor="end" fontSize={11} className="fill-ink-3">
                    {clip(frame.label, 18)}
                  </text>
                  {frame.bindings.length === 0 && (
                    <text x={10} y={HEAD + ROW / 2 + 3} dominantBaseline="central" fontSize={11} className="fill-ink-3">
                      (no bindings)
                    </text>
                  )}
                  {frame.bindings.map((binding, i) => {
                    const hit = state.lookup !== null && state.lookup.found === frame.id && state.lookup.symbol === binding.name;
                    return (
                      <g key={binding.name} transform={`translate(0 ${HEAD + 3 + i * ROW})`}>
                        {hit && <rect x={4} y={1} width={BOX_W - 8} height={ROW - 2} rx={4} className="fill-accent-soft" />}
                        <text x={10} y={ROW / 2} dominantBaseline="central" fontSize={12} className={hit ? 'fill-accent-ink' : 'fill-ink'}>
                          {binding.name}
                          <tspan className="fill-ink-3">: </tspan>
                          <tspan className={binding.value === null ? 'fill-ink-3 italic' : 'fill-num'}>{binding.value === null ? 'unassigned' : clip(binding.value, 14)}</tspan>
                        </text>
                      </g>
                    );
                  })}
                  {frame.value !== null && (
                    <text x={BOX_W - 10} y={box.height - 2} textAnchor="end" fontSize={10.5} className="fill-ink-3">
                      → {clip(frame.value, 12)}
                    </text>
                  )}
                </motion.g>
              );
            })}
          </AnimatePresence>
        </Stage>
      </div>
    </SceneFrame>
  );
}
