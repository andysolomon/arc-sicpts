/**
 * Programs of §3.3.4–§3.3.5 (circuits, constraints), shared by the Book's
 * examples and the Laboratory's tests.
 *
 * The digital-circuit simulator is split the way the book builds it: the queue
 * of §3.3.2 (repeated here so that this section stands alone), the agenda,
 * wires, gates, adders, and the simulation proper (`after_delay`, `propagate`,
 * `probe`). Each piece is a string of declarations; the programs compose them.
 */

/** §3.3.2's queue: a pair of pointers to the front and rear of an ordinary list. */
export const circuitQueueDefinitions = `function front_ptr(queue) {
  return head(queue);
}

function rear_ptr(queue) {
  return tail(queue);
}

function set_front_ptr(queue, item) {
  set_head(queue, item);
}

function set_rear_ptr(queue, item) {
  set_tail(queue, item);
}

function is_empty_queue(queue) {
  return is_null(front_ptr(queue));
}

function make_queue() {
  return pair(null, null);
}

function front_queue(queue) {
  return is_empty_queue(queue)
    ? error(queue, "front_queue called with an empty queue")
    : head(front_ptr(queue));
}

function insert_queue(queue, item) {
  const new_pair = pair(item, null);
  if (is_empty_queue(queue)) {
    set_front_ptr(queue, new_pair);
    set_rear_ptr(queue, new_pair);
  } else {
    set_tail(rear_ptr(queue), new_pair);
    set_rear_ptr(queue, new_pair);
  }
  return queue;
}

function delete_queue(queue) {
  if (is_empty_queue(queue)) {
    error(queue, "delete_queue called with an empty queue");
  } else {
    set_front_ptr(queue, tail(front_ptr(queue)));
    return queue;
  }
}
`;

/** The agenda: the current time, then a list of time segments, each a queue of actions due at that time. */
export const circuitAgendaDefinitions = `function make_time_segment(time, queue) {
  return pair(time, queue);
}

function segment_time(s) {
  return head(s);
}

function segment_queue(s) {
  return tail(s);
}

function make_agenda() {
  return list(0);
}

function current_time(agenda) {
  return head(agenda);
}

function set_current_time(agenda, time) {
  set_head(agenda, time);
}

function segments(agenda) {
  return tail(agenda);
}

function set_segments(agenda, segs) {
  set_tail(agenda, segs);
}

function first_segment(agenda) {
  return head(segments(agenda));
}

function rest_segments(agenda) {
  return tail(segments(agenda));
}

function is_empty_agenda(agenda) {
  return is_null(segments(agenda));
}

function add_to_agenda(time, action, agenda) {
  function belongs_before(segs) {
    return is_null(segs) || time < segment_time(head(segs));
  }
  function make_new_time_segment(time, action) {
    const q = make_queue();
    insert_queue(q, action);
    return make_time_segment(time, q);
  }
  function add_to_segments(segs) {
    if (segment_time(head(segs)) === time) {
      insert_queue(segment_queue(head(segs)), action);
    } else {
      const rest = tail(segs);
      if (belongs_before(rest)) {
        set_tail(segs, pair(make_new_time_segment(time, action), tail(segs)));
      } else {
        add_to_segments(rest);
      }
    }
  }
  const segs = segments(agenda);
  if (belongs_before(segs)) {
    set_segments(agenda, pair(make_new_time_segment(time, action), segs));
  } else {
    add_to_segments(segs);
  }
}

function remove_first_agenda_item(agenda) {
  const q = segment_queue(first_segment(agenda));
  delete_queue(q);
  if (is_empty_queue(q)) {
    set_segments(agenda, rest_segments(agenda));
  } else {}
}

function first_agenda_item(agenda) {
  if (is_empty_agenda(agenda)) {
    error("agenda is empty -- first_agenda_item");
  } else {
    const first_seg = first_segment(agenda);
    set_current_time(agenda, segment_time(first_seg));
    return front_queue(segment_queue(first_seg));
  }
}
`;

/** Wires: a computational object with a signal and the action functions to run when it changes. */
export const circuitWireDefinitions = `function make_wire() {
  let signal_value = 0;
  let action_functions = null;
  function set_my_signal(new_value) {
    if (signal_value !== new_value) {
      signal_value = new_value;
      return call_each(action_functions);
    } else {
      return "done";
    }
  }
  function accept_action_function(fun) {
    action_functions = pair(fun, action_functions);
    fun();
  }
  function dispatch(m) {
    return m === "get_signal"
      ? signal_value
      : m === "set_signal"
      ? set_my_signal
      : m === "add_action"
      ? accept_action_function
      : error(m, "unknown operation -- wire");
  }
  return dispatch;
}

function call_each(functions) {
  if (is_null(functions)) {
    return "done";
  } else {
    head(functions)();
    return call_each(tail(functions));
  }
}

function get_signal(wire) {
  return wire("get_signal");
}

function set_signal(wire, new_value) {
  return wire("set_signal")(new_value);
}

function add_action(wire, action_function) {
  return wire("add_action")(action_function);
}
`;

