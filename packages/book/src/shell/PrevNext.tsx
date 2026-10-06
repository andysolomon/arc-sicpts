import { Link } from 'react-router';
import { neighbours, type Page } from '../toc.ts';

const card =
  'flex min-h-11 flex-col gap-1 rounded-lg border border-line bg-transparent px-4 py-3.5 text-ink no-underline transition-colors hover:bg-paper-2 hover:no-underline';
const label = 'font-mono text-[11px] text-ink-3';

export function PrevNext({ page }: { page: Page }) {
  const { previous, next } = neighbours(page);
  return (
    <nav
      aria-label="Section navigation"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3 border-t border-line pt-5"
    >
      {previous === null ? (
        <span />
      ) : (
        <Link to={previous.path} rel="prev" className={`${card} items-start text-left`}>
          <span className={label}>← previous</span>
          <span className="text-[15.5px]">{previous.title}</span>
        </Link>
      )}
      {next !== null && (
        <Link to={next.path} rel="next" className={`${card} items-end text-right`}>
          <span className={label}>next →</span>
          <span className="text-[15.5px]">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
