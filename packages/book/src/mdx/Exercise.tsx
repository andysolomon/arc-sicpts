import type { JobHandle, TestResult } from '@sicp/lab';
import { AnimatePresence, motion } from 'motion/react';
import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { exercises } from '../../content/exercises.ts';
import { CodeEditor } from '../editor/CodeEditor.tsx';
import { usePersistentSource } from '../editor/persistence.ts';
import { useDuration } from '../hooks.ts';
import { labClient } from '../lab/client.ts';
import { readExercise, recordExercise, type ExerciseResult } from '../progress.ts';
import { useSectionId } from './SectionContext.ts';

/** The explanation revealed by "Reveal solution". Used inside `<Exercise>`. */
export function Solution({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

type CheckState =
  | { status: 'idle'; result: ExerciseResult | null }
  | { status: 'checking' }
  | { status: 'checked'; result: ExerciseResult; note: string | null };

/** When every test fails for the same reason, the reason is the reader's bug, so say it. */
function sharedFailure(results: readonly TestResult[]): string | null {
  const first = results[0];
  if (first === undefined || first.detail === null) return null;
  return results.every((r) => !r.pass && r.detail === first.detail) ? first.detail : null;
}

interface ExerciseProps {
  /** Exercise number; selects the spec in `content/exercises.ts`. */
  id: string;
  /** The statement, with a `<Solution>` among its children. */
  children: ReactNode;
}

export function Exercise({ id, children }: ExerciseProps) {
  const spec = exercises[id];
  if (spec === undefined) throw new Error(`No exercise ${id} in content/exercises.ts`);

  const sectionId = useSectionId();
  const { source, setSource } = usePersistentSource(sectionId, `ex-${id}`, spec.starter);
  const [check, setCheck] = useState<CheckState>(() => ({ status: 'idle', result: readExercise(id) }));
  const [solutionOpen, setSolutionOpen] = useState(false);
  const job = useRef<JobHandle | null>(null);
  const solutionId = useId();
  const duration = useDuration();

  useEffect(() => () => job.current?.cancel(), []);

  const parts = Children.toArray(children);
  const solution = parts.filter((child) => isValidElement(child) && child.type === Solution);
  const statement = parts.filter((child) => !solution.includes(child));

  const runCheck = useCallback(async () => {
    job.current?.cancel();
    setCheck({ status: 'checking' });
    const handle = labClient().submit({
      type: 'check',
      source,
      tests: spec.tests,
      ...(spec.prelude !== undefined && { prelude: spec.prelude }),
      ...(spec.budget !== undefined && { budget: spec.budget }),
    });
    job.current = handle;
    const end = await handle.finished;
    if (job.current !== handle) return;
    job.current = null;
    if (end.type !== 'check-done') {
      setCheck({ status: 'idle', result: readExercise(id) });
      return;
    }
    const result = { passed: end.passed, total: end.total };
    recordExercise(id, result);
    setCheck({ status: 'checked', result, note: sharedFailure(end.results) });
  }, [id, source, spec]);

  const result = check.status === 'checking' ? null : check.result;
  const [tone, dot] =
    result === null
      ? ['text-ink-3', 'bg-ink-3']
      : result.passed === result.total
        ? ['text-ok', 'bg-ok']
        : result.passed === 0
          ? ['text-bad', 'bg-bad']
          : ['text-warn', 'bg-warn'];

  return (
    <article
      aria-label={`Exercise ${id}`}
      data-testid={`exercise-${id}`}
      className="flex flex-col overflow-hidden rounded-[10px] border border-line"
    >
      <div className="flex flex-wrap items-baseline gap-3 bg-paper px-[18px] py-4">
        <span className="font-mono text-xs text-accent-ink">Exercise {id}</span>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 text-[16.5px] leading-[1.55] text-pretty [&_code]:text-[0.9em]">
          {statement}
        </div>
      </div>
      <div className="border-t border-line bg-paper-2">
        <CodeEditor value={source} onChange={setSource} label={`Your answer to exercise ${id}`} onRun={() => void runCheck()} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => void runCheck()}
          disabled={check.status === 'checking'}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border-none bg-accent px-3.5 text-[13.5px] font-semibold text-paper pointer-coarse:h-11"
        >
          Check
        </button>
        {solution.length > 0 && (
          <button
            type="button"
            aria-expanded={solutionOpen}
            aria-controls={solutionId}
            onClick={() => setSolutionOpen((open) => !open)}
            className="h-9 rounded-md border border-line bg-transparent px-3 text-[13.5px] text-ink-2 transition-colors hover:bg-paper-2 pointer-coarse:h-11"
          >
            {solutionOpen ? 'Hide solution' : 'Reveal solution'}
          </button>
        )}
        <span className="flex-1" />
        <span role="status" data-testid="check-status" className={`inline-flex items-center gap-2 font-mono text-xs ${tone}`}>
          {check.status === 'checking' && 'checking…'}
          {result !== null && (
            <>
              <span className={`size-2 rounded-full ${dot}`} />
              {result.passed} / {result.total} hidden tests pass
            </>
          )}
          {check.status === 'idle' && result === null && 'not checked yet'}
        </span>
      </div>
      {check.status === 'checked' && check.note !== null && (
        <code className="border-t border-line bg-paper px-3.5 py-2.5 text-[13px] whitespace-pre-wrap text-bad">
          {check.note}
        </code>
      )}
      <AnimatePresence initial={false}>
        {solutionOpen && (
          <motion.div
            id={solutionId}
            key="solution"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: duration(0.2), ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-line bg-accent-soft px-[18px] py-3.5 text-[15.5px] leading-[1.55] text-pretty [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[0.9em]">
              {solution}
              <pre className="m-0 overflow-auto text-[13px] leading-[1.6]">
                <code>{spec.solution}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