/** The logical functions behind the gates; the book leaves \`logical_and\` and \`logical_or\` to the reader. */
export const circuitLogicDefinitions = `function logical_not(s) {
  return s === 0
    ? 1
    : s === 1
    ? 0
    : error(s, "invalid signal");
}

function logical_and(s1, s2) {
  return s1 === 1 && s2 === 1
    ? 1
    : (s1 === 0 || s1 === 1) && (s2 === 0 || s2 === 1)
    ? 0
    : error(pair(s1, s2), "invalid signals");
}

function logical_or(s1, s2) {
  return s1 === 0 && s2 === 0
    ? 0
    : (s1 === 0 || s1 === 1) && (s2 === 0 || s2 === 1)
    ? 1
    : error(pair(s1, s2), "invalid signals");
}
`;

/** The inverter and the and-gate, as in the book. */
export const circuitInverterAndDefinitions = `function inverter(input, output) {
  function invert_input() {
    const new_value = logical_not(get_signal(input));
    after_delay(inverter_delay, () => set_signal(output, new_value));
  }
  add_action(input, invert_input);
  return "ok";
}

function and_gate(a1, a2, output) {
  function and_action_function() {
    const new_value = logical_and(get_signal(a1), get_signal(a2));
    after_delay(and_gate_delay, () => set_signal(output, new_value));
  }
  add_action(a1, and_action_function);
  add_action(a2, and_action_function);
  return "ok";
}
`;

/** The or-gate as a primitive function box: Exercise 3.28's answer. */
export const circuitOrGateDefinition = `function or_gate(a1, a2, output) {
  function or_action_function() {
    const new_value = logical_or(get_signal(a1), get_signal(a2));
    after_delay(or_gate_delay, () => set_signal(output, new_value));
  }
  add_action(a1, or_action_function);
  add_action(a2, or_action_function);
  return "ok";
}
`;

export const circuitGateDefinitions = `${circuitLogicDefinitions}
${circuitInverterAndDefinitions}
${circuitOrGateDefinition}`;

/** The half-adder and the full-adder, wired from gates. */
export const circuitAdderDefinitions = `function half_adder(a, b, s, c) {
  const d = make_wire();
  const e = make_wire();
  or_gate(a, b, d);
  and_gate(a, b, c);
  inverter(c, e);
  and_gate(d, e, s);
  return "ok";
}

function full_adder(a, b, c_in, sum, c_out) {
  const s = make_wire();
  const c1 = make_wire();
  const c2 = make_wire();
  half_adder(b, c_in, s, c1);
  half_adder(a, s, sum, c2);
  or_gate(c1, c2, c_out);
  return "ok";
}
`;

/** The agenda the gates schedule on, the delays, and the functions that run and watch a simulation. */
export const circuitSimulationDefinitions = `const the_agenda = make_agenda();
const inverter_delay = 2;
const and_gate_delay = 3;
const or_gate_delay = 5;

function after_delay(delay, action) {
  add_to_agenda(delay + current_time(the_agenda), action, the_agenda);
}

function propagate() {
  if (is_empty_agenda(the_agenda)) {
    return "done";
  } else {
    const first_item = first_agenda_item(the_agenda);
    first_item();
    remove_first_agenda_item(the_agenda);
    return propagate();
  }
}

function probe(name, wire) {
  add_action(wire, () => display(name + " " + stringify(current_time(the_agenda)) +
                                 ", new value = " + stringify(get_signal(wire))));
}
`;

/** Everything the gates need to run, without the gates: the base an exercise builds gates on. */
export const circuitMachineryDefinitions = `${circuitQueueDefinitions}
${circuitAgendaDefinitions}
${circuitWireDefinitions}
${circuitSimulationDefinitions}`;

/** The whole simulator: queue, agenda, wires, simulation, gates and adders. */
export const circuitSimulatorDefinitions = `${circuitMachineryDefinitions}
${circuitGateDefinitions}
${circuitAdderDefinitions}`;

/** The book's sample simulation: a half-adder with probes on its outputs. */
export const halfAdderSimulationRun = `const input_1 = make_wire();
const input_2 = make_wire();
const sum = make_wire();
const carry = make_wire();

probe("sum", sum);
probe("carry", carry);

half_adder(input_1, input_2, sum, carry);
set_signal(input_1, 1);
propagate();

set_signal(input_2, 1);
propagate();
`;

