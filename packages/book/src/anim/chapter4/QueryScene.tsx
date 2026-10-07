import { motion } from 'motion/react';
import { useMemo, useRef, type ReactNode } from 'react';
import { useDuration } from '../../hooks.ts';
import { QUERY_WATCH, queryStepsOf, ruleBodies, type Binding, type FrameView, type QueryStep } from '../model/queryFrames.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode } from '../svg.tsx';
import { useCalls } from '../useCalls.ts';

/**
 * Figure 4.8 of the book, running: the query in the editor goes through the
 * query system in the Laboratory, and every pattern match and every rule
 * application becomes a keyframe. Each shows the frame that came in, what the
 * pattern was matched or unified against, and the frame that goes on down the
 * stream, or that it was dropped. Frames that come out of the whole query are
 * the answers.
 */

export interface QuerySceneProps {
  source: string;
  prelude?: string | undefined;
}

const MAX_CALLS = 4000;
/** Keyframes drawn at most; a long run ends with a summary of the rest. */
const MAX_STEPS = 120;

export function QueryScene({ source, prelude }: QuerySceneProps) {
  const { log, pending } = useCalls(source, QUERY_WATCH, { prelude, maxCalls: MAX_CALLS, maxText: 1000 });
  const bodies = useMemo(() => ruleBodies(prelude ?? '', source), [prelude, source]);
  const all = useMemo(
    () => (log === null ? [] : queryStepsOf(log.calls, log.output, { truncated: log.truncated || log.status !== 'done', bodies })),
    [bodies, log],
  );
  const steps = useMemo(() => shorten(all), [all]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(steps.length, { stage, resetKey: log, msPerStep: 1300 });
  const duration = useDuration();

  const title = 'The stream of frames';
  const k = player.index;
  const step = steps[k];
  if (log === null || step === undefined || !steps.some((s) => s.kind === 'query')) {
    const why =
      log === null || pending
        ? 'Running the query…'
        : log.status === 'error'
          ? `The program stopped with an error: ${log.result ?? ''}`
          : 'Call `query(…)` with a query to watch its frames.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No query yet">
        <div />
      </SceneFrame>
    );
  }

  const current = [...steps.slice(0, k + 1)].reverse().find((s) => s.kind === 'query' || s.kind === 'assert');
  const answers = steps.slice(0, k + 1).flatMap((s) => (s.kind === 'answer' ? [s] : []));
  const shownAnswers = answers.slice(-4);
  const fade = { initial: { opacity: 0, y: 3 }, animate: { opacity: 1, y: 0 }, transition: { duration: duration(0.18) } };

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(captionOf(step, steps))}>
      <div ref={stage} className="flex min-w-0 flex-col gap-3" data-testid="query-scene">
        {current !== undefined && (
          <div className="rounded-lg bg-paper-2 px-3 py-2 font-mono text-[12.5px] break-words text-ink">
            <span className="text-ink-3">query </span>
            {current.kind === 'query' || current.kind === 'assert' ? current.input : ''}
          </div>
        )}
        <motion.div key={k} {...fade} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 text-[13px]">
          <StepRows step={step} />
        </motion.div>
        <Counters step={step} />
        <div className="flex flex-col gap-1" aria-label="Answers so far">
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-3 uppercase">
            Answers {answers.length > 0 ? `(${answers.length})` : ''}
          </span>
          {answers.length === 0 ? (
            <span className="text-[13px] text-ink-3">none yet</span>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-[12px]">
              {answers.length > shownAnswers.length && <li className="text-ink-3">… {answers.length - shownAnswers.length} earlier</li>}
              {shownAnswers.map((a) => (
                <li key={a.index} className={`break-words ${step.kind === 'answer' && a.index === step.index ? 'text-ok' : 'text-ink-2'}`}>
                  {a.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </SceneFrame>
  );
}

/** At most MAX_STEPS keyframes: the first ones, then a summary that keeps the final tally. */
function shorten(steps: QueryStep[]): QueryStep[] {
  if (steps.length <= MAX_STEPS) return steps;
  const last = steps[steps.length - 1];
  const kept = steps.slice(0, MAX_STEPS - 1);
  return last === undefined ? kept : [...kept, { kind: 'done', truncated: true, skipped: steps.length - MAX_STEPS, tally: last.tally }];
}

function Label({ children }: { children: ReactNode }) {
  return <span className="pt-1 font-mono text-[11px] tracking-[0.04em] text-ink-3 uppercase">{children}</span>;
}

function Mono({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'ok' | 'bad' | 'dim' }) {
  const tones = {
    plain: 'border-line bg-paper-2 text-ink',
    ok: 'border-ok bg-ok-soft text-ok',
    bad: 'border-bad bg-bad-soft text-bad',
    dim: 'border-line bg-paper text-ink-3',
  };
  return <div className={`rounded-md border px-2.5 py-1.5 font-mono text-[12.5px] break-words ${tones[tone]}`}>{children}</div>;
}

function Chips({ frame, added = [] }: { frame: FrameView; added?: Binding[] }) {
  if (frame.bindings.length === 0 && added.length === 0 && !frame.earlier) {
    return <span className="pt-1 font-mono text-[12.5px] text-ink-3">the empty frame</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {frame.earlier && <span className="rounded-md px-1 py-1 font-mono text-[12px] text-ink-3">…</span>}
      {frame.bindings.map((b, i) => (
        <span key={`o${i}`} className="rounded-md border border-line bg-paper-2 px-2 py-1 font-mono text-[12px] break-words text-ink-2">
          {b.variable} = {b.value}
        </span>
      ))}
      {added.map((b, i) => (
        <span key={`n${i}`} data-testid="new-binding" className="rounded-md border border-accent bg-accent-soft px-2 py-1 font-mono text-[12px] break-words text-accent-ink">
          {b.variable} = {b.value}
        </span>
      ))}
    </div>
  );
}

function StepRows({ step }: { step: QueryStep }) {
  switch (step.kind) {
    case 'match':
      return (
        <>
          <Label>pattern</Label>
          <Mono>{step.pattern}</Mono>
          <Label>frame in</Label>
          <Chips frame={step.frame} />
          <Label>{step.assertions.length > 1 ? `${step.assertions.length} assertions` : 'assertion'}</Label>
          <div className="flex flex-col gap-1">
            {step.assertions.slice(0, 3).map((a, i) => (
              <Mono key={i} tone={step.ok ? 'ok' : 'bad'}>
                {a}
              </Mono>
            ))}
            {step.assertions.length > 3 && <span className="font-mono text-[12px] text-ink-3">… and {step.assertions.length - 3} more</span>}
          </div>
          <Label>frame out</Label>
          {step.ok ? <Chips frame={step.frame} added={step.added} /> : <Dropped />}
        </>
      );
    case 'rule':
      return (
        <>
          <Label>pattern</Label>
          <Mono>{step.pattern}</Mono>
          <Label>frame in</Label>
          <Chips frame={step.frame} />
          <Label>rule</Label>
          <div className="flex flex-col gap-1">
            <Mono tone={step.ok ? 'ok' : 'bad'}>{step.conclusion}</Mono>
            {step.body !== null && <Mono tone="dim">body: {step.body}</Mono>}
          </div>
          <Label>frame out</Label>
          {step.ok ? <Chips frame={step.frame} added={step.added} /> : <Dropped />}
        </>
      );
    case 'answer':
      return (
        <>
          <Label>answer</Label>
          <Mono tone="ok">{step.text}</Mono>
        </>
      );
    case 'query':
    case 'assert':
      return (
        <>
          <Label>frames</Label>
          <span className="pt-1 font-mono text-[12.5px] text-ink-3">{step.kind === 'query' ? 'a stream of one frame: the empty frame' : 'none: an assertion is stored, not evaluated'}</span>
        </>
      );
    case 'done':
      return (
        <>
          <Label>frames</Label>
          <span className="pt-1 font-mono text-[12.5px] text-ink-3">the stream is empty</span>
        </>
      );
  }
}

function Dropped() {
  return <span className="pt-1 font-mono text-[12.5px] text-bad">no match: no frame goes on</span>;
}

function Counters({ step }: { step: QueryStep }) {
  const t = step.tally;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 font-mono text-[11.5px] text-ink-3 tabular-nums" data-testid="query-tally">
      <span>
        matches {t.matched} / {t.matches}
      </span>
      <span>
        rules unified {t.unified} / {t.rules}
      </span>
      <span>answers {t.answers}</span>
    </div>
  );
}

function bindingsText(bindings: readonly Binding[]): string {
  return bindings.map((b) => `\`${b.variable} = ${b.value}\``).join(', ');
}

function captionOf(step: QueryStep, steps: readonly QueryStep[]): string {
  switch (step.kind) {
    case 'query':
      return `\`query\` parses the input and calls \`evaluate_query\` on it with a stream of one frame, the empty frame, which binds no variables yet.`;
    case 'assert':
      return 'An `assert` adds an assertion or rule to the data base, indexed by its first symbol. No frames flow.';
    case 'match':
      if (step.ok) {
        return step.added.length === 0
          ? `\`${step.pattern}\` matches \`${step.assertions[0] ?? ''}\` with the bindings it already has, so the frame goes on unchanged.`
          : `\`${step.pattern}\` matches \`${step.assertions[0] ?? ''}\`. The frame is extended with ${bindingsText(step.added)} and goes on down the stream.`;
      }
      return step.assertions.length > 1
        ? `None of these ${step.assertions.length} assertions matches \`${step.pattern}\` in this frame, so none of them extends it.`
        : `\`${step.pattern}\` does not match \`${step.assertions[0] ?? ''}\` in this frame: no extension.`;
    case 'rule':
      return step.ok
        ? `The pattern unifies with the conclusion of a rule, its variables renamed, which ${step.added.length === 0 ? 'needs no new bindings' : `binds ${bindingsText(step.added)}`}. The rule body is evaluated next, with this frame as its input stream.`
        : `The pattern does not unify with the rule conclusion \`${step.conclusion}\`, so this rule adds nothing.`;
    case 'answer':
      return `A frame has come out of the whole query. \`query\` instantiates the query with it and displays answer ${step.index + 1}.`;
    case 'done': {
      const t = step.tally;
      const { skipped } = step;
      const more = skipped !== undefined ? ` The animation shows the first ${steps.length - 1} steps of ${steps.length - 1 + skipped}; these totals count them all.` : '';
      const stopped = step.truncated && skipped === undefined ? ' The run did not finish, so the stream may hold more.' : '';
      return `${t.answers === 0 ? 'No frame came out of the query: no answers.' : `The stream of frames is exhausted after ${t.answers} ${t.answers === 1 ? 'answer' : 'answers'}.`} ${t.matches} pattern matches were tried and ${t.matched} succeeded${t.rules === 0 ? '' : `; ${t.rules} rule applications were tried and ${t.unified} unified`}.${more}${stopped}`;
    }
  }
}
