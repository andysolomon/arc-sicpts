import { Link } from 'react-router';
import { sectionStatus, type SectionStatus } from '../progress.ts';
import { exerciseCount, pathOf, type Chapter } from '../toc.ts';
import { PageHeader } from './parts.tsx';
import { Introduction } from './SectionPage.tsx';

const DOT: Record<SectionStatus, string> = {
  complete: 'bg-ok',
  'in progress': 'bg-accent',
  'not started': 'bg-line',
};

export function ChapterLanding({ chapter }: { chapter: Chapter }) {
  const pageCount = chapter.sections.reduce((n, section) => n + section.subsections.length, 0);
  const counts = chapter.sections.map(exerciseCount);
  const exercises = counts.every((n) => n !== null) ? counts.reduce<number>((a, n) => a + (n ?? 0), 0) : null;

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <PageHeader eyebrow={`Chapter ${chapter.id}`} title={chapter.title} />
        <p className="m-0 mt-1 text-lg leading-[1.55] text-ink-2">{chapter.blurb}</p>
        <div className="mt-1.5 flex flex-wrap gap-[18px] font-mono text-xs text-ink-3">
          <span>{chapter.sections.length} sections</span>
          <span>{pageCount} pages</span>
          {exercises !== null && <span>{exercises} exercises</span>}
          {chapter.readingTime !== null && <span>{chapter.readingTime}</span>}
        </div>
      </div>
      <Introduction id={chapter.id} />
      <ol className="m-0 flex list-none flex-col border-t border-line p-0">
        {chapter.sections.map((section) => {
          const status = sectionStatus(chapter, section);
          const count = exerciseCount(section);
          return (
            <li key={section.id} className="border-b border-line">
              <Link
                to={pathOf(section.id)}
                className="pressable grid w-full grid-cols-[56px_1fr_auto] items-start gap-4 px-2 py-5 text-left text-ink no-underline transition-colors hover:bg-paper-2 hover:no-underline max-[520px]:grid-cols-[40px_1fr]"
              >
                <span className="pt-1 font-mono text-[13px] text-ink-3">{section.id}</span>
                <span className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-[21px] leading-[1.3] font-medium">{section.title}</span>
                  <span className="text-[15px] leading-normal text-ink-2">{section.blurb}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {section.subsections.map((subsection) => (
                      <span
                        key={subsection.id}
                        className="rounded border border-line px-[7px] py-0.5 font-mono text-[11px] text-ink-2"
                      >
                        {subsection.id}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1.5 pt-1.5 font-mono text-[11px] text-ink-3 max-[520px]:col-start-2 max-[520px]:flex-row max-[520px]:gap-3 max-[520px]:pt-0">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${DOT[status]}`} />
                    {status}
                  </span>
                  {count !== null && <span>{count} exercises</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
