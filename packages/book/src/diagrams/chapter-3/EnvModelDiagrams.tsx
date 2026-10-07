import { useId, useState, type ReactNode } from 'react';
import { Stage } from '../../anim/svg.tsx';
import { Figure } from '../Figure.tsx';

/**
 * SICP's first environment diagram (§3.2, figure 3.1): three frames, two of
 * which extend the third, and four environments pointing into them. The reader
 * picks an environment and a name, and the diagram walks the chain of frames
 * to the binding that answers, or to none.
 */

export interface SimpleFrame {
  id: 'I' | 'II' | 'III';
  bindings: [string, number][];
  parent: SimpleFrame['id'] | null;
}

export const simpleFrames: readonly SimpleFrame[] = [
  { id: 'I', bindings: [['x', 3], ['y', 5]], parent: null },
  { id: 'II', bindings: [['z', 6], ['x', 7]], parent: 'I' },
  { id: 'III', bindings: [['m', 1], ['y', 2]], parent: 'I' },
];

/** Which frame each environment starts at. */
export const simpleEnvironments = { A: 'II', B: 'III', C: 'I', D: 'I' } as const;

export type SimpleEnvironment = keyof typeof simpleEnvironments;

export interface SimpleLookup {
  /** Frames examined, first to last. */
  path: SimpleFrame['id'][];
  /** Frame whose binding answered, or `null` when the name is unbound. */
  found: SimpleFrame['id'] | null;
  value: number | null;
}

/** Look a name up as the environment model says: first frame with a binding wins. */
export function lookupSimple(environment: SimpleEnvironment, name: string): SimpleLookup {
  const path: SimpleFrame['id'][] = [];
  for (let id: SimpleFrame['id'] | null = simpleEnvironments[environment]; id !== null; ) {
    const frame = simpleFrames.find((f) => f.id === id);
    if (frame === undefined) break;
    path.push(frame.id);
    const binding = frame.bindings.find(([n]) => n === name);
    if (binding !== undefined) return { path, found: frame.id, value: binding[1] };
    id = frame.parent;
  }
  return { path, found: null, value: null };
}

const W = 132;
const HEAD = 24;
const ROW = 20;
const H = HEAD + 2 * ROW + 6;
const POS: Record<SimpleFrame['id'], { x: number; y: number }> = {
  I: { x: 194, y: 16 },
  II: { x: 70, y: 150 },
  III: { x: 318, y: 150 },
};

function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-ink-3">{label}</span>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={`rounded-md border px-2.5 py-1 font-mono text-[13px] ${option === value ? 'border-accent bg-accent-soft text-accent-ink' : 'border-line text-ink-2'}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function EnvModelSimpleDiagram({ caption }: { caption?: ReactNode }) {
  const [environment, setEnvironment] = useState<SimpleEnvironment>('A');
  const [name, setName] = useState('x');
  const result = lookupSimple(environment, name);
  const marker = `envmodel-simple-${useId().replace(/:/g, '')}`;
  const start = simpleEnvironments[environment];
  const verdict =
    result.found === null
      ? `${name} is unbound in environment ${environment}: frames ${result.path.join(', ')} have no binding for it.`
      : `In environment ${environment}, ${name} is ${result.value}: ${
          result.path.length === 1 ? `frame ${result.found} binds it` : `frame ${result.path.slice(0, -1).join(', ')} has no ${name}, so the search goes on to frame ${result.found}`
        }.${
          // Shadowing: a binding further out that this one hides.
          result.found !== 'I' && lookupSimple('C', name).found === 'I'
            ? ` Its binding shadows the ${name} of frame I.`
            : ''
        }`;
  const pointer = (env: SimpleEnvironment, at: { x: number; y: number }) => {
    const frame = POS[simpleEnvironments[env]];
    const active = env === environment;
    return (
      <g key={env} data-testid="simple-environment" data-active={active ? 'true' : undefined}>
        <text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize={13} className={active ? 'fill-accent-ink font-semibold' : 'fill-ink-2'}>
          {env}
        </text>
        <line
          x1={at.x + (at.x < frame.x ? 9 : -9)}
          y1={at.y}
          x2={at.x < frame.x ? frame.x - 2 : frame.x + W + 2}
          y2={at.y}
          className={active ? 'stroke-accent' : 'stroke-ink-3'}
          strokeWidth={active ? 2 : 1.2}
          markerEnd={`url(#${marker})`}
        />
      </g>
    );
  };
  return (
    <Figure
      title="A simple environment structure"
      provenance="after SICP figure 3.1"
      caption={
        <>
          <p data-testid="simple-verdict">{verdict}</p>
          {caption}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Choice label="environment" options={['A', 'B', 'C', 'D'] as const} value={environment} onChange={setEnvironment} />
        <Choice label="name" options={['x', 'y', 'z', 'm'] as const} value={name as 'x'} onChange={setName} />
      </div>
      <Stage width={520} height={240} label={`Three frames; looking up ${name} in environment ${environment}`}>
        <defs>
          <marker id={marker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 8 4 L 0 8 z" className="fill-ink-3" />
          </marker>
        </defs>
        {(['II', 'III'] as const).map((id) => {
          const from = POS[id];
          const to = POS.I;
          const x1 = from.x + W / 2;
          const x2 = id === 'II' ? to.x + 24 : to.x + W - 24;
          return (
            <path
              key={id}
              d={`M ${x1} ${from.y} C ${x1} ${from.y - 40}, ${x2} ${to.y + H + 40}, ${x2} ${to.y + H + 1}`}
              fill="none"
              className={result.path.includes(id) && result.path.includes('I') ? 'stroke-accent' : 'stroke-ink-3'}
              strokeWidth={result.path.includes(id) && result.path.includes('I') ? 2 : 1.2}
              markerEnd={`url(#${marker})`}
            />
          );
        })}
        {simpleFrames.map((frame) => {
          const { x, y } = POS[frame.id];
          const searched = result.path.includes(frame.id);
          const first = frame.id === start;
          return (
            <g key={frame.id} transform={`translate(${x} ${y})`} data-testid="simple-frame" data-frame={frame.id} data-searched={searched ? 'true' : undefined}>
              <rect width={W} height={H} rx={8} className={first ? 'fill-paper stroke-accent' : 'fill-paper stroke-line'} strokeWidth={first ? 2 : 1.2} opacity={searched ? 1 : 0.55} />
              <text x={10} y={HEAD / 2 + 2} dominantBaseline="central" fontSize={12} className="fill-ink-2 font-semibold">
                {frame.id}
              </text>
              {frame.bindings.map(([n, v], i) => {
                const hit = result.found === frame.id && n === name;
                return (
                  <g key={n} transform={`translate(0 ${HEAD + i * ROW})`}>
                    {hit && <rect x={4} y={1} width={W - 8} height={ROW - 2} rx={4} className="fill-accent-soft" />}
                    <text x={12} y={ROW / 2} dominantBaseline="central" fontSize={13} className={hit ? 'fill-accent-ink' : 'fill-ink'}>
                      {n}
                      <tspan className="fill-ink-3">: </tspan>
                      <tspan className="fill-num">{v}</tspan>
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
        {pointer('C', { x: 120, y: POS.I.y + 22 })}
        {pointer('D', { x: 120, y: POS.I.y + 50 })}
        {pointer('A', { x: 30, y: POS.II.y + H / 2 })}
        {pointer('B', { x: 490, y: POS.III.y + H / 2 })}
      </Stage>
    </Figure>
  );
}
