import { describe, expect, it } from 'vitest';
import { evaluate } from '../evaluator/evaluate.ts';
import {
  celsiusFahrenheitProgram,
  circuitAdderDefinitions,
  circuitAgendaDefinitions,
  circuitAgendaProgram,
  circuitGateDefinitions,
  circuitQueueDefinitions,
  circuitSimulationDefinitions,
  circuitSimulatorDefinitions,
  circuitWireDefinitions,
  constraintContradictionProgram,
  constraintNetworkProgram,
  fullAdderSimulationProgram,
  halfAdderSimulationProgram,
  halfAdderSimulationRun,
  halfAdderWiresProgram,
} from './simulation.ts';

const run = (source: string) => evaluate(source, { budget: 2_000_000 });

describe('section 3.3.4: a simulator for digital circuits', () => {
  it('runs the agenda in order of time, and first come first served within a time', () => {
    expect(run(circuitAgendaProgram)).toMatchObject({
      status: 'done',
      value: 5,
      output: ['list(2, 3, 5)', '"at 2"', '"at 3"', '"at 5, first"', '"at 5, second"'],
    });
  });

  it("prints exactly the book's sample simulation of the half-adder", () => {
    expect(run(halfAdderSimulationProgram)).toMatchObject({
      status: 'done',
      output: [
        '"sum 0, new value = 0"',
        '"carry 0, new value = 0"',
        '"sum 8, new value = 1"',
        '"carry 11, new value = 1"',
        '"sum 16, new value = 0"',
      ],
    });
  });

  it('settles the inverter first, then follows a and b through every wire of the half-adder', () => {
    const outcome = run(halfAdderWiresProgram);
    expect(outcome.status).toBe('done');
    expect(outcome.output.slice(6)).toEqual([
      '"e 2, new value = 1"',
      '"a 5, new value = 1"',
      '"d 10, new value = 1"',
      '"s 13, new value = 1"',
      '"b 13, new value = 1"',
      '"c 16, new value = 1"',
      '"e 18, new value = 0"',
      '"s 21, new value = 0"',
    ]);
  });

  it('adds 1 + 1 + 1 in a full-adder: sum 1, carry 1', () => {
    const outcome = run(fullAdderSimulationProgram);
    expect(outcome.status).toBe('done');
    expect(outcome.output.slice(-4)).toEqual([
      '"c_out 13, new value = 1"',
      '"sum 13, new value = 1"',
      '"sum 21, new value = 0"',
      '"sum 21, new value = 1"',
    ]);
  });

  it('computes every row of the full-adder truth table', () => {
    const table = `${circuitSimulatorDefinitions}
function add_bits(x, y, z) {
  const a = make_wire();
  const b = make_wire();
  const c_in = make_wire();
  const sum = make_wire();
  const c_out = make_wire();
  full_adder(a, b, c_in, sum, c_out);
  set_signal(a, x);
  set_signal(b, y);
  set_signal(c_in, z);
  propagate();
  return 2 * get_signal(c_out) + get_signal(sum);
}
list(add_bits(0, 0, 0), add_bits(1, 0, 0), add_bits(0, 1, 1), add_bits(1, 1, 0), add_bits(1, 1, 1));
`;
    const outcome = run(table);
    expect(outcome.status === 'done' && outcome.text).toBe('[0, [1, [2, [2, [3, null]]]]]');
  });
});

describe('exercises 3.31 and 3.32: why the simulator is built the way it is', () => {
  const simulator = (wires: string, queue: string) =>
    [queue, circuitAgendaDefinitions, wires, circuitSimulationDefinitions, circuitGateDefinitions, circuitAdderDefinitions].join('\n');

  it('without running each new action at once, the half-adder never settles: only the carry is printed', () => {
    const lazy = circuitWireDefinitions.replace('    fun();\n', '');
    expect(lazy).not.toBe(circuitWireDefinitions);
    const outcome = run(`${simulator(lazy, circuitQueueDefinitions)}\n${halfAdderSimulationRun}`);
    expect(outcome).toMatchObject({ status: 'done', output: ['"carry 11, new value = 1"'] });
  });

  const andGateRace = `
const a1 = make_wire();
const a2 = make_wire();
const out = make_wire();
and_gate(a1, a2, out);
set_signal(a2, 1);
propagate();
set_signal(a1, 1);
set_signal(a2, 0);
propagate();
get_signal(out);
`;

  it('an and-gate whose inputs go from 0, 1 to 1, 0 at once ends at 0 with queues, and at 1 with stacks', () => {
    const fifo = run(`${simulator(circuitWireDefinitions, circuitQueueDefinitions)}${andGateRace}`);
    expect(fifo).toMatchObject({ status: 'done', value: 0 });
    // A stack: insert at the front, so the last action scheduled runs first.
    const stack = circuitQueueDefinitions.replace(
      /function insert_queue\(queue, item\) \{[\s\S]*?\n\}\n/,
      `function insert_queue(queue, item) {
  const new_pair = pair(item, front_ptr(queue));
  if (is_empty_queue(queue)) {
    set_rear_ptr(queue, new_pair);
  } else {}
  set_front_ptr(queue, new_pair);
  return queue;
}
`,
    );
    expect(stack).not.toBe(circuitQueueDefinitions);
    const lifo = run(`${simulator(circuitWireDefinitions, stack)}${andGateRace}`);
    expect(lifo).toMatchObject({ status: 'done', value: 1 });
  });
});

describe('section 3.3.5: propagation of constraints', () => {
  it("converts 25 °C to 77 °F and, after forgetting, 212 °F to 100 °C, as in the book's run", () => {
    expect(run(celsiusFahrenheitProgram)).toMatchObject({
      status: 'done',
      output: [
        '"Probe: Celsius temp = 25"',
        '"Probe: Fahrenheit temp = 77"',
        '"Probe: Celsius temp = ?"',
        '"Probe: Fahrenheit temp = ?"',
        '"Probe: Fahrenheit temp = 212"',
        '"Probe: Celsius temp = 100"',
      ],
    });
  });

  it('signals a contradiction when F is set while C still determines it', () => {
    const outcome = run(constraintContradictionProgram);
    expect(outcome.status).toBe('error');
    expect(outcome.status === 'error' && outcome.error.message).toMatch(/\[77, \[212, null\]\] contradiction/);
  });

  it('shows the values arriving at every connector of the network, constants first', () => {
    const outcome = run(constraintNetworkProgram);
    expect(outcome.status).toBe('done');
    expect(outcome.output.map((line) => line.replace(/^"Probe: |"$/g, ''))).toEqual([
      'w = 9',
      'x = 5',
      'y = 32',
      'F = 77',
      'v = 45',
      'u = 225',
      'C = 25',
      'F = ?',
      'v = ?',
      'u = ?',
      'C = ?',
      'C = 100',
      'u = 900',
      'v = 180',
      'F = 212',
    ]);
  });
});
