import type { ProcessShapeSnapshot } from '@sicp/lab';
import type { MDXComponents } from 'mdx/types';
import { Children, lazy, Suspense, useCallback, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { AnimKind } from '../anim/Animation.tsx';
import { repoFile } from '../config.ts';
import { Figure } from '../diagrams/Figure.tsx';
import { NestedSquaresIcon } from '../shell/icons.tsx';
import { pages } from '../toc.ts';
import { Exercise, Solution } from './Exercise.tsx';

/** Keep each editor, diagram and scene out of the initial reading shell. */
function deferred<Props extends object>(load: () => Promise<{ default: ComponentType<Props> }>) {
  const Component = lazy(load);
  return function Deferred(props: Props) {
    return (
      <Suspense fallback={<div role="status" className="rounded-lg bg-paper-2 p-4 text-ink-3">Loading interactive panel…</div>}>
        <Component {...props} />
      </Suspense>
    );
  };
}

const BlackBoxDiagram = deferred(async () => ({ default: (await import('../diagrams/BlackBoxDiagram.tsx')).BlackBoxDiagram }));
const LabArchitectureDiagram = deferred(async () => ({ default: (await import('../diagrams/LabArchitectureDiagram.tsx')).LabArchitectureDiagram }));
const LayersDiagram = deferred(async () => ({ default: (await import('../diagrams/LayersDiagram.tsx')).LayersDiagram }));
const SourceEditor = deferred(async () => ({ default: (await import('../editor/SourceEditor.tsx')).SourceEditor }));
const ProcessShapeViz = deferred(async () => ({ default: (await import('../viz/ProcessShapeViz.tsx')).ProcessShapeViz }));
const Animation = deferred(async () => ({ default: (await import('../anim/Animation.tsx')).Animation }));
const EnvModelSimpleDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.2.tsx')).diagrams.EnvModelSimpleDiagram }));
const BoxPointerDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.3.tsx')).diagrams.BoxPointerDiagram }));
const PrimitiveGatesDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.3-simulation.tsx')).diagrams.PrimitiveGatesDiagram }));
const HalfAdderDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.3-simulation.tsx')).diagrams.HalfAdderDiagram }));
const FullAdderDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.3-simulation.tsx')).diagrams.FullAdderDiagram }));
const RippleCarryAdderDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.3-simulation.tsx')).diagrams.RippleCarryAdderDiagram }));
const CelsiusFahrenheitDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.3-simulation.tsx')).diagrams.CelsiusFahrenheitDiagram }));
const TimingDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.4.tsx')).diagrams.TimingDiagram }));
const SieveDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5.tsx')).diagrams.SieveDiagram }));
const PairsDecompositionDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.PairsDecompositionDiagram }));
const SignalIntegralDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.SignalIntegralDiagram }));
const SignalRcCircuitDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.SignalRcCircuitDiagram }));
const SignalSolveDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.SignalSolveDiagram }));
const SignalSecondOrderDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.SignalSecondOrderDiagram }));
const SignalRlcDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.SignalRlcDiagram }));
const ParadigmJointAccountDiagram = deferred(async () => ({ default: (await import('../diagrams/chapter-3/section-3.5-paradigm.tsx')).diagrams.ParadigmJointAccountDiagram }));

/** Running text, capped at 68 characters per line. */
function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[68ch] flex-col gap-[18px] text-lg leading-[1.65] text-pretty">{children}</div>
  );
}

interface ExampleProps {
  /** Position among the section's editors, starting at 0. */
  index: number;
  file: string;
  source: string;
  mode?: 'run' | 'step';
  /** Show a visualizer beside the editor. */
  viz?: 'processShape';
  /** Show an animation under the editor, drawn from the text as it currently reads. */
  anim?: AnimKind;
  budget?: number;
  /** Declarations the program uses without showing them, such as the simulator of §5.2. */
  prelude?: string;
  /** For `anim="compare"`: a program declaring `special_statistics(n)` for a hand-designed machine. */
  special?: string;
  /** For `anim="memory"`: the index of the first pair. */
  start?: number;
  /** The note under the visualizer, or under the animation when there is no visualizer. */
  children?: ReactNode;
}

