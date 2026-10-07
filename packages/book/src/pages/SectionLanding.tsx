import { Link } from 'react-router';
import { hasContent } from '../content.ts';
import { pathOf, type Chapter, type Section } from '../toc.ts';
import { PageHeader } from './parts.tsx';
import { Introduction } from './SectionPage.tsx';

/** A numbered section such as 1.2: its summary and the pages it holds. */
export function SectionLanding({ chapter, section }: { chapter: Chapter; section: Section }) {
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <PageHeader eyebrow={`§ ${section.id} · ${chapter.title}`} title={section.title} />
        <p className="m-0 mt-1 max-w-[62ch] text-lg leading-[1.55] text-pretty text-ink-2">{section.blurb}</p>
      </div>
      <Introduction id={section.id} />
      <ol className="m-0 flex list-none flex-col border-t border-line p-0">
        {section.subsections.map((subsection) => {
          const written = hasContent(subsection.id);
          return (
            <li key={subsection.id} className="border-b border-line">
              <Link
                to={pathOf(subsection.id)}
                className="grid min-h-11 grid-cols-[56px_1fr_auto] items-baseline gap-4 px-2 py-4 text-ink no-underline transition-colors hover:bg-paper-2 hover:no-underline"
              >
                <span className="font-mono text-[13px] text-ink-3">{subsection.id}</span>
                <span className="text-[19px] leading-[1.3] text-pretty">{subsection.title}</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-3">
                  <span className={`size-2 rounded-full ${written ? 'bg-ok' : 'bg-line'}`} />
                  {written ? 'live' : 'planned'}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
