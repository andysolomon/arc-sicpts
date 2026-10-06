import { Link } from 'react-router';
import { REPO_URL, SOURCE_BOOK_URL } from '../config.ts';
import { ChevronIcon } from '../shell/icons.tsx';
import { Eyebrow } from './parts.tsx';

const PILLARS: readonly (readonly [title: string, text: string])[] = [
  ['Read', 'Original prose for all five chapters, each section tracing the problem, the abstraction, and what it connects to.'],
  ['Run', 'Editors execute in a worker with a step budget. Nothing you type can freeze the page. Edits persist per section and encode into the URL.'],
  ['Inspect', 'Diagrams are generated from real Laboratory state, never drawn by hand. If a frame is on screen, it exists.'],
  ['Prove', 'Exercises ship with hidden checks. Interpreted and compiled runs are compared side by side in Chapter 5.'],
];

export function FrontPage() {
  return (
    <>
      <div className="flex flex-col gap-3 pt-6">
        <Eyebrow>An interactive book</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,6vw,64px)] leading-[1.05] font-medium tracking-[-0.02em] text-pretty">
          Structure and Interpretation of Computer Programs,{' '}
          <em className="text-ink-2 italic">rewritten in TypeScript</em>
        </h1>
        <p className="m-0 mt-2 max-w-[60ch] text-xl leading-normal text-pretty text-ink-2">
          Every section’s explanation sits beside live, editable code and a view into the machinery that runs
          it: environments, streams, registers, the heap, instruction sequences.
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link
            to="/1"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-[18px] text-[15px] font-semibold text-paper no-underline hover:no-underline"
          >
            Start Chapter 1 <ChevronIcon />
          </Link>
          <Link
            to="/5/5.2"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-[18px] text-[15px] text-ink no-underline transition-colors hover:bg-paper-2 hover:no-underline"
          >
            Jump to the register machine
          </Link>
        </div>
      </div>

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
          Henz and Wrigstad (MIT Press), licensed CC BY-SA 4.0. The explanations here are original. Short code
          excerpts are adapted with attribution. The companion engine, the Laboratory, is MIT licensed.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href={SOURCE_BOOK_URL}>sicp.sourceacademy.org</a>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>
          <a href={`${REPO_URL}/blob/main/LICENSE`}>LICENSE</a>
          <Link to="/appendix/laboratory-api">Laboratory API</Link>
          <Link to="/appendix/grammar">Source grammar</Link>
        </div>
      </section>
    </>
  );
}
