import { define, type Environment } from '../evaluator/environment.ts';
import { arrayToList, isPrimitive, listToArray, stringify, type Primitive, type Value } from '../evaluator/values.ts';
import { SourceError } from '../syntax/errors.ts';
import { ECEVAL_OPERATION_NAMES, evaluatorSupport } from './evaluatorSupport.ts';
import { RegisterMachine } from './registerMachine.ts';

/**
 * What chapter 5 adds to the global environment: `make_machine` and
 * `assemble` backed by the simulator in `registerMachine.ts`, the evaluator
 * support functions of §4.1, `eceval_operations`, and an input queue that
 * stands in for the book's `prompt`.
 */

export interface MachineHostOptions {
  display: (text: string) => void;
  /** Called with every machine `make_machine` creates, before it runs. */
  onMachine?: (machine: RegisterMachine) => void;
  maxInstructions?: number;
}

const fail = (message: string): never => {
  throw new SourceError('runtime', message, null);
};

const machines = new WeakMap<Primitive, RegisterMachine>();

/** The simulator behind a machine value made by `make_machine`, if it is one. */
export function machineOf(value: Value): RegisterMachine | null {
  return isPrimitive(value) ? (machines.get(value) ?? null) : null;
}

const primitive = (name: string, arity: number | null, impl: (...args: Value[]) => Value): Primitive => ({
  tag: 'primitive',
  name,
  arity,
  impl,
});

const strings = (value: Value, what: string): string[] => {
  const items = listToArray(value);
  if (items === null || !items.every((item) => typeof item === 'string')) {
    fail(`${what} must be a list of strings, got ${stringify(value)}`);
  }
  return items as string[];
};

/** A machine as the message-passing object of §5.2.1. */
function machineValue(machine: RegisterMachine): Primitive {
  const registers = new Map<string, Primitive>();
  const registerValue = (name: string): Primitive => {
    machine.get(name);
    let register = registers.get(name);
    if (register === undefined) {
      const set = primitive('set', 1, (value) => {
        machine.set(name, value);
        return undefined;
      });
      register = primitive(`register ${name}`, 1, (message) =>
        message === 'get' ? machine.get(name) : message === 'set' ? set : fail(`Unknown request -- register: ${stringify(message)}`),
      );
      registers.set(name, register);
    }
    return register;
  };
  const stack = primitive('stack', 1, (message) => {
    switch (message) {
      case 'push':
        return primitive('push', 1, (value) => {
          machine.push({ value, register: null });
          return 'done';
        });
      case 'pop':
        return machine.pop().value;
      case 'initialize':
        return machine.initializeStack();
      case 'print_statistics':
        machine.printStatistics();
        return undefined;
      // Not in the book: the statistics as a value, list(total_pushes, maximum_depth), for checking.
      case 'statistics':
        return arrayToList([machine.totalPushes, machine.maxDepth]);
      default:
        return fail(`Unknown request -- stack: ${stringify(message)}`);
    }
  });
  const dispatch = primitive('machine', 1, (message) => {
    switch (message) {
      case 'start':
        return machine.start();
      case 'allocate_register':
        return primitive('allocate_register', 1, (name) => {
          machine.allocateRegister(String(name));
          return 'register allocated';
        });
      case 'get_register':
        return primitive('get_register', 1, (name) => registerValue(String(name)));
      case 'install_operations':
        return primitive('install_operations', 1, (ops) => {
          machine.installOperations(ops);
          return undefined;
        });
      case 'stack':
        return stack;
      case 'operations':
        return arrayToList([...machine.operations].map(([name, fn]) => arrayToList([name, fn])));
      default:
        return fail(`Unknown request -- machine: ${stringify(message)}`);
    }
  });
  machines.set(dispatch, machine);
  return dispatch;
}

export function installMachines(env: Environment, primitives: readonly Primitive[], options: MachineHostOptions): void {
  const { display } = options;
  const put = (name: string, arity: number | null, impl: (...args: Value[]) => Value): void => {
    define(env, name, primitive(name, arity, impl));
  };

  put('make_machine', 3, (registerNames, ops, controller) => {
    const machine = new RegisterMachine({
      display,
      ...(options.maxInstructions !== undefined && { maxInstructions: options.maxInstructions }),
    });
    for (const name of strings(registerNames, 'The register names')) machine.allocateRegister(name);
    machine.installOperations(ops);
    machine.assemble(controller);
    options.onMachine?.(machine);
    return machineValue(machine);
  });

  // Assemble more code into a machine made by make_machine, as compile_and_go does (§5.5.7).
  put('assemble', 2, (controller, machine) => {
    const simulator = machineOf(machine);
    if (simulator === null) return fail(`assemble expects a machine made by make_machine, got ${stringify(machine)}`);
    return simulator.assemble(controller);
  });

  const inputs: string[] = [];
  put('set_inputs', 1, (items) => {
    inputs.splice(0, inputs.length, ...strings(items, 'The inputs'));
    return undefined;
  });

  const support = evaluatorSupport({
    primitives,
    constants: [
      ['math_PI', Math.PI],
      ['math_E', Math.E],
    ],
    display,
    read: () => inputs.shift() ?? null,
  });
  for (const [name, value] of support) define(env, name, value);

  const lookupGlobal = (name: string): Value => {
    const found = env.frame.bindings.get(name);
    return found === undefined ? fail(`eceval_operations: no function ${name}`) : found.value;
  };
  define(
    env,
    'eceval_operations',
    arrayToList(ECEVAL_OPERATION_NAMES.map((name) => arrayToList([name, lookupGlobal(name)]))),
  );
}
