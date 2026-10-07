import { describe, expect, it } from 'vitest';
import { evaluate, type PrepareOptions } from '../evaluator/evaluate.ts';
import { stringify } from '../evaluator/values.ts';
import {
  factorialMachineProgram,
  fibMachineProgram,
  gcdElaboratedProgram,
  gcdMachineProgram,
  gcdControllerProgram,
  gcdSubroutineProgram,
  gcdWithPromptProgram,
  monitoredFactorialProgram,
} from './machines.ts';
import { simulatorFunctions, simulatorSource, simulatorWithout } from './simulator.ts';

const run = (source: string, options: PrepareOptions = {}) => {
  const outcome = evaluate(source, { budget: 5_000_000, ...options });
  if (outcome.status === 'error') throw outcome.error;
  if (outcome.status !== 'done') throw new Error(outcome.status);
  return { value: outcome.text, output: outcome.output };
};

const onSource = (source: string) => run(source, { prelude: simulatorSource });

describe('section 5.1: the machines of the chapter', () => {
  it('compute what their functions compute, on the Laboratory simulator', () => {
    expect(run(gcdControllerProgram).value).toBe('2');
    expect(run(gcdMachineProgram).value).toBe('2');
    expect(run(gcdElaboratedProgram).value).toBe('2');
    expect(run(gcdSubroutineProgram).value).toBe('[2, [6, null]]');
    expect(run(factorialMachineProgram).value).toBe('24');
    expect(run(fibMachineProgram).value).toBe('8');
  });

  it('read their inputs from the queue that stands in for prompt', () => {
    const outcome = evaluate(gcdWithPromptProgram, { budget: 1_000_000 });
    expect(outcome.output).toEqual(['2', '6']);
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.error.message).toMatch(/no more input/);
  });

  it('report assembler errors the way the book names them', () => {
    const fails = (controller: string) => () => run(`make_machine(list("a"), list(), list(${controller}));`);
    expect(fails('go_to(label("nowhere"))')).toThrow(/Undefined label -- assemble: nowhere/);
    expect(fails('assign("b", constant(1))')).toThrow(/Unknown register: b/);
    expect(fails('assign("a", list(op("frobnicate")))')).toThrow(/Unknown operation -- assemble: frobnicate/);
    expect(fails('list("jump")')).toThrow(/Unknown instruction type -- assemble: list\("jump"\)/);
    expect(() => run('const m = make_machine(list("a"), list(), list(go_to(reg("a")))); start(m);')).toThrow(
      /go_to\(reg\("a"\)\) needs a label, but a holds "\*unassigned\*"/,
    );
  });
});

describe('section 5.2: the simulator written in Source', () => {
  it('runs every machine of §5.1 to the same result as the Laboratory simulator', () => {
    for (const program of [gcdControllerProgram, gcdMachineProgram, gcdElaboratedProgram, gcdSubroutineProgram, factorialMachineProgram, fibMachineProgram]) {
      expect(onSource(program).value).toBe(run(program).value);
    }
  });

  it('monitors the stack exactly as the Laboratory simulator does', () => {
    const lab = run(monitoredFactorialProgram).output;
    expect(lab).toEqual([
      '"factorial(3) = 6"',
      'total pushes = 4',
      'maximum depth = 4',
      '"factorial(6) = 720"',
      'total pushes = 10',
      'maximum depth = 10',
    ]);
    expect(onSource(monitoredFactorialProgram).output.map((line) => line.replace(/^"|"$/g, ''))).toEqual(
      lab.map((line) => line.replace(/^"|"$/g, '')),
    );
  });

  it('can be taken apart, so a reader can supply some of its functions', () => {
    const names = ['extract_labels'];
    const context = simulatorWithout(names);
    expect(context).not.toMatch(/function extract_labels\(/);
    expect(simulatorFunctions(names)).toMatch(/^function extract_labels\(controller, receive\)/);
    const reassembled = run(gcdMachineProgram, { context: `${context}\n${simulatorFunctions(names)}` });
    expect(reassembled.value).toBe('2');
  });

  it('resolves duplicated labels to the first occurrence, as exercise 5.8 asks', () => {
    const ambiguous = `const m = make_machine(list("a"), list(), list(
        "start", go_to(label("here")),
        "here", assign("a", constant(3)), go_to(label("there")),
        "here", assign("a", constant(4)), go_to(label("there")),
        "there"));
      start(m);
      get_register_contents(m, "a");`;
    expect(run(ambiguous).value).toBe('3');
    expect(onSource(ambiguous).value).toBe('3');
  });
});

describe('the Source library chapter 5 relies on', () => {
  it('has the list functions of §2.2 and §3.3', () => {
    expect(run('map(x => x * x, list(1, 2, 3));').value).toBe('[1, [4, [9, null]]]');
    expect(run('accumulate((x, y) => x + y, 0, list(1, 2, 3, 4));').value).toBe('10');
    expect(run('length(append(list(1, 2), list(3)));').value).toBe('3');
    expect(run('member(2, list(1, 2, 3));').value).toBe('[2, [3, null]]');
    expect(run('assoc("b", list(list("a", 1), list("b", 2)));').value).toBe('["b", [2, null]]');
    expect(run('is_undefined(assoc("c", list(list("a", 1))));').value).toBe('true');
    expect(run('const p = pair(1, 2); set_tail(p, 3); p;').value).toBe('[1, 3]');
  });

  it('applies functions in the underlying language with a list of arguments', () => {
    expect(run('apply_in_underlying_javascript((a, b) => a - b, list(5, 3));').value).toBe('2');
    expect(run('apply_in_underlying_javascript(math_max, list(1, 7, 3));').value).toBe('7');
  });

  it('reads back-quoted strings across lines', () => {
    expect(run('`a\nb`;').value).toBe(stringify('a\nb'));
  });

  it('reports errors inside library functions at the reader’s call', () => {
    const outcome = evaluate('const xs = list(1, 2);\nmap(x => x, 5);');
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.error.loc?.line).toBe(2);
  });
});
