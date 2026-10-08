import type { ReactNode } from 'react';

/** A diagram with its caption, in the same frame the animations use. */
export function Figure({ title, provenance, caption, children }: { title: string; provenance?: string; caption?: ReactNode; children: ReactNode }) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-3 rounded-[10px] border border-line bg-paper px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[15px] font-semibold">{title}</span>
        {provenance !== undefined && <span className="font-mono text-[11px] text-ink-3">{provenance}</span>}
      </div>
      {children}
      {caption !== undefined && (
        <figcaption className="text-[14.5px] leading-snug text-ink-2 [&_code]:rounded [&_code]:bg-paper-2 [&_code]:px-1 [&_code]:py-px [&_code]:text-[0.9em] [&_code]:text-ink [&_p]:m-0">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
