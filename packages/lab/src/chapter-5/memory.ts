import { evaluate, prepare } from '../evaluator/evaluate.ts';
import { isClosure, isLabel, isPair, isPrimitive, type Pair, type Value } from '../evaluator/values.ts';
import { RegisterMachine } from '../machines/registerMachine.ts';

/**
 * Section 5.3: list structure as two vectors, `the_heads` and `the_tails`,
 * holding typed pointers, and the stop-and-copy garbage collector that the
 * book writes in the register-machine language.
 *
 * A program's pairs are laid out in the order the program allocated them, as
 * a `free` pointer that only moves forward would place them. Its names are the
 * roots: just before collecting, the values of all its names are put in a
 * list that `root` points at, as the book does with the machine's registers.
 */

/** `p3` (a pair at index 3), `n4` (the number 4), `e0` (the empty list), and so on. */
export type Pointer = string;

export interface MemoryImage {
  heads: Pointer[];
  tails: Pointer[];
  /** The next free index. */
  free: number;
  /** The program's names and the pointers they hold. */
  names: { name: string; pointer: Pointer }[];
  /** Where the list of roots starts, once one has been built. */
  root: Pointer | null;
}

export const BROKEN_HEART = 'broken_heart';

function pointerOf(value: Value, index: Map<Pair, number>): Pointer {
  if (value === null) return 'e0';
  if (typeof value === 'number') return `n${value}`;
  if (typeof value === 'boolean') return `b${value ? 1 : 0}`;
  if (value === undefined) return 'u';
  if (typeof value === 'string') return `s${JSON.stringify(value)}`;
  if (isPair(value)) return `p${index.get(value) ?? '?'}`;
  if (isClosure(value) || isPrimitive(value) || isLabel(value)) return 'f';
  return '?';
}

export interface ImageResult {
  image: MemoryImage | null;
  error: string | null;
}

/** Run a program, recording every pair it allocates, and lay its pairs out in memory. */
export function memoryImage(source: string, { start = 0, budget = 200_000 } = {}): ImageResult {
  const allocated: Pair[] = [];
  let machine;
  try {
    machine = prepare(source, { budget, onPair: (pair) => allocated.push(pair) }).machine;
  } catch (error) {
    return { image: null, error: error instanceof Error ? error.message : String(error) };
  }
  const status = machine.run();
  if (status === 'error') return { image: null, error: machine.error?.message ?? 'error' };
  if (status !== 'done') return { image: null, error: 'the program ran out of steps' };
  // The program's names, in order of declaration, with their final values.
  const bindings = [...machine.programEnv.frame.bindings].map(([name, binding]) => ({ name, value: binding.value }));
  // The pairs, in order of allocation, then any pair the program reached some other way.
  const index = new Map<Pair, number>();
  const cells: Pair[] = [];
  const place = (pair: Pair): void => {
    if (index.has(pair)) return;
    index.set(pair, start + cells.length);
    cells.push(pair);
  };
  for (const pair of allocated) place(pair);
  const reach = (value: Value): void => {
    if (!isPair(value) || index.has(value)) return;
    place(value);
    reach(value[0]);
    reach(value[1]);
  };
  for (const { value } of bindings) reach(value);
  const heads: Pointer[] = Array.from({ length: start }, () => '');
  const tails: Pointer[] = Array.from({ length: start }, () => '');
  for (const pair of cells) {
    heads.push(pointerOf(pair[0], index));
    tails.push(pointerOf(pair[1], index));
  }
  return {
    image: {
      heads,
      tails,
      free: start + cells.length,
      names: bindings.map(({ name, value }) => ({ name, pointer: pointerOf(value, index) })),
      root: null,
    },
    error: null,
  };
}

