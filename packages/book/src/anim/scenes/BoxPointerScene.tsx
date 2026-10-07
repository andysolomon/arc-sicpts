import type { HeapValue } from '@sicp/lab';
import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useRef, type ReactNode } from 'react';
import {
  BOX_H,
  BOX_W,
  boxPointerFrames,
  CELL,
  cellText,
  type BoxPointerLayout,
} from '../model/boxPointer.ts';
import { keyframeAt } from '../model/tree.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Box-and-pointer diagrams of the program's pairs, one keyframe per top-level
 * statement (§3.3). A pair is a box of two cells; an arrow leaves a cell that
 * holds a pair; a slash is `null`. Shared pairs are drawn once, cycles loop
 * back, and a cell that a statement changed is lit.
 */

export interface BoxPointerSceneProps {
  trace: Trace | null;
  title?: string;
  /** For step-mode editors: the stepper's record index. */
  stepIndex?: number | undefined;
}

export function BoxPointerScene({ trace, title = 'Box-and-pointer diagram', stepIndex }: BoxPointerSceneProps) {
  const frames = useMemo(() => boxPointerFrames(trace?.heap), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(frames.length, { stage, resetKey: trace, autoplay: stepIndex === undefined });
  const index = stepIndex === undefined ? player.index : keyframeAt(frames, stepIndex);
  const frame = frames[index];

  if (trace === null) {
    return <SceneFrame title={title} provenance="trace" caption="Tracing the program…" empty="Tracing…"><div /></SceneFrame>;
  }
  if (frame === undefined) {
    const caption = trace.outcome.status === 'error' ? `The program stopped: ${trace.outcome.error.message}` : 'Write a statement that makes a pair to draw it.';
    return <SceneFrame title={title} provenance="trace" caption={caption} empty="No pairs to draw"><div /></SceneFrame>;
  }

  let caption = frame.caption;
  if (index === frames.length - 1 && trace.outcome.status === 'error') caption += ` Then the program stopped: ${trace.outcome.error.message}`;
  if (index === frames.length - 1 && trace.outcome.status === 'budget-exhausted') caption += ' Then the trace ran out of steps.';
  if (stepIndex !== undefined && stepIndex < frame.at) caption = `Press step above. ${caption}`;

  return (
    <SceneFrame
      title={title}
      provenance={stepIndex === undefined ? 'trace' : 'stepper'}
      player={stepIndex === undefined ? player : undefined}
      caption={inlineCode(caption)}
      step={index}
    >
      <div ref={stage}>
        <BoxPointerDrawing layout={frame.layout} added={frame.added} changed={frame.changed} label={`${frame.layout.boxes.length} pairs after ${frame.snapshot.node?.text ?? 'the program'}`} />
      </div>
    </SceneFrame>
  );
}

interface DrawingProps {
  layout: BoxPointerLayout;
  label: string;
  added?: ReadonlySet<number>;
  changed?: ReadonlySet<string>;
  maxHeight?: number;
  /** Fade new pairs and pointers in; off for still diagrams. */
  enter?: boolean;
}

/** The SVG itself, shared with the static `BoxPointerDiagram`. */
export function BoxPointerDrawing({ layout, label, added = new Set(), changed = new Set(), maxHeight = 460, enter = true }: DrawingProps) {
  const ease = useEase();
  const marker = `bp-arrow-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const lit = `${marker}-lit`;
  const othersY = layout.height - 12;
  return (
    <Stage width={layout.width} height={layout.height} label={label} maxHeight={maxHeight}>
      <defs>
        <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-2" />
        </marker>
        <marker id={lit} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className="fill-accent" />
        </marker>
      </defs>
      <AnimatePresence>
        {layout.pointers.map((pointer) => {
          const hot = changed.has(pointer.key);
          return (
            <motion.path
              key={pointer.key}
              data-testid="pointer"
              data-pointer={pointer.key}
              initial={enter ? { d: pointer.d, opacity: 0 } : false}
              animate={{ d: pointer.d, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={ease}
              fill="none"
              className={hot ? 'stroke-accent' : 'stroke-ink-2'}
              strokeWidth={hot ? 2 : 1.3}
              markerEnd={`url(#${hot ? lit : marker})`}
            />
          );
        })}
      </AnimatePresence>
      <AnimatePresence>
        {layout.boxes.map((box) => (
          <motion.g
            key={box.id}
            data-testid="pair"
            data-pair={box.id}
            data-new={added.has(box.id) ? '' : undefined}
            initial={enter ? { x: box.x, y: box.y, opacity: 0, scale: 0.85 } : false}
            animate={{ x: box.x, y: box.y, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={ease}
          >
            <rect width={BOX_W} height={BOX_H} rx={3} className={added.has(box.id) ? 'fill-accent-soft stroke-accent' : 'fill-paper stroke-ink-2'} strokeWidth={1.3} />
            <Cell value={box.head} x={0} hot={changed.has(`${box.id}:head`)} testId="head" />
            <Cell value={box.tail} x={CELL} hot={changed.has(`${box.id}:tail`)} testId="tail" />
            <line x1={CELL} y1={0} x2={CELL} y2={BOX_H} className="stroke-ink-2" strokeWidth={1.3} />
          </motion.g>
        ))}
      </AnimatePresence>
      {layout.names.map((name) => (
        <text
          key={`n-${name.target}`}
          data-testid="pair-name"
          x={name.x}
          y={name.y}
          textAnchor="end"
          dominantBaseline={name.side === 'left' ? 'central' : 'auto'}
          fontSize={12}
          className="fill-accent-ink font-semibold"
        >
          {name.names.join(', ')}
        </text>
      ))}
      {layout.others.length > 0 && (
        <text x={14} y={othersY} fontSize={11.5} className="fill-ink-3" data-testid="other-bindings">
          {layout.others.map((other, i) => (
            <tspan key={other.name}>
              {i > 0 ? ' · ' : ''}
              {other.name}: <tspan className="fill-num">{other.text}</tspan>
            </tspan>
          ))}
        </text>
      )}
    </Stage>
  );
}

