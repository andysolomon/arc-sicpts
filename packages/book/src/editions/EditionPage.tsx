import { useShape } from '../anim/useShape.ts';
import { ProcessShapeViz } from '../viz/ProcessShapeViz.tsx';
import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Animation, type AnimationProps } from '../anim/Animation.tsx';
import { contentFor } from '../content.ts';
import { mdxComponents } from '../mdx/components.tsx';
import { exerciseFor } from '../mdx/exerciseCatalog.ts';
import { SectionContext } from '../mdx/SectionContext.ts';
import { pages } from '../toc.ts';
import { EditionContext } from './context.ts';

function Listing({ source, label }: { source: string; label: string }) {
  return <div className="edition-listing"><p className="edition-listing-label">{label}</p><pre><code>{source}</code></pre></div>;
}

function ShapeDiagram({ source, budget }: { source: string; budget?: number }) {
  const { shape } = useShape(source, budget === undefined ? {} : { budget });
  return <ProcessShapeViz snapshot={shape?.snapshot ?? null} />;
}

function Example({ file, source, anim, prelude, special, start, children, viz, budget }: {
  file: string; source: string; viz?: 'processShape'; budget?: number; anim?: AnimationProps['kind']; prelude?: string; special?: string; start?: number; children?: ReactNode;
}) {
  return <div className="edition-example">
    <Listing source={source} label={file} />
    {viz === 'processShape' && <ShapeDiagram source={source} {...(budget !== undefined && { budget })} />}
    {anim !== undefined && <Animation kind={anim} source={source} prelude={prelude} special={special} start={start} />}
    {children && <div className="edition-note">{children}</div>}
  </div>;
}

const exercises = new Map<string, LazyExoticComponent<ComponentType<{ answer?: boolean }>>>();
function Exercise({ id, children }: { id: string; children: ReactNode }) {
  let Content = exercises.get(id);
  if (Content === undefined) {
    Content = lazy(async () => {
      const spec = await exerciseFor(id);
      return { default: ({ answer }: { answer?: boolean }) => <Listing source={answer ? spec.solution : spec.starter} label={`Exercise ${id} ${answer ? 'reference solution' : 'starter'}`} /> };
    });
    exercises.set(id, Content);
  }
  return <section className="edition-exercise">
    <h3>Exercise {id}</h3>
    <Suspense fallback={<p data-edition-loading>Loading exercise…</p>}><Content /></Suspense>
    {children}
    <Suspense fallback={<p data-edition-loading>Loading reference solution…</p>}><Content answer /></Suspense>
  </section>;
}

const components = {
  ...mdxComponents,
  Example,
  Exercise,
  Solution: ({ children }: { children: ReactNode }) => <div className="edition-solution">{children}</div>,
};

/** One manuscript section at a time keeps export memory and worker use bounded. */
export function EditionPage() {
  const [params] = useSearchParams();
  const id = params.get('section') ?? '1';
  const page = pages.find((candidate) => candidate.crumb === id || (candidate.kind === 'chapter' && candidate.chapter.id === id) || (candidate.kind === 'appendix' && `appendix/${candidate.appendix.slug}` === id));
  const Content = contentFor(id);
  const edition = useMemo(() => ({ pending: new Set<symbol>() }), [id]);
  useEffect(() => {
    const state = window as unknown as { editionPending: () => number };
    state.editionPending = () => edition.pending.size;
  }, [edition]);
  return <MotionConfig reducedMotion="always">
    <EditionContext value={edition}>
      <SectionContext value={id}>
        <article className="edition-render" data-section={id}>
          <h1>{id} {page?.title ?? id}</h1>
          {Content === null ? <p>No manuscript for this section yet.</p> :
            <Suspense fallback={<p data-edition-loading>Loading section…</p>}><Content components={components} /></Suspense>}
        </article>
      </SectionContext>
    </EditionContext>
  </MotionConfig>;
}