export const gcControllerSource = `const gc_controller = list(
"begin_garbage_collection",
  assign("free", constant(0)),
  assign("scan", constant(0)),
  assign("old", reg("root")),
  assign("relocate_continue", label("reassign_root")),
  go_to(label("relocate_old_result_in_new")),
"reassign_root",
  assign("root", reg("new")),
  go_to(label("gc_loop")),
"gc_loop",
  test(list(op("==="), reg("scan"), reg("free"))),
  branch(label("gc_flip")),
  assign("old", list(op("vector_ref"), reg("new_heads"), reg("scan"))),
  assign("relocate_continue", label("update_head")),
  go_to(label("relocate_old_result_in_new")),
"update_head",
  perform(list(op("vector_set"),
               reg("new_heads"), reg("scan"), reg("new"))),
  assign("old", list(op("vector_ref"),
                     reg("new_tails"), reg("scan"))),
  assign("relocate_continue", label("update_tail")),
  go_to(label("relocate_old_result_in_new")),
"update_tail",
  perform(list(op("vector_set"),
               reg("new_tails"), reg("scan"), reg("new"))),
  assign("scan", list(op("+"), reg("scan"), constant(1))),
  go_to(label("gc_loop")),
"relocate_old_result_in_new",
  test(list(op("is_pointer_to_pair"), reg("old"))),
  branch(label("pair")),
  assign("new", reg("old")),
  go_to(reg("relocate_continue")),
"pair",
  assign("oldht", list(op("vector_ref"),
                       reg("the_heads"), reg("old"))),
  test(list(op("is_broken_heart"), reg("oldht"))),
  branch(label("already_moved")),
  assign("new", reg("free")),     // new location for pair
  // Update free pointer
  assign("free", list(op("+"), reg("free"), constant(1))),
  // Copy the head and tail to new memory
  perform(list(op("vector_set"),
               reg("new_heads"), reg("new"),
               reg("oldht"))),
  assign("oldht", list(op("vector_ref"),
                       reg("the_tails"), reg("old"))),
  perform(list(op("vector_set"),
               reg("new_tails"), reg("new"),
               reg("oldht"))),
  // Construct the broken heart
  perform(list(op("vector_set"),
               reg("the_heads"), reg("old"),
               constant("broken_heart"))),
  perform(list(op("vector_set"),
               reg("the_tails"), reg("old"),
               reg("new"))),
  go_to(reg("relocate_continue")),
"already_moved",
  assign("new", list(op("vector_ref"),
                     reg("the_tails"), reg("old"))),
  go_to(reg("relocate_continue")),
"gc_flip",
  assign("temp", reg("the_tails")),
  assign("the_tails", reg("new_tails")),
  assign("new_tails", reg("temp")),
  assign("temp", reg("the_heads")),
  assign("the_heads", reg("new_heads")),
  assign("new_heads", reg("temp")));
`;

const GC_REGISTERS = [
  'free',
  'scan',
  'old',
  'new',
  'oldht',
  'root',
  'relocate_continue',
  'temp',
  'the_heads',
  'the_tails',
  'new_heads',
  'new_tails',
];

/** Memory and the collector's registers just after one instruction. */
export interface GcStep {
  /** The instruction that ran, as text, and the label it falls under. */
  instruction: string;
  label: string | null;
  /** Working memory and free memory, by which vectors the registers name now. */
  heads: Pointer[];
  tails: Pointer[];
  newHeads: Pointer[];
  newTails: Pointer[];
  scan: number;
  free: number;
  old: Pointer;
  new: Pointer;
  /** Whether `gc_flip` has swapped the vectors. */
  flipped: boolean;
}

export interface GcRun {
  before: MemoryImage;
  steps: GcStep[];
  after: MemoryImage;
}

let gcController: Value | undefined;

function controller(): Value {
  if (gcController === undefined) {
    const outcome = evaluate(`${gcControllerSource}\ngc_controller;`);
    if (outcome.status !== 'done') throw new Error('the garbage collector does not assemble');
    gcController = outcome.value;
  }
  return gcController;
}

