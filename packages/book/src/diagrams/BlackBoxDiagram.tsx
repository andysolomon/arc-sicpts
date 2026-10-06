import { motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import { monoWidth } from '../anim/model/layout.ts';
import { Arrow, Stage, useEase } from '../anim/svg.tsx';
import { innerFunctions, localNames, referencedNames, topLevelFunctions, tryParse } from './ast.ts';
import { Figure } from './Figure.tsx';

/**
 * Block structure as boxes within a box: the helpers declared inside a
 * function are hidden from the outside, and the names they use freely are
 * found in the enclosing function.
 */

export interface BlackBoxDiagramProps {
  source: string;
  caption?: ReactNode;
}

interface Inner {
  name: string;
  params: string[];
  /** Names used but not bound here, bound by the enclosing function. */
  free: string[];
}

interface Outer {
  name: string;
  params: string[];
  inner: Inner[];
}

export function blackBoxes(source: string): Outer[] {
  const program = tryParse(source);
  if (program === null) return [];
  return topLevelFunctions(program).map((fn) => {
    const outerLocals = localNames(fn.lambda);
    return {
      name: fn.symbol,
      params: [...fn.lambda.params],
      inner: innerFunctions(fn.lambda).map((inner) => {
        const bound = localNames(inner.lambda);
        const free = [...referencedNames(inner.lambda.body)].filter((name) => !bound.has(name) && outerLocals.has(name) && fn.lambda.params.includes(name));
        return { name: inner.symbol, params: [...inner.lambda.params], free };
      }),
    };
  });
}

const FONT = 12.5;

export function BlackBoxDiagram({ source, caption }: BlackBoxDiagramProps) {
  const boxes = useMemo(() => blackBoxes(source), [source]);
  const ease = useEase(0.5);
  const outer = boxes.find((box) => box.inner.length > 0) ?? boxes[0];

  if (outer === undefined) {
    return (
      <Figure title="Black boxes" provenance="drawn from the parsed program" caption={caption}>
        <div className="text-sm text-ink-3">Declare a function to draw it as a box.</div>
      </Figure>
    );
  }

  const innerW = 150;
  const innerH = 34;
  const gap = 14;
  const cols = Math.min(3, Math.max(1, outer.inner.length));
  const rows = Math.ceil(outer.inner.length / cols);
  const pad = 18;
  const headH = 32;
  const width = Math.max(300, pad * 2 + cols * innerW + (cols - 1) * gap) + 40;
  const boxW = width - 40;
  const boxH = headH + pad + rows * (innerH + gap) + (outer.inner.length === 0 ? 30 : 0) + 8;
  const height = boxH + 40;
  const x0 = 20;
  const y0 = 20;
  const paramLabel = `${outer.name}(${outer.params.join(', ')})`;
  const paramX = x0 + 12 + monoWidth(`${outer.name}(`, FONT);

  return (
    <Figure title="Black boxes" provenance="drawn from the parsed program" caption={caption}>
      <Stage width={width} height={height} label={`${outer.name} with its ${outer.inner.length} internal functions`}>
        <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.5 }} transition={ease}>
          <rect x={x0} y={y0} width={boxW} height={boxH} rx={10} className="fill-paper-2 stroke-ink-2" strokeWidth={1.4} />
          <text x={x0 + 12} y={y0 + headH / 2 + 2} dominantBaseline="central" fontSize={FONT + 1} className="fill-ink font-semibold">
            {paramLabel}
          </text>
          <text x={x0 + boxW - 12} y={y0 + headH / 2 + 2} dominantBaseline="central" textAnchor="end" fontSize={10.5} className="fill-ink-3">
            {outer.inner.length === 0 ? 'the whole box' : 'what the user sees'}
          </text>
        </motion.g>
        {outer.inner.map((inner, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const bx = x0 + pad + col * (innerW + gap) + (boxW - pad * 2 - (cols * innerW + (cols - 1) * gap)) / 2;
          const by = y0 + headH + pad + row * (innerH + gap);
          return (
            <motion.g
              key={inner.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ ...ease, delay: 0.15 + i * 0.1 }}
              style={{ originX: `${bx + innerW / 2}px`, originY: `${by + innerH / 2}px` }}
            >
              <rect x={bx} y={by} width={innerW} height={innerH} rx={7} className="fill-paper stroke-line" />
              <text x={bx + innerW / 2} y={by + innerH / 2} textAnchor="middle" dominantBaseline="central" fontSize={FONT} className="fill-ink">
                {inner.name}({inner.params.join(', ')})
              </text>
              {inner.free.map((name, j) => (
                <g key={name}>
                  <Arrow id={`${inner.name}-${name}`} from={[bx + 10 + j * 14, by]} to={[paramX + monoWidth(outer.params.join(', '), FONT) / 2, y0 + headH / 2 + 10]} tone="accent" opacity={0.8} />
                  <text x={bx + 10 + j * 14} y={by - 4} textAnchor="middle" fontSize={9.5} className="fill-accent-ink">
                    {name}
                  </text>
                </g>
              ))}
            </motion.g>
          );
        })}
        {outer.inner.length > 0 && (
          <text x={x0 + boxW / 2} y={y0 + boxH + 16} textAnchor="middle" fontSize={10.5} className="fill-ink-3">
            hidden inside: a free {outer.params.join(', ')} is found one frame out
          </text>
        )}
      </Stage>
    </Figure>
  );
}
