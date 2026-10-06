import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { useDuration } from '../hooks.ts';
import { TocList } from './TocList.tsx';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  current: string | null;
}

/** The table of contents below 980px: slides in from the left over a scrim. */
export function Drawer({ open, onClose, current }: DrawerProps) {
  const panel = useRef<HTMLElement>(null);
  const duration = useDuration();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const target =
      panel.current?.querySelector<HTMLElement>('[aria-current="page"]') ??
      panel.current?.querySelector<HTMLElement>('a');
    target?.focus();
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          data-testid="drawer-scrim"
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-ink/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration(0.22) }}
          onClick={onClose}
        />
      )}
      {open && (
        <motion.aside
          key="drawer"
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label="Contents"
          className="fixed top-14 bottom-0 left-0 z-[31] w-[min(320px,86vw)] overflow-y-auto border-r border-line bg-paper px-3 pt-5 pb-10 shadow-[0_20px_60px_color-mix(in_oklab,var(--color-ink)_25%,transparent)]"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: duration(0.22), ease: 'easeOut' }}
        >
          <TocList current={current} touch />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
