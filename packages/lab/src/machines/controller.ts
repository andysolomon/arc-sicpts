import { SourceError } from '../syntax/errors.ts';
import { isPair, listToArray, stringify, type Value } from '../evaluator/values.ts';

/**
 * The register-machine language of §5.1 as data. A controller is a list of
 * labels (strings) and instructions (lists built by `assign`, `test`, ...).
 * This module reads that list structure into typed instructions and writes
 * instructions back as text, in the notation the book uses.
 */

export type PrimitiveExp =
  | { kind: 'reg'; name: string }
  | { kind: 'constant'; value: Value }
  | { kind: 'label'; name: string };

export interface OperationExp {
  kind: 'op';
  op: string;
  operands: PrimitiveExp[];
}

export type ValueExp = PrimitiveExp | OperationExp;

export type Instruction =
  | { type: 'assign'; target: string; value: ValueExp }
  | { type: 'test'; condition: OperationExp }
  | { type: 'branch'; label: string }
  | { type: 'go_to'; dest: { kind: 'label'; name: string } | { kind: 'reg'; name: string } }
  | { type: 'save'; register: string }
  | { type: 'restore'; register: string }
  | { type: 'perform'; action: OperationExp }
  | { type: 'push_marker_to_stack' }
  | { type: 'revert_stack_to_marker' };

export interface ControllerLine {
  instruction: Instruction;
  /** The instruction as the book writes it, e.g. `assign("a", reg("b"))`. */
  text: string;
  /** Labels that immediately precede this instruction. */
  labels: string[];
}

export interface Controller {
  lines: ControllerLine[];
  /** Label name to the index of the instruction it marks; the end of the sequence for a trailing label. */
  labels: Map<string, number>;
  /** Labels after the last instruction, such as `"gcd_done"`. */
  trailing: string[];
}

const fail = (message: string): never => {
  throw new SourceError('runtime', message, null);
};

const TAGS: readonly string[] = [
  'assign',
  'perform',
  'op',
  'label',
  'branch',
  'go_to',
  'save',
  'restore',
  'reg',
  'constant',
  'test',
  'push_marker_to_stack',
  'revert_stack_to_marker',
];

/** An instruction or expression as source text, like `display_instructions` in §5.5.7. */
export function instructionText(value: Value): string {
  if (!isPair(value)) return stringify(value);
  const items = listToArray(value);
  if (items === null) return stringify(value);
  const [tag, ...rest] = items;
  const args = rest.map(instructionText).join(', ');
  return typeof tag === 'string' && TAGS.includes(tag) ? `${tag}(${args})` : `list(${items.map(instructionText).join(', ')})`;
}

const tagged = (value: Value, tag: string): boolean => isPair(value) && value[0] === tag;

function elements(value: Value, what: string, inst: Value): Value[] {
  const items = listToArray(value);
  if (items === null) fail(`Bad ${what} -- assemble: ${instructionText(inst)}`);
  return items as Value[];
}

function stringAt(items: Value[], index: number, what: string, inst: Value): string {
  const item = items[index];
  if (typeof item !== 'string') fail(`Bad ${what} -- assemble: ${instructionText(inst)}`);
  return item as string;
}

function primitiveExp(exp: Value, inst: Value): PrimitiveExp {
  const items = isPair(exp) ? listToArray(exp) : null;
  if (items !== null && items.length === 2) {
    const [tag, argument] = items;
    if (tag === 'constant') return { kind: 'constant', value: argument };
    if (tag === 'reg' && typeof argument === 'string') return { kind: 'reg', name: argument };
    if (tag === 'label' && typeof argument === 'string') return { kind: 'label', name: argument };
  }
  return fail(`Unknown expression type -- assemble: ${instructionText(exp)} in ${instructionText(inst)}`);
}

export function isOperationExp(exp: Value): boolean {
  return isPair(exp) && tagged(exp[0], 'op');
}

function operationExp(exp: Value, inst: Value): OperationExp {
  const items = elements(exp, 'operation', inst);
  const head = elements(items[0] ?? null, 'operation', inst);
  const op = stringAt(head, 1, 'operation', inst);
  return { kind: 'op', op, operands: items.slice(1).map((operand) => primitiveExp(operand, inst)) };
}

function valueExp(exp: Value, inst: Value): ValueExp {
  return isOperationExp(exp) ? operationExp(exp, inst) : primitiveExp(exp, inst);
}

/** Read one instruction, signalling the book's assembler errors for malformed ones. */
export function readInstruction(inst: Value): Instruction {
  const items = elements(inst, 'instruction', inst);
  const type = items[0];
  switch (type) {
    case 'assign':
      return { type, target: stringAt(items, 1, 'assign instruction', inst), value: valueExp(items[2], inst) };
    case 'test':
      if (!isOperationExp(items[1])) fail(`Bad test instruction -- assemble: ${instructionText(inst)}`);
      return { type, condition: operationExp(items[1], inst) };
    case 'branch': {
      const dest = items[1];
      if (!tagged(dest, 'label')) fail(`Bad branch instruction -- assemble: ${instructionText(inst)}`);
      const exp = primitiveExp(dest, inst);
      return { type, label: exp.kind === 'label' ? exp.name : '' };
    }
    case 'go_to': {
      const exp = primitiveExp(items[1], inst);
      if (exp.kind === 'constant') fail(`Bad go_to instruction -- assemble: ${instructionText(inst)}`);
      return { type, dest: exp as { kind: 'label'; name: string } | { kind: 'reg'; name: string } };
    }
    case 'save':
    case 'restore':
      return { type, register: stringAt(items, 1, `${type} instruction`, inst) };
    case 'perform':
      if (!isOperationExp(items[1])) fail(`Bad perform instruction -- assemble: ${instructionText(inst)}`);
      return { type, action: operationExp(items[1], inst) };
    case 'push_marker_to_stack':
    case 'revert_stack_to_marker':
      return { type };
    default:
      return fail(`Unknown instruction type -- assemble: ${instructionText(inst)}`);
  }
}

/**
 * Split a controller sequence into instructions and labels, as `extract_labels`
 * does. When a label occurs twice, the first occurrence wins, which is what the
 * book's assembler does too (exercise 5.8).
 */
export function readController(sequence: Value): Controller {
  const items = listToArray(sequence);
  if (items === null) fail(`A controller must be a list of labels and instructions, got ${stringify(sequence)}`);
  const lines: ControllerLine[] = [];
  const labels = new Map<string, number>();
  let pending: string[] = [];
  for (const item of items as Value[]) {
    if (typeof item === 'string') {
      if (!labels.has(item)) labels.set(item, lines.length);
      pending.push(item);
      continue;
    }
    lines.push({ instruction: readInstruction(item), text: instructionText(item), labels: pending });
    pending = [];
  }
  return { lines, labels, trailing: pending };
}

/** Every register an instruction names. */
export function registersOf(instruction: Instruction): string[] {
  const fromExp = (exp: ValueExp): string[] =>
    exp.kind === 'reg' ? [exp.name] : exp.kind === 'op' ? exp.operands.flatMap(fromExp) : [];
  switch (instruction.type) {
    case 'assign':
      return [instruction.target, ...fromExp(instruction.value)];
    case 'test':
      return fromExp(instruction.condition);
    case 'perform':
      return fromExp(instruction.action);
    case 'go_to':
      return instruction.dest.kind === 'reg' ? [instruction.dest.name] : [];
    case 'save':
    case 'restore':
      return [instruction.register];
    default:
      return [];
  }
}
