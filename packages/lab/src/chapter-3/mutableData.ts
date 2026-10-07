/** Programs of §3.3.1–§3.3.3, shared by the Book's examples and the Laboratory's tests. */

// §3.3.1 Mutable list structure

/** Figures 3.12 and 3.13: `set_head` makes `x`'s head point at `y`, and `list("a", "b")` is left behind. */
export const mutableSetHeadProgram = `const x = list(list("a", "b"), "c", "d");
const y = list("e", "f");
set_head(x, y);
display_list(x);
`;

/** Figures 3.14 and 3.15: a new pair made by `pair` against `set_tail` changing an old one. */
export const mutableSetTailProgram = `const x = list(list("a", "b"), "c", "d");
const y = list("e", "f");
const z = pair(y, tail(x));
set_tail(x, y);
display_list(z);
display_list(x);
`;

/** `pair` in terms of the two mutators and a supply of fresh pairs. */
export const mutableGetNewPairProgram = `// A stand-in for the memory manager of section 5.3.1:
// all it has to do is hand out a pair no one else is using.
function get_new_pair() {
  return list(undefined);
}

function pair(x, y) {
  const fresh = get_new_pair();
  set_head(fresh, x);
  set_tail(fresh, y);
  return fresh;
}

const p = pair(1, pair(2, null));
display_list(p);
`;

export const mutableLastPairDefinition = `function last_pair(x) {
  return is_null(tail(x)) ? x : last_pair(tail(x));
}
`;

export const mutableAppendDefinitions = `function append(x, y) {
  return is_null(x)
         ? y
         : pair(head(x), append(tail(x), y));
}

function append_mutator(x, y) {
  set_tail(last_pair(x), y);
  return x;
}

${mutableLastPairDefinition}`;

/** `append` copies the pairs of its first argument and shares its second. */
export const mutableAppendProgram = `${mutableAppendDefinitions}
const x = list("a", "b");
const y = list("c", "d");
const z = append(x, y);
display_list(z);
tail(x);
`;

export const mutableSetToWowDefinition = `function set_to_wow(x) {
  set_head(head(x), "wow");
  return x;
}
`;

/** Figures 3.16 and 3.17: the same list twice, against two equal lists. */
export const mutableSharingProgram = `const x = list("a", "b");
const z1 = pair(x, x);
const z2 = pair(list("a", "b"), list("a", "b"));

${mutableSetToWowDefinition}
set_to_wow(z1);
set_to_wow(z2);
display_list(z1);
display_list(z2);
`;

/** `===` on pairs asks whether they are the same pair. */
export const mutableIdentityProgram = `const x = list("a", "b");
const z1 = pair(x, x);
const z2 = pair(list("a", "b"), list("a", "b"));

display(head(z1) === tail(z1));
display(head(z2) === tail(z2));
equal(head(z2), tail(z2));
`;

/** Pairs as functions: mutation is assignment to a name in the frame of a call to `pair`. */
export const mutableFunctionalPairDefinitions = `function pair(x, y) {
  function set_x(v) {
    x = v;
  }
  function set_y(v) {
    y = v;
  }
  return m => m === "head"
              ? x
              : m === "tail"
              ? y
              : m === "set_head"
              ? set_x
              : m === "set_tail"
              ? set_y
              : error(m, "undefined operation -- pair");
}

function head(z) {
  return z("head");
}

function tail(z) {
  return z("tail");
}

function set_head(z, new_value) {
  z("set_head")(new_value);
  return z;
}

function set_tail(z, new_value) {
  z("set_tail")(new_value);
  return z;
}
`;

export const mutableFunctionalPairProgram = `${mutableFunctionalPairDefinitions}
const p = pair(1, 2);
set_tail(p, 3);
tail(p);
`;

// §3.3.2 Representing queues

