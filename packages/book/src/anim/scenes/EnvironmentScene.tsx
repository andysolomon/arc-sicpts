import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useRef } from 'react';
import { closureFrame, environmentStates, functionParams, type EnvState, type FrameView } from '../model/environment.ts';
import { clip } from '../model/layout.ts';
import { keyframeAt } from '../model/tree.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { Arrow, inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Environment frames as the evaluator created them: boxes of bindings, each
 * with an arrow to the frame it extends, in the manner of SICP's diagrams.
 * Lookups and assignments draw a second arrow from the frame that asked to
 * the frame that answered. A name bound to a function shows the function
 * object as SICP's pair of bubbles, code and environment, with a pointer from
 * the second bubble to the frame the function was made in (§3.2.1).
 */

export interface EnvironmentSceneProps {
  source: string;
  trace: Trace | null;
  title?: string;
  stepIndex?: number;
  /** Frames that have returned stay faintly on screen; this is how many. */
  keepReturned?: number;
}

const BOX_W = 180;
const ROW = 19;
const HEAD = 24;
const COL = 228;
const GAP_Y = 18;
const PAD = 16;
const GLOBAL_H = 26;
/** Width of a character of the 12px monospace binding text. */
const CHAR_W = 7.2;
/** The two bubbles of a function object sit at the right end of its row. */
const BUBBLE_R = 6;
const CODE_X = BOX_W - 36;
const ENV_X = CODE_X + 2 * BUBBLE_R;
/** Where a pointer leaves the environment bubble. */
const POINTER_X = ENV_X + BUBBLE_R;

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
    // A returned value sits under the last row; make room when that row ends in a function object's bubbles.
    const valueRoom = frame.value !== null && frame.bindings.some((b) => closureFrame(b.value) !== null) ? 13 : 0;
    const height = HEAD + Math.max(1, frame.bindings.length) * ROW + 6 + valueRoom;
    column.push({ frame, x: PAD + d * COL, y, height });
    columns.set(d, column);
  }
  const boxes = [...columns.values()].flat();
  const width = PAD * 2 + Math.max(1, columns.size) * COL - (COL - BOX_W);
  const height = Math.max(120, ...boxes.map((box) => box.y + box.height)) + PAD;
  return { boxes, width, height };
}


const rowY = (i: number): number => HEAD + 3 + i * ROW + ROW / 2;

/** Frames that something on screen still needs: a function points into them, or a live frame extends them. */
function heldFrames(boxes: Placed[]): Set<string> {
  const byId = new Map(boxes.map((box) => [box.frame.id, box.frame]));
  const held = new Set<string>();
  const hold = (id: string | null): void => {
    for (let at = id; at !== null && !held.has(at); at = byId.get(at)?.parent ?? null) held.add(at);
  };
  for (const { frame } of boxes) {
    if (frame.status === 'live') hold(frame.parent);
    for (const binding of frame.bindings) hold(closureFrame(binding.value));
  }
  return held;
}

interface PointerProps {
  from: Placed;
  row: number;
  to: Placed;
  marker: string;
  testName: string;
}

/**
 * The environment pointer of a function object, from the edge of its frame to
 * the frame further right that the function was made in. It is drawn beneath
 * the boxes, so it passes behind any frame on the way; a stub inside the frame
 * joins it to the bubble.
 */
function Pointer({ from, row, to, marker, testName }: PointerProps) {
  const ease = useEase();
  const x1 = from.x + BOX_W;
  const y1 = from.y + rowY(row);
  const x2 = to.x;
  const y2 = to.y + Math.min(to.height - 8, HEAD + ROW / 2 + 3);
  const dx = x2 - x1;
  const d = `M ${x1} ${y1} C ${x1 + dx * 0.55} ${y1}, ${x1 + dx * 0.45} ${y2}, ${x2} ${y2}`;
  return (
    <motion.path
      data-testid="env-pointer"
      data-from={testName}
      data-to={to.frame.id}
      initial={false}
      animate={{ d }}
      transition={ease}
      fill="none"
      className="stroke-num"
      strokeWidth={1.4}
      markerEnd={`url(#${marker})`}
    />
  );
}

