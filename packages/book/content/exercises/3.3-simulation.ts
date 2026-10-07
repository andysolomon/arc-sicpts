import {
  circuitAdderDefinitions,
  circuitAgendaDefinitions,
  circuitGateDefinitions,
  circuitInverterAndDefinitions,
  circuitLogicDefinitions,
  circuitMachineryDefinitions,
  circuitQueueDefinitions,
  circuitSimulationDefinitions,
  circuitSimulatorDefinitions,
  circuitWireDefinitions,
  constraintSystemDefinitions,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §3.3.4–§3.3.5. Each export is an ExerciseSpec (see ./spec.ts). */

/** Build a two-input gate on fresh wires, give it inputs x and y, and report the settled output or how long it took. */
const gateHelpers = `function settled_output(gate, x, y) {
  const a = make_wire();
  const b = make_wire();
  const out = make_wire();
  gate(a, b, out);
  set_signal(a, x);
  set_signal(b, y);
  propagate();
  return get_signal(out);
}

function output_delay(gate, x, y) {
  const a = make_wire();
  const b = make_wire();
  const out = make_wire();
  gate(a, b, out);
  propagate();
  const start = current_time(the_agenda);
  let changed = start;
  add_action(out, () => { changed = current_time(the_agenda); });
  set_signal(a, x);
  set_signal(b, y);
  propagate();
  return changed - start;
}
`;

/** The simulator without an or-gate: wires, agenda, inverter and and-gate. */
const withoutOrGate = `${circuitMachineryDefinitions}
${circuitLogicDefinitions}
${circuitInverterAndDefinitions}
${gateHelpers}`;

export const exercise_3_28: ExerciseSpec = {
  id: '3.28',
  prelude: withoutOrGate,
  starter: `// make_wire, get_signal, set_signal, add_action, after_delay, propagate,
// logical_or (and logical_and, logical_not) and or_gate_delay are provided.

function or_gate(a1, a2, output) {
  // your answer
}
`,
  tests: [
    { name: '0 or 0 is 0', kind: 'value', expr: 'settled_output(or_gate, 0, 0)', expected: 0 },
    { name: '1 or 0 is 1', kind: 'value', expr: 'settled_output(or_gate, 1, 0)', expected: 1 },
    { name: '0 or 1 is 1', kind: 'value', expr: 'settled_output(or_gate, 0, 1)', expected: 1 },
    { name: '1 or 1 is 1', kind: 'value', expr: 'settled_output(or_gate, 1, 1)', expected: 1 },
    { name: 'the output changes or_gate_delay after an input', kind: 'value', expr: 'output_delay(or_gate, 0, 1) === or_gate_delay', expected: true },
  ],
  solution: `function or_gate(a1, a2, output) {
  function or_action_function() {
    const new_value = logical_or(get_signal(a1), get_signal(a2));
    after_delay(or_gate_delay, () => set_signal(output, new_value));
  }
  add_action(a1, or_action_function);
  add_action(a2, or_action_function);
  return "ok";
}
`,
};

export const exercise_3_29: ExerciseSpec = {
  id: '3.29',
  prelude: withoutOrGate,
  starter: `// make_wire, and_gate, inverter, inverter_delay and and_gate_delay are provided.

// An or-gate built from and-gates and inverters, with no or of its own.
function or_gate(a1, a2, output) {
  // your answer
}

// The delay of your or-gate, in terms of inverter_delay and and_gate_delay.
const compound_or_gate_delay = undefined;
`,
  tests: [
    { name: '0 or 0 is 0', kind: 'value', expr: 'settled_output(or_gate, 0, 0)', expected: 0 },
    { name: '1 or 0 is 1', kind: 'value', expr: 'settled_output(or_gate, 1, 0)', expected: 1 },
    { name: '0 or 1 is 1', kind: 'value', expr: 'settled_output(or_gate, 0, 1)', expected: 1 },
    { name: '1 or 1 is 1', kind: 'value', expr: 'settled_output(or_gate, 1, 1)', expected: 1 },
    { name: 'built from one and-gate', kind: 'calls', call: 'or_gate(make_wire(), make_wire(), make_wire())', fn: 'and_gate', atMost: 1 },
    { name: 'and at most three inverters', kind: 'calls', call: 'or_gate(make_wire(), make_wire(), make_wire())', fn: 'inverter', atMost: 3 },
    { name: 'the delay you give is the one the simulator measures', kind: 'value', expr: 'output_delay(or_gate, 1, 0) === compound_or_gate_delay', expected: true },
    { name: 'the delay in terms of the gates', kind: 'value', expr: 'compound_or_gate_delay === 2 * inverter_delay + and_gate_delay', expected: true },
  ],
  solution: `// a or b is not (not a and not b).
function or_gate(a1, a2, output) {
  const not_a1 = make_wire();
  const not_a2 = make_wire();
  const both_off = make_wire();
  inverter(a1, not_a1);
  inverter(a2, not_a2);
  and_gate(not_a1, not_a2, both_off);
  inverter(both_off, output);
  return "ok";
}

const compound_or_gate_delay = 2 * inverter_delay + and_gate_delay;
`,
};

export const exercise_3_30: ExerciseSpec = {
  id: '3.30',
  prelude: `${circuitSimulatorDefinitions}
function wires(n) {
  return n === 0 ? null : pair(make_wire(), wires(n - 1));
}

// Set the wires (most significant first) to the n-bit binary digits of k.
function set_number(ws, k, n) {
  if (n > 0) {
    set_signal(head(ws), math_floor(k / math_pow(2, n - 1)) % 2);
    set_number(tail(ws), k, n - 1);
  } else {}
}

function read_number(ws, so_far) {
  return is_null(ws) ? so_far : read_number(tail(ws), 2 * so_far + get_signal(head(ws)));
}

function add_with_ripple(ripple_carry_adder, n, x, y) {
  const A = wires(n);
  const B = wires(n);
  const S = wires(n);
  const C = make_wire();
  ripple_carry_adder(A, B, S, C);
  set_number(A, x, n);
  set_number(B, y, n);
  propagate();
  return get_signal(C) * math_pow(2, n) + read_number(S, 0);
}
`,
  starter: `// make_wire, full_adder and the rest of the simulator are provided.
// A, B and S are lists of n wires, most significant bit first; C is the carry out.

function ripple_carry_adder(A, B, S, C) {
  // your answer
}
`,
  tests: [
    { name: '1-bit: 1 + 1', kind: 'value', expr: 'add_with_ripple(ripple_carry_adder, 1, 1, 1)', expected: 2 },
    { name: '4-bit: 5 + 9', kind: 'value', expr: 'add_with_ripple(ripple_carry_adder, 4, 5, 9)', expected: 14 },
    { name: '4-bit: 15 + 1 carries out', kind: 'value', expr: 'add_with_ripple(ripple_carry_adder, 4, 15, 1)', expected: 16 },
    { name: '6-bit: 45 + 27', kind: 'value', expr: 'add_with_ripple(ripple_carry_adder, 6, 45, 27)', expected: 72 },
    { name: '8-bit: 200 + 100', kind: 'value', expr: 'add_with_ripple(ripple_carry_adder, 8, 200, 100)', expected: 300 },
    { name: 'one full-adder per bit', kind: 'calls', call: 'ripple_carry_adder(wires(4), wires(4), wires(4), make_wire())', fn: 'full_adder', atMost: 4 },
  ],
  budget: 3_000_000,
  solution: `function ripple_carry_adder(A, B, S, C) {
  const c_in = make_wire();
  if (!is_null(tail(A))) {
    ripple_carry_adder(tail(A), tail(B), tail(S), c_in);
  } else {}
  full_adder(head(A), head(B), c_in, head(S), C);
  return "ok";
}
`,
};

/** Wires whose `accept_action_function` only remembers the new action, without running it. */
const lazyWireDefinitions = circuitWireDefinitions.replace('    action_functions = pair(fun, action_functions);\n    fun();\n', '    action_functions = pair(fun, action_functions);\n');
if (lazyWireDefinitions === circuitWireDefinitions) throw new Error('exercise 3.31: accept_action_function not found');

export const exercise_3_31: ExerciseSpec = {
  id: '3.31',
  prelude: `${circuitQueueDefinitions}
${circuitAgendaDefinitions}
${lazyWireDefinitions}
${circuitSimulationDefinitions}
${circuitGateDefinitions}
${circuitAdderDefinitions}`,
  starter: `// Suppose accept_action_function were declared as
//
//   function accept_action_function(fun) {
//     action_functions = pair(fun, action_functions);
//   }
//
// and the half-adder sample simulation were run as in the text:
// probe sum and carry, build the half-adder, set input_1 to 1 and
// propagate, then set input_2 to 1 and propagate.

// Every line the probes print, in order, e.g. list("sum 0, new value = 0").
const printed = undefined;

// The signal on sum once input_1 is 1 and the first propagate is done.
const sum_after_first_propagate = undefined;
`,
  tests: [
    { name: 'what the probes print', kind: 'value', expr: 'equal(printed, list("carry 11, new value = 1"))', expected: true },
    { name: 'the sum of 1 + 0', kind: 'value', expr: 'sum_after_first_propagate', expected: 0 },
  ],
  solution: `// Nothing runs when an action is added, so the probes print nothing at
// first, and the inverter never sets e to 1. Setting input_1 changes d,
// but the and-gate for sum sees e = 0. Only the carry ever changes.
const printed = list("carry 11, new value = 1");
const sum_after_first_propagate = 0;
`,
};

export const exercise_3_32: ExerciseSpec = {
  id: '3.32',
  prelude: circuitSimulatorDefinitions,
  starter: `// An and-gate's inputs are 0 and 1, and the circuit has settled. Then,
// at the same time, a1 changes to 1 and a2 changes to 0:
//
//   const a1 = make_wire();
//   const a2 = make_wire();
//   const out = make_wire();
//   and_gate(a1, a2, out);
//   set_signal(a2, 1);
//   propagate();
//   set_signal(a1, 1);
//   set_signal(a2, 0);
//   propagate();

// The signal on out at the end, with the agenda's segments as queues (first in, first out).
const fifo_output = undefined;

// The signal on out at the end if each segment were a stack (last in, first out).
const lifo_output = undefined;
`,
  tests: [
    { name: 'first in, first out', kind: 'value', expr: 'fifo_output', expected: 0 },
    { name: 'last in, first out', kind: 'value', expr: 'lifo_output', expected: 1 },
  ],
  solution: `// Setting a1 to 1 schedules "out becomes 1" (1 and 1); setting a2 to 0
// then schedules "out becomes 0" (1 and 0), both and_gate_delay later.
// In order, the last word is 0. Reversed, the stale 1 is set last.
const fifo_output = 0;
const lifo_output = 1;
`,
};

/** Build a three-terminal constraint box, tell two terminals, and read the third. */
const constraintHelpers = `function third_of(box, a_value, b_value, c_value) {
  const a = make_connector();
  const b = make_connector();
  const c = make_connector();
  box(a, b, c);
  if (a_value !== false) { set_value(a, a_value, "user"); } else {}
  if (b_value !== false) { set_value(b, b_value, "user"); } else {}
  if (c_value !== false) { set_value(c, c_value, "user"); } else {}
  return a_value === false ? get_value(a) : b_value === false ? get_value(b) : get_value(c);
}
`;

export const exercise_3_33: ExerciseSpec = {
  id: '3.33',
  prelude: `${constraintSystemDefinitions}
${constraintHelpers}`,
  starter: `// make_connector, adder, multiplier and constant are provided.

// The constraint that c is the average of a and b.
function averager(a, b, c) {
  // your answer
}
`,
  tests: [
    { name: 'c from a and b', kind: 'value', expr: 'third_of(averager, 10, 20, false)', expected: 15 },
    { name: 'b from a and c', kind: 'value', expr: 'third_of(averager, 10, false, 15)', expected: 20 },
    { name: 'a from b and c', kind: 'value', expr: 'third_of(averager, false, 3, 4)', expected: 5 },
    { name: 'built from one adder', kind: 'calls', call: 'averager(make_connector(), make_connector(), make_connector())', fn: 'adder', atMost: 1 },
  ],
  solution: `// a + b = u and u = 2c.
function averager(a, b, c) {
  const u = make_connector();
  const two = make_connector();
  adder(a, b, u);
  multiplier(c, two, u);
  constant(2, two);
  return "ok";
}
`,
};

export const exercise_3_34: ExerciseSpec = {
  id: '3.34',
  prelude: constraintSystemDefinitions,
  starter: `// Louis's squarer:
//
//   function squarer(a, b) {
//     return multiplier(a, a, b);
//   }
//
// const a = make_connector();
// const b = make_connector();
// squarer(a, b);

// The value of b after set_value(a, 3, "user").
const b_when_a_is_3 = undefined;

// has_value(a) after setting b instead: set_value(b, 9, "user") on a fresh network.
const a_has_value_when_b_is_9 = undefined;
`,
  tests: [
    { name: 'from a to b', kind: 'value', expr: 'b_when_a_is_3', expected: 9 },
    { name: 'from b to a', kind: 'value', expr: 'a_has_value_when_b_is_9', expected: false },
  ],
  solution: `// Given a, the multiplier knows both factors: b = 9. Given only b, it
// knows the product and neither factor, and none of its rules apply.
const b_when_a_is_3 = 9;
const a_has_value_when_b_is_9 = false;
`,
};

export const exercise_3_35: ExerciseSpec = {
  id: '3.35',
  prelude: `${constraintSystemDefinitions}
function square_root_of(squarer, b_value) {
  const a = make_connector();
  const b = make_connector();
  squarer(a, b);
  set_value(b, b_value, "user");
  return get_value(a);
}

function square_of(squarer, a_value) {
  const a = make_connector();
  const b = make_connector();
  squarer(a, b);
  set_value(a, a_value, "user");
  return get_value(b);
}

function forgets(squarer) {
  const a = make_connector();
  const b = make_connector();
  squarer(a, b);
  set_value(a, 5, "user");
  forget_value(a, "user");
  const forgotten = !has_value(b);
  set_value(b, 49, "user");
  return forgotten && get_value(a) === 7;
}
`,
  starter: `// make_connector, has_value, get_value, set_value, forget_value,
// connect and error are provided.

function squarer(a, b) {
  function process_new_value() {
    if (has_value(b)) {
      if (get_value(b) < 0) {
        error(get_value(b), "square less than 0 -- squarer");
      } else {
        // alternative1
      }
    } else {
      // alternative2
    }
  }
  function process_forget_value() {
    // body1
  }
  function me(request) {
    // body2
  }
  // statements
  return me;
}
`,
  tests: [
    { name: 'the root of 9', kind: 'value', expr: 'square_root_of(squarer, 9)', expected: 3 },
    { name: 'the root of 2', kind: 'value', expr: 'square_root_of(squarer, 2) === math_sqrt(2)', expected: true },
    { name: 'the square of 4', kind: 'value', expr: 'square_of(squarer, 4)', expected: 16 },
    { name: 'forgets, then works the other way', kind: 'value', expr: 'forgets(squarer)', expected: true },
  ],
  solution: `function squarer(a, b) {
  function process_new_value() {
    if (has_value(b)) {
      if (get_value(b) < 0) {
        error(get_value(b), "square less than 0 -- squarer");
      } else {
        set_value(a, math_sqrt(get_value(b)), me);
      }
    } else {
      if (has_value(a)) {
        set_value(b, get_value(a) * get_value(a), me);
      } else {}
    }
  }
  function process_forget_value() {
    forget_value(a, me);
    forget_value(b, me);
    process_new_value();
  }
  function me(request) {
    if (request === "I have a value.") {
      process_new_value();
    } else if (request === "I lost my value.") {
      process_forget_value();
    } else {
      error(request, "unknown request -- squarer");
    }
  }
  connect(a, me);
  connect(b, me);
  return me;
}
`,
};

export const exercise_3_37: ExerciseSpec = {
  id: '3.37',
  prelude: `${constraintSystemDefinitions}
function c_plus(x, y) {
  const z = make_connector();
  adder(x, y, z);
  return z;
}

function fahrenheit_of(celsius_fahrenheit_converter, celsius) {
  const C = make_connector();
  const F = celsius_fahrenheit_converter(C);
  set_value(C, celsius, "user");
  return get_value(F);
}

function celsius_of(celsius_fahrenheit_converter, fahrenheit) {
  const C = make_connector();
  const F = celsius_fahrenheit_converter(C);
  set_value(F, fahrenheit, "user");
  return get_value(C);
}

function backwards(op, z_value, y_value) {
  const x = make_connector();
  const y = make_connector();
  const z = op(x, y);
  set_value(z, z_value, "user");
  set_value(y, y_value, "user");
  return get_value(x);
}
`,
  starter: `// make_connector, adder, multiplier, constant and c_plus are provided:
//
//   function c_plus(x, y) {
//     const z = make_connector();
//     adder(x, y, z);
//     return z;
//   }

function c_minus(x, y) {
  // your answer
}

function c_times(x, y) {
  // your answer
}

function c_divide(x, y) {
  // your answer
}

function cv(value) {
  // your answer
}

function celsius_fahrenheit_converter(x) {
  return c_plus(c_times(c_divide(cv(9), cv(5)), x), cv(32));
}
`,
  tests: [
    { name: '25 °C is 77 °F', kind: 'value', expr: 'fahrenheit_of(celsius_fahrenheit_converter, 25)', expected: 77 },
    { name: '212 °F is 100 °C', kind: 'value', expr: 'celsius_of(celsius_fahrenheit_converter, 212)', expected: 100 },
    { name: 'cv is a constant', kind: 'value', expr: 'get_value(cv(7))', expected: 7 },
    { name: 'c_minus works backwards: x − 3 = 4', kind: 'value', expr: 'backwards(c_minus, 4, 3)', expected: 7 },
    { name: 'c_times works backwards: x · 3 = 12', kind: 'value', expr: 'backwards(c_times, 12, 3)', expected: 4 },
    { name: 'c_divide works backwards: x / 4 = 3', kind: 'value', expr: 'backwards(c_divide, 3, 4)', expected: 12 },
  ],
  solution: `function c_minus(x, y) {
  const z = make_connector();
  adder(z, y, x);
  return z;
}

function c_times(x, y) {
  const z = make_connector();
  multiplier(x, y, z);
  return z;
}

function c_divide(x, y) {
  const z = make_connector();
  multiplier(z, y, x);
  return z;
}

function cv(value) {
  const z = make_connector();
  constant(value, z);
  return z;
}

function celsius_fahrenheit_converter(x) {
  return c_plus(c_times(c_divide(cv(9), cv(5)), x), cv(32));
}
`,
};
