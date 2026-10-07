import type { DataPaths, Source } from '@sicp/lab';

/**
 * Where to draw a machine's data paths, in the manner of the book's figure
 * 5.1: registers in a row, the operations below them with their inputs coming
 * down from the registers, constants as small tags, and a button (a small ×)
 * on every path that can load a register.
 */

export interface Point {
  x: number;
  y: number;
}

export interface RegisterBox extends Point {
  name: string;
}

export interface OperationBox extends Point {
  id: string;
  op: string;
  test: boolean;
  /** Where each input enters, in order. */
  inputs: Point[];
}

export interface ConstantTag extends Point {
  id: string;
  text: string;
  kind: 'constant' | 'label';
}

export interface Wire {
  id: string;
  path: string;
  /** For button wires, the button's name and where to draw it. */
  button: { name: string; at: Point } | null;
  /** What the wire connects, for highlighting: a register, an operation id, or a button name. */
  from: string;
  to: string;
}

export interface DataPathLayout {
  width: number;
  height: number;
  registers: RegisterBox[];
  operations: OperationBox[];
  constants: ConstantTag[];
  wires: Wire[];
}

export const REG_W = 98;
export const REG_H = 40;
export const OP_W = 92;
export const OP_H = 30;
const SPACING = 128;
const PAD = 26;
const ROW_CONST = 22;
const ROW_REG = 96;
const ROW_OP_CONST = 182;
const ROW_OP = 236;
const BOTTOM = 312;

/** The most a picture of data paths can hold before it stops being readable. */
export const fitsDataPaths = (paths: DataPaths): boolean => paths.registers.length <= 8 && paths.operations.length <= 9;

const spread = (count: number, width: number): number[] =>
  Array.from({ length: count }, (_, i) => (count === 1 ? width / 2 : PAD + REG_W / 2 + (i * (width - 2 * PAD - REG_W)) / (count - 1)));

const sourceKey = (source: Source): string =>
  source.kind === 'reg' ? `reg:${source.name}` : source.kind === 'op' ? `op:${source.id}` : `${source.kind}:${source.kind === 'constant' ? source.text : source.name}`;