const indexOf = (pointer: Value): number =>
  typeof pointer === 'number' ? pointer : typeof pointer === 'string' && pointer.startsWith('p') ? Number(pointer.slice(1)) : Number.NaN;

const show = (value: Value): Pointer => (typeof value === 'number' ? `p${value}` : typeof value === 'string' ? value : String(value));

/** Build the list of roots in free memory, then run the book's collector on the image, step by step. */
export function collectGarbage(image: MemoryImage, { maxSteps = 2000 } = {}): GcRun {
  // The root list: one pair per name, allocated at free, holding the names' pointers.
  const heads = [...image.heads];
  const tails = [...image.tails];
  let next: Pointer = 'e0';
  for (let i = image.names.length - 1; i >= 0; i--) {
    heads.push(image.names[i]?.pointer ?? 'e0');
    tails.push(next);
    next = `p${heads.length - 1}`;
  }
  const before: MemoryImage = { ...image, heads, tails, free: heads.length, root: next };
  const size = heads.length;
  const vectors = new Map<string, Pointer[]>([
    ['the_heads', [...heads]],
    ['the_tails', [...tails]],
    ['new_heads', Array.from({ length: size }, () => '')],
    ['new_tails', Array.from({ length: size }, () => '')],
  ]);
  const vector = (name: Value): Pointer[] => {
    const found = vectors.get(String(name));
    if (found === undefined) throw new Error(`no vector ${String(name)}`);
    return found;
  };
  const machine = new RegisterMachine({ maxInstructions: 100_000 });
  for (const name of GC_REGISTERS) machine.allocateRegister(name);
  const op = (name: string, arity: number, impl: (...args: Value[]) => Value): void => {
    machine.operations.set(name, { tag: 'primitive', name, arity, impl });
  };
  op('vector_ref', 2, (v, i) => vector(v)[indexOf(i)] ?? '');
  op('vector_set', 3, (v, i, value) => {
    vector(v)[indexOf(i)] = show(value);
    return undefined;
  });
  op('+', 2, (a, b) => (a as number) + (b as number));
  op('===', 2, (a, b) => a === b);
  op('is_pointer_to_pair', 1, (x) => typeof x === 'number' || (typeof x === 'string' && /^p\d+$/.test(x)));
  op('is_broken_heart', 1, (x) => x === BROKEN_HEART);
  machine.assemble(controller());
  for (const name of ['the_heads', 'the_tails', 'new_heads', 'new_tails']) machine.set(name, name);
  machine.set('root', before.root);

  const steps: GcStep[] = [];
  machine.observers.push({
    after: (m, index) => {
      if (steps.length >= maxSteps) return;
      const line = m.line(index);
      const { label } = m.labelOf(index);
      steps.push({
        instruction: line?.text ?? '',
        label,
        heads: [...vector(m.get('the_heads'))],
        tails: [...vector(m.get('the_tails'))],
        newHeads: [...vector(m.get('new_heads'))],
        newTails: [...vector(m.get('new_tails'))],
        scan: Number(m.get('scan')),
        free: Number(m.get('free')),
        old: show(m.get('old')),
        new: show(m.get('new')),
        flipped: m.get('the_heads') === 'new_heads',
      });
    },
  });
  machine.start();

  const finalHeads = vector(machine.get('the_heads'));
  const finalTails = vector(machine.get('the_tails'));
  const free = Number(machine.get('free'));
  const root = show(machine.get('root'));
  // Read the names back out of the relocated root list.
  const names = image.names.map((entry, i) => {
    let cell = indexOf(root);
    for (let k = 0; k < i; k++) cell = indexOf(finalTails[cell] ?? '');
    return { name: entry.name, pointer: finalHeads[cell] ?? 'e0' };
  });
  return {
    before,
    steps,
    after: { heads: finalHeads.slice(0, free), tails: finalTails.slice(0, free), free, names, root },
  };
}
