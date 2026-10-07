import { invoke } from '../evaluator/invoke.ts';
import { isLabel, listToArray, stringify, type Label, type Value } from '../evaluator/values.ts';
import { SourceError } from '../syntax/errors.ts';
import { readController, type ControllerLine, type OperationExp, type PrimitiveExp } from './controller.ts';

/**
 * A register-machine simulator in the shape of §5.2. `assemble` turns each
 * instruction of a controller into an execution function once, before the
 * machine runs; running is then a loop that calls the function the program
 * counter points at. The stack is monitored as in §5.2.4 and supports the
 * markers that §5.4 uses for return statements.
 *
 * Labels evaluate to `Label` values that point into one instruction vector.
 * Code assembled later, such as compiled code (§5.5.7), is appended to the
 * vector, so its labels and the controller's can live in the same registers.
 */

export const UNASSIGNED = '*unassigned*';
export const DEFAULT_MAX_INSTRUCTIONS = 5_000_000;

export interface StackEntry {
  value: Value;
  /** The register the value was saved from, or `null` for a raw push. */
  register: string | null;
}

export interface MachineObserver {
  /** The instruction at `index` is about to run. */
  before?(machine: RegisterMachine, index: number): void;
  /** The instruction at `index` has run. */
  after?(machine: RegisterMachine, index: number): void;
}

export interface RegisterMachineOptions {
  /** Receives the lines `print_stack_statistics` writes. */
  display?: (text: string) => void;
  /** Instructions one `start` may execute before it is stopped. */
  maxInstructions?: number;
}

export interface CodeLine extends ControllerLine {
  /** Which call of `assemble` the line came from; 0 is the controller. */
  segment: number;
}

interface Executable {
  line: CodeLine;
  run: () => void;
}

const fail = (message: string): never => {
  throw new SourceError('runtime', message, null);
};

export class RegisterMachine {
  /** Register name to contents, in order of allocation. The program counter is `pc`, not a register. */
  readonly registers = new Map<string, Value>([['flag', UNASSIGNED]]);
  readonly operations = new Map<string, Value>();
  readonly stack: StackEntry[] = [];
  /** Stack heights at each `push_marker_to_stack` not yet reverted. */
  readonly markers: number[] = [];
  /** The instruction vector; `null` ends a segment. */
  readonly code: (Executable | null)[] = [];
  /** Label names in each segment, for the code view. */
  readonly segments: { start: number; labels: Map<string, number> }[] = [];
  pc = 0;
  totalPushes = 0;
  maxDepth = 0;
  instructionCount = 0;
  readonly observers: MachineObserver[] = [];
  readonly maxInstructions: number;
  private readonly display: (text: string) => void;

  constructor(options: RegisterMachineOptions = {}) {
    this.display = options.display ?? (() => {});
    this.maxInstructions = options.maxInstructions ?? DEFAULT_MAX_INSTRUCTIONS;
    const stackOp = (name: string, impl: () => Value): void => {
      this.operations.set(name, { tag: 'primitive', name, arity: 0, impl });
    };
    stackOp('initialize_stack', () => this.initializeStack());
    stackOp('print_stack_statistics', () => {
      this.printStatistics();
      return undefined;
    });
  }

  allocateRegister(name: string): void {
    if (this.registers.has(name)) fail(`Multiply defined register: ${name}`);
    this.registers.set(name, UNASSIGNED);
  }

  private known(name: string): string {
    if (!this.registers.has(name)) fail(`Unknown register: ${name}`);
    return name;
  }

  get(name: string): Value {
    return this.registers.get(this.known(name));
  }

  set(name: string, value: Value): void {
    this.registers.set(this.known(name), value);
  }

  /** Add operations given as a list of `list(name, function)`. */
  installOperations(ops: Value): void {
    const entries = listToArray(ops);
    if (entries === null) fail(`Operations must be a list of list(name, function), got ${stringify(ops)}`);
    for (const entry of entries as Value[]) {
      const items = listToArray(entry);
      if (items === null || items.length !== 2 || typeof items[0] !== 'string') {
        fail(`Each operation must be list(name, function), got ${stringify(entry)}`);
      }
      const [name, fn] = items as [string, Value];
      this.operations.set(name, fn);
    }
  }

  push(entry: StackEntry): void {
    this.stack.push(entry);
    this.totalPushes++;
    this.maxDepth = Math.max(this.maxDepth, this.stack.length);
  }

  pop(): StackEntry {
    const entry = this.stack.pop();
    if (entry === undefined) return fail('Empty stack -- pop');
    return entry;
  }

  initializeStack(): string {
    this.stack.length = 0;
    this.markers.length = 0;
    this.totalPushes = 0;
    this.maxDepth = 0;
    return 'done';
  }

  printStatistics(): void {
    this.display(`total pushes = ${this.totalPushes}`);
    this.display(`maximum depth = ${this.maxDepth}`);
  }

  /** Where the instruction at `index` sits: the label before it and how far after. */
  labelOf(index: number): { label: string | null; offset: number } {
    for (let i = index; i >= 0; i--) {
      const entry = this.code[i];
      if (entry === undefined || entry === null) break;
      const label = entry.line.labels[entry.line.labels.length - 1];
      if (label !== undefined) return { label, offset: index - i + 1 };
    }
    return { label: null, offset: 0 };
  }