export const halfAdderSimulationProgram = `${circuitSimulatorDefinitions}
${halfAdderSimulationRun}`;

/** The half-adder of Figure 3.25 wired by hand, with a probe on every one of its six wires. */
export const halfAdderWiresProgram = `${circuitSimulatorDefinitions}
const a = make_wire();
const b = make_wire();
const c = make_wire();
const d = make_wire();
const e = make_wire();
const s = make_wire();

or_gate(a, b, d);
and_gate(a, b, c);
inverter(c, e);
and_gate(d, e, s);

probe("a", a);
probe("b", b);
probe("d", d);
probe("c", c);
probe("e", e);
probe("s", s);

propagate();

set_signal(a, 1);
propagate();

set_signal(b, 1);
propagate();
`;

/** A full-adder adding 1 + 1 with a carry in of 1. */
export const fullAdderSimulationProgram = `${circuitSimulatorDefinitions}
const a = make_wire();
const b = make_wire();
const c_in = make_wire();
const sum = make_wire();
const c_out = make_wire();

full_adder(a, b, c_in, sum, c_out);
propagate();

probe("a", a);
probe("b", b);
probe("c_in", c_in);
probe("sum", sum);
probe("c_out", c_out);

set_signal(a, 1);
set_signal(b, 1);
set_signal(c_in, 1);
propagate();
`;

/** The agenda on its own: actions scheduled out of order run in order of time, and in order of scheduling within a time. */
export const circuitAgendaProgram = `${circuitQueueDefinitions}
${circuitAgendaDefinitions}
const agenda = make_agenda();

add_to_agenda(5, () => display("at 5, first"), agenda);
add_to_agenda(2, () => display("at 2"), agenda);
add_to_agenda(5, () => display("at 5, second"), agenda);
add_to_agenda(3, () => display("at 3"), agenda);

function run(agenda) {
  if (is_empty_agenda(agenda)) {
    return current_time(agenda);
  } else {
    const item = first_agenda_item(agenda);
    item();
    remove_first_agenda_item(agenda);
    return run(agenda);
  }
}

display_list(map(segment_time, segments(agenda)));
run(agenda);
`;

/* §3.3.5: propagation of constraints. */

/** Connectors, and the protocol constraints use to talk to them. */
export const constraintConnectorDefinitions = `function make_connector() {
  let value = false;
  let informant = false;
  let constraints = null;
  function set_my_value(newval, setter) {
    if (!has_value(me)) {
      value = newval;
      informant = setter;
      return for_each_except(setter, inform_about_value, constraints);
    } else if (value !== newval) {
      error(list(value, newval), "contradiction");
    } else {
      return "ignored";
    }
  }
  function forget_my_value(retractor) {
    if (retractor === informant) {
      informant = false;
      return for_each_except(retractor, inform_about_no_value, constraints);
    } else {
      return "ignored";
    }
  }
  function connect(new_constraint) {
    if (is_null(member(new_constraint, constraints))) {
      constraints = pair(new_constraint, constraints);
    } else {}
    if (has_value(me)) {
      inform_about_value(new_constraint);
    } else {}
    return "done";
  }
  function me(request) {
    if (request === "has_value") {
      return informant !== false;
    } else if (request === "value") {
      return value;
    } else if (request === "set_value") {
      return set_my_value;
    } else if (request === "forget") {
      return forget_my_value;
    } else if (request === "connect") {
      return connect;
    } else {
      error(request, "unknown operation -- connector");
    }
  }
  return me;
}

function for_each_except(exception, fun, list) {
  function loop(items) {
    if (is_null(items)) {
      return "done";
    } else if (head(items) === exception) {
      return loop(tail(items));
    } else {
      fun(head(items));
      return loop(tail(items));
    }
  }
  return loop(list);
}

function has_value(connector) {
  return connector("has_value");
}

function get_value(connector) {
  return connector("value");
}

function set_value(connector, new_value, informant) {
  return connector("set_value")(new_value, informant);
}

function forget_value(connector, retractor) {
  return connector("forget")(retractor);
}

function connect(connector, new_constraint) {
  return connector("connect")(new_constraint);
}

function inform_about_value(constraint) {
  return constraint("I have a value.");
}

function inform_about_no_value(constraint) {
  return constraint("I lost my value.");
}
`;