function Cell({ value, x, hot, testId }: { value: HeapValue; x: number; hot: boolean; testId: string }): ReactNode {
  // An atom too long for its cell hangs underneath on a short pointer, as SICP draws them.
  const long = value.kind === 'atom' && value.text.length > 5;
  const text = long ? null : cellText(value);
  const tone = hot ? 'fill-accent-ink' : value.kind === 'function' ? 'fill-ink-2' : 'fill-num';
  return (
    <g transform={`translate(${x} 0)`} data-testid={testId} data-kind={value.kind}>
      {hot && <rect x={2} y={2} width={CELL - 4} height={BOX_H - 4} rx={2} className="fill-accent-soft" />}
      {(value.kind === 'pair' || long) && <circle cx={CELL / 2} cy={BOX_H / 2} r={3} className={hot ? 'fill-accent' : 'fill-ink-2'} />}
      {value.kind === 'null' && <line x1={CELL - 3} y1={3} x2={3} y2={BOX_H - 3} className={hot ? 'stroke-accent' : 'stroke-ink-2'} strokeWidth={1.3} />}
      {text !== null && (
        <text x={CELL / 2} y={BOX_H / 2} textAnchor="middle" dominantBaseline="central" fontSize={11} className={tone}>
          {text}
        </text>
      )}
      {long && (
        <>
          <line x1={CELL / 2} y1={BOX_H / 2} x2={CELL / 2} y2={BOX_H + 9} className={hot ? 'stroke-accent' : 'stroke-ink-2'} strokeWidth={1.1} />
          <text x={CELL / 2} y={BOX_H + 19} textAnchor="middle" fontSize={10.5} className={tone}>
            {cellText(value, 14)}
          </text>
        </>
      )}
    </g>
  );
}
