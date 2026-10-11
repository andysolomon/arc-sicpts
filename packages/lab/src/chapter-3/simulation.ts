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
export const circuitQueueDefinitions = `type Queue<T> = Pair<List<T>, List<T>>;

const front_ptr = <T>(queue: Queue<T>): List<T> =>
  head(queue);

const rear_ptr = <T>(queue: Queue<T>): List<T> =>
  tail(queue);

const set_front_ptr = <T>(queue: Queue<T>, item: List<T>): void => {
  set_head(queue, item);
};

const set_rear_ptr = <T>(queue: Queue<T>, item: List<T>): void => {
  set_tail(queue, item);
};

const is_empty_queue = <T>(queue: Queue<T>): boolean =>
  is_null(front_ptr(queue));

const make_queue = <T>(): Queue<T> =>
  pair(null, null);

const front_queue = <T>(queue: Queue<T>): T =>
  is_empty_queue(queue)
    ? error(queue, "front_queue called with an empty queue")
    : head(front_ptr(queue));

const insert_queue = <T>(queue: Queue<T>, item: T): Queue<T> => {
  const new_pair = pair(item, null);
  if (is_empty_queue(queue)) {
    set_front_ptr(queue, new_pair);
    set_rear_ptr(queue, new_pair);
  } else {
    set_tail(rear_ptr(queue), new_pair);
    set_rear_ptr(queue, new_pair);
  }
  return queue;
};

const delete_queue = <T>(queue: Queue<T>): Queue<T> => {
  if (is_empty_queue(queue)) {
    error(queue, "delete_queue called with an empty queue");
  } else {
    set_front_ptr(queue, tail(front_ptr(queue)));
    return queue;
  }
};
`;

/** The agenda: the current time, then a list of time segments, each a queue of actions due at that time. */
export const circuitAgendaDefinitions = `type Action = () => void;
type TimeSegment = Pair<number, Queue<Action>>;
type Agenda = Pair<number, List<TimeSegment>>;

const make_time_segment = (time: number, queue: Queue<Action>): TimeSegment =>
  pair(time, queue);

const segment_time = (s: TimeSegment): number =>
  head(s);

const segment_queue = (s: TimeSegment): Queue<Action> =>
  tail(s);

const make_agenda = (): Agenda =>
  list(0);

const current_time = (agenda: Agenda): number =>
  head(agenda);

const set_current_time = (agenda: Agenda, time: number): void => {
  set_head(agenda, time);
};

const segments = (agenda: Agenda): List<TimeSegment> =>
  tail(agenda);

const set_segments = (agenda: Agenda, segs: List<TimeSegment>): void => {
  set_tail(agenda, segs);
};

const first_segment = (agenda: Agenda): TimeSegment =>
  head(segments(agenda));

const rest_segments = (agenda: Agenda): List<TimeSegment> =>
  tail(segments(agenda));

const is_empty_agenda = (agenda: Agenda): boolean =>
  is_null(segments(agenda));

const add_to_agenda = (time: number, action: Action, agenda: Agenda): void => {
  const belongs_before = (segs: List<TimeSegment>): boolean =>
    is_null(segs) || time < segment_time(head(segs));
  const make_new_time_segment = (time: number, action: Action): TimeSegment => {
    const q = make_queue();
    insert_queue(q, action);
    return make_time_segment(time, q);
  };
  const add_to_segments = (segs: List<TimeSegment>): void => {
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
  };
  const segs = segments(agenda);
  if (belongs_before(segs)) {
    set_segments(agenda, pair(make_new_time_segment(time, action), segs));
  } else {
    add_to_segments(segs);
  }
};

const remove_first_agenda_item = (agenda: Agenda): void => {
  const q = segment_queue(first_segment(agenda));
  delete_queue(q);
  if (is_empty_queue(q)) {
    set_segments(agenda, rest_segments(agenda));
  } else {}
};

const first_agenda_item = (agenda: Agenda): Action => {
  if (is_empty_agenda(agenda)) {
    error("agenda is empty -- first_agenda_item");
  } else {
    const first_seg = first_segment(agenda);
    set_current_time(agenda, segment_time(first_seg));
    return front_queue(segment_queue(first_seg));
  }
};
`;