  /**
   * Assemble a controller sequence onto the end of the instruction vector and
   * return a label for its first instruction. The first call assembles the
   * controller that `start` runs.
   */
  assemble(sequence: Value): Label {
    const controller = readController(sequence);
    const base = this.code.length;
    const segment = this.segments.length;
    const labels = new Map([...controller.labels].map(([name, index]) => [name, base + index]));
    this.segments.push({ start: base, labels });
    const labelValue = (name: string): Label => {
      const at = labels.get(name);
      if (at === undefined) return fail(`Undefined label -- assemble: ${name}`);
      return { tag: 'label', name, at };
    };
    // Every label used by the segment gets one Label value, so labels compare with ===.
    const values = new Map<string, Label>();
    const labelFor = (name: string): Label => {
      let value = values.get(name);
      if (value === undefined) {
        value = labelValue(name);
        values.set(name, value);
      }
      return value;
    };
    const lines: CodeLine[] = controller.lines.map((line) => ({ ...line, segment }));
    const executables = lines.map((line) => ({ line, run: this.executionFunction(line, labelFor) }));
    this.code.push(...executables, null);
    return { tag: 'label', name: lines[0]?.labels[0] ?? `segment ${segment}`, at: base };
  }

  private primitiveFunction(exp: PrimitiveExp, labelFor: (name: string) => Label): () => Value {
    switch (exp.kind) {
      case 'constant': {
        const { value } = exp;
        return () => value;
      }
      case 'label': {
        const label = labelFor(exp.name);
        return () => label;
      }
      case 'reg': {
        const name = this.known(exp.name);
        return () => this.registers.get(name);
      }
    }
  }

  private operationFunction(exp: OperationExp, labelFor: (name: string) => Label): () => Value {
    const op = this.operations.get(exp.op);
    if (op === undefined) return fail(`Unknown operation -- assemble: ${exp.op}`);
    const operands = exp.operands.map((operand) => this.primitiveFunction(operand, labelFor));
    return () => {
      try {
        return invoke(op, operands.map((operand) => operand()));
      } catch (error) {
        if (error instanceof SourceError) {
          throw new SourceError(
            error.phase,
            `${error.reason} (in operation ${exp.op}${error.loc === null ? '' : `, line ${error.loc.line}`})`,
            null,
          );
        }
        throw error;
      }
    };
  }

  private executionFunction(line: CodeLine, labelFor: (name: string) => Label): () => void {
    const { instruction } = line;
    switch (instruction.type) {
      case 'assign': {
        const target = this.known(instruction.target);
        const value =
          instruction.value.kind === 'op'
            ? this.operationFunction(instruction.value, labelFor)
            : this.primitiveFunction(instruction.value, labelFor);
        return () => {
          this.registers.set(target, value());
          this.pc++;
        };
      }
      case 'test': {
        const condition = this.operationFunction(instruction.condition, labelFor);
        return () => {
          this.registers.set('flag', condition());
          this.pc++;
        };
      }
      case 'branch': {
        const dest = labelFor(instruction.label);
        return () => {
          const flag = this.registers.get('flag');
          if (typeof flag !== 'boolean') fail(`branch expects the flag to be a boolean, got ${stringify(flag)}`);
          if (flag) this.pc = dest.at;
          else this.pc++;
        };
      }
      case 'go_to': {
        const { dest } = instruction;
        if (dest.kind === 'label') {
          const label = labelFor(dest.name);
          return () => {
            this.pc = label.at;
          };
        }
        const name = this.known(dest.name);
        return () => {
          const target = this.registers.get(name);
          if (!isLabel(target)) fail(`go_to(reg("${name}")) needs a label, but ${name} holds ${stringify(target)}`);
          this.pc = (target as Label).at;
        };
      }
      case 'save': {
        const name = this.known(instruction.register);
        return () => {
          this.push({ value: this.registers.get(name), register: name });
          this.pc++;
        };
      }
      case 'restore': {
        const name = this.known(instruction.register);
        return () => {
          this.registers.set(name, this.pop().value);
          this.pc++;
        };
      }
      case 'perform': {
        const action = this.operationFunction(instruction.action, labelFor);
        return () => {
          action();
          this.pc++;
        };
      }
      case 'push_marker_to_stack':
        return () => {
          this.markers.push(this.stack.length);
          this.pc++;
        };
      case 'revert_stack_to_marker':
        return () => {
          const height = this.markers.pop();
          if (height === undefined) fail('revert_stack_to_marker: there is no marker on the stack');
          this.stack.length = Math.min(this.stack.length, height as number);
          this.pc++;
        };
    }
  }

  /** Run from the first instruction of the controller until the controller ends. */
  start(): string {
    if (this.segments.length === 0) fail('The machine has no controller to start');
    this.pc = 0;
    return this.proceed();
  }

  /** Run from the current instruction until a segment ends. */
  proceed(): string {
    let remaining = this.maxInstructions;
    const { code, observers } = this;
    for (;;) {
      const executable = code[this.pc];
      if (executable === null || executable === undefined) return 'done';
      if (remaining-- <= 0) {
        fail(`The machine executed ${this.maxInstructions} instructions without reaching the end of its controller`);
      }
      this.instructionCount++;
      const index = this.pc;
      if (observers.length > 0) for (const observer of observers) observer.before?.(this, index);
      try {
        executable.run();
      } catch (error) {
        if (error instanceof SourceError) {
          const { label, offset } = this.labelOf(index);
          const where = label === null ? `instruction ${index + 1}` : `${label} + ${offset}`;
          throw new SourceError(error.phase, `${error.reason}, at ${where}: ${executable.line.text}`, null);
        }
        throw error;
      }
      if (observers.length > 0) for (const observer of observers) observer.after?.(this, index);
    }
  }

  line(index: number): CodeLine | null {
    return this.code[index]?.line ?? null;
  }
}
