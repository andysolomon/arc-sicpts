import { Navigate, Route, Routes, useLocation } from 'react-router';
import { ChapterLanding } from './pages/ChapterLanding.tsx';
import { FrontPage } from './pages/FrontPage.tsx';
import { PageHeader } from './pages/parts.tsx';
import { SectionLanding } from './pages/SectionLanding.tsx';
import { SectionPage } from './pages/SectionPage.tsx';
import { Shell } from './shell/Shell.tsx';
import { findPage, FRONT_PATH } from './toc.ts';

/** Every page the table of contents knows, chosen by path. */
function BookPage() {
  const { pathname } = useLocation();
  const page = findPage(pathname);

  if (page === null) {
    return (
      <>
        <PageHeader eyebrow="404" title="No such page" />
        <p className="m-0 text-lg leading-[1.65]">
          Nothing in the book lives at <code>{pathname}</code>. The table of contents lists every section.
        </p>
      </>
    );
  }

  switch (page.kind) {
    case 'front':
      return <FrontPage />;
    case 'chapter':
      return <ChapterLanding key={page.path} chapter={page.chapter} />;
    case 'section':
      return <SectionLanding chapter={page.chapter} section={page.section} />;
    case 'subsection':
      return (
        <SectionPage
          key={page.path}
          id={page.subsection.id}
          eyebrow={`§ ${page.subsection.id} · ${page.section.title}`}
          title={page.title}
        />
      );
    case 'appendix':
      return (
        <SectionPage
          key={page.path}
          id={`appendix/${page.appendix.slug}`}
          eyebrow={`Appendix ${page.appendix.letter}`}
          title={page.title}
        />
      );
  }
}

/** Routes: `/front`, `/:chapter`, `/:chapter/:section`, `/appendix/:slug`. */
export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Navigate to={FRONT_PATH} replace />} />
        <Route path="front" element={<BookPage />} />
        <Route path="appendix/:slug" element={<BookPage />} />
        <Route path=":chapter" element={<BookPage />} />
        <Route path=":chapter/:section" element={<BookPage />} />
        <Route path="*" element={<BookPage />} />
      </Route>
    </Routes>
  );
}
