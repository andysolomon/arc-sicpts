import { Suspense } from 'react';
import { contentFor } from '../content.ts';
import { mdxComponents } from '../mdx/components.tsx';
import { SectionContext } from '../mdx/SectionContext.ts';
import { PageHeader, Unwritten } from './parts.tsx';

interface SectionPageProps {
  /** Content id: a subsection number or `appendix/<slug>`. */
  id: string;
  eyebrow: string;
  title: string;
}

/**
 * The template every section shares: eyebrow and title from the table of
 * contents, then the section's MDX, which supplies prose, examples, the
 * "under the hood" note, exercises and "what this enables", in that order.
 */
export function SectionPage({ id, eyebrow, title }: SectionPageProps) {
  const Content = contentFor(id);
  return (
    <SectionContext value={id}>
      <PageHeader eyebrow={eyebrow} title={title} />
      {Content === null ? (
        <Unwritten what={`“${title}”`} />
      ) : (
        <Suspense fallback={<p className="m-0 font-mono text-xs text-ink-3">loading section…</p>}>
          <Content components={mdxComponents} />
        </Suspense>
      )}
    </SectionContext>
  );
}