export const queueDefinitions = `// A queue is a pair of pointers into an ordinary list.
function front_ptr(queue) {
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

/** Figures 3.19 to 3.21: inserting at the rear and deleting at the front, each in a constant number of steps. */
export const queueProgram = `${queueDefinitions}
const q = make_queue();
insert_queue(q, "a");
insert_queue(q, "b");
insert_queue(q, "c");
delete_queue(q);
insert_queue(q, "d");
front_queue(q);
`;

/** Ben Bitdiddle's experiment of exercise 3.21. */
export const queueBenProgram = `${queueDefinitions}
const q1 = make_queue();
display_list(insert_queue(q1, "a"));
display_list(insert_queue(q1, "b"));
display_list(delete_queue(q1));
display_list(delete_queue(q1));
`;

// §3.3.3 Representing tables

export const tableDefinitions = `function assoc(key, records) {
  return is_null(records)
         ? undefined
         : equal(key, head(head(records)))
         ? head(records)
         : assoc(key, tail(records));
}

function lookup(key, table) {
  const record = assoc(key, tail(table));
  return is_undefined(record)
         ? undefined
         : tail(record);
}

function insert(key, value, table) {
  const record = assoc(key, tail(table));
  if (is_undefined(record)) {
    set_tail(table, pair(pair(key, value), tail(table)));
  } else {
    set_tail(record, value);
  }
  return "ok";
}

function make_table() {
  return list("*table*");
}
`;

/** Figure 3.22: a one-dimensional table, a headed list of records. */
export const tableProgram = `${tableDefinitions}
const table = make_table();
insert("a", 1, table);
insert("b", 2, table);
insert("c", 3, table);
insert("a", 10, table);
lookup("b", table);
`;

export const table2DDefinitions = `function assoc(key, records) {
  return is_null(records)
         ? undefined
         : equal(key, head(head(records)))
         ? head(records)
         : assoc(key, tail(records));
}

function lookup(key_1, key_2, table) {
  const subtable = assoc(key_1, tail(table));
  if (is_undefined(subtable)) {
    return undefined;
  } else {
    const record = assoc(key_2, tail(subtable));
    return is_undefined(record)
           ? undefined
           : tail(record);
  }
}

function insert(key_1, key_2, value, table) {
  const subtable = assoc(key_1, tail(table));
  if (is_undefined(subtable)) {
    set_tail(table, pair(list(key_1, pair(key_2, value)), tail(table)));
  } else {
    const record = assoc(key_2, tail(subtable));
    if (is_undefined(record)) {
      set_tail(subtable, pair(pair(key_2, value), tail(subtable)));
    } else {
      set_tail(record, value);
    }
  }
  return "ok";
}

function make_table() {
  return list("*table*");
}
`;

/** Figure 3.23: a two-dimensional table, each subtable a headed list of its own. */
export const table2DProgram = `${table2DDefinitions}
const table = make_table();
insert("math", "+", 43, table);
insert("math", "-", 45, table);
insert("math", "*", 42, table);
insert("letters", "a", 97, table);
insert("letters", "b", 98, table);
lookup("math", "-", table);
`;

/** A table that is a function with local state, and `get` and `put` made from one. */
export const tableLocalDefinitions = `function make_table() {
  const local_table = list("*table*");
  function assoc(key, records) {
    return is_null(records)
           ? undefined
           : equal(key, head(head(records)))
           ? head(records)
           : assoc(key, tail(records));
  }
  function lookup(key_1, key_2) {
    const subtable = assoc(key_1, tail(local_table));
    if (is_undefined(subtable)) {
      return undefined;
    } else {
      const record = assoc(key_2, tail(subtable));
      return is_undefined(record)
             ? undefined
             : tail(record);
    }
  }
  function insert(key_1, key_2, value) {
    const subtable = assoc(key_1, tail(local_table));
    if (is_undefined(subtable)) {
      set_tail(local_table,
               pair(list(key_1, pair(key_2, value)), tail(local_table)));
    } else {
      const record = assoc(key_2, tail(subtable));
      if (is_undefined(record)) {
        set_tail(subtable, pair(pair(key_2, value), tail(subtable)));
      } else {
        set_tail(record, value);
      }
    }
    return "ok";
  }
  function dispatch(m) {
    return m === "lookup"
           ? lookup
           : m === "insert"
           ? insert
           : error(m, "unknown operation -- table");
  }
  return dispatch;
}
`;

export const tableLocalProgram = `${tableLocalDefinitions}
const operation_table = make_table();
const get = operation_table("lookup");
const put = operation_table("insert");

put("letters", "a", 97);
put("math", "+", 43);
display(get("letters", "a"));
display(get("math", "+"));
get("math", "*");
`;
