import { useCallback, useEffect, useState } from 'react';
import { readStored, removeStored, writeStored } from './storage.ts';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'sicp.theme';
const ORDER: readonly ThemeMode[] = ['system', 'light', 'dark'];

function storedMode(): ThemeMode {
  const stored = readStored(KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** The theme follows the system unless forced; the override persists. */
export function useTheme(): { mode: ThemeMode; cycle: () => void } {
  const [mode, setMode] = useState<ThemeMode>(storedMode);

  useEffect(() => {
    const root = document.documentElement;
    // The boot script sets this before CSS loads; CSS owns it once React mounts.
    root.style.removeProperty('color-scheme');
    if (mode === 'system') {
      root.removeAttribute('data-theme');
      removeStored(KEY);
    } else {
      root.setAttribute('data-theme', mode);
      writeStored(KEY, mode);
    }
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? 'system');
  }, []);

  return { mode, cycle };
}
