import { isLabel, isPair, listToArray, stringify, type Value } from '../evaluator/values.ts';
import { unparse } from './components.ts';
import { dataPaths, type DataPaths } from './dataPaths.ts';
import { isTaggedList } from './evaluatorSupport.ts';
import { UNASSIGNED, type RegisterMachine } from './registerMachine.ts';

/**
 * What a register machine did, as plain JSON for the Book's animations: the
 * machine's code and data paths, and for each `start`, every instruction it
 * executed with the registers it changed and what it did to the stack.
 */

export type ShownKind = 'number' | 'string' | 'boolean' | 'label' | 'code' | 'function' | 'environment' | 'list' | 'unassigned' | 'other';

/** A register's contents, described for a reader. */
export interface Shown {
  text: string;
  kind: ShownKind;
}

export interface CodeLineView {
  text: string;
  labels: string[];
  type: string;
  /** 0 for the controller; 1, 2, ... for code assembled later. */
  segment: number;
}

export interface StepView {
  /** Index of the instruction executed. */
  at: number;
  /** Registers (and `flag`) whose contents the instruction changed, with the new contents. */
  writes: [string, Shown][];
  /** A value saved on the stack, with the register it came from. */
  push?: [string | null, Shown];
  /** Values removed from the top of the stack by `restore` or `revert_stack_to_marker`. */
  pop?: number;
  marker?: 'push' | 'revert';
  /** Stack depth after the instruction. */
  depth: number;
}

export interface RunView {
  /** Register contents when `start` was called. */
  initial: [string, Shown][];
  steps: StepView[];
  /** True when the run had more steps than were recorded. */
  truncated: boolean;
  instructions: number;
  totalPushes: number;
  maxDepth: number;
  /** Set when the run stopped with an error. */
  error: string | null;
}

export interface MachineView {
  registers: string[];
  operations: string[];
  /** The instruction vector; `null` ends a segment. Steps index into it. */
  code: (CodeLineView | null)[];
  /** Labels after the last instruction of each segment. */
  endLabels: string[][];
  dataPaths: DataPaths;
  runs: RunView[];
}

const MAX_TEXT = 72;
const clip = (text: string, max = MAX_TEXT): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

const COMPONENT_TAGS = new Set([
  'literal',
  'name',
  'application',
  'binary_operator_combination',
  'unary_operator_combination',
  'logical_composition',
  'conditional_expression',
  'conditional_statement',
  'lambda_expression',
  'sequence',
  'block',
  'return_statement',
  'assignment',
  'constant_declaration',
  'variable_declaration',
  'function_declaration',
]);

/** An environment in the representation of §4.1.3: a list of frames, each a pair of lists. */
function isEnvironment(value: Value): boolean {
  if (!isPair(value)) return false;
  const frame = value[0];
  if (!isPair(frame)) return false;
  const symbols = listToArray(frame[0]);
  return symbols !== null && symbols.length > 0 && symbols.every((s) => typeof s === 'string') && listToArray(frame[1]) !== null;
}

function environmentText(env: Value): string {
  const frames: string[] = [];
  for (let e = env; isPair(e); e = e[1]) {
    const frame = e[0];
    if (!isPair(frame)) break;
    const symbols = listToArray(frame[0]) ?? [];
    const values = listToArray(frame[1]) ?? [];
    if (e[1] === null) {
      frames.push('global');
      break;
    }
    frames.push(`{${symbols.map((s, i) => `${String(s)}: ${brief(values[i])}`).join(', ')}}`);
  }
  return frames.join(' → ');
}

function brief(value: Value): string {
  if (isPair(value) && typeof value[0] === 'string' && COMPONENT_TAGS.has(value[0])) return clip(unparse(value), 24);
  if (isTaggedList(value, 'compound_function')) return 'fn';
  if (isTaggedList(value, 'compiled_function')) return 'compiled fn';
  if (isTaggedList(value, 'primitive')) return 'primitive';
  if (value === UNASSIGNED) return '*unassigned*';
  return clip(stringify(value), 16);
}