/** The primitive constraints: adder, multiplier and constant. */
export const constraintPrimitiveDefinitions = `function adder(a1, a2, sum) {
  function process_new_value() {
    if (has_value(a1) && has_value(a2)) {
      set_value(sum, get_value(a1) + get_value(a2), me);
    } else if (has_value(a1) && has_value(sum)) {
      set_value(a2, get_value(sum) - get_value(a1), me);
    } else if (has_value(a2) && has_value(sum)) {
      set_value(a1, get_value(sum) - get_value(a2), me);
    } else {}
  }
  function process_forget_value() {
    forget_value(sum, me);
    forget_value(a1, me);
    forget_value(a2, me);
    process_new_value();
  }
  function me(request) {
    if (request === "I have a value.") {
      process_new_value();
    } else if (request === "I lost my value.") {
      process_forget_value();
    } else {
      error(request, "unknown request -- adder");
    }
  }
  connect(a1, me);
  connect(a2, me);
  connect(sum, me);
  return me;
}

function multiplier(m1, m2, product) {
  function process_new_value() {
    if ((has_value(m1) && get_value(m1) === 0) ||
        (has_value(m2) && get_value(m2) === 0)) {
      set_value(product, 0, me);
    } else if (has_value(m1) && has_value(m2)) {
      set_value(product, get_value(m1) * get_value(m2), me);
    } else if (has_value(product) && has_value(m1)) {
      set_value(m2, get_value(product) / get_value(m1), me);
    } else if (has_value(product) && has_value(m2)) {
      set_value(m1, get_value(product) / get_value(m2), me);
    } else {}
  }
  function process_forget_value() {
    forget_value(product, me);
    forget_value(m1, me);
    forget_value(m2, me);
    process_new_value();
  }
  function me(request) {
    if (request === "I have a value.") {
      process_new_value();
    } else if (request === "I lost my value.") {
      process_forget_value();
    } else {
      error(request, "unknown request -- multiplier");
    }
  }
  connect(m1, me);
  connect(m2, me);
  connect(product, me);
  return me;
}

function constant(value, connector) {
  function me(request) {
    error(request, "unknown request -- constant");
  }
  connect(connector, me);
  set_value(connector, value, me);
  return me;
}
`;

/** A probe prints a message whenever its connector is given a value or loses one. */
export const constraintProbeDefinition = `function probe(name, connector) {
  function print_probe(value) {
    display("Probe: " + name + " = " + value);
  }
  function process_new_value() {
    print_probe(stringify(get_value(connector)));
  }
  function process_forget_value() {
    print_probe("?");
  }
  function me(request) {
    return request === "I have a value."
      ? process_new_value()
      : request === "I lost my value."
      ? process_forget_value()
      : error(request, "unknown request -- probe");
  }
  connect(connector, me);
  return me;
}
`;

/** The whole constraint system: connectors, primitive constraints and probes. */
export const constraintSystemDefinitions = `${constraintConnectorDefinitions}
${constraintPrimitiveDefinitions}
${constraintProbeDefinition}`;

/** 9C = 5(F − 32) as a network of two multipliers, an adder and three constants. */
export const celsiusFahrenheitDefinition = `function celsius_fahrenheit_converter(c, f) {
  const u = make_connector();
  const v = make_connector();
  const w = make_connector();
  const x = make_connector();
  const y = make_connector();
  multiplier(c, w, u);
  multiplier(v, x, u);
  adder(v, y, f);
  constant(9, w);
  constant(5, x);
  constant(32, y);
  return "ok";
}
`;

/** The book's run: set C to 25, forget it, then set F to 212. */
export const celsiusFahrenheitProgram = `${constraintSystemDefinitions}
${celsiusFahrenheitDefinition}
const C = make_connector();
const F = make_connector();
celsius_fahrenheit_converter(C, F);

probe("Celsius temp", C);
probe("Fahrenheit temp", F);

set_value(C, 25, "user");
forget_value(C, "user");
set_value(F, 212, "user");
`;

/** Setting F while C still holds 25 contradicts the 77 the network computed. */
export const constraintContradictionProgram = `${constraintSystemDefinitions}
${celsiusFahrenheitDefinition}
const C = make_connector();
const F = make_connector();
celsius_fahrenheit_converter(C, F);

probe("Celsius temp", C);
probe("Fahrenheit temp", F);

set_value(C, 25, "user");
set_value(F, 212, "user");
`;

/** The converter's network built at the top level, so that every connector can carry a probe. */
export const constraintNetworkProgram = `${constraintSystemDefinitions}
const C = make_connector();
const F = make_connector();
const u = make_connector();
const v = make_connector();
const w = make_connector();
const x = make_connector();
const y = make_connector();

probe("C", C);
probe("F", F);
probe("u", u);
probe("v", v);
probe("w", w);
probe("x", x);
probe("y", y);

multiplier(C, w, u);
multiplier(v, x, u);
adder(v, y, F);
constant(9, w);
constant(5, x);
constant(32, y);

set_value(C, 25, "user");
forget_value(C, "user");
set_value(F, 212, "user");
`;
