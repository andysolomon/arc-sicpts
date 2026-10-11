import type { Loc, Program } from '../syntax/ast.ts';

/**
 * The list and stream libraries of Source §2 and §3, written in Source itself.
 * `prepare` evaluates them into a frame named `library` between the global
 * frame of primitives and the program, so a program sees every name here and
 * can shadow any of them with a declaration of its own.
 *
 * `list_to_string` and `display_list` are primitives (in `primitives.ts`): they
 * have to cope with circular structure, which Source code cannot detect.
 */

export const listLibrary = `
type Pair<H, T> = [H, T];
type List<T> = null | Pair<T, List<T>>;

const equal = (xs: unknown, ys: unknown): boolean =>
  is_pair(xs)
    ? is_pair(ys) && equal(head(xs), head(ys)) && equal(tail(xs), tail(ys))
    : xs === ys;

const length = <T>(xs: List<T>): number => {
  const iter = (xs: List<T>, n: number): number =>
    is_null(xs) ? n : iter(tail(xs), n + 1);
  return iter(xs, 0);
};

const map = <A, B>(f: (x: A) => B, xs: List<A>): List<B> =>
  is_null(xs) ? null : pair(f(head(xs)), map(f, tail(xs)));

const build_list = <T>(f: (i: number) => T, n: number): List<T> => {
  const build = (i: number, rest: List<T>): List<T> =>
    i < 0 ? rest : build(i - 1, pair(f(i), rest));
  return build(n - 1, null);
};

const for_each = <T>(f: (x: T) => unknown, xs: List<T>): true => {
  if (is_null(xs)) {
    return true;
  } else {
    f(head(xs));
    return for_each(f, tail(xs));
  }
};

const reverse = <T>(xs: List<T>): List<T> => {
  const rev = (original: List<T>, reversed: List<T>): List<T> =>
    is_null(original) ? reversed : rev(tail(original), pair(head(original), reversed));
  return rev(xs, null);
};

const append = <T>(xs: List<T>, ys: List<T>): List<T> =>
  is_null(xs) ? ys : pair(head(xs), append(tail(xs), ys));

const member = <T>(v: T, xs: List<T>): List<T> =>
  is_null(xs) ? null : v === head(xs) ? xs : member(v, tail(xs));

const remove = <T>(v: T, xs: List<T>): List<T> =>
  is_null(xs) ? null : v === head(xs) ? tail(xs) : pair(head(xs), remove(v, tail(xs)));

const remove_all = <T>(v: T, xs: List<T>): List<T> =>
  is_null(xs)
    ? null
    : v === head(xs)
    ? remove_all(v, tail(xs))
    : pair(head(xs), remove_all(v, tail(xs)));

const filter = <T>(pred: (x: T) => boolean, xs: List<T>): List<T> =>
  is_null(xs)
    ? null
    : pred(head(xs))
    ? pair(head(xs), filter(pred, tail(xs)))
    : filter(pred, tail(xs));

const enum_list = (start: number, end: number): List<number> =>
  start > end ? null : pair(start, enum_list(start + 1, end));

const list_ref = <T>(xs: List<T>, n: number): T =>
  n === 0 ? head(xs) : list_ref(tail(xs), n - 1);

const accumulate = <T, R>(f: (x: T, acc: R) => R, initial: R, xs: List<T>): R =>
  is_null(xs) ? initial : f(head(xs), accumulate(f, initial, tail(xs)));
`;

/**
 * Streams as in Source §3: a pair whose tail is a function of no arguments.
 * These tails are not memoized; §3.5.1 shows how to add that.
 */
