import { motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { iconButton } from '../editor/buttons.ts';
import { useDuration } from '../hooks.ts';
import { PlayIcon, StepBackIcon, StepIcon, StopIcon } from '../shell/icons.tsx';
import type { Player } from './player.ts';

/**
 * The frame every animation shares: a title, where its picture comes from, the
 * stage, a one-sentence caption for the current keyframe, and transport controls.
 */

export type Provenance = 'trace' | 'model' | 'stepper' | 'parse' | 'machine' | 'memory' | 'compiler';

const PROVENANCE: Record<Provenance, string> = {
  trace: 'drawn from the evaluator’s trace',
  model: 'the substitution model, step by step',
  stepper: 'follows the stepper above',
  parse: 'drawn from the parsed program',
  machine: 'drawn from the machine’s run',
  memory: 'drawn from the pairs the program made',
  compiler: 'what the compiler of §5.5 produced',
};

export interface SceneFrameProps {
  title: string;
  provenance: Provenance;
  /** Transport controls; omit when another control (the stepper) drives the scene. */
  player?: Player | undefined;
  caption: ReactNode;
  /** Shown instead of the stage while there is nothing to draw yet. */
  empty?: ReactNode;
  children: ReactNode;
  /** Extra controls, e.g. an order toggle, shown left of the transport. */
  extra?: ReactNode;
  /** Which keyframe the caption belongs to, so a new caption fades in; defaults to the player's. */
  step?: number;
}

export function SceneFrame({ title, provenance, player, caption, empty, children, extra, step }: SceneFrameProps) {
  const duration = useDuration();
  const captionId = useId();
  return (
    <section
      aria-label={title}
      data-testid="animation"
      className="flex min-w-0 flex-col gap-3 rounded-[10px] border border-line bg-paper px-4 py-3.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
        <span className="font-mono text-[11px] text-ink-3">{PROVENANCE[provenance]}</span>
      </div>
      {empty !== undefined ? (
        <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-line px-4 text-center text-sm text-ink-3">
          {empty}
        </div>
      ) : (
        children
      )}
      <div
        id={captionId}
        role="status"
        aria-live="polite"
        data-testid="caption"
        className="min-h-[2.6em] text-[14.5px] leading-snug text-pretty text-ink-2 [&_code]:rounded [&_code]:bg-paper-2 [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.9em] [&_code]:text-ink"
      >
        <motion.div
          key={step ?? player?.index ?? (typeof caption === 'string' ? caption : 0)}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: duration(0.14) }}
        >
          {caption}
        </motion.div>
      </div>
      {(player !== undefined || extra !== undefined) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          {extra}
          {player !== undefined && <Transport player={player} />}
        </div>
      )}
    </section>
  );
}

function Transport({ player }: { player: Player }) {
  const sliderId = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <button type="button" aria-label="Previous keyframe" className={iconButton} disabled={player.index === 0} onClick={player.prev}>
        <StepBackIcon />
      </button>
      <button
        type="button"
        aria-label={player.playing ? 'Pause' : player.atEnd ? 'Replay' : 'Play'}
        aria-pressed={player.playing}
        className={`${iconButton} ${player.playing ? 'bg-paper-3' : ''}`}
        onClick={player.toggle}
        disabled={player.count <= 1}
      >
        {player.playing ? <StopIcon /> : <PlayIcon />}
      </button>
      <button type="button" aria-label="Next keyframe" className={iconButton} disabled={player.atEnd} onClick={player.next}>
        <StepIcon />
      </button>
      <input
        id={sliderId}
        type="range"
        aria-label="Keyframe"
        min={0}
        max={Math.max(0, player.count - 1)}
        value={player.index}
        onChange={(event) => player.seek(Number(event.currentTarget.value))}
        className="min-w-[120px] flex-1 accent-accent"
        disabled={player.count <= 1}
      />
      <span data-testid="keyframe-counter" className="font-mono text-[11.5px] text-ink-3 tabular-nums">
        {player.index + 1} / {player.count}
      </span>
    </div>
  );
}

/** Mono text inside captions, for expressions and values. */
export const Code = ({ children }: { children: ReactNode }) => <code>{children}</code>;
