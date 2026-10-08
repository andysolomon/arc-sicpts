import type { Ref } from 'react';
import { Link } from 'react-router';
import type { ThemeMode } from '../theme.ts';
import { FRONT_PATH, type Page } from '../toc.ts';
import { MenuIcon, MoonIcon, SearchIcon, SunIcon, SystemThemeIcon } from './icons.tsx';

interface HeaderProps {
  page: Page | null;
  narrow: boolean;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  menuButtonRef: Ref<HTMLButtonElement>;
  onSearch: () => void;
  theme: ThemeMode;
  onCycleTheme: () => void;
}

const NEXT_THEME: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };

/** The λ mark: a 28px accent square. */
export function Mark() {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 items-center justify-center rounded-md bg-accent font-mono text-[13px] font-semibold text-paper"
    >
      λ
    </span>
  );
}

export function Header(props: HeaderProps) {
  const { page, narrow, theme } = props;
  return (
    <header className="sticky top-0 z-20 flex h-(--shell-header-height) items-center gap-3 border-b border-line bg-paper/92 px-5 backdrop-blur-[10px]">
      {narrow && (
        <button
          ref={props.menuButtonRef}
          type="button"
          onClick={props.onToggleDrawer}
          aria-label="Contents"
          aria-expanded={props.drawerOpen}
          className="inline-flex size-11 items-center justify-center rounded-lg border border-line bg-transparent text-ink"
        >
          <MenuIcon />
        </button>
      )}
      <Link to={FRONT_PATH} className="pressable inline-flex items-center gap-2.5 text-ink no-underline hover:no-underline">
        <Mark />
        <span className="text-[17px] font-semibold tracking-[-0.01em] whitespace-nowrap">SICP JS</span>
      </Link>
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm whitespace-nowrap text-ink-2">
        {page !== null && (
          <>
            <span className="text-ink-3">/</span>
            <span className="font-mono text-[12.5px] text-accent-ink">{page.crumb}</span>
            <span className="truncate">{page.title}</span>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={props.onSearch}
        aria-label="Search"
        aria-keyshortcuts="Meta+K Control+K"
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-paper-2 px-3 text-[13px] text-ink-2 pointer-coarse:h-11"
      >
        <SearchIcon />
        <kbd className="rounded border border-line px-[5px] py-px text-[11px]">⌘K</kbd>
      </button>
      <button
        type="button"
        onClick={props.onCycleTheme}
        aria-label={`Theme: ${theme}. Switch to ${NEXT_THEME[theme]}.`}
        title={`Theme: ${theme}`}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-transparent text-ink-2 pointer-coarse:size-11"
      >
        {theme === 'system' ? <SystemThemeIcon /> : theme === 'light' ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
