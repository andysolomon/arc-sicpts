import {
  ecevalControllerSource,
  ecevalMachineSource,
  evaluate,
  factorialMachineProgram,
  gcdMachineProgram,
  recordMachine,
  type MachineRecorder,
  type MachineView,
} from '@sicp/lab';
import { describe, expect, it } from 'vitest';
import { fitsDataPaths, layoutDataPaths } from '../src/anim/model/dataPathLayout.ts';
import { isEvaluator, landmarks, machineStates, mainRun } from '../src/anim/model/machine.ts';
import { comparePlan } from '../src/anim/scenes/CompareScene.tsx';

/** The record of the last machine a program makes, as the worker would send it. */
function viewOf(source: string, prelude?: string): MachineView {
  const recorders: MachineRecorder[] = [];
  evaluate(source, {
    budget: 2_000_000,
    onMachine: (machine) => void recorders.push(recordMachine(machine)),
    ...(prelude !== undefined && { prelude }),
  });
  const recorder = recorders.at(-1);
  if (recorder === undefined) throw new Error('no machine');
  return recorder.view();
}

describe('register machine keyframes', () => {
  it('replay the GCD machine instruction by instruction, with a sentence for each', () => {
    const view = viewOf(gcdMachineProgram);
    const run = mainRun(view);
    if (run === null) throw new Error('no run');
    const states = machineStates(view, run);
    expect(states).toHaveLength(27);
    expect(states[0]?.registers.get('a')).toEqual({ text: '206', kind: 'number' });
    expect(states.at(-1)?.registers.get('a')).toEqual({ text: '2', kind: 'number' });
    expect(states[1]?.caption).toBe('Test `=(b, 0)`: the flag is `false`.');
    expect(states[3]?.caption).toBe('Push `t<-rem`: `t` gets `6`.');
    expect(states[4]?.caption).toBe('Push `a<-b`: `a` gets `40`.');
    expect(states.at(-1)?.caption).toMatch(/run off its end: done after 26 instructions/);
  });

  it('rebuild the stack of the factorial machine from pushes and pops', () => {
    const view = viewOf(factorialMachineProgram);
    const run = mainRun(view);
    if (run === null) throw new Error('no run');
    const states = machineStates(view, run);
    const deepest = Math.max(...states.map((s) => s.stack.length));
    expect(deepest).toBe(6);
    const atBase = states.find((s) => s.stack.length === 6);
    expect(atBase?.stack.map((item) => item.register)).toEqual(['continue', 'n', 'continue', 'n', 'continue', 'n']);
    expect(states.at(-1)?.stack).toEqual([]);
    expect(states.at(-1)?.registers.get('val')?.text).toBe('24');
  });

  it('lay out small machines’ data paths and leave large ones to the controller', () => {
    const gcd = viewOf(gcdMachineProgram);
    expect(fitsDataPaths(gcd.dataPaths)).toBe(true);
    const layout = layoutDataPaths(gcd.dataPaths);
    expect(layout.registers.map((r) => r.name)).toEqual(['a', 'b', 't']);
    expect(layout.wires.filter((w) => w.button !== null).map((w) => w.button?.name)).toEqual(['t<-rem', 'a<-b', 'b<-t']);
    const eceval = viewOf('set_inputs(list("1 + 2;")); start(eceval);', ecevalControllerSource + ecevalMachineSource);
    expect(isEvaluator(eceval)).toBe(true);
    expect(fitsDataPaths(eceval.dataPaths)).toBe(false);
  });

  it('key the evaluator’s long runs to the blocks it enters', () => {
    const view = viewOf('set_inputs(list("(x => x * 2)(21);")); start(eceval);', ecevalControllerSource + ecevalMachineSource);
    const run = mainRun(view);
    if (run === null) throw new Error('no run');
    const states = machineStates(view, run);
    const frames = landmarks(view, states);
    expect(frames[0]).toBe(0);
    expect(frames.at(-1)).toBe(states.length - 1);
    expect(frames.length).toBeLessThan(states.length / 2);
    expect(states.at(-1)?.registers.get('val')).toEqual({ text: '42', kind: 'number' });
  });
});

describe('the comparison of interpreted and compiled code', () => {
  it('reads the declarations and the sizes from the program', () => {
    expect(comparePlan('function f(n) { return n; }\nf(2);\nf(5);\nconst x = 1;')).toEqual({
      definition: 'function f(n) { return n; }\nconst x = 1;',
      call: 'f',
      ns: [2, 5],
    });
    expect(comparePlan('f(2);')).toBeNull();
    expect(comparePlan('function f(n) {')).toBeNull();
  });
});