export function EnvironmentScene({ source, trace, title = 'Environment frames', stepIndex, keepReturned = 3 }: EnvironmentSceneProps) {
  const states = useMemo(() => environmentStates(source, trace), [source, trace]);
  const params = useMemo(() => functionParams(source, trace), [source, trace]);
  const marker = `env-pointer-${useId().replace(/:/g, '')}`;
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
  const held = heldFrames(layout.boxes);
  const globalBox = { x: PAD, y: PAD, w: BOX_W, h: GLOBAL_H };
  const caption = stepIndex !== undefined && stepIndex === 0 ? `Press step above. ${state.caption}` : state.caption;

  return (
    <SceneFrame title={title} provenance={stepIndex === undefined ? 'trace' : 'stepper'} player={stepIndex === undefined ? player : undefined} caption={inlineCode(caption)} step={index}>
      <div ref={stage}>
        <Stage width={layout.width} height={layout.height} label={`Environment with ${state.frames.length} frames`} maxHeight={520}>
          <defs>
            <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 z" className="fill-num" />
            </marker>
          </defs>
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
          {layout.boxes.flatMap((box) =>
            box.frame.bindings.flatMap((binding, i) => {
              const home = closureFrame(binding.value);
              const target = home === null ? undefined : byId.get(home);
              if (target === undefined || target.x <= box.x) return [];
              const name = `${box.frame.id}.${binding.name}`;
              return [<Pointer key={name} testName={name} from={box} row={i} to={target} marker={marker} />];
            }),
          )}
          <AnimatePresence>
            {layout.boxes.map((box) => {
              const { frame } = box;
              const live = frame.status === 'live';
              const kept = !live && held.has(frame.id);
              const current = frame.id === state.current;
              return (
                <motion.g
                  key={frame.id}
                  data-testid="frame"
                  data-frame={frame.id}
                  data-status={frame.status}
                  data-held={kept ? 'true' : undefined}
                  initial={{ x: box.x, y: box.y, opacity: 0, scale: 0.9 }}
                  animate={{ x: box.x, y: box.y, opacity: live ? 1 : kept ? 0.85 : 0.4, scale: 1 }}
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
                    {clip(frame.appliedAs ?? frame.label, 20)}
                  </text>
                  {frame.bindings.length === 0 && (
                    <text x={10} y={HEAD + ROW / 2 + 3} dominantBaseline="central" fontSize={11} className="fill-ink-3">
                      (no bindings)
                    </text>
                  )}
                  {frame.bindings.map((binding, i) => {
                    const hit = state.lookup !== null && state.lookup.found === frame.id && state.lookup.symbol === binding.name;
                    const home = closureFrame(binding.value);
                    if (home !== null) {
                      // A function object: the name, its parameters, and the two bubbles.
                      const name = clip(binding.name, 15);
                      const codeX = 10 + CHAR_W * (name.length + 2);
                      const code = `(${(params.get(binding.name) ?? []).join(', ')})`;
                      const room = Math.floor((CODE_X - BUBBLE_R - 6 - codeX) / 6.3);
                      const cy = rowY(i);
                      const target = byId.get(home);
                      // Made in this frame: loop back to it. Made in a frame further right: a stub to the edge, where the
                      // pointer drawn beneath the boxes takes over. Otherwise: a short arrow labelled with the frame.
                      const reach = home === frame.id ? 'self' : target !== undefined && target.x > box.x ? 'right' : 'label';
                      return (
                        <g key={binding.name} data-testid="function-object" data-binding={binding.name} data-env={home}>
                          <title>{`${binding.name}: a function object. Code: ${params.has(binding.name) ? `${code} => …` : 'its lambda expression'}; environment: ${home}.`}</title>
                          {hit && <rect x={4} y={cy - ROW / 2 + 1} width={BOX_W - 8} height={ROW - 2} rx={4} className="fill-accent-soft" />}
                          <text x={10} y={cy} dominantBaseline="central" fontSize={12} className={hit ? 'fill-accent-ink' : 'fill-ink'}>
                            {name}
                            <tspan className="fill-ink-3">:</tspan>
                          </text>
                          {params.has(binding.name) && room >= 3 && (
                            <text x={codeX} y={cy} dominantBaseline="central" fontSize={10.5} className="fill-ink-3">
                              {code.length <= room ? code : '(…)'}
                            </text>
                          )}
                          {[CODE_X, ENV_X].map((cx) => (
                            <g key={cx}>
                              <circle cx={cx} cy={cy} r={BUBBLE_R} className="fill-paper stroke-num" strokeWidth={1.2} />
                              <circle cx={cx} cy={cy} r={1.7} className="fill-num" />
                            </g>
                          ))}
                          {reach === 'right' && <line x1={POINTER_X} y1={cy} x2={BOX_W} y2={cy} className="stroke-num" strokeWidth={1.4} />}
                          {reach === 'label' && (
                            <g data-testid="env-pointer" data-from={`${frame.id}.${binding.name}`} data-to={home}>
                              <path d={`M ${POINTER_X} ${cy} H ${BOX_W + 12}`} className="stroke-num" strokeWidth={1.2} markerEnd={`url(#${marker})`} />
                              <text x={BOX_W + 16} y={cy} dominantBaseline="central" fontSize={10.5} className="fill-num">
                                {home}
                              </text>
                            </g>
                          )}
                          {reach === 'self' && (
                            <path
                              data-testid="env-pointer"
                              data-from={`${frame.id}.${binding.name}`}
                              data-to={home}
                              d={`M ${POINTER_X} ${cy} C ${BOX_W + 14} ${cy}, ${BOX_W + 14} ${HEAD / 2 + 3}, ${BOX_W + 1} ${HEAD / 2 + 3}`}
                              fill="none"
                              className="stroke-num"
                              strokeWidth={1.1}
                              opacity={0.55}
                              markerEnd={`url(#${marker})`}
                            />
                          )}
                        </g>
                      );
                    }
                    return (
                      <g key={binding.name} transform={`translate(0 ${HEAD + 3 + i * ROW})`}>
                        {hit && <rect x={4} y={1} width={BOX_W - 8} height={ROW - 2} rx={4} className="fill-accent-soft" />}
                        <text x={10} y={ROW / 2} dominantBaseline="central" fontSize={12} className={hit ? 'fill-accent-ink' : 'fill-ink'}>
                          {binding.name}
                          <tspan className="fill-ink-3">: </tspan>
                          <tspan className={binding.value === null ? 'fill-ink-3 italic' : 'fill-num'}>{binding.value === null ? 'unassigned' : clip(binding.value, 15)}</tspan>
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
