import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { Stage } from '../anim/svg.tsx';
import { Figure } from './Figure.tsx';

/** How a page, the client, the worker and the machine pass messages. */
export function LabArchitectureDiagram({ caption }: { caption?: ReactNode }) {
  const reduced = useReducedMotion() === true;
  const boxes = [
    { id: 'page', x: 20, label: 'Book page', sub: 'editor · scenes · exercises' },
    { id: 'client', x: 190, label: 'LabClient', sub: 'numbers jobs, cancels' },
    { id: 'host', x: 360, label: 'Worker · LabHost', sub: 'run · trace · check' },
    { id: 'machine', x: 530, label: 'Machine', sub: 'steps + hooks' },
  ];
  const W = 140;
  const H = 46;
  const y = 40;
  const dot = (from: number, to: number, cy: number, delay: number, cls: string) =>
    reduced ? null : (
      <motion.circle
        r={3.5}
        cy={cy}
        className={cls}
        initial={{ cx: from, opacity: 0 }}
        animate={{ cx: [from, to], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, delay, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.2, ease: 'easeInOut' }}
      />
    );
  return (
    <Figure title="The Book and the Laboratory" provenance="the worker protocol" caption={caption}>
      <Stage width={700} height={150} label="Requests flow from the page to the machine; events flow back">
        {boxes.slice(0, -1).map((box, i) => {
          const next = boxes[i + 1];
          if (next === undefined) return null;
          return (
            <g key={box.id}>
              <line x1={box.x + W} y1={y + 14} x2={next.x} y2={y + 14} className="stroke-ink-3" strokeWidth={1.2} markerEnd="url(#lab-arrow)" />
              <line x1={next.x} y1={y + 32} x2={box.x + W} y2={y + 32} className="stroke-ink-3" strokeWidth={1.2} markerEnd="url(#lab-arrow)" />
              {dot(box.x + W, next.x, y + 14, i * 0.3, 'fill-accent')}
              {dot(next.x, box.x + W, y + 32, 1.1 + i * 0.3, 'fill-num')}
            </g>
          );
        })}
        <defs>
          <marker id="lab-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-3" />
          </marker>
        </defs>
        {boxes.map((box) => (
          <g key={box.id}>
            <rect x={box.x} y={y} width={W} height={H} rx={8} className={box.id === 'host' || box.id === 'machine' ? 'fill-paper-2 stroke-line' : 'fill-paper stroke-line'} strokeWidth={1.2} />
            <text x={box.x + W / 2} y={y + 18} textAnchor="middle" fontSize={12.5} className="fill-ink font-semibold">
              {box.label}
            </text>
            <text x={box.x + W / 2} y={y + 34} textAnchor="middle" fontSize={10} className="fill-ink-3">
              {box.sub}
            </text>
          </g>
        ))}
        <text x={20} y={118} fontSize={10.5} className="fill-accent-ink">
          → requests: run, trace, check, cancel
        </text>
        <text x={20} y={136} fontSize={10.5} className="fill-num">
          ← events: started, display, shape, done, error, budget-exhausted, cancelled, trace-done, check-done
        </text>
        <rect x={360} y={y + H + 10} width={310} height={1} className="fill-line" />
        <text x={515} y={y + H + 26} textAnchor="middle" fontSize={9.5} className="fill-ink-3">
          off the main thread, so a runaway program cannot freeze the page
        </text>
      </Stage>
    </Figure>
  );
}
