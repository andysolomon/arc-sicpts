import { instructionText } from './controller.ts';
import type { ControllerLine, Instruction, OperationExp, PrimitiveExp, ValueExp } from './controller.ts';

/**
 * The data paths a controller needs, read off its instructions: the analysis
 * exercise 5.11 asks the simulator to do, and what the Book draws as the
 * machine's data-path diagram (figure 5.1).
 */

export type Source =
  | { kind: 'reg'; name: string }
  | { kind: 'constant'; text: string }
  | { kind: 'label'; name: string }
  | { kind: 'op'; id: string };

export interface OperationNode {
  /** Stable id: the operation and its inputs, e.g. `rem(a, b)`. */
  id: string;
  op: string;
  inputs: Source[];
  /** True when the operation's value feeds a test rather than a register. */
  test: boolean;
}

export interface Button {
  /** The book's name for the button, e.g. `t<-r`. */
  name: string;
  target: string;
  source: Source;
}

export interface DataPaths {
  registers: string[];
  operations: OperationNode[];
  buttons: Button[];
  /** Registers that hold entry points: those `go_to` jumps through. */
  entryRegisters: string[];
  /** Registers that are saved or restored. */
  stackRegisters: string[];
  /** For each instruction, what it uses: the button it pushes, or the operation it tests or performs. */
  uses: (string | null)[];
}

const primitiveSource = (exp: PrimitiveExp): Source =>
  exp.kind === 'reg'
    ? { kind: 'reg', name: exp.name }
    : exp.kind === 'label'
      ? { kind: 'label', name: exp.name }
      : { kind: 'constant', text: instructionText(exp.value) };

const sourceText = (source: Source): string =>
  source.kind === 'reg' ? source.name : source.kind === 'constant' ? source.text : source.kind === 'label' ? source.name : source.id;

export function operationId(exp: OperationExp): string {
  return `${exp.op}(${exp.operands.map((operand) => sourceText(primitiveSource(operand))).join(', ')})`;
}

/** Short names for buttons, in the style of the book's `a<-b` and `t<-r`. */
function buttonName(target: string, source: Source): string {
  const from =
    source.kind === 'reg'
      ? source.name
      : source.kind === 'constant'
        ? source.text
        : source.kind === 'label'
          ? source.name
          : (source.id.split('(')[0] ?? source.id);
  // Operators such as - and * read better in parentheses: n<-(-).
  return `${target}<-${/^\w+$/.test(from) ? from : `(${from})`}`;
}

export function dataPaths(registers: readonly string[], lines: readonly ControllerLine[]): DataPaths {
  const operations = new Map<string, OperationNode>();
  const buttons = new Map<string, Button>();
  const entry = new Set<string>();
  const stack = new Set<string>();
  const used = new Set<string>(registers);

  const operation = (exp: OperationExp, test: boolean): OperationNode => {
    const id = operationId(exp);
    let node = operations.get(id);
    if (node === undefined) {
      node = { id, op: exp.op, inputs: exp.operands.map(primitiveSource), test };
      operations.set(id, node);
    } else if (!test) node.test = false;
    for (const operand of exp.operands) if (operand.kind === 'reg') used.add(operand.name);
    return node;
  };
  const sourceOf = (exp: ValueExp): Source => (exp.kind === 'op' ? { kind: 'op', id: operation(exp, false).id } : primitiveSource(exp));

  const uses = lines.map(({ instruction }: { instruction: Instruction }): Button | OperationNode | null => {
    switch (instruction.type) {
      case 'assign': {
        used.add(instruction.target);
        const source = sourceOf(instruction.value);
        if (source.kind === 'reg') used.add(source.name);
        const key = `${instruction.target}<-${JSON.stringify(source)}`;
        let button = buttons.get(key);
        if (button === undefined) {
          button = { name: buttonName(instruction.target, source), target: instruction.target, source };
          buttons.set(key, button);
        }
        return button;
      }
      case 'test':
        return operation(instruction.condition, true);
      case 'perform':
        return operation(instruction.action, false);
      case 'go_to':
        if (instruction.dest.kind === 'reg') {
          entry.add(instruction.dest.name);
          used.add(instruction.dest.name);
        }
        return null;
      case 'save':
      case 'restore':
        stack.add(instruction.register);
        used.add(instruction.register);
        return null;
      default:
        return null;
    }
  });

  // Two buttons into one register from different places need different names.
  const seen = new Map<string, number>();
  for (const button of buttons.values()) {
    const count = (seen.get(button.name) ?? 0) + 1;
    seen.set(button.name, count);
    if (count > 1) button.name = `${button.name}${count}`;
  }

  return {
    registers: [...used].filter((name) => name !== 'flag' && name !== 'pc'),
    operations: [...operations.values()],
    buttons: [...buttons.values()],
    entryRegisters: [...entry],
    stackRegisters: [...stack],
    uses: uses.map((use) => (use === null ? null : 'target' in use ? use.name : use.id)),
  };
}
