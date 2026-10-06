import { useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import { freshIds, TermLine } from '../TermLine.tsx';
import { flatten } from './SubstitutionScene.tsx';

/**
 * Applicative and normal order side by side on the same program. One of them
 * may never finish; the keyframe counter shows it still trying.
 */

export interface OrderSceneProps {
  source: string;
  title?: string;
  /** Rewrites after which a side is declared to be going nowhere. */
  limit?: number;
}

export function OrderScene({ source, title = 'Two evaluation orders', limit = 24 }: OrderSceneProps) {
  const applicative = useMemo(() => flatten(source, 'applicative', limit).frames, [limit, source]);
  const normal = useMemo(() => flatten(source, 'normal', limit).frames, [limit, source]);
  const count = Math.max(applicative.length, normal.length);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(count, { stage, resetKey: source, msPerStep: 900 });

  const a = applicative[Math.min(player.index, applicative.length - 1)];
  const n = normal[Math.min(player.index, normal.length - 1)];
  if (a === undefined || n === undefined) {
    return (
      <SceneFrame title={title} provenance="model" caption="Write an expression statement to compare the two orders on it." empty="Nothing to evaluate">
        <div />
      </SceneFrame>
    );
  }

  const side = (label: string, frames: typeof applicative, frame: typeof a, id: string) => {
    const last = frames[frames.length - 1];
    const finished = frame.step.rule === 'done';
    const stuckForever = last?.step.rule !== 'done' && player.index >= frames.length - 1 && frames.length >= limit;
    const rewrites = frames.indexOf(frame);
    return (
      <div className="flex min-w-0 flex-1 basis-[280px] flex-col gap-2 rounded-lg bg-paper-2 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2 font-mono text-[11px] text-ink-3">
          <span className="font-semibold text-ink-2">{label}</span>
          <span className={stuckForever ? 'text-warn' : finished ? 'text-ok' : ''}>
            {stuckForever ? `${rewrites} rewrites and counting…` : finished ? `done in ${rewrites} rewrites` : `rewrite ${rewrites}`}
          </span>
        </div>
        <TermLine term={frame.step.term} redex={frame.step.redex} fresh={freshIds(frame.previous?.term ?? null, frame.step.term)} layoutId={id} testId={`term-${id}`} />
        <div className="text-[12.5px] leading-snug text-ink-2 [&_code]:rounded [&_code]:bg-paper [&_code]:px-1 [&_code]:text-[0.9em]">
          {inlineCode(stuckForever ? 'The same expression comes back every time: this never finishes.' : frame.step.caption)}
        </div>
      </div>
    );
  };

  const caption =
    player.index === 0
      ? 'Both orders start from the same expression. Applicative order evaluates every operand first; normal order substitutes operands unevaluated and computes them only when a primitive needs their value.'
      : player.atEnd
        ? applicative.length >= limit && applicative[applicative.length - 1]?.step.rule !== 'done'
          ? `Normal order found the answer. Applicative order was still evaluating the argument after ${limit} rewrites and would go on forever.`
          : 'Both orders finished.'
        : 'Watch which sub-expression each order picks next.';

  return (
    <SceneFrame title={title} provenance="model" player={player} caption={caption}>
      <div ref={stage} className="flex flex-wrap gap-3">
        {side('applicative order', applicative, a, 'applicative')}
        {side('normal order', normal, n, 'normal')}
      </div>
    </SceneFrame>
  );
}