/** Wires: a computational object with a signal and the action functions to run when it changes. */
export const circuitWireDefinitions = `type Wire = (m: string) => unknown;

const make_wire = (): Wire => {
  let signal_value = 0;
  let action_functions: List<Action> = null;
  const set_my_signal = (new_value: number): "done" => {
    if (signal_value !== new_value) {
      signal_value = new_value;
      return call_each(action_functions);
    } else {
      return "done";
    }
  };
  const accept_action_function = (fun: Action): void => {
    action_functions = pair(fun, action_functions);
    fun();
  };
  const dispatch = (m: string): unknown =>
    m === "get_signal"
      ? signal_value
      : m === "set_signal"
      ? set_my_signal
      : m === "add_action"
      ? accept_action_function
      : error(m, "unknown operation -- wire");
  return dispatch;
};

const call_each = (functions: List<Action>): "done" => {
  if (is_null(functions)) {
    return "done";
  } else {
    head(functions)();
    return call_each(tail(functions));
  }
};

const get_signal = (wire: Wire): number =>
  wire("get_signal");

const set_signal = (wire: Wire, new_value: number): "done" =>
  wire("set_signal")(new_value);

const add_action = (wire: Wire, action_function: Action): void =>
  wire("add_action")(action_function);
`;

/** The logical functions behind the gates; the book leaves \`logical_and\` and \`logical_or\` to the reader. */
export const circuitLogicDefinitions = `const logical_not = (s: number): number =>
  s === 0
    ? 1
    : s === 1
    ? 0
    : error(s, "invalid signal");

const logical_and = (s1: number, s2: number): number =>
  s1 === 1 && s2 === 1
    ? 1
    : (s1 === 0 || s1 === 1) && (s2 === 0 || s2 === 1)
    ? 0
    : error(pair(s1, s2), "invalid signals");

const logical_or = (s1: number, s2: number): number =>
  s1 === 0 && s2 === 0
    ? 0
    : (s1 === 0 || s1 === 1) && (s2 === 0 || s2 === 1)
    ? 1
    : error(pair(s1, s2), "invalid signals");
`;

/** The inverter and the and-gate, as in the book. */
export const circuitInverterAndDefinitions = `const inverter = (input: Wire, output: Wire): "ok" => {
  const invert_input = (): void => {
    const new_value = logical_not(get_signal(input));
    after_delay(inverter_delay, () => set_signal(output, new_value));
  };
  add_action(input, invert_input);
  return "ok";
};

const and_gate = (a1: Wire, a2: Wire, output: Wire): "ok" => {
  const and_action_function = (): void => {
    const new_value = logical_and(get_signal(a1), get_signal(a2));
    after_delay(and_gate_delay, () => set_signal(output, new_value));
  };
  add_action(a1, and_action_function);
  add_action(a2, and_action_function);
  return "ok";
};
`;

/** The or-gate as a primitive function box: Exercise 3.28's answer. */
export const circuitOrGateDefinition = `const or_gate = (a1: Wire, a2: Wire, output: Wire): "ok" => {
  const or_action_function = (): void => {
    const new_value = logical_or(get_signal(a1), get_signal(a2));
    after_delay(or_gate_delay, () => set_signal(output, new_value));
  };
  add_action(a1, or_action_function);
  add_action(a2, or_action_function);
  return "ok";
};
`;

export const circuitGateDefinitions = `${circuitLogicDefinitions}
${circuitInverterAndDefinitions}
${circuitOrGateDefinition}`;

/** The half-adder and the full-adder, wired from gates. */
export const circuitAdderDefinitions = `const half_adder = (a: Wire, b: Wire, s: Wire, c: Wire): "ok" => {
  const d = make_wire();
  const e = make_wire();
  or_gate(a, b, d);
  and_gate(a, b, c);
  inverter(c, e);
  and_gate(d, e, s);
  return "ok";
};

const full_adder = (a: Wire, b: Wire, c_in: Wire, sum: Wire, c_out: Wire): "ok" => {
  const s = make_wire();
  const c1 = make_wire();
  const c2 = make_wire();
  half_adder(b, c_in, s, c1);
  half_adder(a, s, sum, c2);
  or_gate(c1, c2, c_out);
  return "ok";
};
`;

