import { Link } from 'react-router';
import { appendices, chapters, FRONT_PATH, pathOf } from '../toc.ts';

interface TocListProps {
  /** Path of the row to mark as current. */
  current: string | null;
  /** Use 44px rows for touch. */
  touch?: boolean;
}

interface RowProps {
  number: string;
  title: string;
  to: string;
  head?: boolean;
  current: string | null;
  touch: boolean;
}

function Row({ number, title, to, head = false, current, touch }: RowProps) {
  const active = current === to;
  const tone = active ? 'bg-accent-soft text-accent-ink' : head ? 'text-ink' : 'text-ink-2';
  const weight = head ? 'font-semibold' : active ? 'font-medium' : 'font-normal';
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`pressable grid grid-cols-[40px_1fr] items-baseline gap-2 rounded-md text-left leading-[1.35] text-pretty no-underline transition-colors hover:bg-paper-2 hover:no-underline ${tone} ${weight} ${
        head ? 'px-2 pt-3.5 pb-1.5 text-[13.5px]' : 'px-2 py-[7px] text-[13px]'
      } ${touch ? 'min-h-11 content-center' : ''}`}
    >
      <span className="font-mono text-[11px] text-ink-3">{number}</span>
      <span>{title}</span>
    </Link>
  );
}

/** The whole book as one flat list: number | title. */
export function TocList({ current, touch = false }: TocListProps) {
  const shared = { current, touch };
  return (
    <nav aria-label="Table of contents" className="flex flex-col gap-0.5">
      <Row number="" title="Front matter" to={FRONT_PATH} head {...shared} />
      {chapters.map((chapter) => (
        <div key={chapter.id} className="flex flex-col gap-0.5">
          <Row number={chapter.id} title={chapter.title} to={pathOf(chapter.id)} head {...shared} />
          {chapter.sections.map((section) => (
            <Row key={section.id} number={section.id} title={section.title} to={pathOf(section.id)} {...shared} />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-[40px_1fr] gap-2 px-2 pt-3.5 pb-1.5 text-[13.5px] font-semibold leading-[1.35]">
        <span />
        <span>Appendices</span>
      </div>
      {appendices.map((appendix) => (
        <Row
          key={appendix.slug}
          number={appendix.letter}
          title={appendix.title}
          to={`/appendix/${appendix.slug}`}
          {...shared}
        />
      ))}
    </nav>
  );
}
