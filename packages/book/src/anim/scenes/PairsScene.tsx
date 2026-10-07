import { AnimatePresence, motion } from 'motion/react';
import { useId, useMemo, useRef } from 'react';
import { CELL, countPairs, layout, listNotation, PAIR_WIDTH, structuresOf, type Diagram } from '../model/pairs.ts';
import { usePlayer } from '../player.ts';
import { SceneFrame } from '../Scene.tsx';
import { FONT, inlineCode, Stage, useEase } from '../svg.tsx';
import type { Trace } from '../useTrace.ts';

/**
 * Box-and-pointer diagrams of the structures a program builds (§2.2.1): one
 * keyframe per top-level name bound to a pair, and one for the program's value.
 */

export interface PairsSceneProps {
  trace: Trace | null;
  title?: string;
}

const MARGIN = 14;

export function PairsScene({ trace, title = 'Box-and-pointer diagrams' }: PairsSceneProps) {
  const structures = useMemo(() => structuresOf(trace), [trace]);
  const stage = useRef<HTMLDivElement>(null);
  const player = usePlayer(structures.length, { stage, resetKey: trace, msPerStep: 1800 });
  const current = structures[player.index];
  const diagram = useMemo(() => (current === undefined ? null : layout(current.datum)), [current]);

  if (current === undefined || diagram === null) {
    const why =
      trace === null
        ? 'Tracing the program…'
        : trace.outcome.status === 'error'
          ? `The program stopped with an error: ${trace.outcome.error.message}`
          : 'Nothing to draw: declare a name at the top level whose value is a pair, or end the program with one.';
    return (
      <SceneFrame title={title} provenance="trace" caption={inlineCode(why)} empty="No pairs yet">
        <div />
      </SceneFrame>
    );
  }

  const pairs = countPairs(current.datum);
  const notation = listNotation(current.datum);
  const shown = notation.length > 90 ? `${notation.slice(0, 89)}…` : notation;
  const caption = `\`${current.label}\` is \`${shown}\`: ${pairs === 1 ? 'one pair' : `${pairs} pairs`}${
    diagram.clipped ? `, of which the first ${diagram.pairs.length} are drawn` : ''
  }. A slash is null, the end of a list.`;

  return (
    <SceneFrame title={title} provenance="trace" player={player} caption={inlineCode(caption)}>
      <div ref={stage} className="flex flex-col gap-2">
        <span data-testid="structure-label" className="font-mono text-[12.5px] text-ink-2">
          {current.label}
        </span>
        <PairsDiagram diagram={diagram} label={`Box-and-pointer diagram of ${current.label}`} keyPrefix={`${player.index}`} />
      </div>
      {structures.length > 1 && (
        <ol className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 font-mono text-[11.5px] text-ink-3" aria-label="Structures">
          {structures.map((s, i) => (
            <li key={i} className={i === player.index ? 'text-accent-ink' : i < player.index ? 'text-ink-2' : ''}>
              {s.label}
            </li>
          ))}
        </ol>
      )}
    </SceneFrame>
  );
}

interface PairsDiagramProps {
  diagram: Diagram;
  label: string;
  /** Changing this redraws the diagram from nothing. */
  keyPrefix?: string;
}

/** A laid-out diagram on its own stage; reusable by any scene that shows list structure. */
export function PairsDiagram({ diagram, label, keyPrefix = '' }: PairsDiagramProps) {
  const ease = useEase(0.35);
  const marker = `pair-arrow-${useId().replace(/:/g, '')}`;
  return (
    <Stage width={diagram.width + MARGIN * 2} height={diagram.height + MARGIN * 2} label={label} maxHeight={460}>
      <defs>
        <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-3" />
        </marker>
      </defs>
      <g transform={`translate(${MARGIN} ${MARGIN})`}>
        <AnimatePresence>
          {diagram.pointers.map((p, i) => (
            <motion.line
              key={`${keyPrefix}-pointer-${p.id}`}
              data-testid="pointer"
              x1={p.from[0]}
              y1={p.from[1]}
              x2={p.to[0]}
              y2={p.to[1]}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ ...ease, delay: Math.min(i * 0.03, 0.6) }}
              className="stroke-ink-3"
              strokeWidth={1.3}
              markerEnd={`url(#${marker})`}
            />
          ))}
          {diagram.pairs.map((p, i) => (
            <motion.g
              key={`${keyPrefix}-pair-${p.id}`}
              data-testid="pair"
              initial={{ opacity: 0, y: p.y - 6 }}
              animate={{ opacity: 1, y: p.y }}
              transition={{ ...ease, delay: Math.min(i * 0.03, 0.6) }}
            >
              <rect x={p.x} y={0} width={PAIR_WIDTH} height={CELL} className="fill-accent-soft stroke-accent" strokeWidth={1.4} />
              <line x1={p.x + CELL} y1={0} x2={p.x + CELL} y2={CELL} className="stroke-accent" strokeWidth={1.4} />
              {p.headNull ? <Slash x={p.x} /> : <circle cx={p.x + CELL / 2} cy={CELL / 2} r={2.6} className="fill-ink-2" />}
              {p.tailNull ? <Slash x={p.x + CELL} /> : <circle cx={p.x + CELL * 1.5} cy={CELL / 2} r={2.6} className="fill-ink-2" />}
            </motion.g>
          ))}
          {diagram.atoms.map((a) => (
            <motion.g
              key={`${keyPrefix}-atom-${a.id}`}
              data-testid="atom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={ease}
            >
              <rect x={a.x} y={a.y} width={a.width} height={CELL} rx={3} className="fill-paper stroke-num" strokeWidth={1.2} />
              <text x={a.x + a.width / 2} y={a.y + CELL / 2} textAnchor="middle" dominantBaseline="central" fontSize={FONT} className="fill-num">
                {a.text}
              </text>
            </motion.g>
          ))}
        </AnimatePresence>
      </g>
    </Stage>
  );
}

const Slash = ({ x }: { x: number }) => <line x1={x + 3} y1={CELL - 3} x2={x + CELL - 3} y2={3} className="stroke-accent" strokeWidth={1.4} />;