export const streamLibrary = `
type Stream<T> = null | Pair<T, () => Stream<T>>;

const stream_tail = <T>(s: Stream<T>): Stream<T> =>
  tail(s)();

const is_stream = (s: unknown): boolean =>
  is_null(s) || (is_pair(s) && is_function(tail(s)) && is_stream(stream_tail(s)));

const list_to_stream = <T>(xs: List<T>): Stream<T> =>
  is_null(xs) ? null : pair(head(xs), () => list_to_stream(tail(xs)));

const stream_to_list = <T>(s: Stream<T>): List<T> =>
  is_null(s) ? null : pair(head(s), stream_to_list(stream_tail(s)));

const stream_length = <T>(s: Stream<T>): number =>
  is_null(s) ? 0 : 1 + stream_length(stream_tail(s));

const stream_map = <A, B>(f: (x: A) => B, s: Stream<A>): Stream<B> =>
  is_null(s) ? null : pair(f(head(s)), () => stream_map(f, stream_tail(s)));

const build_stream = <T>(f: (i: number) => T, n: number): Stream<T> => {
  const build = (i: number): Stream<T> =>
    i >= n ? null : pair(f(i), () => build(i + 1));
  return build(0);
};

const stream_for_each = <T>(f: (x: T) => unknown, s: Stream<T>): true => {
  if (is_null(s)) {
    return true;
  } else {
    f(head(s));
    return stream_for_each(f, stream_tail(s));
  }
};

const stream_reverse = <T>(s: Stream<T>): Stream<T> => {
  const rev = (original: Stream<T>, reversed: Stream<T>): Stream<T> =>
    is_null(original)
      ? reversed
      : rev(stream_tail(original), pair(head(original), () => reversed));
  return rev(s, null);
};

const stream_append = <T>(xs: Stream<T>, ys: Stream<T>): Stream<T> =>
  is_null(xs) ? ys : pair(head(xs), () => stream_append(stream_tail(xs), ys));

const stream_member = <T>(v: T, s: Stream<T>): Stream<T> =>
  is_null(s) ? null : head(s) === v ? s : stream_member(v, stream_tail(s));

const stream_remove = <T>(v: T, s: Stream<T>): Stream<T> =>
  is_null(s)
    ? null
    : v === head(s)
    ? stream_tail(s)
    : pair(head(s), () => stream_remove(v, stream_tail(s)));

const stream_remove_all = <T>(v: T, s: Stream<T>): Stream<T> =>
  is_null(s)
    ? null
    : v === head(s)
    ? stream_remove_all(v, stream_tail(s))
    : pair(head(s), () => stream_remove_all(v, stream_tail(s)));

const stream_filter = <T>(pred: (x: T) => boolean, s: Stream<T>): Stream<T> =>
  is_null(s)
    ? null
    : pred(head(s))
    ? pair(head(s), () => stream_filter(pred, stream_tail(s)))
    : stream_filter(pred, stream_tail(s));

const enum_stream = (start: number, end: number): Stream<number> =>
  start > end ? null : pair(start, () => enum_stream(start + 1, end));

const integers_from = (n: number): Stream<number> =>
  pair(n, () => integers_from(n + 1));

const eval_stream = <T>(s: Stream<T>, n: number): List<T> =>
  n === 0 ? null : pair(head(s), eval_stream(stream_tail(s), n - 1));

const stream_ref = <T>(s: Stream<T>, n: number): T =>
  n === 0 ? head(s) : stream_ref(stream_tail(s), n - 1);
`;

/**
 * The register-machine language of §5.1 and the machine interface of §5.2.1,
 * as the book declares them. A program that declares its own versions, as the
 * simulator of §5.2 does, shadows these.
 */
export const machineLibrary = `
type Instruction = List<unknown>;
type Machine = (message: string) => unknown;
type Register = (message: string) => unknown;

const assign = (register_name: string, source: Instruction): Instruction => list("assign", register_name, source);
const reg = (name: string): Instruction => list("reg", name);
const constant = (value: unknown): Instruction => list("constant", value);
const label = (name: string): Instruction => list("label", name);
const op = (name: string): Instruction => list("op", name);
const test = (condition: Instruction): Instruction => list("test", condition);
const branch = (label: Instruction): Instruction => list("branch", label);
const go_to = (label: Instruction): Instruction => list("go_to", label);
const save = (reg: string): Instruction => list("save", reg);
const restore = (reg: string): Instruction => list("restore", reg);
const perform = (action: Instruction): Instruction => list("perform", action);
const push_marker_to_stack = (): Instruction => list("push_marker_to_stack");
const revert_stack_to_marker = (): Instruction => list("revert_stack_to_marker");
const controller = (sequence: List<Instruction | string>): Instruction => list("controller", sequence);
const controller_sequence = (controller: Instruction): List<Instruction | string> => head(tail(controller));

const start = (machine: Machine): unknown =>
  machine("start");
const get_register = (machine: Machine, reg_name: string): Register =>
  machine("get_register")(reg_name);
const get_contents = (register: Register): unknown =>
  register("get");
const set_contents = (register: Register, value: unknown): unknown =>
  register("set")(value);
const get_register_contents = (machine: Machine, register_name: string): unknown =>
  get_contents(get_register(machine, register_name));
const set_register_contents = (machine: Machine, register_name: string, value: unknown): "done" => {
  set_contents(get_register(machine, register_name), value);
  return "done";
};
`;

/** The libraries, in the order `prepare` evaluates them. */
export const library = `${listLibrary}${streamLibrary}${machineLibrary}`;

const libraryLocs = new WeakSet<Loc>();

/** Remember every location in the library's syntax tree, so errors can be reported at the program's call. */
export function markLibrary(program: Program): Program {
  const visit = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc') libraryLocs.add(value as Loc);
      else visit(value);
    }
  };
  visit(program);
  return program;
}

/** True for locations inside the library's text rather than the reader's. */
export function isLibraryLoc(loc: Loc): boolean {
  return libraryLocs.has(loc);
}