const curve = (a: Point, b: Point): string => {
  const my = (a.y + b.y) / 2;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${a.x.toFixed(1)} ${my.toFixed(1)}, ${b.x.toFixed(1)} ${my.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

/** A point on a cubic Bézier curve. */
function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

export function layoutDataPaths(paths: DataPaths): DataPathLayout {
  const columns = Math.max(paths.registers.length, paths.operations.length, 2);
  const width = Math.max(420, columns * SPACING + PAD * 2);
  const registers: RegisterBox[] = spread(paths.registers.length, width).map((x, i) => ({ name: paths.registers[i] ?? '', x, y: ROW_REG }));
  const regAt = new Map(registers.map((r) => [r.name, r]));

  const opXs = spread(paths.operations.length, width);
  const constants: ConstantTag[] = [];
  const constantAt = new Map<string, ConstantTag>();
  const tag = (source: Source, near: Point, row: number): ConstantTag => {
    const key = `${sourceKey(source)}@${row}:${Math.round(near.x)}`;
    let found = constantAt.get(key);
    if (found === undefined) {
      const text = source.kind === 'constant' ? source.text : source.kind === 'label' ? source.name : '';
      // Move right until the tag's text clears every tag already on its row.
      const half = (t: string): number => (Math.min(t.length, 14) * 6.4 + 14) / 2;
      let x = near.x;
      for (;;) {
        const clash = constants.find((c) => c.y === row && Math.abs(c.x - x) < half(c.text) + half(text));
        if (clash === undefined) break;
        x = clash.x + half(clash.text) + half(text) + 2;
      }
      found = { id: key, text, kind: source.kind === 'label' ? 'label' : 'constant', x, y: row };
      constants.push(found);
      constantAt.set(key, found);
    }
    return found;
  };

  const wires: Wire[] = [];
  const operations: OperationBox[] = paths.operations.map((node, i) => {
    const x = opXs[i] ?? width / 2;
    const n = node.inputs.length;
    const inputs = node.inputs.map((_, k) => ({ x: x + (n === 1 ? 0 : (k - (n - 1) / 2) * (node.test ? 16 : 26)), y: ROW_OP - (node.test ? 14 : OP_H / 2) }));
    node.inputs.forEach((input, k) => {
      const end = inputs[k] ?? { x, y: ROW_OP };
      if (input.kind === 'reg') {
        const reg = regAt.get(input.name);
        if (reg !== undefined) {
          wires.push({ id: `in-${node.id}-${k}`, path: curve({ x: reg.x + (k - (n - 1) / 2) * 10, y: reg.y + REG_H / 2 }, end), button: null, from: input.name, to: node.id });
        }
      } else {
        const constant = tag(input, { x: end.x + (k - (n - 1) / 2) * 18, y: ROW_OP_CONST }, ROW_OP_CONST);
        wires.push({ id: `in-${node.id}-${k}`, path: curve({ x: constant.x, y: constant.y + 9 }, end), button: null, from: constant.id, to: node.id });
      }
    });
    return { id: node.id, op: node.op, test: node.test, x, y: ROW_OP, inputs };
  });
  const opAt = new Map(operations.map((o) => [o.id, o]));

  // Buttons: one wire per way of loading a register.
  const buttonsInto = new Map<string, number>();
  for (const button of paths.buttons) {
    const target = regAt.get(button.target);
    if (target === undefined) continue;
    const k = buttonsInto.get(button.target) ?? 0;
    buttonsInto.set(button.target, k + 1);
    const { source } = button;
    if (source.kind === 'reg') {
      const from = regAt.get(source.name);
      if (from === undefined) continue;
      // An arc over the register row, from the source's top to the target's top.
      const a = { x: from.x + 14, y: from.y - REG_H / 2 };
      const b = { x: target.x - 14 + k * 8, y: target.y - REG_H / 2 };
      const lift = 30 + Math.min(40, Math.abs(b.x - a.x) / 8);
      const c1 = { x: a.x, y: a.y - lift };
      const c2 = { x: b.x, y: b.y - lift };
      wires.push({
        id: `b-${button.name}`,
        path: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
        button: { name: button.name, at: bezier(a, c1, c2, b, 0.5) },
        from: source.name,
        to: button.name,
      });
    } else if (source.kind === 'op') {
      const op = opAt.get(source.id);
      if (op === undefined) continue;
      // Out of the bottom of the operation, around, and into the bottom of the register.
      const a = { x: op.x, y: op.y + OP_H / 2 };
      const b = { x: target.x + 18 - k * 10, y: target.y + REG_H / 2 };
      const c1 = { x: a.x, y: BOTTOM };
      const c2 = { x: b.x + (b.x >= a.x ? 60 : -60), y: BOTTOM - 10 };
      wires.push({
        id: `b-${button.name}`,
        path: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
        button: { name: button.name, at: bezier(a, c1, c2, b, 0.78) },
        from: source.id,
        to: button.name,
      });
    } else {
      const constant = tag(source, { x: target.x - 30 + k * 20, y: ROW_CONST }, ROW_CONST);
      const a = { x: constant.x, y: constant.y + 9 };
      const b = { x: target.x - 24 + k * 16, y: target.y - REG_H / 2 };
      wires.push({
        id: `b-${button.name}`,
        path: curve(a, b),
        button: { name: button.name, at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (k % 2) * 14 } },
        from: constant.id,
        to: button.name,
      });
    }
  }

  const right = Math.max(width, ...constants.map((c) => c.x + Math.min(c.text.length, 14) * 3.2 + 16));
  return { width: right, height: BOTTOM + 8, registers, operations, constants, wires };
}
