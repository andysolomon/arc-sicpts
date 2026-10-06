import { motion, type Transition } from 'motion/react';
import { Fragment, type ReactNode } from 'react';
import { useDuration } from '../hooks.ts';

/** Shared SVG pieces and the one easing every scene uses. */

export function useEase(seconds = 0.45): Transition {
  const duration = useDuration();
  return { duration: duration(seconds), ease: [0.4, 0, 0.2, 1] };
}

export const NODE_HEIGHT = 26;
export const FONT = 12.5;

interface StageProps {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  /** Keep the drawing from growing past this height in CSS pixels. */
  maxHeight?: number;
}

/** A scalable drawing surface; its size follows the content it is given. */
export function Stage({ width, height, label, children, maxHeight = 420 }: StageProps) {
  return (
    <div className="flex justify-center overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="block h-auto overflow-visible font-mono"
        style={{ width: '100%', minWidth: Math.min(width, 480), maxWidth: width * 1.15, maxHeight }}
      >
        {children}
      </svg>
    </div>
  );
}

/** Turn `text with `code`` into text with mono spans. */
export function inlineCode(text: string): ReactNode {
  const parts = text.split('`');
  return parts.map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>));
}

export type Tone = 'plain' | 'focus' | 'value' | 'dim' | 'ok' | 'bad';

const TONE: Record<Tone, { box: string; text: string }> = {
  plain: { box: 'fill-paper-2 stroke-line', text: 'fill-ink' },
  focus: { box: 'fill-accent-soft stroke-accent', text: 'fill-accent-ink' },
  value: { box: 'fill-paper stroke-num', text: 'fill-num' },
  dim: { box: 'fill-paper-2 stroke-line', text: 'fill-ink-3' },
  ok: { box: 'fill-ok-soft stroke-ok', text: 'fill-ok' },
  bad: { box: 'fill-bad-soft stroke-bad', text: 'fill-bad' },
};

interface PillProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  text: string;
  tone?: Tone;
  opacity?: number;
  dashed?: boolean;
  fontSize?: number;
  /** Set when the pill is new, so it grows in. */
  enter?: boolean;
  testId?: string;
  strokeWidth?: number;
}

/** A labelled rounded box centred on (x, y) that glides to new positions. */
export function Pill({ x, y, width, height = NODE_HEIGHT, text, tone = 'plain', opacity = 1, dashed = false, fontSize = FONT, enter = true, testId, strokeWidth }: PillProps) {
  const ease = useEase();
  const styles = TONE[tone];
  return (
    <motion.g
      data-testid={testId}
      initial={enter ? { x, y, opacity: 0, scale: 0.8 } : false}
      animate={{ x, y, opacity, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={ease}
      style={{ originX: `${x}px`, originY: `${y}px` }}
    >
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={height / 2 > 8 ? 7 : height / 2}
        className={styles.box}
        strokeWidth={strokeWidth ?? (tone === 'focus' ? 2 : 1.2)}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      <text textAnchor="middle" dominantBaseline="central" fontSize={fontSize} className={styles.text}>
        {text}
      </text>
    </motion.g>
  );
}

interface EdgeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: 'line' | 'accent' | 'dim';
  dashed?: boolean;
  opacity?: number;
}

export function Edge({ x1, y1, x2, y2, tone = 'line', dashed = false, opacity = 1 }: EdgeProps) {
  const ease = useEase();
  return (
    <motion.line
      initial={false}
      animate={{ x1, y1, x2, y2, opacity }}
      transition={ease}
      className={tone === 'accent' ? 'stroke-accent' : tone === 'dim' ? 'stroke-line' : 'stroke-ink-3'}
      strokeWidth={tone === 'accent' ? 2 : 1.2}
      strokeDasharray={dashed ? '4 3' : undefined}
      strokeLinecap="round"
    />
  );
}

/** A curved connector ending in an arrowhead, for frame-to-parent and lookup arrows. */
export function Arrow({ from, to, tone = 'line', opacity = 1, id }: { from: [number, number]; to: [number, number]; tone?: 'line' | 'accent'; opacity?: number; id: string }) {
  const ease = useEase();
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const path = `M ${x1} ${y1} C ${x1 + dx * 0.5} ${y1}, ${x1 + dx * 0.5} ${y2}, ${x2} ${y2}`;
  const marker = `arrow-${tone}-${id}`;
  return (
    <>
      <defs>
        <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className={tone === 'accent' ? 'fill-accent' : 'fill-ink-3'} />
        </marker>
      </defs>
      <motion.path
        initial={false}
        animate={{ d: path, opacity }}
        transition={ease}
        fill="none"
        className={tone === 'accent' ? 'stroke-accent' : 'stroke-ink-3'}
        strokeWidth={tone === 'accent' ? 2 : 1.2}
        markerEnd={`url(#${marker})`}
      />
    </>
  );
}
