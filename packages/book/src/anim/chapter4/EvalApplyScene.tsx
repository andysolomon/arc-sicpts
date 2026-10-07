import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { useDuration } from '../../hooks.ts';
import { cycleSteps, type CycleStep } from '../model/evalApply.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Pill, Stage } from '../svg.tsx';
import { useCalls } from '../useCalls.ts';

/**
 * Figure 4.2 of the book, running: the program in the editor is evaluated by
 * the metacircular evaluator in the Laboratory, and every call of its
 * `evaluate` and `apply` becomes a keyframe. The cycle lights the half that is
 * working, and the log below shows the calls still pending and the values of
 * the ones that have returned.
 */

export interface EvalApplySceneProps {
  source: string;
  prelude?: string | undefined;
}

const WATCH = ['evaluate', 'apply'];
const MAX_CALLS = 400;
const WINDOW = 7;

const W = 520;
const H = 176;
const EVAL = { x: 130, y: 88 };
const APPLY = { x: 390, y: 88 };

/** Where the work came from: the watched call this one was made for. */
function source(step: CycleStep, steps: readonly CycleStep[]): 'evaluate' | 'apply' | null {
  const parent = step.ancestors[step.ancestors.length - 1];
  return parent === undefined ? null : (steps[parent]?.kind ?? null);
}

export function EvalApplyScene({ source: text, prelude }: EvalApplySceneProps) {
  const { log, pending } = useCalls(text, WATCH, { prelude, maxCalls: MAX_CALLS });
  const steps = useMemo(() => (log === null ? [] : cycleSteps(log.calls)), [log]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(steps.length, { stage, resetKey: log, msPerStep: 1000 });
  const duration = useDuration();

  const title = 'The evaluate–apply cycle';
  const k = player.index;
  const current = steps[k];
  if (log === null || current === undefined) {
    const why =
      log === null || pending
        ? 'Running the program through the metacircular evaluator…'
        : log.status === 'error'
          ? `The program stopped with an error: ${log.result ?? ''}`
          : 'The program never called the evaluator: give `evaluate_program` a program string.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No calls of evaluate or apply yet">
        <div />
      </SceneFrame>
    );
  }

  const pendingNow = new Set(current.ancestors);
  const from = source(current, steps);
  const lastOf = (kind: CycleStep['kind']) => [...steps.slice(0, k + 1)].reverse().find((s) => s.kind === kind) ?? null;
  const lastEvaluate = lastOf('evaluate');
  const lastApply = lastOf('apply');
  const first = Math.max(0, Math.min(k - 3, steps.length - WINDOW));
  const rows = steps.slice(first, first + WINDOW);
  const atEnd = k === steps.length - 1;
  const caption =
    `\`${current.kind}\` #${current.n + 1}: ${current.explanation}` +
    (atEnd && log.result !== null ? ` The program’s value is \`${log.result}\`.` : '');

  const arc = (active: boolean) => (active ? 'stroke-accent' : 'stroke-line');
  const arcText = (active: boolean) => (active ? 'fill-accent-ink' : 'fill-ink-3');

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage} className="flex flex-col gap-3">
        <Stage width={W} height={H} label="The evaluate–apply cycle" maxHeight={210}>
          <defs>
            <marker id="ea-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-3" />
            </marker>
          </defs>
          {/* evaluate → apply: a function and its arguments */}
          <path
            d={`M ${EVAL.x + 40} ${EVAL.y - 16} C ${EVAL.x + 90} ${EVAL.y - 70}, ${APPLY.x - 90} ${APPLY.y - 70}, ${APPLY.x - 36} ${APPLY.y - 16}`}
            fill="none"
            strokeWidth={current.kind === 'apply' ? 2 : 1.2}
            className={arc(current.kind === 'apply')}
            markerEnd="url(#ea-arrow)"
          />
          <text x={W / 2} y={14} textAnchor="middle" fontSize={11} className={arcText(current.kind === 'apply')}>
            function, arguments
          </text>
          {/* apply → evaluate: a body and an environment */}
          <path
            d={`M ${APPLY.x - 36} ${APPLY.y + 16} C ${APPLY.x - 90} ${APPLY.y + 70}, ${EVAL.x + 90} ${EVAL.y + 70}, ${EVAL.x + 40} ${EVAL.y + 16}`}
            fill="none"
            strokeWidth={from === 'apply' ? 2 : 1.2}
            className={arc(from === 'apply')}
            markerEnd="url(#ea-arrow)"
          />
          <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={11} className={arcText(from === 'apply')}>
            body, environment
          </text>
          {/* evaluate → evaluate: the parts of a component */}
          <path
            d={`M ${EVAL.x - 44} ${EVAL.y - 8} C ${EVAL.x - 110} ${EVAL.y - 50}, ${EVAL.x - 110} ${EVAL.y + 50}, ${EVAL.x - 44} ${EVAL.y + 8}`}
            fill="none"
            strokeWidth={current.kind === 'evaluate' && from === 'evaluate' ? 2 : 1.2}
            className={arc(current.kind === 'evaluate' && from === 'evaluate')}
            markerEnd="url(#ea-arrow)"
          />
          <text x={EVAL.x - 104} y={EVAL.y + 4} textAnchor="end" fontSize={10.5} className={arcText(current.kind === 'evaluate' && from === 'evaluate')}>
            parts
          </text>
          <Pill x={EVAL.x} y={EVAL.y} width={92} height={32} text="evaluate" tone={current.kind === 'evaluate' ? 'focus' : 'plain'} enter={false} />
          <Pill x={APPLY.x} y={APPLY.y} width={76} height={32} text="apply" tone={current.kind === 'apply' ? 'focus' : 'plain'} enter={false} />
          <text x={EVAL.x} y={EVAL.y + 32} textAnchor="middle" fontSize={10.5} className="fill-ink-2">
            {lastEvaluate?.summary ?? ''}
          </text>
          <text x={APPLY.x} y={APPLY.y + 32} textAnchor="middle" fontSize={10.5} className="fill-ink-2">
            {lastApply?.summary ?? ''}
          </text>
        </Stage>
        <ol aria-label="Calls of evaluate and apply" className="m-0 flex list-none flex-col rounded-lg border border-line p-0 font-mono text-[11.5px]">
          {rows.map((step) => {
            const isCurrent = step.n === current.n;
            const done = step.n < current.n && !pendingNow.has(step.n);
            return (
              <motion.li
                key={step.n}
                layout="position"
                transition={{ duration: duration(0.16) }}
                data-testid="cycle-call"
                aria-current={isCurrent ? 'step' : undefined}
                className={`grid grid-cols-[28px_1fr_auto] items-baseline gap-2 border-t border-line px-3 py-1 first:border-t-0 ${
                  isCurrent ? 'bg-accent-soft text-accent-ink' : step.n > current.n ? 'text-ink-3 opacity-40' : 'text-ink-2'
                }`}
              >
                <span className="text-ink-3">{step.n + 1}</span>
                <span className="truncate" style={{ paddingLeft: Math.min(step.level, 12) * 10 }}>
                  <span className={step.kind === 'apply' ? 'text-num' : ''}>{step.kind}</span> {step.summary}
                </span>
                <span className="text-ink-3">
                  {pendingNow.has(step.n) ? 'pending' : done ? (step.value === null ? '↪ tail call' : `→ ${step.value}`) : ''}
                </span>
              </motion.li>
            );
          })}
        </ol>
        {log.truncated && (
          <p className="m-0 font-mono text-[11.5px] text-ink-3">Only the first {MAX_CALLS} calls are shown.</p>
        )}
      </div>
    </SceneFrame>
  );
}
