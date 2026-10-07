import { motion } from 'motion/react';
import { useMemo, useRef } from 'react';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Pill, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';
import { divisibilityTests, sieveCaption, sieveCascade } from './sieveCascade.ts';

/**
 * The cascade of filters that `sieve` builds, one per prime found. Each
 * keyframe sends the next candidate in from the left: it passes the filters
 * it is not a multiple of, and either a filter stops it, or it comes out of
 * the last one as a prime and becomes a filter itself. Drawn from the calls of
 * `is_divisible` in the trace.
 */

export interface SieveSceneProps {
  trace: Trace | null;
  title?: string;
}

/** Candidates drawn at most; the trace is cut long before the program ends anyway. */
const MAX_CANDIDATES = 30;
const GATE_W = 44;
const LEFT = 92;
const TOP = 30;
const GATE_H = 64;

export function SieveScene({ trace, title = 'The sieve as a cascade of filters' }: SieveSceneProps) {
  const sieve = useMemo(() => {
    if (trace === null) return null;
    const full = sieveCascade(divisibilityTests(trace.records), !trace.truncated);
    return { ...full, candidates: full.candidates.slice(0, MAX_CANDIDATES) };
  }, [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const count = sieve?.candidates.length ?? 0;
  const player = usePlayer(count, { stage, resetKey: trace, msPerStep: 1000 });
  const ease = useEase(0.6);

  if (sieve === null || count === 0) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : 'Keep the filter `x => ! is_divisible(x, head(stream))` in `sieve`: its calls of `is_divisible` are what is drawn.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No filters yet">
        <div />
      </SceneFrame>
    );
  }

  const k = player.index;
  const candidate = sieve.candidates[k];
  if (candidate === undefined) return null;
  const maxGates = Math.max(...sieve.candidates.map((c) => c.filters)) + 1;
  const gates = sieve.filters.slice(0, candidate.filters + (candidate.stoppedBy === null ? 1 : 0));
  const width = LEFT + maxGates * GATE_W + 110;
  const height = TOP + GATE_H + 92;
  const gateX = (i: number): number => LEFT + i * GATE_W + GATE_W / 2;
  const cy = TOP + GATE_H / 2;
  const stopIndex = candidate.stoppedBy === null ? -1 : gates.indexOf(candidate.stoppedBy);
  const outX = gateX(candidate.filters);
  const endX = stopIndex >= 0 ? gateX(stopIndex) : outX;
  const primes = sieve.filters.slice(0, gates.length);

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(sieveCaption(sieve, k))}>
      <div ref={stage}>
        <Stage width={width} height={height} label={`Sieve with ${gates.length} filters; candidate ${candidate.value}`} maxHeight={300}>
          <text x={8} y={cy - 18} fontSize={11} className="fill-ink-3">
            integers
          </text>
          <text x={8} y={cy - 5} fontSize={11} className="fill-ink-3">
            from {sieve.filters[0] ?? 2}
          </text>
          <line x1={8} y1={cy + 12} x2={width - 16} y2={cy + 12} className="stroke-line" strokeWidth={1.2} />
          {gates.map((p, i) => {
            const passed = candidate.passed.includes(p);
            const stopped = candidate.stoppedBy === p;
            const fresh = candidate.stoppedBy === null && i === gates.length - 1;
            const tone = stopped ? 'stroke-bad fill-bad-soft' : passed ? 'stroke-ok fill-ok-soft' : 'stroke-line fill-paper-2';
            return (
              <motion.g key={p} data-testid="sieve-filter" data-divisor={p} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={ease}>
                <rect x={gateX(i) - GATE_W / 2 + 5} y={TOP} width={GATE_W - 10} height={GATE_H} rx={6} className={tone} strokeWidth={fresh ? 2 : 1.2} strokeDasharray={fresh ? '4 3' : undefined} />
                <text x={gateX(i)} y={TOP - 8} textAnchor="middle" fontSize={11} className={stopped ? 'fill-bad' : 'fill-ink-2'}>
                  ÷{p}
                </text>
              </motion.g>
            );
          })}
          <motion.g key={candidate.value} initial={{ x: 40, opacity: 0 }} animate={{ x: endX, opacity: 1 }} transition={ease}>
            <circle cx={0} cy={cy + 12} r={13} className={candidate.stoppedBy === null ? 'fill-ok-soft stroke-ok' : 'fill-bad-soft stroke-bad'} strokeWidth={1.6} />
            <text x={0} y={cy + 12} textAnchor="middle" dominantBaseline="central" fontSize={11} className="fill-ink" data-testid="sieve-candidate">
              {candidate.value}
            </text>
          </motion.g>
          <text x={8} y={TOP + GATE_H + 34} fontSize={11} className="fill-ink-3">
            primes
          </text>
          {primes.map((p, i) => (
            <Pill
              key={p}
              x={LEFT + i * GATE_W + GATE_W / 2}
              y={TOP + GATE_H + 30}
              width={GATE_W - 6}
              height={24}
              text={String(p)}
              tone={candidate.stoppedBy === null && p === candidate.value ? 'focus' : 'value'}
              testId="sieve-prime"
            />
          ))}
          <text x={8} y={TOP + GATE_H + 74} fontSize={11} className="fill-ink-3">
            {`candidate ${k + 1} of ${count}: ${candidate.stoppedBy === null ? 'a new prime' : `stopped by ÷${candidate.stoppedBy}`}`}
          </text>
        </Stage>
      </div>
    </SceneFrame>
  );
}