/** An editor, optionally with a visualizer beside it and an animation below. */
function Example({ index, file, source, mode = 'run', viz, anim, budget, prelude, special, start, children }: ExampleProps) {
  const [shape, setShape] = useState<{ snapshot: ProcessShapeSnapshot | null; runId: number }>({
    snapshot: null,
    runId: 0,
  });
  const onShape = useCallback(
    (snapshot: ProcessShapeSnapshot | null, runId: number) => setShape({ snapshot, runId }),
    [],
  );
  // The animation follows the editor's text and, in step mode, its stepper.
  const [text, setText] = useState(source);
  const [step, setStep] = useState(0);
  const editor = (
    <SourceEditor
      file={file}
      source={source}
      editorId={String(index)}
      mode={mode}
      {...(budget !== undefined && { budget })}
      {...(prelude !== undefined && { prelude })}
      {...(viz === 'processShape' && { onShape })}
      {...(anim !== undefined && { onSource: setText })}
      {...(anim !== undefined && mode === 'step' && { onStep: setStep })}
    />
  );
  const main =
    viz === undefined ? (
      editor
    ) : (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-4">
        {editor}
        <ProcessShapeViz snapshot={shape.snapshot} runKey={shape.runId}>
          {children}
        </ProcessShapeViz>
      </div>
    );
  const note =
    children === undefined ? null : (
      <div className="text-sm leading-normal text-pretty text-ink-2 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[0.9em]">{children}</div>
    );
  if (anim === undefined) {
    return viz === undefined && note !== null ? (
      <div className="flex flex-col gap-4">
        {main}
        {note}
      </div>
    ) : (
      main
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {main}
      <Animation kind={anim} source={text} stepIndex={mode === 'step' ? step : undefined} prelude={prelude} special={special} start={start} />
      {viz === undefined && note}
    </div>
  );
}

interface UnderTheHoodProps {
  /** Repository path the link points at. */
  file: string;
  children: ReactNode;
}

/** Names the Laboratory modules behind the section and the test that proves its claim. */
function UnderTheHood({ file, children }: UnderTheHoodProps) {
  return (
    <aside className="grid grid-cols-[auto_1fr] items-start gap-3.5 rounded-[10px] bg-paper-2 px-[18px] py-4">
      <NestedSquaresIcon />
      <div className="flex min-w-0 flex-col gap-1.5 text-[15px] leading-[1.55]">
        <span className="font-semibold">Under the hood</span>
        <div className="text-pretty text-ink-2 [&_code]:text-[0.9em] [&_p]:m-0">{children}</div>
        <a href={repoFile(file)} className="text-sm break-all">
          {file} →
        </a>
      </div>
    </aside>
  );
}

interface ExercisesProps {
  /** The numbers covered, e.g. `1.9 – 1.10`. */
  range: string;
  /** How many exercises the range holds; defaults to the number shown. */
  total?: number;
  children: ReactNode;
}

function Exercises({ range, total, children }: ExercisesProps) {
  const shown = Children.count(children);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-3 border-b border-line pb-2.5">
        <h2 className="m-0 text-2xl font-medium">Exercises</h2>
        <span className="font-mono text-xs text-ink-3">
          {range} · {shown} of {total ?? shown} shown
        </span>
      </div>
      {children}
    </section>
  );
}

interface EnablesProps {
  /**
   * What builds on this section: section numbers or appendix letters as shown
   * in the contents, each optionally with its own label.
   */
  items: readonly (string | { id: string; label: string })[];
}

/** Pill links to the sections that build on this one. */
function Enables({ items }: EnablesProps) {
  return (
    <footer className="flex flex-col gap-2.5 rounded-[10px] border border-dashed border-line px-5 py-[18px]">
      <span className="font-mono text-xs tracking-[0.06em] text-ink-3 uppercase">What this enables</span>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const id = typeof item === 'string' ? item : item.id;
          const page = pages.find((candidate) => candidate.crumb === id);
          if (page === undefined) throw new Error(`<Enables> names ${id}, which is not in the contents`);
          return (
            <Link
              key={id}
              to={page.path}
              className="pressable rounded-full border border-line px-3 py-1.5 text-[14.5px] pointer-coarse:py-2.5"
            >
              {id} {typeof item === 'string' ? page.title : item.label}
            </Link>
          );
        })}
      </div>
    </footer>
  );
}

/** What MDX content may use without importing. */
export const mdxComponents: MDXComponents = {
  Prose,
  Example,
  UnderTheHood,
  Exercises,
  Exercise,
  Solution,
  Enables,
  Figure,
  LayersDiagram,
  BlackBoxDiagram,
  LabArchitectureDiagram,
  EnvModelSimpleDiagram,
  BoxPointerDiagram,
  PrimitiveGatesDiagram,
  HalfAdderDiagram,
  FullAdderDiagram,
  RippleCarryAdderDiagram,
  CelsiusFahrenheitDiagram,
  TimingDiagram,
  SieveDiagram,
  PairsDecompositionDiagram,
  SignalIntegralDiagram,
  SignalRcCircuitDiagram,
  SignalSolveDiagram,
  SignalSecondOrderDiagram,
  SignalRlcDiagram,
  ParadigmJointAccountDiagram,

  p: (props) => <p className="m-0" {...props} />,
  code: (props) => <code className="rounded bg-paper-2 px-[5px] py-px text-[0.88em]" {...props} />,
  pre: (props) => (
    <pre
      className="m-0 overflow-auto rounded-lg border border-line bg-paper-2 p-3.5 text-[13.5px] leading-[1.6] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className="m-0 flex flex-col gap-2 border-l-2 border-line pl-4 text-[16px] leading-[1.55] text-ink-2 italic [&_p]:m-0" {...props} />
  ),
  h2: (props) => <h2 className="m-0 mt-2 text-2xl font-medium" {...props} />,
  h3: (props) => <h3 className="m-0 mt-1 text-xl font-semibold" {...props} />,
  ul: (props) => <ul className="m-0 flex list-disc flex-col gap-1.5 pl-6" {...props} />,
  ol: (props) => <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-6" {...props} />,
  table: (props) => (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-left text-[15.5px] [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:py-2 [&_th]:pr-4 [&_th]:font-mono [&_th]:text-xs [&_th]:font-medium [&_th]:text-ink-3"
        {...props}
      />
    </div>
  ),
};
