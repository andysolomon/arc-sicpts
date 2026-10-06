import { useMemo, useRef, useState } from 'react';
import { outlineButton } from '../../editor/buttons.ts';
import { substitution, type Order, type RewriteStep } from '../model/substitution.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import { freshIds, TermLine } from '../TermLine.tsx';

/**
 * The substitution model applied to a program's expression statements, one
 * rewrite per keyframe, with the sub-expression about to be rewritten lit up.
 */

export interface SubstitutionSceneProps {
  source: string;
  title?: string;
  order?: Order;
  /** Offer applicative and normal order side by side as a toggle. */
  orderToggle?: boolean;
  maxSteps?: number;
}

interface Flat {
  statement: number;
  statements: number;
  label: string;
  step: RewriteStep;
  previous: RewriteStep | null;
  history: RewriteStep[];
}

export function flatten(source: string, order: Order, maxSteps: number): { frames: Flat[]; error: string | null } {
  const result = substitution(source, { order, maxSteps });
  const frames: Flat[] = [];
  result.statements.forEach((statement, i) => {
    statement.steps.forEach((step, j) => {
      frames.push({
        statement: i,
        statements: result.statements.length,
        label: statement.label,
        step,
        previous: statement.steps[j - 1] ?? null,
        history: statement.steps.slice(Math.max(0, j - 2), j),
      });
    });
  });
  return { frames, error: result.error };
}

export function SubstitutionScene({ source, title = 'Substitution model', order: fixedOrder = 'applicative', orderToggle = false, maxSteps = 120 }: SubstitutionSceneProps) {
  const [order, setOrder] = useState<Order>(fixedOrder);
  const { frames, error } = useMemo(() => flatten(source, order, maxSteps), [maxSteps, order, source]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames.length, { stage, resetKey: `${order}\n${source}` });
  const frame = frames[player.index];

  const toggle = orderToggle ? (
    <div role="group" aria-label="Evaluation order" className="flex items-center gap-1 font-mono text-[11.5px]">
      {(['applicative', 'normal'] as const).map((candidate) => (
        <button
          key={candidate}
          type="button"
          aria-pressed={order === candidate}
          onClick={() => setOrder(candidate)}
          className={`${outlineButton} h-7 px-2 ${order === candidate ? 'bg-paper-3 text-ink' : ''}`}
        >
          {candidate} order
        </button>
      ))}
    </div>
  ) : undefined;

  if (frame === undefined) {
    return (
      <SceneFrame title={title} provenance="model" caption={error === null ? 'Nothing to rewrite: the program has no expression statements.' : `The program does not parse: ${error}`} empty="No expression to rewrite" extra={toggle}>
        <div />
      </SceneFrame>
    );
  }

  const fresh = freshIds(frame.previous?.term ?? null, frame.step.term);
  const printed = frame.step.output;

  return (
    <SceneFrame title={title} provenance="model" player={player} caption={inlineCode(frame.step.caption)} extra={toggle}>
      <div ref={stage} className="flex flex-col gap-2 rounded-lg bg-paper-2 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] text-ink-3">
          <span>
            {frame.statements > 1 ? `statement ${frame.statement + 1} of ${frame.statements} · ` : ''}
            {frame.label}
          </span>
          <span>
            {order} order · rewrite {frames.slice(0, player.index + 1).filter((f) => f.statement === frame.statement).length - 1}
          </span>
        </div>
        <div className="flex min-h-[2.2em] flex-col gap-0.5">
          {frame.history.map((past, i) => (
            <TermLine key={`h${i}`} term={past.term} redex={null} size="sm" dim layoutId={`history-${frame.statement}-${i}`} />
          ))}
        </div>
        <TermLine term={frame.step.term} redex={frame.step.redex} fresh={fresh} layoutId={`current-${frame.statement}`} testId="term" />
        {printed.length > 0 && (
          <div className="font-mono text-[12px] text-ink-2">
            prints: <span className="text-ink">{printed.join(' · ')}</span>
          </div>
        )}
      </div>
    </SceneFrame>
  );
}
