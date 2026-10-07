import { parse, type Statement } from '@sicp/lab';
import { listItems, listNotation, parseValue, type Datum } from './pairs.ts';

/**
 * The complex numbers a program names (§2.4), read through the program's own
 * selectors. The scene cannot know whether `pair(3, 1)` is Ben's 3 + i or
 * Alyssa's number of magnitude 3, so it asks the program: it appends a probe
 * that applies `real_part` and `imag_part` to every top-level constant and
 * displays the answers together with the value as it is stored. Whatever the
 * representation (rectangular, polar, tagged, or a message-passing
 * function), the picture is the same; only the stored value differs.
 */

export type ComplexOp = 'add' | 'sub' | 'mul' | 'div';

/** A constant declared as an arithmetic operation on two other constants. */
export interface Derivation {
  op: ComplexOp;
  left: string;
  right: string;
}

export interface Candidate {
  name: string;
  via: Derivation | null;
}

export interface ComplexPoint extends Candidate {
  re: number;
  im: number;
  /** How the value is stored, in list notation, e.g. `pair("polar", pair(5, 0.93))`, or `fn[E1]`. */
  stored: string;
  /** True when the value is a function: a message-passing data object. */
  isFunction: boolean;
}

const OPS: Record<string, ComplexOp> = { add_complex: 'add', sub_complex: 'sub', mul_complex: 'mul', div_complex: 'div' };

/** The marker that starts each probe line. */
const MARK = 'complex-plane';

/** The top-level constants of a program, each with the operation it was made by, if any; null when the text does not parse. */
export function candidates(source: string): Candidate[] | null {
  let body: Statement[];
  try {
    body = parse(source).body;
  } catch {
    return null;
  }
  return body.flatMap((statement): Candidate[] => {
    if (statement.kind !== 'const') return [];
    const init = statement.init;
    let via: Derivation | null = null;
    if (init.kind === 'application' && init.fun.kind === 'name' && init.args.length === 2) {
      const op = OPS[init.fun.symbol];
      const [left, right] = init.args;
      if (op !== undefined && left?.kind === 'name' && right?.kind === 'name') via = { op, left: left.symbol, right: right.symbol };
    }
    return [{ name: statement.symbol, via }];
  });
}

/**
 * The program with a probe after it: for each candidate that could be a
 * complex number (a pair, or a function), one line of output holding its
 * name, real part, imaginary part and stored value.
 */
export function probeSource(source: string, names: readonly string[]): string {
  const probes = names.map(
    (name) =>
      `is_pair(${name}) || is_function(${name}) ? display(list("${MARK}", "${name}", real_part(${name}), imag_part(${name}), ${name})) : undefined;`,
  );
  return `${source}\n${probes.join('\n')}\n`;
}

const numberOf = (d: Datum | undefined): number | null => {
  if (d?.kind !== 'atom') return null;
  const n = Number(d.text);
  return d.text !== '' && Number.isFinite(n) ? n : null;
};

/** The complex numbers the probe reported, in the order they were declared. */
export function readProbe(output: readonly string[], found: readonly Candidate[]): ComplexPoint[] {
  const points: ComplexPoint[] = [];
  for (const line of output) {
    if (!line.startsWith(`["${MARK}"`)) continue;
    const datum = parseValue(line);
    const items = datum === null ? null : listItems(datum);
    if (items === null || items.length !== 5) continue;
    const [, nameItem, reItem, imItem, stored] = items;
    const name = nameItem?.kind === 'atom' ? nameItem.text.replace(/^"|"$/g, '') : '';
    const re = numberOf(reItem);
    const im = numberOf(imItem);
    const candidate = found.find((c) => c.name === name);
    if (candidate === undefined || re === null || im === null || stored === undefined) continue;
    points.push({
      ...candidate,
      re,
      im,
      stored: listNotation(stored),
      isFunction: stored.kind === 'atom' && /^(fn|primitive)\[/.test(stored.text),
    });
  }
  // An operation is drawn as one only when both of its operands are on the plane too.
  const named = new Set(points.map((p) => p.name));
  return points.map((p) => (p.via === null || (named.has(p.via.left) && named.has(p.via.right)) ? p : { ...p, via: null }));
}

/** A number for a caption: at most two decimals, and no "-0". */
export function short(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

/** A complex number as a reader writes it, e.g. `3 + i`, `2 − 4i`, `−i`, `0`. */
export function complexText(re: number, im: number): string {
  const r = short(re);
  const i = Number(short(im));
  const imagPart = (n: number): string => (n === 1 ? 'i' : `${short(n)}i`);
  if (i === 0) return r.replace('-', '−');
  if (r === '0') return (i < 0 ? `−${imagPart(-i)}` : imagPart(i));
  return `${r.replace('-', '−')} ${i < 0 ? '−' : '+'} ${imagPart(Math.abs(i))}`;
}

export const magnitudeOf = (p: { re: number; im: number }): number => Math.hypot(p.re, p.im);
export const angleOf = (p: { re: number; im: number }): number => Math.atan2(p.im, p.re);

const VERB: Record<ComplexOp, string> = { add: 'add_complex', sub: 'sub_complex', mul: 'mul_complex', div: 'div_complex' };

/** One sentence about a point: what it is, how it was made, and how it is stored. */
export function describe(p: ComplexPoint, points: readonly ComplexPoint[]): string {
  const value = complexText(p.re, p.im);
  const storage = p.isFunction
    ? `It is not a pair at all but a function, \`${p.stored}\`: asked for its real part, it answers ${short(p.re)}.`
    : `It is stored as \`${p.stored}\`.`;
  const left = points.find((q) => q.name === p.via?.left);
  const right = points.find((q) => q.name === p.via?.right);
  if (p.via !== null && left !== undefined && right !== undefined) {
    const call = `\`${p.name}\` is \`${VERB[p.via.op]}(${p.via.left}, ${p.via.right})\`, ${value}`;
    const [r1, r2, a1, a2] = [magnitudeOf(left), magnitudeOf(right), angleOf(left), angleOf(right)];
    switch (p.via.op) {
      case 'add':
        return `${call}: real parts add and imaginary parts add, so it closes the parallelogram on \`${left.name}\` and \`${right.name}\`. ${storage}`;
      case 'sub':
        return `${call}: the real parts and the imaginary parts are subtracted, so it is the arrow from \`${right.name}\` to \`${left.name}\`, moved to the origin. ${storage}`;
      case 'mul':
        return `${call}: magnitudes multiply (${short(r1)} × ${short(r2)} = ${short(r1 * r2)}) and angles add (${short(a1)} + ${short(a2)} = ${short(a1 + a2)}). ${storage}`;
      case 'div':
        return `${call}: magnitudes divide (${short(r1)} / ${short(r2)} = ${short(r1 / r2)}) and angles subtract (${short(a1)} − ${short(a2)} = ${short(a1 - a2)}). ${storage}`;
    }
  }
  return `\`${p.name}\` is ${value}: real part ${short(p.re)}, imaginary part ${short(p.im)}, magnitude ${short(magnitudeOf(p))}, angle ${short(angleOf(p))}. ${storage}`;
}
