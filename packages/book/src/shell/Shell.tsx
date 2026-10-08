import { MotionConfig } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useMediaQuery } from '../hooks.ts';
import { useTheme } from '../theme.ts';
import { findPage, neighbours, sidebarPath } from '../toc.ts';
import { Drawer } from './Drawer.tsx';
import { Header } from './Header.tsx';
import { PrevNext } from './PrevNext.tsx';
import { ShortcutSheet } from './ShortcutSheet.tsx';
import { TocList } from './TocList.tsx';

const SearchDialog = lazy(() => import('./SearchDialog.tsx').then((module) => ({ default: module.SearchDialog })));

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]') !== null)
  );
}

export function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = findPage(location.pathname);
  const wide = useMediaQuery('(min-width: 980px)');
  const { mode, cycle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const current = page === null ? null : sidebarPath(page);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);

  // A new page starts at the top, with the drawer out of the way.
  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    document.title = page === null ? 'SICP JS' : `${page.title} · SICP JS`;
  }, [page]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || searchOpen || sheetOpen) return;
      if (event.key === '?') {
        event.preventDefault();
        setSheetOpen(true);
        return;
      }
      if (page === null || (event.key !== '[' && event.key !== ']')) return;
      const { previous, next } = neighbours(page);
      const target = event.key === '[' ? previous : next;
      if (target !== null) void navigate(target.path);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, page, searchOpen, sheetOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Header
          page={page}
          narrow={!wide}
          drawerOpen={drawerOpen}
          onToggleDrawer={() => setDrawerOpen((open) => !open)}
          menuButtonRef={menuButton}
          onSearch={() => setSearchOpen(true)}
          theme={mode}
          onCycleTheme={cycle}
        />
        <div className="flex min-h-0 flex-1">
          {wide && (
            <aside className="sticky top-14 h-[calc(100vh-56px)] w-[272px] flex-none overflow-y-auto border-r border-line bg-paper px-3 pt-5 pb-10">
              <TocList current={current} />
            </aside>
          )}
          <Drawer open={!wide && drawerOpen} onClose={closeDrawer} current={current} />
          <main
            id="main"
            tabIndex={-1}
            className="min-w-0 flex-1 px-[clamp(16px,4vw,48px)] pt-[clamp(24px,4vw,56px)] pb-24 outline-none"
          >
            <div className="mx-auto flex max-w-[880px] flex-col gap-10">
              <Outlet />
              {page !== null && <PrevNext page={page} />}
            </div>
          </main>
        </div>
        {searchOpen && <Suspense fallback={<span role="status" className="sr-only">Loading search…</span>}>
          <SearchDialog open onClose={() => setSearchOpen(false)} />
        </Suspense>}
        <ShortcutSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </div>
    </MotionConfig>
  );
}
