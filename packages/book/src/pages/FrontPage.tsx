import { Link } from 'react-router';
import { REPO_URL, SOURCE_BOOK_URL } from '../config.ts';
import { ChevronIcon } from '../shell/icons.tsx';
import { Eyebrow } from './parts.tsx';

const PILLARS: readonly (readonly [title: string, text: string])[] = [
  ['Read', 'Explanations and adaptations across all five chapters, each section tracing the problem, the abstraction, and what it connects to.'],
  ['Run', 'Run Source programs with a step budget in the Laboratory worker. Edits persist per section and can be shared in a link.'],
  ['Inspect', 'Execution views show real Laboratory state: frames, streams, registers, and the heap.'],
  ['Practice', 'Exercises ship with hidden checks. Interpreted and compiled runs are compared side by side in Chapter 5.'],
];

export function FrontPage() {
  return (
    <>
      <div className="flex flex-col gap-3 pt-6">
        <Eyebrow>An interactive book</Eyebrow>
        <h1 className="m-0 text-[clamp(2.25rem,1.5rem+3vw,4rem)] leading-[1.05] font-medium tracking-[-0.02em] text-balance">
          Structure and Interpretation of Computer Programs,{' '}
          <em className="text-ink-2 italic">an interactive Source edition</em>
        </h1>
        <p className="m-0 mt-2 max-w-[60ch] text-xl leading-normal text-pretty text-ink-2">
          Every section’s explanation sits beside live, editable code and a view into the machinery that runs
          it: environments, streams, registers, the heap, instruction sequences.
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link
            to="/1"
            className="pressable inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-[18px] text-[15px] font-semibold text-paper no-underline hover:no-underline"
          >
            Start Chapter 1 <ChevronIcon />
          </Link>
          <Link
            to="/5/5.2"
            className="pressable inline-flex h-11 items-center gap-2 rounded-lg border border-line px-[18px] text-[15px] text-ink no-underline transition-colors hover:bg-paper-2 hover:no-underline"
          >
            Jump to the register machine
          </Link>
        </div>
      </div>

      <section aria-label="Before you begin" className="flex max-w-[68ch] flex-col gap-3 text-lg leading-[1.65]">
        <h2 className="m-0 text-2xl font-medium">Before you begin</h2>
        <p className="m-0">
          This book is for readers learning how programs work. Familiarity with variables, functions,
          and basic algebra helps; recursion and higher-order functions are developed in Chapter 1.
          The numerical examples use some calculus, explained where needed. You can work through the
          book independently or alongside a programming course.
        </p>
        <p className="m-0">
          The editors run <em>Source</em>, a small JavaScript subset: you write functions and expressions
          without TypeScript type annotations. The companion app and Laboratory engine are implemented
          in TypeScript. <Link to="/appendix/grammar">Appendix A</Link> lists the syntax and library
          functions available in every editor, including the differences from ordinary JavaScript.
        </p>
        <h3 className="m-0 mt-1 text-xl font-semibold">A study routine</h3>
        <ol className="m-0 flex list-decimal flex-col gap-2 pl-6">
          <li><strong>Predict.</strong> Read the explanation and work out the example’s result before running it.</li>
          <li><strong>Run.</strong> Press Run, or Ctrl/⌘ Enter inside an editor; change one input and predict again.
            Reset restores the supplied example. A step budget stops a program that does too much work.</li>
          <li><strong>Inspect.</strong> Play or step through the animation; in a step editor, follow the highlighted code and log.
            Compare the model with the value the program produced.</li>
          <li><strong>Practice.</strong> Attempt the exercises, use Check and its feedback to revise your answer,
            then reveal the solution to compare approaches. Passing the checks is evidence for the tested cases,
            so explain why your solution works as well.</li>
        </ol>
        <p className="m-0 text-base text-ink-2">
          Work through the chapters in order on a first reading. Edits and exercise results stay in this
          browser; Share copies a link to an example’s code. Search finds concepts and exercise numbers,
          and the links at the end of each page connect it to later material.
        </p>
      </section>

      <section
        aria-label="What the book offers"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-px overflow-hidden rounded-[10px] border border-line bg-line"
      >
        {PILLARS.map(([title, text], i) => (
          <div key={title} className="bg-paper p-[22px]">
            <span className="font-mono text-xs text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <h2 className="mt-2 mb-1.5 text-lg font-semibold">{title}</h2>
            <p className="m-0 text-[15.5px] leading-[1.55] text-ink-2">{text}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-[10px] bg-paper-2 px-6 py-[22px]">
        <h2 className="m-0 font-mono text-sm font-medium tracking-[0.06em] text-ink-2 uppercase">Attribution</h2>
        <p className="m-0 text-base leading-[1.6] text-pretty">
          This book follows the structure of{' '}
          <em>Structure and Interpretation of Computer Programs, JavaScript Edition</em> by Abelson, Sussman,
          Henz and Wrigstad (MIT Press), licensed CC BY-SA 4.0. The manuscript and teaching programs here
          adapt that work with additional explanations and interactive examples, under CC BY-SA 4.0.
          The original companion software, including the Laboratory engine, is MIT licensed.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href={SOURCE_BOOK_URL}>sicp.sourceacademy.org</a>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>
          <a href={`${REPO_URL}/blob/main/LICENSE`}>Software license</a>
          <a href={`${REPO_URL}/blob/main/LICENSE-CONTENT.md`}>Book license and attribution</a>
          <Link to="/appendix/laboratory-api">Laboratory API</Link>
          <Link to="/appendix/grammar">Source grammar</Link>
        </div>
      </section>
    </>
  );
}