/** The agenda the gates schedule on, the delays, and the functions that run and watch a simulation. */
export const circuitSimulationDefinitions = `const the_agenda = make_agenda();
const inverter_delay = 2;
const and_gate_delay = 3;
const or_gate_delay = 5;

const after_delay = (delay: number, action: Action): void => {
  add_to_agenda(delay + current_time(the_agenda), action, the_agenda);
};

const propagate = (): "done" => {
  if (is_empty_agenda(the_agenda)) {
    return "done";
  } else {
    const first_item = first_agenda_item(the_agenda);
    first_item();
    remove_first_agenda_item(the_agenda);
    return propagate();
  }
};

const probe = (name: string, wire: Wire): void => {
  add_action(wire, () => display(name + " " + stringify(current_time(the_agenda)) +
                                 ", new value = " + stringify(get_signal(wire))));
};
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
export const halfAdderWiresRun = `const a = make_wire();
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

export const halfAdderWiresProgram = `${circuitSimulatorDefinitions}
${halfAdderWiresRun}`;

/** A full-adder adding 1 + 1 with a carry in of 1. */
export const fullAdderSimulationRun = `const a = make_wire();
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

export const fullAdderSimulationProgram = `${circuitSimulatorDefinitions}
${fullAdderSimulationRun}`;

/** The agenda on its own: actions scheduled out of order run in order of time, and in order of scheduling within a time. */
export const circuitAgendaProgram = `${circuitQueueDefinitions}
${circuitAgendaDefinitions}
const agenda = make_agenda();

add_to_agenda(5, () => display("at 5, first"), agenda);
add_to_agenda(2, () => display("at 2"), agenda);
add_to_agenda(5, () => display("at 5, second"), agenda);
add_to_agenda(3, () => display("at 3"), agenda);

const run = (agenda: Agenda): number => {
  if (is_empty_agenda(agenda)) {
    return current_time(agenda);
  } else {
    const item = first_agenda_item(agenda);
    item();
    remove_first_agenda_item(agenda);
    return run(agenda);
  }
};

display_list(map(segment_time, segments(agenda)));
run(agenda);
`;

/* §3.3.5: propagation of constraints. */

/** Connectors, and the protocol constraints use to talk to them. */
export const constraintConnectorDefinitions = `type Connector = (request: string) => unknown;
type Constraint = (request: "I have a value." | "I lost my value.") => void;
// Whoever sets a connector's value: a constraint, or a name such as "user".
type Informant = Constraint | string;

const make_connector = (): Connector => {
  let value: number | false = false;
  let informant: Informant | false = false;
  let constraints: List<Constraint> = null;
  const set_my_value = (newval: number, setter: Informant): "done" | "ignored" => {
    if (!has_value(me)) {
      value = newval;
      informant = setter;
      return for_each_except(setter, inform_about_value, constraints);
    } else if (value !== newval) {
      error(list(value, newval), "contradiction");
    } else {
      return "ignored";
    }
  };
  const forget_my_value = (retractor: Informant): "done" | "ignored" => {
    if (retractor === informant) {
      informant = false;
      return for_each_except(retractor, inform_about_no_value, constraints);
    } else {
      return "ignored";
    }
  };
  const connect = (new_constraint: Constraint): "done" => {
    if (is_null(member(new_constraint, constraints))) {
      constraints = pair(new_constraint, constraints);
    } else {}
    if (has_value(me)) {
      inform_about_value(new_constraint);
    } else {}
    return "done";
  };
  const me = (request: string): unknown => {
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
  };
  return me;
};

const for_each_except = <T>(exception: unknown, fun: (item: T) => void, list: List<T>): "done" => {
  const loop = (items: List<T>): "done" => {
    if (is_null(items)) {
      return "done";
    } else if (head(items) === exception) {
      return loop(tail(items));
    } else {
      fun(head(items));
      return loop(tail(items));
    }
  };
  return loop(list);
};

const has_value = (connector: Connector): boolean =>
  connector("has_value");

const get_value = (connector: Connector): number =>
  connector("value");

const set_value = (connector: Connector, new_value: number, informant: Informant): "done" | "ignored" =>
  connector("set_value")(new_value, informant);

const forget_value = (connector: Connector, retractor: Informant): "done" | "ignored" =>
  connector("forget")(retractor);

const connect = (connector: Connector, new_constraint: Constraint): "done" =>
  connector("connect")(new_constraint);

const inform_about_value = (constraint: Constraint): void =>
  constraint("I have a value.");

const inform_about_no_value = (constraint: Constraint): void =>
  constraint("I lost my value.");
