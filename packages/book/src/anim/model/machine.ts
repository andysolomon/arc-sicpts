import type { CodeLineView, MachineView, RunView, Shown, StepView } from '@sicp/lab';

/**
 * A register machine's run as keyframes: the registers, the flag and the
 * stack after each instruction, with a sentence about what the instruction
 * did. Rebuilt from the Laboratory's record of the run.
 */

export interface StackItem {
  register: string | null;
  value: Shown;
}

export interface MachineState {
  /** Index of the step this state follows; -1 for the state before the first instruction. */
  step: number;
  registers: Map<string, Shown>;
  flag: Shown | null;
  stack: StackItem[];
  /** The instruction that just ran, or the first one before anything has. */
  at: number;
  /** The instruction that runs next, or -1 when the machine has stopped. */
  next: number;
  /** Registers this instruction wrote. */
  written: Set<string>;
  /** Button pushed or operation used by this instruction, from the data paths. */
  uses: string | null;
  pushes: number;
  caption: string;
}

const code = (text: string): string => `\`${text}\``;

const valueText = (shown: Shown | undefined): string => (shown === undefined ? '' : shown.kind === 'label' ? `label ${shown.text}` : shown.text);

function describe(line: CodeLineView | null, step: StepView, before: MachineState, after: MachineState, uses: string | null): string {
  if (line === null) return '';
  const written = (name: string) => valueText(after.registers.get(name));
  const target = step.writes.find(([name]) => name !== 'flag')?.[0];
  switch (line.type) {
    case 'assign': {
      const name = target ?? /assign\("([^"]+)"/.exec(line.text)?.[1] ?? '';
      const button = uses === null ? '' : `Push ${code(uses)}: `;
      const unchanged = target === undefined ? ' (unchanged)' : '';
      return `${button}${code(name)} gets ${code(written(name) || valueText(before.registers.get(name)))}${unchanged}.`;
    }
    case 'test':
      return `Test ${code(uses ?? line.text)}: the flag is ${code(valueText(after.flag ?? undefined))}.`;
    case 'branch': {
      const label = /label\("([^"]+)"\)/.exec(line.text)?.[1] ?? '';
      return after.flag?.text === 'true' ? `The test was true, so branch to ${code(label)}.` : 'The test was false, so carry on with the next instruction.';
    }
    case 'go_to': {
      const register = /reg\("([^"]+)"\)/.exec(line.text)?.[1];
      if (register !== undefined) return `Go to the label held in ${code(register)}: ${code(valueText(before.registers.get(register)))}.`;
      return `Go to ${code(/label\("([^"]+)"\)/.exec(line.text)?.[1] ?? '')}.`;
    }
    case 'save': {
      const register = /save\("([^"]+)"\)/.exec(line.text)?.[1] ?? '';
      return `Save ${code(register)} (${code(valueText(before.registers.get(register)))}) on the stack; it is ${after.stack.length} deep.`;
    }
    case 'restore': {
      const register = /restore\("([^"]+)"\)/.exec(line.text)?.[1] ?? '';
      return `Restore ${code(register)} from the stack: ${code(written(register) || valueText(before.registers.get(register)))}.`;
    }
    case 'perform':
      return `Perform ${code(uses ?? line.text)}.`;
    case 'push_marker_to_stack':
      return `Mark the stack at depth ${after.stack.length}, so a return can find this point again.`;
    case 'revert_stack_to_marker':
      return `Return: discard everything saved since the last mark, back to depth ${after.stack.length}.`;
    default:
      return line.text;
  }
}

/** One state before the run and one after each recorded step. */
export function machineStates(view: MachineView, run: RunView): MachineState[] {
  const first: MachineState = {
    step: -1,
    registers: new Map(run.initial.filter(([name]) => name !== 'flag')),
    flag: run.initial.find(([name]) => name === 'flag')?.[1] ?? null,
    stack: [],
    at: run.steps[0]?.at ?? 0,
    next: run.steps[0]?.at ?? -1,
    written: new Set(),
    uses: null,
    pushes: 0,
    caption: '',
  };
  first.caption = `Start at the first instruction. ${initialSummary(first)}`;
  const states = [first];
  let state = first;
  run.steps.forEach((step, i) => {
    const registers = new Map(state.registers);
    let flag = state.flag;
    const written = new Set<string>();
    for (const [name, value] of step.writes) {
      if (name === 'flag') flag = value;
      else {
        registers.set(name, value);
        written.add(name);
      }
    }
    let stack = state.stack;
    if (step.push !== undefined) stack = [...stack, { register: step.push[0], value: step.push[1] }];
    if (step.pop !== undefined) stack = stack.slice(0, Math.max(0, stack.length - step.pop));
    if (stack.length !== step.depth) stack = stack.slice(0, step.depth);
    const uses = view.dataPaths.uses[indexInController(view, step.at)] ?? null;
    const next = run.steps[i + 1]?.at ?? -1;
    const after: MachineState = {
      step: i,
      registers,
      flag,
      stack,
      at: step.at,
      next,
      written,
      uses,
      pushes: state.pushes + (step.push !== undefined ? 1 : 0),
      caption: '',
    };
    after.caption = describe(view.code[step.at] ?? null, step, state, after, uses);
    if (next === -1 && i === run.steps.length - 1 && !run.truncated) {
      after.caption += run.error === null ? ` The controller has run off its end: done after ${run.instructions} instructions.` : ` The machine stopped: ${run.error}`;
    }
    states.push(after);
    state = after;
  });
  return states;
}

function initialSummary(state: MachineState): string {
  const set = [...state.registers].filter(([, value]) => value.kind !== 'unassigned');
  return set.length === 0 ? 'No register has a value yet.' : `${set.map(([name, value]) => `${code(name)} is ${code(valueText(value))}`).join(', ')}.`;
}

/** The data paths are numbered by the machine's instructions, without the segment ends. */
function indexInController(view: MachineView, at: number): number {
  let index = 0;
  for (let i = 0; i < at; i++) if (view.code[i] !== null) index++;
  return index;
}

/** The labels that come before each instruction, and the label sections each belongs to. */
export function sectionOf(view: MachineView, at: number): string | null {
  for (let i = at; i >= 0; i--) {
    const line = view.code[i];
    if (line === null || line === undefined) return null;
    const label = line.labels[line.labels.length - 1];
    if (label !== undefined) return label;
  }
  return null;
}

/** True for machines shaped like the explicit-control evaluator, which get their own picture. */
export function isEvaluator(view: MachineView): boolean {
  return ['comp', 'env', 'val', 'continue'].every((name) => view.registers.includes(name));
}

/** The run to show: the last one that executed anything. */
export function mainRun(view: MachineView): RunView | null {
  return [...view.runs].reverse().find((run) => run.steps.length > 0) ?? view.runs.at(-1) ?? null;
}

/**
 * For long runs, keyframes only where control enters a labelled block, so
 * that a slider over thousands of instructions moves in meaningful steps.
 */
export function landmarks(view: MachineView, states: readonly MachineState[]): number[] {
  const picks = [0];
  states.forEach((state, i) => {
    if (i === 0) return;
    const nextLine = state.next === -1 ? null : view.code[state.next];
    if (state.next === -1 || (nextLine !== null && nextLine !== undefined && nextLine.labels.length > 0)) picks.push(i);
  });
  if (picks.at(-1) !== states.length - 1) picks.push(states.length - 1);
  return picks;
}
