import { motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import { monoWidth } from '../anim/model/layout.ts';
import { Stage, useEase } from '../anim/svg.tsx';
import { calledNames, isExpression, operators, topLevelFunctions, tryParse } from './ast.ts';
import { Figure } from './Figure.tsx';

/**
 * Who is built from whom: the program's top-level call at the top, the
 * functions it uses below it, and so on down to the primitives. Each layer
 * only sees the one directly under it.
 */

export interface LayersDiagramProps {
  source: string;
  caption?: ReactNode;
}

interface Layer {
  title: string;
  items: string[];
}

export function layers(source: string): { layers: Layer[]; edges: [string, string][] } {
  const program = tryParse(source);
  if (program === null) return { layers: [], edges: [] };
  const functions = new Map(topLevelFunctions(program).map((fn) => [fn.symbol, fn]));
  const calls = program.body.filter(isExpression);
  const entryText = calls.map((call) => source.slice(call.loc.start, call.loc.end).replace(/;$/, ''));
  const roots = calls.flatMap((call) => calledNames(call)).filter((name) => functions.has(name));

  const edges: [string, string][] = [];
  const depth = new Map<string, number>();
  const queue: [string, number][] = roots.map((name) => [name, 1]);
  while (queue.length > 0) {
    const [name, d] = queue.shift() as [string, number];
    if ((depth.get(name) ?? Number.POSITIVE_INFINITY) <= d) continue;
    depth.set(name, d);
    const fn = functions.get(name);
    if (fn === undefined) continue;
    for (const callee of calledNames(fn.lambda)) {
      if (functions.has(callee) && callee !== name) {
        edges.push([name, callee]);
        queue.push([callee, d + 1]);
      }
    }
  }
  const byDepth = new Map<number, string[]>();
  for (const [name, d] of depth) byDepth.set(d, [...(byDepth.get(d) ?? []), name]);
  const primitives = new Set<string>();
  for (const name of depth.keys()) {
    const fn = functions.get(name);
    if (fn === undefined) continue;
    for (const op of operators(fn.lambda)) primitives.add(op);
    for (const callee of calledNames(fn.lambda)) if (!functions.has(callee)) primitives.add(callee);
    if (!functions.has(name)) continue;
  }
  const maxDepth = Math.max(0, ...byDepth.keys());
  const result: Layer[] = [{ title: 'the program asks', items: entryText.length > 0 ? entryText : ['(no call)'] }];
  for (let d = 1; d <= maxDepth; d++) result.push({ title: d === 1 ? 'built from' : 'which is built from', items: byDepth.get(d) ?? [] });
  if (primitives.size > 0) result.push({ title: 'down to the primitives', items: [...primitives] });
  for (const name of depth.keys()) {
    const fn = functions.get(name);
    if (fn === undefined) continue;
    for (const op of operators(fn.lambda)) edges.push([name, op]);
    for (const callee of calledNames(fn.lambda)) if (!functions.has(callee)) edges.push([name, callee]);
  }
  for (const root of roots) edges.push([entryText[0] ?? '', root]);
  return { layers: result, edges };
}

const ROW = 64;
const PAD = 20;
const FONT = 12.5;

export function LayersDiagram({ source, caption }: LayersDiagramProps) {
  const model = useMemo(() => layers(source), [source]);
  const ease = useEase(0.5);
  const positions = new Map<string, { x: number; y: number; w: number }>();
  const width = 560;
  model.layers.forEach((layer, row) => {
    const widths = layer.items.map((item) => Math.max(34, monoWidth(item, FONT) + 22));
    const total = widths.reduce((a, b) => a + b, 0) + (widths.length - 1) * 16;
    let x = (width - total) / 2;
    layer.items.forEach((item, i) => {
      const w = widths[i] ?? 40;
      positions.set(item, { x: x + w / 2, y: PAD + row * ROW + 14, w });
      x += w + 16;
    });
  });
  const height = PAD * 2 + model.layers.length * ROW - 20;

  return (
    <Figure title="Layers of abstraction" provenance="drawn from the parsed program" caption={caption}>
      {model.layers.length === 0 ? (
        <div className="text-sm text-ink-3">The program does not parse.</div>
      ) : (
        <Stage width={width} height={height} label="Each function is built from the ones below it">
          {model.edges.map(([from, to], i) => {
            const a = positions.get(from);
            const b = positions.get(to);
            if (a === undefined || b === undefined) return null;
            return (
              <motion.line
                key={`${from}-${to}-${i}`}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ ...ease, delay: 0.1 + i * 0.05 }}
                x1={a.x}
                y1={a.y + 13}
                x2={b.x}
                y2={b.y - 13}
                className="stroke-ink-3"
                strokeWidth={1.2}
              />
            );
          })}
          {model.layers.map((layer, row) => (
            <g key={row}>
              <text x={8} y={PAD + row * ROW + 14} dominantBaseline="central" fontSize={10} className="fill-ink-3">
                {layer.title}
              </text>
              {layer.items.map((item, i) => {
                const p = positions.get(item);
                if (p === undefined) return null;
                const last = row === model.layers.length - 1;
                return (
                  <motion.g
                    key={item}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ ...ease, delay: row * 0.18 + i * 0.06 }}
                  >
                    <rect x={p.x - p.w / 2} y={p.y - 13} width={p.w} height={26} rx={7} className={last ? 'fill-paper stroke-line' : row === 0 ? 'fill-accent-soft stroke-accent' : 'fill-paper-2 stroke-line'} strokeDasharray={last ? '4 3' : undefined} />
                    <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={FONT} className={row === 0 ? 'fill-accent-ink' : 'fill-ink'}>
                      {item}
                    </text>
                  </motion.g>
                );
              })}
            </g>
          ))}
        </Stage>
      )}
    </Figure>
  );
}
