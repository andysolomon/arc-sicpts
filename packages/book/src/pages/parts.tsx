import type { ReactNode } from 'react';

/** The uppercase mono label above a page title. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-[0.08em] text-accent-ink uppercase">{children}</span>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="m-0 text-[clamp(2rem,1.5rem+2vw,3.125rem)] leading-[1.1] font-medium tracking-[-0.02em]">
      {children}
    </h1>
  );
}

export function PageHeader({ eyebrow, title }: { eyebrow: ReactNode; title: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <PageTitle>{title}</PageTitle>
    </div>
  );
}

/** Shown where prose will go, for sections that are in the contents but not yet written. */
export function Unwritten({ what }: { what: string }) {
  return (
    <p className="m-0 rounded-[10px] border border-dashed border-line px-5 py-[18px] text-[17px] leading-[1.6] text-ink-2">
      {what} has not been written yet. The book is delivered in increments; Chapter 1 up to §1.2.1 is
      complete, and the rest follows in reading order.
    </p>
  );
}
