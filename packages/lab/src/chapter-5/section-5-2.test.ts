import { describe, expect, it } from 'vitest';
import { evaluate, type PrepareOptions } from '../evaluator/evaluate.ts';
import type { RegisterMachine } from '../machines/registerMachine.ts';
import { factorialMachineProgram, gcdMachineProgram, gcdSubroutineProgram, monitoredFactorialProgram } from './machines.ts';
import {
  assemblyTimeErrorProgram,
  executionFunctionProgram,
  extractLabelsProgram,
  machineModelProgram,
  monitoredStackProgram,
  simulatorGcdProgram,
} from './section-5-2.ts';
import { simulatorSource } from './simulator.ts';

const run = (source: string, options: PrepareOptions = {}) => {
  const outcome = evaluate(source, { budget: 5_000_000, ...options });
  if (outcome.status === 'error') throw outcome.error;
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return { value: outcome.text, output: outcome.output, steps: outcome.steps };
};

const onSource = (source: string) => run(source, { prelude: simulatorSource });

describe('section 5.2: the examples on the simulator written in Source', () => {
  it('computes the GCD of 206 and 40, in many more evaluator steps than the Laboratory simulator', () => {
    const source = onSource(simulatorGcdProgram);
    const lab = run(gcdMachineProgram);
    expect(source.value).toBe('2');
    expect(lab.value).toBe('2');
    // §5.2 says the simulation is slow: the editor shows roughly 11 000 steps against 500.
    expect(source.steps).toBeGreaterThan(10_000);
    expect(source.steps).toBeLessThan(12_000);
    expect(lab.steps).toBeLessThan(500);
  });

  it('uses a register, a stack and a bare machine by hand (§5.2.1)', () => {
    const { value, output } = onSource(machineModelProgram);
    expect(output).toEqual(['"*unassigned*"', '206', '2', '1', '["initialize_stack", ["print_stack_statistics", null]]']);
    expect(value).toBe('40');
    expect(() => onSource('const s = make_stack(); pop(s);')).toThrow(/empty stack -- pop/);
  });

  it('shows what extract_labels passes to its continuation (§5.2.2)', () => {
    const { value, output } = onSource(extractLabelsProgram);
    expect(output).toEqual(['6', '["test_b", ["gcd_done", null]]', 'true', 'null', 'null']);
    expect(value).toBe('["test", [[["op", ["=", null]], [["reg", ["b", null]], [["constant", [0, null]], null]]], null]]');
  });

  it('calls one execution function by hand (§5.2.3)', () => {
    const { value, output } = onSource(executionFunctionProgram);
    expect(output).toEqual(['7', '11']);
    expect(value).toBe('["third", null]');
  });

  it('rejects an unknown operation at assembly time, before anything runs (§5.2.3)', () => {
    expect(() => onSource(assemblyTimeErrorProgram)).toThrow(/\* unknown operation -- assemble/);
  });

  it('counts pushes and the maximum depth (§5.2.4)', () => {
    expect(onSource(monitoredStackProgram).output).toEqual([
      '"total pushes = 4"',
      '"maximum depth = 3"',
      '"total pushes = 0"',
      '"maximum depth = 0"',
    ]);
    expect(onSource(monitoredFactorialProgram).output).toEqual([
      '"factorial(3) = 6"',
      '"total pushes = 4"',
      '"maximum depth = 4"',
      '"factorial(6) = 720"',
      '"total pushes = 10"',
      '"maximum depth = 10"',
    ]);
  });
});

describe('section 5.2: what the Laboratory simulator measures', () => {
  const lastMachine = (program: string): RegisterMachine => {
    let machine: RegisterMachine | null = null;
    run(program, { onMachine: (made) => void (machine = made) });
    if (machine === null) throw new Error('no machine');
    return machine;
  };

  it('executes 26 instructions for the GCD of 206 and 40, and 38 for the factorial of 4 (exercise 5.14)', () => {
    expect(lastMachine(gcdMachineProgram).instructionCount).toBe(26);
    expect(lastMachine(factorialMachineProgram).instructionCount).toBe(38);
  });

  it('keeps labels in registers as places in the controller (§5.2.2)', () => {
    expect(run(gcdSubroutineProgram).value).toBe('[2, [6, null]]');
  });

  it('makes 2(n - 1) pushes to a maximum depth of 2(n - 1) for the factorial of n (exercise 5.13)', () => {
    for (const n of [2, 3, 4, 5, 6, 10]) {
      const program = factorialMachineProgram.replace('"n", 4)', `"n", ${n})`);
      const { value } = run(`${program}\nfactorial_recursive_machine("stack")("statistics");`);
      expect(value).toBe(`[${2 * (n - 1)}, [${2 * (n - 1)}, null]]`);
    }
  });
});
