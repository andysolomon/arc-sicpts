import type { JobHandle, LabEvent, ProcessShapeSnapshot, TerminalEvent } from '@sicp/lab';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDuration } from '../hooks.ts';
import { labClient } from '../lab/client.ts';
import { useSectionId } from '../mdx/SectionContext.ts';
import { PlayIcon, RunToEndIcon, StepBackIcon, StepIcon, StopIcon } from '../shell/icons.tsx';
import { accentButton, accentIconButton, iconButton, outlineButton } from './buttons.ts';
import { CodeEditor } from './CodeEditor.tsx';
import { formatMs, pluralSteps } from './format.ts';
import { shareUrl, usePersistentSource } from './persistence.ts';

export interface SourceEditorProps {
  /** Shown in the toolbar, e.g. `factorial.sicp`. */
  file: string;
  /** The source the page supplies; Reset restores it. */
  source: string;
  /** Position of this editor within its section; part of the storage key. */
  editorId: string;
  /** `run` evaluates the whole program; `step` walks it one step at a time. */
  mode?: 'run' | 'step';
  /** Maximum evaluator steps for a run. */
  budget?: number;
  /**
   * Ask the Laboratory for a process-shape trace and receive each snapshot.
   * Called with `null` when a run starts or the editor is reset.
   */
  onShape?: (snapshot: ProcessShapeSnapshot | null, runId: number) => void;
  /** Receives the text as it currently reads, on mount and after every edit or reset. */
  onSource?: ((source: string) => void) | undefined;
  /** In step mode, receives the stepper's position whenever it moves. */
  onStep?: ((index: number) => void) | undefined;
}

type RunState =
  | { status: 'idle' }
  | { status: 'running'; output: string[] }
  | { status: 'done'; output: string[]; value: string; steps: number; ms: number }
  | { status: 'error'; output: string[]; message: string; steps: number; ms: number }
  | { status: 'budget'; output: string[]; steps: number; ms: number }
  | { status: 'cancelled'; output: string[]; steps: number };

type TraceDone = Extract<TerminalEvent, { type: 'trace-done' }>;

const LOG_WINDOW = 5;

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[10px] border border-line bg-paper-2 focus-within:border-accent">
      {children}
    </div>
  );
}

function OutputHeader({ right }: { right: string }) {
  return (
    <div className="flex justify-between gap-3 font-mono text-[11px] text-ink-3">
      <span>output</span>
      <span>{right}</span>
    </div>
  );
}

