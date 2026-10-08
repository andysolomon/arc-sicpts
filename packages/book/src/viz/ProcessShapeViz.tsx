import type { ProcessRun, ProcessShapeSnapshot } from '@sicp/lab';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Stack depth per step, one chart per top-level call. The component renders an
 * `inspect/processShape` snapshot and nothing else; it never runs code.
 */

export interface ProcessShapeVizProps {
  /** `null` until a run has produced a trace; a snapshot with no runs means the program made no calls. */
  snapshot: ProcessShapeSnapshot | null;
  /** Changes when a new run starts, so that its bars grow from the baseline again. */
  runKey?: number;
  /** The note under the charts. */
  children?: ReactNode;
}

export interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

const WIDTH = 320;
const BASELINE = 75;
const UNIT = 11;
const MAX_BARS = 64;

/** Reduce a long trace to at most `buckets` samples, keeping each bucket's peak. */
export function downsample(samples: readonly number[], buckets = MAX_BARS): number[] {
  if (samples.length <= buckets) return [...samples];
  const out: number[] = [];
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor((b * samples.length) / buckets);
    const to = Math.floor(((b + 1) * samples.length) / buckets);
    out.push(Math.max(...samples.slice(from, Math.max(to, from + 1))));
  }
  return out;
}

/** Bars 11px per depth unit with a 4px gap, shrinking only when they would not fit. */
export function layoutBars(samples: readonly number[]): Bar[] {
  const depths = downsample(samples);
  const n = depths.length;
  if (n === 0) return [];
  const gap = n <= 40 ? 4 : 1;
  const width = (WIDTH - gap * (n - 1)) / n;
  const unit = Math.min(UNIT, (BASELINE - 5) / Math.max(1, ...depths));
  const round = (value: number): number => Math.round(value * 10) / 10;
  return depths.map((depth, i) => ({
    x: round(i * (width + gap)),
    y: round(BASELINE - depth * unit),
    width: round(width),
    height: round(depth * unit),
    depth,
  }));
}

/** One sentence that says what the chart shows. */
export function describeRun(run: ProcessRun): string {
  const { samples, maxDepth } = run;
  const last = samples.at(-1);
  if (last === undefined) return 'No calls were made';
  if (samples.every((depth) => depth === maxDepth)) {
    return `Stack depth stays at ${maxDepth} for every step`;
  }
  const peak = samples.indexOf(maxDepth);
  const rises = samples.slice(0, peak + 1).every((depth, i, all) => i === 0 || depth >= (all[i - 1] ?? 0));
  const falls = samples.slice(peak).every((depth, i, all) => i === 0 || depth <= (all[i - 1] ?? 0));
  if (rises && falls) return `Stack depth grows to ${maxDepth} then shrinks to ${last}`;
  return `Stack depth varies between ${Math.min(...samples)} and ${maxDepth}`;
}

const depthWord = (run: ProcessRun): string => `${run.label} · ${run.kind} · max depth ${run.maxDepth}`;

function RunChart({ run }: { run: ProcessRun }) {
  const reduced = useReducedMotion() === true;
  const bars = layoutBars(run.samples);
  // Bars that were already on screen stay put; only new arrivals are staggered.
  const shown = useRef(0);
  const firstNew = Math.min(shown.current, bars.length);
  useEffect(() => {
    shown.current = bars.length;
  });
  const stagger = Math.min(0.03, 0.6 / Math.max(1, bars.length - firstNew));

  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-xs text-ink-2">{depthWord(run)}</span>
      <svg
        viewBox={`0 0 ${WIDTH} 76`}
        width="100%"
        role="img"
        aria-label={describeRun(run)}
        className="block overflow-visible"
      >
        <line x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE} className="stroke-line" />
        {bars.map((bar, i) => (
          <motion.rect
            key={i}
            data-depth={bar.depth}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            rx={2}
            className={run.kind === 'recursive' ? 'fill-accent' : 'fill-ok'}
            style={{ originY: 1 }}
            initial={reduced ? false : { scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.12, ease: 'easeOut', delay: Math.max(0, i - firstNew) * stagger }}
          />
        ))}
      </svg>
    </div>
  );
}

export function ProcessShapeViz({ snapshot, runKey = 0, children }: ProcessShapeVizProps) {
  const runs = snapshot?.runs ?? [];
  return (
    <section
      aria-label="Process shape"
      data-testid="process-shape"
      className="flex min-w-0 flex-col gap-3 rounded-[10px] border border-line bg-paper px-4 py-3.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-[15px] font-semibold">Process shape</h3>
        <span className="font-mono text-[11px] text-ink-3">stack depth · per step</span>
      </div>
      {runs.length === 0 ? (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-ink-3">
            {snapshot === null ? 'no trace yet · run the program' : 'no function calls in this run'}
          </span>
          <svg viewBox={`0 0 ${WIDTH} 76`} width="100%" aria-hidden className="block">
            <line x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE} className="stroke-line" />
          </svg>
        </div>
      ) : (
        <div key={runKey} className="flex flex-col gap-3.5">
          {runs.map((run, i) => (
            <RunChart key={i} run={run} />
          ))}
        </div>
      )}
      {children !== undefined && (
        <div className="text-sm leading-normal text-ink-2 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[0.9em]">
          {children}
        </div>
      )}
      {runs.length > 0 && (
        <details className="font-mono text-[11px] text-ink-3">
          <summary>as text</summary>
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1.5 p-0">
            {runs.map((run, i) => (
              <li key={i}>
                {depthWord(run)} · {run.calls} calls · depths: {run.samples.join(' ')}
                {run.truncated ? ' … (trace truncated)' : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