export function show(value: Value): Shown {
  if (value === UNASSIGNED) return { text: '*unassigned*', kind: 'unassigned' };
  if (typeof value === 'number') return { text: String(value), kind: 'number' };
  if (typeof value === 'string') return { text: clip(JSON.stringify(value)), kind: 'string' };
  if (typeof value === 'boolean') return { text: String(value), kind: 'boolean' };
  if (isLabel(value)) return { text: value.name, kind: 'label' };
  if (isPair(value)) {
    const tag = value[0];
    if (typeof tag === 'string' && COMPONENT_TAGS.has(tag)) return { text: clip(unparse(value)), kind: 'code' };
    if (tag === 'compound_function') return { text: '<compound function>', kind: 'function' };
    if (tag === 'compiled_function') {
      const entry = listToArray(value)?.[1];
      return { text: `<compiled function ${isLabel(entry ?? null) ? (entry as { name: string }).name : ''}>`, kind: 'function' };
    }
    if (tag === 'primitive') return { text: '<primitive function>', kind: 'function' };
    if (isEnvironment(value)) return { text: clip(environmentText(value)), kind: 'environment' };
    const items = listToArray(value);
    if (items !== null) return { text: clip(`list(${items.map(brief).join(', ')})`), kind: 'list' };
  }
  if (typeof value === 'object' && value !== null && 'tag' in value) return { text: 'fn', kind: 'function' };
  return { text: clip(stringify(value)), kind: 'other' };
}

export interface MachineRecorder {
  view(): MachineView;
}

/** Watch a machine from now on and record every run, up to `maxSteps` steps each. */
export function recordMachine(machine: RegisterMachine, { maxSteps = 4000 } = {}): MachineRecorder {
  const runs: RunView[] = [];
  let current: RunView | null = null;
  let previous = new Map<string, Value>();
  let stackLength = 0;
  let pushes = 0;

  const snapshot = (): Map<string, Value> => new Map(machine.registers);

  machine.observers.push({
    after(m, index) {
      const run = current;
      if (run === null) return;
      run.instructions++;
      if (run.steps.length >= maxSteps) {
        run.truncated = true;
        stackLength = m.stack.length;
        pushes = m.totalPushes;
        return;
      }
      const writes: [string, Shown][] = [];
      for (const [name, value] of m.registers) {
        if (previous.get(name) !== value) writes.push([name, show(value)]);
      }
      previous = snapshot();
      const step: StepView = { at: index, writes, depth: m.stack.length };
      const line = m.line(index);
      if (line?.instruction.type === 'push_marker_to_stack') step.marker = 'push';
      if (line?.instruction.type === 'revert_stack_to_marker') step.marker = 'revert';
      if (m.totalPushes > pushes) {
        const top = m.stack[m.stack.length - 1];
        if (top !== undefined) step.push = [top.register, show(top.value)];
      } else if (m.stack.length < stackLength) {
        step.pop = stackLength - m.stack.length;
      }
      stackLength = m.stack.length;
      pushes = m.totalPushes;
      run.steps.push(step);
      run.totalPushes = m.totalPushes;
      run.maxDepth = m.maxDepth;
    },
  });
  // Wrap start and proceed, so every run is recorded from its first instruction.
  const begin = (): void => {
    current = {
      initial: [...machine.registers].map(([name, value]): [string, Shown] => [name, show(value)]),
      steps: [],
      truncated: false,
      instructions: 0,
      totalPushes: machine.totalPushes,
      maxDepth: machine.maxDepth,
      error: null,
    };
    runs.push(current);
    previous = snapshot();
    stackLength = machine.stack.length;
    pushes = machine.totalPushes;
  };
  const start = machine.start.bind(machine);
  machine.start = () => {
    begin();
    try {
      return start();
    } catch (error) {
      if (current !== null) current.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  };

  return {
    view(): MachineView {
      const code = machine.code.map((entry): CodeLineView | null =>
        entry === null
          ? null
          : { text: entry.line.text, labels: entry.line.labels, type: entry.line.instruction.type, segment: entry.line.segment },
      );
      const endLabels: string[][] = [];
      for (const segment of machine.segments) {
        const ends = [...segment.labels].filter(([, at]) => machine.code[at] === null).map(([name]) => name);
        endLabels.push(ends);
      }
      const registers = [...machine.registers.keys()].filter((name) => name !== 'flag');
      const controllerLines = machine.code
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .map((entry) => entry.line);
      return {
        registers,
        operations: [...machine.operations.keys()],
        code,
        endLabels,
        dataPaths: dataPaths(registers, controllerLines),
        runs,
      };
    },
  };
}
