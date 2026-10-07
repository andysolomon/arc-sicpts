import { AnimatePresence } from 'motion/react';
import { useMemo, useRef, type ReactNode } from 'react';
import { rowsAt, THUNK_WATCH, thunkTimeline, type ThunkEvent, type ThunkRow, type ThunkTimeline } from '../model/thunks.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Pill, Stage, type Tone } from '../svg.tsx';
import { useCalls } from '../useCalls.ts';

/**
 * The thunks of the lazy evaluator (§4.2.2) at work. The program in the
 * editor runs through the lazy evaluator in the Laboratory; every argument it
 * delays becomes a row, and the keyframes follow the calls of `delay_it` and
 * `force_it`: a thunk made, forced, memoized, reused, or never forced at all.
 */

export interface ThunkSceneProps {
  source: string;
  prelude?: string | undefined;
}

const MAX_CALLS = 4000;
const MAX_EVENTS = 60;
const MAX_ROWS = 7;

const W = 680;
const ROW = 36;
const TOP = 30;
const PARAM_X = 46;
const EXP_X = 236;
const STATE_X = 486;

const PROMPT = 'L-evaluate value: ';

const code = (text: string): string => `\`${text}\``;
const cut = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function names(items: readonly string[]): string {
  const quoted = items.map(code);
  return quoted.length <= 1 ? (quoted[0] ?? '') : `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
}

function caption(event: ThunkEvent, timeline: ThunkTimeline, memoizes: boolean): string {
  const thunk = (id: number | null) => (id === null ? undefined : timeline.thunks[id]);
  switch (event.kind) {
    case 'delay': {
      const exps = event.thunks.map((id) => cut(thunk(id)?.exp ?? '…', 24));
      const one = exps.length === 1;
      return `A compound function is applied, and its argument${one ? ' is' : 's are'} not evaluated: \`delay_it\` packages ${names(exps)} with the environment of the application, and ${names(event.params)} ${one ? 'is' : 'are'} bound to the thunk${one ? '' : 's'}.`;
    }
    case 'force': {
      const t = thunk(event.thunk);
      const exp = code(cut(t?.exp ?? '…', 28));
      const value = event.value === null ? '' : `, which gives ${event.value}`;
      const need =
        event.via === null || event.via === t?.param
          ? `${code(t?.param ?? '?')} is needed${event.primitive ? ' by a primitive' : ''}`
          : `The value of ${code(cut(event.via, 24))} is itself a thunk, the one bound to ${code(t?.param ?? '?')}, and it is needed`;
      if (event.again) return `${need} again. This evaluator does not memoize, so ${exp} is evaluated once more${value}.`;
      if (!event.done) return `${need}, so \`force_it\` evaluates ${exp} in the environment the thunk kept. That needs more work first.`;
      return `${need}, so \`force_it\` evaluates ${exp} in the environment the thunk kept${value}.${
        memoizes ? ` The thunk becomes an \`evaluated_thunk\` holding ${event.value ?? 'it'}.` : ''
      }`;
    }
    case 'forced': {
      const t = thunk(event.thunk);
      const exp = code(cut(t?.exp ?? '…', 28));
      return memoizes
        ? `${exp} gives ${event.value ?? 'its value'}. The thunk of ${code(t?.param ?? '?')} becomes an \`evaluated_thunk\` holding it; the expression and environment are dropped.`
        : `${exp} has been evaluated. Without memoization the thunk of ${code(t?.param ?? '?')} stays as it was, to be evaluated again if needed.`;
    }
    case 'reuse': {
      const t = thunk(event.thunk);
      const who = event.via ?? t?.param ?? 'An argument';
      return `${code(who)} is needed again${event.primitive ? ' by a primitive' : ''}. Its thunk is already evaluated, so \`force_it\` returns ${event.value} at once${t === undefined ? '' : `: ${code(cut(t.exp, 28))} is not evaluated again`}.`;
    }
  }
}

function finalCaption(timeline: ThunkTimeline, rows: readonly ThunkRow[], result: string | null, complete: boolean): string {
  const forced = rows.filter((r) => r.forcings > 0).length;
  const reuses = rows.reduce((sum, r) => sum + r.reuses, 0);
  const never = rows.filter((r) => r.forcings === 0);
  const made = `${timeline.thunks.length} thunk${timeline.thunks.length === 1 ? ' was' : 's were'} made and ${forced} forced${
    reuses > 0 ? `; stored values were reused ${reuses === 1 ? 'once' : `${reuses} times`}` : ''
  }.`;
  const ending = !complete
    ? 'The log stops here, so the rest is not shown.'
    : never.length === 0
      ? 'Every thunk was forced.'
      : `Never forced: ${names(never.map((r) => cut(r.exp, 24)))}. ${never.length === 1 ? 'That expression was' : 'Those expressions were'} never evaluated.`;
  return `${result === null ? '' : `The value printed last is ${result}. `}${made} ${ending}`;
}

function stateOf(row: ThunkRow, final: boolean, memoizes: boolean): { text: string; tone: Tone; dashed: boolean } {
  if (row.state === 'forcing') return { text: 'being forced…', tone: 'focus', dashed: false };
  if (row.state === 'evaluated') return { text: `evaluated_thunk  ${cut(row.value ?? '?', 12)}`, tone: 'ok', dashed: false };
  if (final && row.forcings === 0) return { text: 'thunk, never forced', tone: 'bad', dashed: true };
  if (!memoizes && row.forcings > 0) {
    return { text: row.value === null ? 'thunk, value not kept' : `thunk  (gave ${cut(row.value, 8)})`, tone: 'value', dashed: true };
  }
  return { text: 'thunk: expression + env', tone: 'plain', dashed: true };
}

