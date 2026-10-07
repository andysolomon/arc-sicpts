import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { clip } from '../model/layout.ts';
import { localStateKeyframes, type LocalStateKeyframe, type StateHolder } from '../model/localState.ts';
import { keyframeAt } from '../model/tree.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Objects and the state they hold (§3.1). Each card is one object: the names
 * the program gives it, the call that made it, and the variables of the frame
 * it remembers, each with the values it has had. Two names for one object
 * share a card; two objects made alike get a card each (§3.1.3).
 */

export interface LocalStateSceneProps {
  trace: Trace | null;
  title?: string;
  stepIndex?: number;
}

const CARD_W = 236;
const GAP = 22;
const HEAD = 44;
const ROW = 24;
const PAD = 12;
const PER_ROW = 3;
/** About this many mono characters fit across a card's row. */
const ROW_CHARS = 30;

/** The latest earlier values that fit beside the name and the current value. */
export function visibleHistory(name: string, value: string, history: readonly string[]): string[] {
  let room = ROW_CHARS - name.length - Math.min(value.length, 14) - 2;
  const shown: string[] = [];
  for (let i = history.length - 1; i >= 0 && shown.length < 3; i--) {
    const text = clip(history[i] ?? '', 10);
    if (text.length + 1 > room) break;
    room -= text.length + 1;
    shown.unshift(text);
  }
  return shown;
}

interface PlacedCard {
  holder: StateHolder;
  x: number;
  y: number;
  height: number;
}

function place(holders: readonly StateHolder[]): { cards: PlacedCard[]; width: number; height: number } {
  const cards: PlacedCard[] = [];
  const rowHeights: number[] = [];
  holders.forEach((holder, i) => {
    const row = Math.floor(i / PER_ROW);
    const height = HEAD + Math.max(1, holder.cells.length) * ROW + 10;
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, height);
    cards.push({ holder, x: PAD + (i % PER_ROW) * (CARD_W + GAP), y: 0, height });
  });
  cards.forEach((card, i) => {
    const row = Math.floor(i / PER_ROW);
    card.y = PAD + rowHeights.slice(0, row).reduce((sum, h) => sum + h + GAP, 0);
  });
  const columns = Math.min(PER_ROW, Math.max(1, holders.length));
  const width = PAD * 2 + columns * CARD_W + (columns - 1) * GAP;
  const height = PAD * 2 + rowHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, rowHeights.length - 1) * GAP;
  return { cards, width, height };
}

const heading = (holder: StateHolder): string => (holder.kind === 'program' ? 'the program frame' : holder.names.join(' = '));

const origin = (holder: StateHolder): string => {
  if (holder.kind === 'program') return 'shared by every function';
  const frames = [...new Set(holder.cells.map((c) => c.frame))];
  return `${clip(holder.made, 20)} · ${frames.length === 0 ? holder.key : frames.join(', ')}`;
};

export function LocalStateScene({ trace, title = 'Objects and their state', stepIndex }: LocalStateSceneProps) {
  const keyframes = useMemo(() => localStateKeyframes(trace), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(keyframes.length, { stage, resetKey: trace, autoplay: stepIndex === undefined });
  const index = stepIndex === undefined ? player.index : keyframeAt(keyframes, stepIndex);
  const keyframe: LocalStateKeyframe | undefined = keyframes[index];
  const layout = useMemo(() => place(keyframe?.holders ?? []), [keyframe]);
  const ease = useEase();
  const ever = keyframes.some((k) => k.holders.length > 0);

  if (trace === null || keyframe === undefined || !ever) {
    return (
      <SceneFrame
        title={title}
        provenance="trace"
        caption={inlineCode(
          trace === null
            ? 'Running the program…'
            : trace.outcome.status === 'error'
              ? `The evaluator stops with an error: ${trace.outcome.error.message}.`
              : 'No local state here: no name is bound to a function that remembers a frame of its own, and nothing in the program frame is assigned.',
        )}
        empty="No objects with state"
      >
        <div />
      </SceneFrame>
    );
  }

  const caption = stepIndex !== undefined && stepIndex === 0 ? `Press step above. ${keyframe.caption}` : keyframe.caption;

  return (
    <SceneFrame
      title={title}
      provenance={stepIndex === undefined ? 'trace' : 'stepper'}
      player={stepIndex === undefined ? player : undefined}
      caption={inlineCode(caption)}
      step={index}
    >
      <div ref={stage}>
        {keyframe.holders.length === 0 ? (
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-sm text-ink-3">
            No object made yet
          </div>
        ) : (
          <Stage width={layout.width} height={layout.height} label={`${keyframe.holders.length} holder${keyframe.holders.length === 1 ? '' : 's'} of state`}>
            <AnimatePresence>
              {layout.cards.map(({ holder, x, y, height }) => (
                <motion.g
                  key={holder.key}
                  data-testid="state-holder"
                  data-names={holder.names.join(',')}
                  data-frame={holder.key}
                  initial={{ x, y, opacity: 0, scale: 0.92 }}
                  animate={{ x, y, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={ease}
                >
                  <rect width={CARD_W} height={height} rx={9} className="fill-paper stroke-line" strokeWidth={1.2} strokeDasharray={holder.kind === 'program' ? '4 3' : undefined} />
                  <rect width={CARD_W} height={HEAD - 4} rx={9} className="fill-paper-2" />
                  <rect y={HEAD - 13} width={CARD_W} height={9} className="fill-paper-2" />
                  <text x={12} y={16} fontSize={12.5} className="fill-ink font-semibold">
                    {clip(heading(holder), 30)}
                  </text>
                  <text x={12} y={32} fontSize={10.5} className="fill-ink-3">
                    {origin(holder)}
                  </text>
                  {holder.cells.length === 0 && (
                    <text x={12} y={HEAD + ROW / 2} dominantBaseline="central" fontSize={11} className="fill-ink-3 italic">
                      no variables of its own
                    </text>
                  )}
                  {holder.cells.map((cell, i) => {
                    const hot = keyframe.changed !== null && keyframe.changed.key === holder.key && keyframe.changed.name === cell.name;
                    const earlier = visibleHistory(cell.name, cell.value, cell.history);
                    return (
                      <g key={cell.name} transform={`translate(0 ${HEAD + i * ROW})`} data-testid="state-cell" data-name={cell.name} data-value={cell.value} data-changes={cell.history.length}>
                        {hot && <rect x={5} y={1} width={CARD_W - 10} height={ROW - 2} rx={5} className="fill-accent-soft" />}
                        <text x={12} y={ROW / 2} dominantBaseline="central" fontSize={12} className={hot ? 'fill-accent-ink' : 'fill-ink'}>
                          {cell.name}
                        </text>
                        <text x={CARD_W - 12} y={ROW / 2} dominantBaseline="central" textAnchor="end" fontSize={12}>
                          {cell.history.length > earlier.length && <tspan className="fill-ink-3">… </tspan>}
                          {earlier.map((value, j) => (
                            <tspan key={j} className="fill-ink-3" fontSize={10.5} textDecoration="line-through">
                              {value}
                              <tspan textDecoration="none"> </tspan>
                            </tspan>
                          ))}
                          <tspan className={hot ? 'fill-accent-ink font-semibold' : 'fill-num'}>{clip(cell.value, 14)}</tspan>
                        </text>
                      </g>
                    );
                  })}
                </motion.g>
              ))}
            </AnimatePresence>
          </Stage>
        )}
      </div>
    </SceneFrame>
  );
}