function RunOutput({ state, fading }: { state: RunState; fading: boolean }) {
  // While a run is in flight the previous body stays, dimmed, so the panel
  // does not collapse and regrow for a run that takes a few milliseconds.
  const settled = useRef<RunState>({ status: 'idle' });
  if (state.status !== 'running') settled.current = state;
  const shown = state.status === 'running' ? settled.current : state;

  const summary =
    state.status === 'idle'
      ? 'not run yet'
      : state.status === 'running'
        ? 'evaluating…'
        : state.status === 'cancelled'
          ? `cancelled · ${pluralSteps(state.steps)}`
          : `evaluate · ${pluralSteps(state.steps)} · ${formatMs(state.ms)}`;
  const output = shown.status === 'idle' ? [] : shown.output;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="output"
      data-status={state.status}
      className={`flex flex-col gap-1.5 border-t border-line bg-paper px-3.5 py-2.5 transition-opacity duration-150 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <OutputHeader right={summary} />
      <div className={`flex min-h-[22px] flex-col gap-1.5 ${state.status === 'running' ? 'opacity-50' : ''}`}>
        {output.map((line, i) => (
          <code key={i} className="text-[13.5px] break-words whitespace-pre-wrap text-ink">
            {line}
          </code>
        ))}
        {shown.status === 'idle' && <span className="text-sm text-ink-3">Run the program to see its value.</span>}
        {shown.status === 'done' && (
          <code data-testid="output-value" className="text-[13.5px] break-words whitespace-pre-wrap text-num">
            {shown.value}
          </code>
        )}
        {shown.status === 'error' && (
          <code data-testid="output-error" className="text-[13.5px] break-words whitespace-pre-wrap text-bad">
            {shown.message}
          </code>
        )}
        {shown.status === 'budget' && (
          <code data-testid="output-budget" className="text-[13.5px] whitespace-pre-wrap text-warn">
            budget exhausted after {pluralSteps(shown.steps)}. The program was stopped; it may never finish.
          </code>
        )}
      </div>
    </div>
  );
}

export function SourceEditor({ file, source: supplied, editorId, mode = 'run', budget, onShape, onSource, onStep }: SourceEditorProps) {
  const sectionId = useSectionId();
  const { source, setSource, reset } = usePersistentSource(sectionId, editorId, supplied);
  const sourceRef = useRef(source);
  const duration = useDuration();

  const [run, setRun] = useState<RunState>({ status: 'idle' });
  const [fading, setFading] = useState(false);
  const [shared, setShared] = useState<'copied' | 'in-url' | null>(null);
  const job = useRef<JobHandle | null>(null);

  const [trace, setTrace] = useState<TraceDone | null>(null);
  const [index, setIndex] = useState(0);
  const tracing = useRef<Promise<TraceDone | null> | null>(null);

  useEffect(() => () => job.current?.cancel(), []);
  useEffect(() => onSource?.(source), [onSource, source]);
  useEffect(() => onStep?.(index), [index, onStep]);

  const change = useCallback(
    (next: string) => {
      sourceRef.current = next;
      setSource(next);
      // A step log describes the text it was made from.
      tracing.current = null;
      setTrace(null);
      setIndex(0);
    },
    [setSource],
  );

  const start = useCallback(() => {
    job.current?.cancel();
    const output: string[] = [];
    let shapeSeen = false;
    setRun({ status: 'running', output });
    const handle = labClient().submit(
      {
        type: 'run',
        source: sourceRef.current,
        inspect: { processShape: onShape !== undefined },
        ...(budget !== undefined && { budget }),
      },
      (event: LabEvent) => {
        if (job.current?.id !== event.id) return;
        switch (event.type) {
          case 'display':
            output.push(event.text);
            setRun({ status: 'running', output: [...output] });
            return;
          case 'shape':
            shapeSeen = true;
            onShape?.(event.snapshot, event.id);
            return;
          case 'done':
            setRun({ status: 'done', output, value: event.value, steps: event.steps, ms: event.ms });
            break;
          case 'error':
            setRun({ status: 'error', output, message: event.error.message, steps: event.steps, ms: event.ms });
            break;
          case 'budget-exhausted':
            setRun({ status: 'budget', output, steps: event.steps, ms: event.ms });
            break;
          case 'cancelled':
            setRun({ status: 'cancelled', output, steps: event.steps });
            break;
          default:
            return;
        }
        job.current = null;
        // The previous chart stays up until this run's trace replaces it. A run
        // that made no calls has no trace, so clear it now.
        if (!shapeSeen) onShape?.({ runs: [] }, event.id);
      },
    );
    job.current = handle;
  }, [budget, onShape]);

  const resetAll = useCallback(() => {
    job.current?.cancel();
    job.current = null;
    sourceRef.current = supplied;
    reset();
    tracing.current = null;
    setTrace(null);
    setIndex(0);
    // The stale output fades out before it is cleared.
    setFading(true);
    window.setTimeout(() => {
      setRun({ status: 'idle' });
      onShape?.(null, 0);
      setFading(false);
    }, duration(0.15) * 1000);
  }, [duration, onShape, reset, supplied]);

  const share = useCallback(async () => {
    const url = shareUrl(editorId, sourceRef.current);
    window.history.replaceState(window.history.state, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setShared('copied');
    } catch {
      // No clipboard permission: the link is still in the address bar.
      setShared('in-url');
    }
    window.setTimeout(() => setShared(null), 1800);
  }, [editorId]);

  /** The step log for the current text, computed once and then reused. */
  const ensureTrace = useCallback((): Promise<TraceDone | null> => {
    if (tracing.current !== null) return tracing.current;
    const text = sourceRef.current;
    const pending = labClient()
      .submit({ type: 'trace', source: text })
      .finished.then((end) => {
        if (end.type !== 'trace-done' || sourceRef.current !== text) return null;
        setTrace(end);
        return end;
      });
    tracing.current = pending;
    return pending;
  }, []);

  const stepTo = useCallback(
    async (target: (current: number, length: number) => number) => {
      const log = await ensureTrace();
      if (log !== null) setIndex((current) => target(current, log.records.length));
    },
    [ensureTrace],
  );

  const live = run.status === 'running';
  const record = trace?.records[index - 1] ?? null;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-2.5 py-2">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{file}</span>
      {mode === 'run' ? (
        live ? (
          <button type="button" className={outlineButton} onClick={() => job.current?.cancel()}>
            <StopIcon />
            Cancel
          </button>
        ) : (
          <button type="button" className={accentButton} onClick={start} aria-keyshortcuts="Meta+Enter Control+Enter">
            <PlayIcon />
            Run
          </button>
        )
      ) : (
        <>
          <button
            type="button"
            aria-label="Step back"
            className={iconButton}
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            <StepBackIcon />
          </button>
          <button
            type="button"
            aria-label="Step"
            className={accentIconButton}
            disabled={trace !== null && index >= trace.records.length}
            onClick={() => void stepTo((current, length) => Math.min(current + 1, length))}
          >
            <StepIcon />
          </button>
          <button
            type="button"
            aria-label="Run to end"
            className={iconButton}
            disabled={trace !== null && index >= trace.records.length}
            onClick={() => void stepTo((_, length) => length)}
          >
            <RunToEndIcon />
          </button>
          <span data-testid="step-counter" className="ml-1 font-mono text-[11.5px] text-ink-3">
            step {index} / {trace === null ? '–' : trace.records.length}
          </span>
        </>
      )}
      <button type="button" className={outlineButton} onClick={resetAll}>
        Reset
      </button>
      <button type="button" className={outlineButton} onClick={() => void share()}>
        {shared === 'copied' ? 'Copied' : shared === 'in-url' ? 'Link in URL' : 'Share'}
      </button>
    </div>
  );

  return (
    <Panel>
      {toolbar}
      <CodeEditor
        value={source}
        onChange={change}
        label={`${file}, editable program`}
        highlight={record === null ? null : { from: record.loc.start, to: record.loc.end }}
        {...(mode === 'run' && { onRun: start })}
      />
      {mode === 'run' ? <RunOutput state={run} fading={fading} /> : <StepLog trace={trace} index={index} />}
    </Panel>
  );
}

function StepLog({ trace, index }: { trace: TraceDone | null; index: number }) {
  const duration = useDuration();

  if (trace === null) {
    return (
      <div role="status" className="border-t border-line bg-paper px-3.5 py-2.5 text-sm text-ink-3">
        Press step to evaluate the program one step at a time.
      </div>
    );
  }

  const { records, outcome } = trace;
  const first = Math.max(0, Math.min(index - 3, records.length - LOG_WINDOW));
  const rows = records.slice(first, first + LOG_WINDOW);
  const finished = index >= records.length;

  return (
    <div role="status" aria-live="polite" data-testid="step-log" className="flex flex-col border-t border-line bg-paper">
      <AnimatePresence initial={false}>
        {rows.map((row) => {
          const current = row.n === index;
          return (
            <motion.div
              key={row.n}
              layout="position"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: duration(0.16) }}
              aria-current={current ? 'step' : undefined}
              className={`grid grid-cols-[28px_1fr_auto] items-baseline gap-2.5 border-t border-line px-3.5 py-[7px] font-mono text-xs first:border-t-0 ${
                current ? 'bg-accent-soft text-accent-ink' : 'text-ink-2'
              }`}
            >
              <span className="text-ink-3">{row.n}</span>
              <span className="break-words">{row.text}</span>
              <span className="text-ink-3">{row.env}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {finished && (
        <div className="flex flex-col gap-1.5 border-t border-line px-3.5 py-2.5">
          <OutputHeader right={trace.truncated ? `log truncated at ${pluralSteps(records.length)}` : 'finished'} />
          {trace.output.map((line, i) => (
            <code key={i} className="text-[13.5px] whitespace-pre-wrap text-ink">
              {line}
            </code>
          ))}
          {outcome.status === 'done' && <code className="text-[13.5px] text-num">{outcome.value}</code>}
          {outcome.status === 'error' && <code className="text-[13.5px] text-bad">{outcome.error.message}</code>}
          {outcome.status === 'budget-exhausted' && (
            <code className="text-[13.5px] text-warn">budget exhausted before the program finished</code>
          )}
        </div>
      )}
    </div>
  );
}