/** The thunks an event is about. */
function focusOf(event: ThunkEvent | undefined): number[] {
  if (event === undefined) return [];
  if (event.kind === 'delay') return event.thunks;
  return event.thunk === null ? [] : [event.thunk];
}

export function ThunkScene({ source, prelude }: ThunkSceneProps): ReactNode {
  const { log, pending } = useCalls(source, THUNK_WATCH, { prelude, maxCalls: MAX_CALLS });
  const timeline = useMemo(() => (log === null ? null : thunkTimeline(log.calls)), [log]);
  const memoizes = prelude?.includes('set_head(obj, "evaluated_thunk")') ?? false;
  const events = timeline?.events.slice(0, MAX_EVENTS) ?? [];
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(events.length === 0 ? 0 : events.length + 1, { stage, resetKey: log, msPerStep: 1500 });

  const title = 'Thunks, delayed and forced';
  if (prelude === undefined || log === null || timeline === null || events.length === 0) {
    const why =
      prelude === undefined
        ? 'This scene needs the lazy evaluator in the example’s prelude.'
        : log === null || pending
          ? 'Running the program through the lazy evaluator…'
          : log.status === 'error'
            ? `The program stopped with an error before any thunk was made: ${log.result ?? ''}`
            : 'No argument was delayed: apply a compound function in a program given to `driver_loop` or `evaluate_program`.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No thunks yet">
        <div />
      </SceneFrame>
    );
  }

  const k = player.index;
  const final = k >= events.length;
  const event = events[Math.min(k, events.length - 1)];
  const all = rowsAt(timeline, Math.min(k, events.length - 1), memoizes);
  const focus = final ? [] : focusOf(event);

  // Keep the rows touched most recently, in the order the thunks were made.
  const touched = new Map<number, number>();
  events.slice(0, Math.min(k, events.length - 1) + 1).forEach((e, i) => focusOf(e).forEach((id) => touched.set(id, i)));
  const shown = (
    all.length <= MAX_ROWS
      ? all
      : final
        ? [...all].sort((a, b) => (a.forcings === 0 ? 0 : 1) - (b.forcings === 0 ? 0 : 1) || (touched.get(b.id) ?? 0) - (touched.get(a.id) ?? 0)).slice(0, MAX_ROWS)
        : [...all].sort((a, b) => (touched.get(b.id) ?? 0) - (touched.get(a.id) ?? 0)).slice(0, MAX_ROWS)
  ).sort((a, b) => a.id - b.id);
  const hidden = all.length - shown.length;

  const values = log.output.filter((line) => line.startsWith(PROMPT)).map((line) => line.slice(PROMPT.length));
  const result = values.length > 0 ? (values[values.length - 1] ?? null) : log.status === 'done' ? log.result : null;
  const complete = !log.truncated && timeline.events.length <= MAX_EVENTS;
  const text = final
    ? finalCaption(timeline, all, result, complete)
    : event === undefined
      ? ''
      : caption(event, timeline, memoizes);
  const height = TOP + Math.max(1, shown.length) * ROW + (hidden > 0 ? 18 : 4);

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(text)}>
      <div ref={stage}>
        <Stage width={W} height={height} label="Thunks made by the lazy evaluator, with their state" maxHeight={340}>
          <g className="fill-ink-3" fontSize={10.5}>
            <text x={PARAM_X} y={12} textAnchor="middle">
              parameter
            </text>
            <text x={EXP_X} y={12} textAnchor="middle">
              argument expression
            </text>
            <text x={STATE_X} y={12} textAnchor="middle">
              what the frame holds
            </text>
          </g>
          <AnimatePresence>
            {shown.map((row, i) => {
              const y = TOP + i * ROW + ROW / 2 - 4;
              const lit = focus.includes(row.id);
              const state = stateOf(row, final, memoizes);
              const counts = [
                row.forcings > 1 ? `evaluated ${row.forcings}×` : null,
                row.reuses > 0 ? `reused ${row.reuses}×` : null,
              ].filter((c) => c !== null);
              return (
                <g key={row.id} data-testid="thunk-row">
                  <Pill x={PARAM_X} y={y} width={72} text={cut(row.param, 9)} tone={lit ? 'focus' : 'plain'} />
                  <line x1={PARAM_X + 38} y1={y} x2={EXP_X - 112} y2={y} className="stroke-line" strokeWidth={1.2} />
                  <Pill
                    x={EXP_X}
                    y={y}
                    width={220}
                    text={cut(row.exp, 30)}
                    tone={final && row.forcings === 0 ? 'dim' : lit ? 'focus' : 'plain'}
                  />
                  <line x1={EXP_X + 112} y1={y} x2={STATE_X - 92} y2={y} className="stroke-line" strokeWidth={1.2} />
                  <Pill x={STATE_X} y={y} width={180} text={state.text} tone={state.tone} dashed={state.dashed} fontSize={11.5} />
                  {counts.length > 0 && (
                    <text x={STATE_X + 98} y={y} dominantBaseline="central" fontSize={11} className="fill-ink-2">
                      {counts.join(' · ')}
                    </text>
                  )}
                </g>
              );
            })}
          </AnimatePresence>
          {hidden > 0 && (
            <text x={W / 2} y={height - 6} textAnchor="middle" fontSize={10.5} className="fill-ink-3">
              {hidden} other thunk{hidden === 1 ? '' : 's'} not shown
            </text>
          )}
        </Stage>
      </div>
    </SceneFrame>
  );
}