`;

/** The primitive constraints: adder, multiplier and constant. */
export const constraintPrimitiveDefinitions = `const adder = (a1: Connector, a2: Connector, sum: Connector): Constraint => {
  const process_new_value = (): void => {
    if (has_value(a1) && has_value(a2)) {
      set_value(sum, get_value(a1) + get_value(a2), me);
    } else if (has_value(a1) && has_value(sum)) {
      set_value(a2, get_value(sum) - get_value(a1), me);
    } else if (has_value(a2) && has_value(sum)) {
      set_value(a1, get_value(sum) - get_value(a2), me);
    } else {}
  };
  const process_forget_value = (): void => {
    forget_value(sum, me);
    forget_value(a1, me);
    forget_value(a2, me);
    process_new_value();
  };
  const me = (request: "I have a value." | "I lost my value."): void => {
    if (request === "I have a value.") {
      process_new_value();
    } else if (request === "I lost my value.") {
      process_forget_value();
    } else {
      error(request, "unknown request -- adder");
    }
  };
  connect(a1, me);
  connect(a2, me);
  connect(sum, me);
  return me;
};

const multiplier = (m1: Connector, m2: Connector, product: Connector): Constraint => {
  const process_new_value = (): void => {
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
  };
  const process_forget_value = (): void => {
    forget_value(product, me);
    forget_value(m1, me);
    forget_value(m2, me);
    process_new_value();
  };
  const me = (request: "I have a value." | "I lost my value."): void => {
    if (request === "I have a value.") {
      process_new_value();
    } else if (request === "I lost my value.") {
      process_forget_value();
    } else {
      error(request, "unknown request -- multiplier");
    }
  };
  connect(m1, me);
  connect(m2, me);
  connect(product, me);
  return me;
};

const constant = (value: number, connector: Connector): Constraint => {
  const me = (request: "I have a value." | "I lost my value."): void => {
    error(request, "unknown request -- constant");
  };
  connect(connector, me);
  set_value(connector, value, me);
  return me;
};
`;

/** A probe prints a message whenever its connector is given a value or loses one. */
export const constraintProbeDefinition = `const probe = (name: string, connector: Connector): Constraint => {
  const print_probe = (value: string): void => {
    display("Probe: " + name + " = " + value);
  };
  const process_new_value = (): void => {
    print_probe(stringify(get_value(connector)));
  };
  const process_forget_value = (): void => {
    print_probe("?");
  };
  const me = (request: "I have a value." | "I lost my value."): void =>
    request === "I have a value."
      ? process_new_value()
      : request === "I lost my value."
      ? process_forget_value()
      : error(request, "unknown request -- probe");
  connect(connector, me);
  return me;
};
`;

/** The whole constraint system: connectors, primitive constraints and probes. */
export const constraintSystemDefinitions = `${constraintConnectorDefinitions}
${constraintPrimitiveDefinitions}
${constraintProbeDefinition}`;

/** 9C = 5(F − 32) as a network of two multipliers, an adder and three constants. */
export const celsiusFahrenheitDefinition = `const celsius_fahrenheit_converter = (c: Connector, f: Connector): "ok" => {
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
};
`;

/** The book's run: set C to 25, forget it, then set F to 212. */
export const celsiusFahrenheitRun = `${celsiusFahrenheitDefinition}
const C = make_connector();
const F = make_connector();
celsius_fahrenheit_converter(C, F);

probe("Celsius temp", C);
probe("Fahrenheit temp", F);

set_value(C, 25, "user");
forget_value(C, "user");
set_value(F, 212, "user");
`;

export const celsiusFahrenheitProgram = `${constraintSystemDefinitions}
${celsiusFahrenheitRun}`;

/** Setting F while C still holds 25 contradicts the 77 the network computed. */
export const constraintContradictionRun = `${celsiusFahrenheitDefinition}
const C = make_connector();
const F = make_connector();
celsius_fahrenheit_converter(C, F);

probe("Celsius temp", C);
probe("Fahrenheit temp", F);

set_value(C, 25, "user");
set_value(F, 212, "user");
`;

export const constraintContradictionProgram = `${constraintSystemDefinitions}
${constraintContradictionRun}`;

/** The converter's network built at the top level, so that every connector can carry a probe. */
export const constraintNetworkRun = `const C = make_connector();
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

export const constraintNetworkProgram = `${constraintSystemDefinitions}
${constraintNetworkRun}`;
