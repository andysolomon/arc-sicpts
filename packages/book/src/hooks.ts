import { useReducedMotion } from 'motion/react';
import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

/** Scale a duration in seconds to zero when the reader prefers reduced motion. */
export function useDuration(): (seconds: number) => number {
  const reduced = useReducedMotion() === true;
  return useCallback((seconds: number) => (reduced ? 0 : seconds), [reduced]);
}
