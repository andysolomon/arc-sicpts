import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import { isLabel, type Value } from '../evaluator/values.ts';
import type { RegisterMachine } from '../machines/registerMachine.ts';
import {
  factorialMachineProgram,
  fibController,
  fibMachineProgram,
  gcdControllerProgram,
  gcdElaboratedProgram,
  gcdSubroutineProgram,
  gcdWithPromptProgram,
} from './machines.ts';
import { everyInstructionProgram, gcdFunctionAndMachineProgram } from './section-5-1.ts';

/** Run a program, keeping the machines it makes. */
const run = (source: string) => {
  const machines: RegisterMachine[] = [];
  const outcome = evaluate(source, { budget: 5_000_000, onMachine: (m) => machines.push(m) });
  if (outcome.status === 'error') throw outcome.error;
  if (outcome.status !== 'done') throw new Error(outcome.status);
  const machine = machines.at(-1);
  if (machine === undefined) throw new Error('the program made no machine');
  return { value: outcome.text, output: outcome.output, machine };
};

const fib = (n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2));

const factorialFor = (n: number) => factorialMachineProgram.replace('"n", 4)', `"n", ${n})`);
const fibFor = (n: number, program = fibMachineProgram) => program.replace('"n", 6)', `"n", ${n})`);

/** The machine's stack, top first, labels by name, each time execution reaches `label`. */
function stacksAt(source: string, label: string): Value[][] {
  const seen: Value[][] = [];
  const machines: RegisterMachine[] = [];
  evaluate(source, {
    budget: 5_000_000,
    onMachine: (m) => {
      machines.push(m);
      m.observers.push({
        before(machine, index) {
          if (machine.line(index)?.labels.includes(label)) {
            seen.push([...machine.stack].reverse().map(({ value }) => (isLabel(value) ? value.name : value)));
          }
        },
      });
    },
  });
  return seen;
}

/** The Fibonacci controller without the restore/save of continue in afterfib_n_1 (exercise 5.6). */
const fibWithoutExtraPair = fibMachineProgram.replace(
  fibController,
  fibController.replace(
    `restore("continue"),
          // set up to compute Fib(n - 2)
          assign("n", list(op("-"), reg("n"), constant(2))),
          save("continue"),`,
    `// set up to compute Fib(n - 2)
          assign("n", list(op("-"), reg("n"), constant(2))),`,
  ),
);

describe('section 5.1: designing register machines', () => {
  it('the GCD machine agrees with the gcd function, in 26 instructions for 206 and 40', () => {
    const { value, machine } = run(gcdFunctionAndMachineProgram);
    expect(value).toBe('[2, [2, null]]');
    expect(machine.instructionCount).toBe(26);
    expect(run(gcdControllerProgram).machine.instructionCount).toBe(26);
  });

  it('the GCD machine with prompt prints 2 and 6 for the queued inputs, then runs out of input', () => {
    const outcome = evaluate(gcdWithPromptProgram, { budget: 1_000_000 });
    expect(outcome.output).toEqual(['2', '6']);
    expect(outcome.status).toBe('error');
  });

  it('the elaborated GCD machine gets the same answer with many more instructions', () => {
    const { value, machine } = run(gcdElaboratedProgram);
    expect(value).toBe('2');
    expect(machine.instructionCount).toBe(90);
  });

  it('one gcd subroutine serves both callers', () => {
    expect(run(gcdSubroutineProgram).value).toBe('[2, [6, null]]');
  });

  it('the factorial machine pushes 2(n - 1) values, all on the stack at once', () => {
    expect(run(factorialMachineProgram).value).toBe('24');
    for (const n of [1, 2, 4, 6, 10]) {
      const { machine } = run(factorialFor(n));
      expect([machine.totalPushes, machine.maxDepth]).toEqual([2 * (n - 1), 2 * (n - 1)]);
    }
  });

  it('the Fibonacci machine pushes 4(Fib(n + 1) - 1) values, at most 2(n - 1) at once', () => {
    expect(run(fibMachineProgram).value).toBe('8');
    for (const n of [2, 3, 6, 10]) {
      const { value, machine } = run(fibFor(n));
      expect(value).toBe(String(fib(n)));
      expect([machine.totalPushes, machine.maxDepth]).toEqual([4 * (fib(n + 1) - 1), 2 * (n - 1)]);
    }
    const { machine } = run(fibFor(6));
    expect([machine.totalPushes, machine.maxDepth]).toEqual([48, 10]);
  });

  it('the factorial stack at its deepest for n = 4, and the stacks exercise 5.5 asks about', () => {
    expect(stacksAt(factorialMachineProgram, 'base_case')[0]).toEqual([2, 'after_fact', 3, 'after_fact', 4, 'fact_done']);
    expect(stacksAt(factorialFor(3), 'base_case')[0]).toEqual([2, 'after_fact', 3, 'fact_done']);
    expect(stacksAt(fibFor(3), 'immediate_answer')[0]).toEqual([2, 'afterfib_n_1', 3, 'fib_done']);
    expect(stacksAt(fibFor(3), 'afterfib_n_2')[0]).toEqual([1, 'afterfib_n_1', 3, 'fib_done']);
  });

  it('exercise 5.6: the book machine pushes 352 values for Fib(10); without the extra pair, 3(Fib(n + 1) - 1)', () => {
    expect(run(fibFor(10)).machine.totalPushes).toBe(352);
    expect(fibWithoutExtraPair).not.toBe(fibMachineProgram);
    for (const n of [0, 1, 2, 6, 10]) {
      const { value, machine } = run(fibFor(n, fibWithoutExtraPair));
      expect(value).toBe(String(fib(n)));
      expect(machine.totalPushes).toBe(3 * Math.max(0, fib(n + 1) - 1));
      expect(machine.maxDepth).toBe(run(fibFor(n)).machine.maxDepth);
    }
    expect(run(fibFor(10, fibWithoutExtraPair)).machine.totalPushes).toBe(264);
  });

  it('the instruction tour sums 1 to 4, printing each partial sum', () => {
    const { value, output, machine } = run(everyInstructionProgram);
    expect(value).toBe('10');
    expect(output).toEqual(['1', '3', '6', '10']);
    expect([machine.totalPushes, machine.maxDepth]).toEqual([8, 8]);
    const kinds = new Set(machine.code.flatMap((entry) => (entry === null ? [] : [entry.line.instruction.type])));
    expect([...kinds].sort()).toEqual(['assign', 'branch', 'go_to', 'perform', 'restore', 'save', 'test']);
  });
});
