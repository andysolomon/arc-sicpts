import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/**
 * A modal built on the native dialog element, which supplies the focus trap,
 * Escape handling and focus restoration.
 */
export function Dialog({ open, onClose, label, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto mt-[12vh] w-[min(560px,calc(100vw-32px))] rounded-[10px] border border-line bg-paper p-0 text-ink"
    >
      {open && children}
    </dialog>
  );
}
