import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useMemo } from 'react';
import { useEase } from './svg.tsx';
import { find, ids, tokens, type Term, type TokenRole } from './model/substitution.ts';

/**
 * One expression of the substitution model as text whose pieces keep their
 * identity between rewrites, so a redex visibly collapses into its value and
 * the rest of the expression slides to make room.
 */

const ROLE: Record<TokenRole, string> = {
  num: 'text-num',
  str: 'text-str',
  bool: 'text-num',
  name: 'text-ink',
  op: 'text-ink-2',
  punct: 'text-ink-3',
  opaque: 'text-ink-3 italic',
};

interface TermLineProps {
  term: Term;
  /** The sub-term about to be rewritten, highlighted. */
  redex: number | null;
  /** Ids of terms that did not exist in the previous keyframe; they fade in. */
  fresh?: ReadonlySet<number>;
  size?: 'lg' | 'sm';
  dim?: boolean;
  layoutId: string;
  testId?: string;
}

export function TermLine({ term, redex, fresh, size = 'lg', dim = false, layoutId, testId }: TermLineProps) {
  const ease = useEase(0.4);
  const list = useMemo(() => tokens(term), [term]);
  const highlighted = useMemo(() => {
    if (redex === null) return new Set<number>();
    const target = find(term, redex);
    return target === null ? new Set<number>() : ids(target);
  }, [redex, term]);

  return (
    <LayoutGroup id={layoutId}>
      <div
        data-testid={testId}
        className={`flex flex-wrap items-baseline font-mono leading-[1.9] ${size === 'lg' ? 'text-[17px]' : 'text-[13px]'} ${dim ? 'opacity-45' : ''}`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((token) => {
            const hot = highlighted.has(token.id);
            return (
              <motion.span
                key={token.key}
                layout="position"
                initial={fresh?.has(token.id) === true ? { opacity: 0, scale: 0.7 } : { opacity: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={ease}
                data-hot={hot ? 'true' : undefined}
                className={`inline-block whitespace-pre px-[1px] ${ROLE[token.role]} ${
                  hot ? 'bg-accent-soft text-accent-ink first:rounded-l-[4px] last:rounded-r-[4px]' : ''
                }`}
              >
                {token.text}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

/** Ids present in `now` but not in `before`. */
export function freshIds(before: Term | null, now: Term): Set<number> {
  const current = ids(now);
  if (before === null) return current;
  const old = ids(before);
  return new Set([...current].filter((id) => !old.has(id)));
}
