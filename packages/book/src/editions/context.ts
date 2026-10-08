import { createContext, useContext, useEffect } from 'react';

/** Export rendering waits for the same Laboratory jobs used by the live book. */
export const EditionContext = createContext<{ pending: Set<symbol> } | null>(null);

export function useEditionPending(pending: boolean) {
  const edition = useContext(EditionContext);
  useEffect(() => {
    if (edition === null || !pending) return;
    const token = Symbol();
    edition.pending.add(token);
    return () => { edition.pending.delete(token); };
  }, [edition, pending]);
}
