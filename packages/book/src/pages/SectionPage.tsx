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

/**
 * The prose that opens a chapter or a numbered section, such as `5.1`, shown
 * on its landing page above the list of what it holds. Nothing when unwritten.
 */
export function Introduction({ id }: { id: string }) {
  const Content = contentFor(id);
  if (Content === null) return null;
  return (
    <SectionContext value={id}>
      <Suspense fallback={<p className="m-0 font-mono text-xs text-ink-3">loading introduction…</p>}>
        <div className="contents" data-testid="introduction">
          <Content components={mdxComponents} />
        </div>
      </Suspense>
    </SectionContext>
  );
}
