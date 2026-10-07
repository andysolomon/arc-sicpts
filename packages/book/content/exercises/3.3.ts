import { mutableAppendDefinitions, mutableLastPairDefinition, mutableSetToWowDefinition, queueDefinitions, tableDefinitions } from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §3.3.1–§3.3.3: mutable list structure, queues and tables. */

const makeCycleDefinition = `function make_cycle(x) {
  set_tail(last_pair(x), x);
  return x;
}
`;

/** Helpers the hidden tests use: a correct pair counter and a cycle detector that cannot be fooled. */
const structureHelpers = `function pairs_reached(x) {
  function walk(x, seen) {
    return !is_pair(x) || !is_null(member(x, seen))
           ? seen
           : walk(tail(x), walk(head(x), pair(x, seen)));
  }
  return length(walk(x, null));
}

function reaches_itself(x) {
  function walk(x, path) {
    return is_pair(x) &&
           (!is_null(member(x, path)) ||
            walk(head(x), pair(x, path)) ||
            walk(tail(x), pair(x, path)));
  }
  return walk(x, null);
}
`;

/** Structures of three pairs each, for exercises 3.16 and 3.17. */
const threePairStructures = `const three_in_a_row = list("a", "b", "c");
const shared_once = (() => {
  const last = list("c");
  return pair(pair("a", last), last);
})();
const shared_twice = (() => {
  const bottom = pair("a", "b");
  const middle = pair(bottom, bottom);
  return pair(middle, middle);
})();
const three_in_a_circle = (() => {
  const xs = list("a", "b", "c");
  set_tail(tail(tail(xs)), xs);
  return xs;
})();
`;

const repeatHelper = `function repeat_times(n, f) {
  if (n === 0) {
    return true;
  } else {
    f(n);
    return repeat_times(n - 1, f);
  }
}

function all_up_to(n, pred) {
  return n === 0 || (pred(n) && all_up_to(n - 1, pred));
}
`;

export const exercise_3_12: ExerciseSpec = {
  id: '3.12',
  prelude: mutableAppendDefinitions,
  starter: `// append, append_mutator and last_pair are provided.
const x = list("a", "b");
const y = list("c", "d");
const z = append(x, y);

// What is tail(x) now? Write it with list(...), without calling tail.
const first_answer = undefined;

const w = append_mutator(x, y);

// And what is tail(x) after append_mutator?
const second_answer = undefined;
`,
  tests: [
    { name: 'tail(x) after append', kind: 'value', expr: 'equal(first_answer, list("b"))', expected: true },
    { name: 'tail(x) after append_mutator', kind: 'value', expr: 'equal(second_answer, list("b", "c", "d"))', expected: true },
    { name: 'w is x itself', kind: 'value', expr: 'w === x', expected: true },
  ],
  solution: `const x = list("a", "b");
const y = list("c", "d");
const z = append(x, y);

const first_answer = list("b");

const w = append_mutator(x, y);

const second_answer = list("b", "c", "d");
`,
};

export const exercise_3_13: ExerciseSpec = {
  id: '3.13',
  prelude: mutableLastPairDefinition,
  starter: `// last_pair is provided.
function make_cycle(x) {
  // your answer: make the last pair's tail point back to x, and return x
}

const z = make_cycle(list("a", "b", "c"));

// Does last_pair(z) ever return a value? true or false.
const last_pair_returns = undefined;
`,
  tests: [
    { name: 'the fourth element is "a" again', kind: 'value', expr: 'head(tail(tail(tail(z))))', expected: 'a' },
    { name: 'the cycle has three pairs', kind: 'value', expr: 'tail(tail(tail(z))) === z', expected: true },
    { name: 'last_pair(z) never returns', kind: 'value', expr: 'last_pair_returns', expected: false },
  ],
  solution: `${makeCycleDefinition}
const z = make_cycle(list("a", "b", "c"));

const last_pair_returns = false;
`,
};

export const exercise_3_14: ExerciseSpec = {
  id: '3.14',
  starter: `function mystery(x) {
  function loop(x, y) {
    if (is_null(x)) {
      return y;
    } else {
      const temp = tail(x);
      set_tail(x, y);
      return loop(temp, x);
    }
  }
  return loop(x, null);
}

const v = list("a", "b", "c", "d");
const w = mystery(v);

// Predict, then write as list(...): what do v and w print as now?
const v_answer = undefined;
const w_answer = undefined;
`,
  tests: [
    { name: 'v afterwards', kind: 'value', expr: 'equal(v_answer, list("a"))', expected: true },
    { name: 'w afterwards', kind: 'value', expr: 'equal(w_answer, list("d", "c", "b", "a"))', expected: true },
  ],
  solution: `function mystery(x) {
  function loop(x, y) {
    if (is_null(x)) {
      return y;
    } else {
      const temp = tail(x);
      set_tail(x, y);
      return loop(temp, x);
    }
  }
  return loop(x, null);
}

const v = list("a", "b", "c", "d");
const w = mystery(v);

// mystery reverses its list in place: v still names the pair holding "a",
// which is now the last pair of the reversed list.
const v_answer = list("a");
const w_answer = list("d", "c", "b", "a");
`,
};

export const exercise_3_15: ExerciseSpec = {
  id: '3.15',
  prelude: mutableSetToWowDefinition,
  starter: `// set_to_wow is provided. After
//   const x = list("a", "b");
//   const z1 = pair(x, x);
//   const z2 = pair(list("a", "b"), list("a", "b"));
//   set_to_wow(z1);
//   set_to_wow(z2);
// build structures that look like z1 and z2 do now, sharing included.

const z1_after = undefined;
const z2_after = undefined;
`,
  tests: [
    { name: 'z1 prints with "wow" twice', kind: 'value', expr: 'equal(z1_after, list(list("wow", "b"), "wow", "b"))', expected: true },
    { name: 'z1 shares one list', kind: 'value', expr: 'head(z1_after) === tail(z1_after)', expected: true },
    { name: 'z2 prints with "wow" once', kind: 'value', expr: 'equal(z2_after, list(list("wow", "b"), "a", "b"))', expected: true },
    { name: 'z2 has two lists', kind: 'value', expr: 'head(z2_after) !== tail(z2_after)', expected: true },
  ],
  solution: `const x = list("wow", "b");
const z1_after = pair(x, x);
const z2_after = pair(list("wow", "b"), list("a", "b"));
`,
};

export const exercise_3_16: ExerciseSpec = {
  id: '3.16',
  prelude: structureHelpers,
  starter: `function count_pairs(x) {
  return ! is_pair(x)
         ? 0
         : count_pairs(head(x)) + count_pairs(tail(x)) + 1;
}

// Each structure must be made of exactly three pairs.
const returns_3 = undefined;
const returns_4 = undefined;
const returns_7 = undefined;
const never_returns = undefined; // don't call count_pairs on this one!
`,
  tests: [
    { name: 'count_pairs says 3', kind: 'value', expr: 'pairs_reached(returns_3) === 3 && count_pairs(returns_3) === 3', expected: true },
    { name: 'count_pairs says 4', kind: 'value', expr: 'pairs_reached(returns_4) === 3 && count_pairs(returns_4) === 4', expected: true },
    { name: 'count_pairs says 7', kind: 'value', expr: 'pairs_reached(returns_7) === 3 && count_pairs(returns_7) === 7', expected: true },
    { name: 'three pairs that count_pairs never finishes', kind: 'value', expr: 'pairs_reached(never_returns) === 3 && reaches_itself(never_returns)', expected: true },
  ],
  solution: `function count_pairs(x) {
  return ! is_pair(x)
         ? 0
         : count_pairs(head(x)) + count_pairs(tail(x)) + 1;
}

const returns_3 = list("a", "b", "c");

const c = list("c");
const returns_4 = pair(pair("a", c), c);

const bottom = pair("a", "b");
const middle = pair(bottom, bottom);
const returns_7 = pair(middle, middle);

const never_returns = list("a", "b", "c");
set_tail(tail(tail(never_returns)), never_returns);
`,
};

export const exercise_3_17: ExerciseSpec = {
  id: '3.17',
  prelude: threePairStructures,
  starter: `// Count the distinct pairs in x, each once, whatever the sharing.
function count_pairs(x) {
  // your answer
}
`,
  tests: [
    { name: 'a plain list of three', kind: 'value', expr: 'count_pairs(three_in_a_row)', expected: 3 },
    { name: 'a pair reached twice', kind: 'value', expr: 'count_pairs(shared_once)', expected: 3 },
    { name: 'pairs reached four times', kind: 'value', expr: 'count_pairs(shared_twice)', expected: 3 },
    { name: 'a cycle', kind: 'value', expr: 'count_pairs(three_in_a_circle)', expected: 3 },
    { name: 'no pairs at all', kind: 'value', expr: 'count_pairs("a")', expected: 0 },
  ],
  solution: `function count_pairs(x) {
  let counted = null;
  function count(x) {
    if (!is_pair(x) || !is_null(member(x, counted))) {
      return 0;
    } else {
      counted = pair(x, counted);
      return count(head(x)) + count(tail(x)) + 1;
    }
  }
  return count(x);
}
`,
};

const cycleTests = [
  { name: 'make_cycle(list(1, 2, 3))', kind: 'value', expr: 'contains_cycle(make_cycle(list(1, 2, 3)))', expected: true },
  { name: 'a one-pair cycle', kind: 'value', expr: 'contains_cycle(make_cycle(list(1)))', expected: true },
  { name: 'a list whose end loops back to its middle', kind: 'value', expr: 'contains_cycle(pair(0, make_cycle(list(1, 2))))', expected: true },
  { name: 'list(1, 2, 3)', kind: 'value', expr: 'contains_cycle(list(1, 2, 3))', expected: false },
  { name: 'the empty list', kind: 'value', expr: 'contains_cycle(null)', expected: false },
  { name: 'shared, but not circular', kind: 'value', expr: 'contains_cycle((() => { const a = list(1); return pair(a, a); })())', expected: false },
] satisfies ExerciseSpec['tests'];

export const exercise_3_18: ExerciseSpec = {
  id: '3.18',
  prelude: `${mutableLastPairDefinition}
${makeCycleDefinition}`,
  starter: `// make_cycle and last_pair are provided.
// True when taking successive tails of x would go on forever.
function contains_cycle(x) {
  // your answer
}
`,
  tests: cycleTests,
  solution: `function contains_cycle(x) {
  function walk(x, seen) {
    return !is_pair(x)
           ? false
           : !is_null(member(x, seen))
           ? true
           : walk(tail(x), pair(x, seen));
  }
  return walk(x, null);
}
`,
};

export const exercise_3_19: ExerciseSpec = {
  id: '3.19',
  // The program's own pair is counted, so that a solution that remembers pairs in a list shows up.
  prelude: `${mutableLastPairDefinition}
${makeCycleDefinition}
let pairs_made = 0;
function pair(x, y) {
  pairs_made = pairs_made + 1;
  const fresh = list(x);
  set_tail(fresh, y);
  return fresh;
}

function pairs_made_by(f) {
  const before = pairs_made;
  f();
  return pairs_made - before;
}

const long_cycle = make_cycle(enum_list(1, 300));
`,
  starter: `// make_cycle and last_pair are provided.
// The same question as exercise 3.18, in a constant amount of space:
// remember no pairs, just keep a fixed number of pointers into x.
function contains_cycle(x) {
  // your answer
}
`,
  tests: [
    ...cycleTests,
    { name: 'a cycle of 300 pairs, without making a single pair', kind: 'value', expr: 'pairs_made_by(() => contains_cycle(long_cycle))', expected: 0 },
    { name: 'an iterative process', kind: 'shape', expr: '"iterative"', call: 'contains_cycle(long_cycle)' },
  ],
  solution: `// Floyd's tortoise and hare: the hare moves two pairs for each of the
// tortoise's one. If there is a cycle, the hare comes round and lands on
// the tortoise; if not, it reaches the end of the list.
function contains_cycle(x) {
  function race(tortoise, hare) {
    return !is_pair(hare) || !is_pair(tail(hare))
           ? false
           : tail(tortoise) === tail(tail(hare))
           ? true
           : race(tail(tortoise), tail(tail(hare)));
  }
  return race(x, x);
}
`,
};

export const exercise_3_20: ExerciseSpec = {
  id: '3.20',
  starter: `// Pairs as functions, as in the text.
function pair(x, y) {
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

const x = pair(1, 2);
const z = pair(x, x);
set_head(tail(z), 17);

// Answer from the environment diagram, without running anything:
// How many frames did the two calls of pair create?
const frames_made_by_pair = undefined;
// Which call's frame holds the binding of x that set_head changed:
// "pair(1, 2)" or "pair(x, x)"?
const frame_changed = undefined;
// What is head(x) now?
const head_of_x = undefined;
`,
  tests: [
    { name: 'frames made by pair', kind: 'value', expr: 'frames_made_by_pair', expected: 2 },
    { name: 'the frame whose x changed', kind: 'value', expr: 'frame_changed', expected: 'pair(1, 2)' },
    { name: 'head(x)', kind: 'value', expr: 'head_of_x', expected: 17 },
  ],
  solution: `// (pair, head, tail, set_head and set_tail as given)
const frames_made_by_pair = 2;
const frame_changed = "pair(1, 2)";
const head_of_x = 17;
`,
};

export const exercise_3_21: ExerciseSpec = {
  id: '3.21',
  prelude: queueDefinitions,
  starter: `// The queue operations of the text are provided.
// Display the items of the queue, front first, as a list, and return that list.
function print_queue(queue) {
  // your answer
}
`,
  tests: [
    { name: 'one item', kind: 'value', expr: 'equal(print_queue(insert_queue(make_queue(), "a")), list("a"))', expected: true },
    {
      name: 'after two insertions and a deletion',
      kind: 'value',
      expr: '(() => { const q = make_queue(); insert_queue(q, "a"); insert_queue(q, "b"); delete_queue(q); return equal(print_queue(q), list("b")); })()',
      expected: true,
    },
    {
      name: 'empty again, although the rear pointer still points at "b"',
      kind: 'value',
      expr: '(() => { const q = make_queue(); insert_queue(q, "a"); insert_queue(q, "b"); delete_queue(q); delete_queue(q); return is_null(print_queue(q)); })()',
      expected: true,
    },
  ],
  solution: `function print_queue(queue) {
  const items = front_ptr(queue);
  display_list(items);
  return items;
}
`,
};

export const exercise_3_22: ExerciseSpec = {
  id: '3.22',
  prelude: `function insert_queue(queue, item) {
  return queue("insert_queue")(item);
}
function delete_queue(queue) {
  return queue("delete_queue")();
}
function front_queue(queue) {
  return queue("front_queue")();
}
function is_empty_queue(queue) {
  return queue("is_empty_queue")();
}
`,
  starter: `// insert_queue(q, item), delete_queue(q), front_queue(q) and is_empty_queue(q)
// are provided: each asks q, by message, for a function and applies it.
function make_queue() {
  let front_ptr = null;
  let rear_ptr = null;
  // your answer: declare the operations here, then dispatch on m
  function dispatch(m) {
    return error(m, "unknown operation -- queue");
  }
  return dispatch;
}
`,
  tests: [
    { name: 'a new queue is empty', kind: 'value', expr: 'is_empty_queue(make_queue())', expected: true },
    {
      name: 'first in, first out',
      kind: 'value',
      expr: '(() => { const q = make_queue(); insert_queue(q, 1); insert_queue(q, 2); insert_queue(q, 3); delete_queue(q); return front_queue(q); })()',
      expected: 2,
    },
    {
      name: 'empty, then used again',
      kind: 'value',
      expr: '(() => { const q = make_queue(); insert_queue(q, 1); delete_queue(q); const empty = is_empty_queue(q); insert_queue(q, 5); return empty && front_queue(q) === 5; })()',
      expected: true,
    },
    {
      name: 'two queues do not share state',
      kind: 'value',
      expr: '(() => { const a = make_queue(); const b = make_queue(); insert_queue(a, "a"); insert_queue(b, "b"); return front_queue(a) + front_queue(b); })()',
      expected: 'ab',
    },
  ],
  solution: `function make_queue() {
  let front_ptr = null;
  let rear_ptr = null;
  function is_empty_queue() {
    return is_null(front_ptr);
  }
  function insert_queue(item) {
    const new_pair = pair(item, null);
    if (is_empty_queue()) {
      front_ptr = new_pair;
      rear_ptr = new_pair;
    } else {
      set_tail(rear_ptr, new_pair);
      rear_ptr = new_pair;
    }
    return dispatch;
  }
  function delete_queue() {
    if (is_empty_queue()) {
      error("delete_queue called with an empty queue");
    } else {
      front_ptr = tail(front_ptr);
      return dispatch;
    }
  }
  function front_queue() {
    return is_empty_queue()
           ? error("front_queue called with an empty queue")
           : head(front_ptr);
  }
  function dispatch(m) {
    return m === "insert_queue"
           ? insert_queue
           : m === "delete_queue"
           ? delete_queue
           : m === "front_queue"
           ? front_queue
           : m === "is_empty_queue"
           ? is_empty_queue
           : error(m, "unknown operation -- queue");
  }
  return dispatch;
}
`,
};

export const exercise_3_23: ExerciseSpec = {
  id: '3.23',
  prelude: repeatHelper,
  budget: 1_000_000,
  starter: `// Every operation must take a constant number of steps, however long the deque.
function make_deque() {
  // your answer
}
function is_empty_deque(deque) {
}
function front_deque(deque) {
}
function rear_deque(deque) {
}
function front_insert_deque(deque, item) {
}
function rear_insert_deque(deque, item) {
}
function front_delete_deque(deque) {
}
function rear_delete_deque(deque) {
}
`,
  tests: [
    { name: 'a new deque is empty', kind: 'value', expr: 'is_empty_deque(make_deque())', expected: true },
    {
      name: 'items go in at both ends',
      kind: 'value',
      expr: '(() => { const d = make_deque(); rear_insert_deque(d, 2); front_insert_deque(d, 1); rear_insert_deque(d, 3); return front_deque(d) * 10 + rear_deque(d); })()',
      expected: 13,
    },
    {
      name: 'and come out at both ends',
      kind: 'value',
      expr: '(() => { const d = make_deque(); rear_insert_deque(d, 1); rear_insert_deque(d, 2); rear_insert_deque(d, 3); rear_delete_deque(d); front_delete_deque(d); return front_deque(d) === 2 && rear_deque(d) === 2; })()',
      expected: true,
    },
    {
      name: 'empty after deleting the last item from either end',
      kind: 'value',
      expr: '(() => { const d = make_deque(); front_insert_deque(d, 1); rear_delete_deque(d); const a = is_empty_deque(d); rear_insert_deque(d, 2); front_delete_deque(d); return a && is_empty_deque(d); })()',
      expected: true,
    },
    {
      name: '2000 insertions and 1999 deletions at the rear, in constant time each',
      kind: 'value',
      expr: '(() => { const d = make_deque(); repeat_times(2000, i => rear_insert_deque(d, i)); repeat_times(1999, i => rear_delete_deque(d)); return front_deque(d) === 2000 && rear_deque(d) === 2000; })()',
      expected: true,
    },
  ],
  solution: `// A doubly linked list. Each item lives in a node, a pair whose head is
// the item and whose tail is pair(previous node, next node). The deque is
// a pair of pointers to its first and last nodes.
function make_node(item, prev, next) {
  return pair(item, pair(prev, next));
}
function node_item(node) {
  return head(node);
}
function node_prev(node) {
  return head(tail(node));
}
function node_next(node) {
  return tail(tail(node));
}
function set_prev(node, prev) {
  set_head(tail(node), prev);
}
function set_next(node, next) {
  set_tail(tail(node), next);
}

function make_deque() {
  return pair(null, null);
}
function is_empty_deque(deque) {
  return is_null(head(deque));
}
function front_deque(deque) {
  return is_empty_deque(deque)
         ? error("front_deque called with an empty deque")
         : node_item(head(deque));
}
function rear_deque(deque) {
  return is_empty_deque(deque)
         ? error("rear_deque called with an empty deque")
         : node_item(tail(deque));
}
function front_insert_deque(deque, item) {
  const node = make_node(item, null, head(deque));
  if (is_empty_deque(deque)) {
    set_tail(deque, node);
  } else {
    set_prev(head(deque), node);
  }
  set_head(deque, node);
  return deque;
}
function rear_insert_deque(deque, item) {
  const node = make_node(item, tail(deque), null);
  if (is_empty_deque(deque)) {
    set_head(deque, node);
  } else {
    set_next(tail(deque), node);
  }
  set_tail(deque, node);
  return deque;
}
function front_delete_deque(deque) {
  if (is_empty_deque(deque)) {
    error("front_delete_deque called with an empty deque");
  } else {
    const next = node_next(head(deque));
    set_head(deque, next);
    if (is_null(next)) {
      set_tail(deque, null);
    } else {
      set_prev(next, null);
    }
    return deque;
  }
}
function rear_delete_deque(deque) {
  if (is_empty_deque(deque)) {
    error("rear_delete_deque called with an empty deque");
  } else {
    const prev = node_prev(tail(deque));
    set_tail(deque, prev);
    if (is_null(prev)) {
      set_head(deque, null);
    } else {
      set_next(prev, null);
    }
    return deque;
  }
}
`,
};

export const exercise_3_24: ExerciseSpec = {
  id: '3.24',
  starter: `// A two-dimensional local table that compares keys with same_key.
function make_table(same_key) {
  const local_table = list("*table*");
  function assoc(key, records) {
    // your answer
  }
  function lookup(key_1, key_2) {
    const subtable = assoc(key_1, tail(local_table));
    if (is_undefined(subtable)) {
      return undefined;
    } else {
      const record = assoc(key_2, tail(subtable));
      return is_undefined(record) ? undefined : tail(record);
    }
  }
  function insert(key_1, key_2, value) {
    const subtable = assoc(key_1, tail(local_table));
    if (is_undefined(subtable)) {
      set_tail(local_table, pair(list(key_1, pair(key_2, value)), tail(local_table)));
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
`,
  tests: [
    {
      name: 'keys within 0.1 of each other are the same key',
      kind: 'value',
      expr: '(() => { const t = make_table((a, b) => math_abs(a - b) < 0.1); t("insert")(1, 2, "near"); return t("lookup")(1.05, 1.98); })()',
      expected: 'near',
    },
    {
      name: 'keys further apart are not',
      kind: 'value',
      expr: '(() => { const t = make_table((a, b) => math_abs(a - b) < 0.1); t("insert")(1, 2, "near"); return is_undefined(t("lookup")(1.5, 2)); })()',
      expected: true,
    },
    {
      name: 'equal works as same_key too',
      kind: 'value',
      expr: '(() => { const t = make_table(equal); t("insert")("math", "+", 43); t("insert")("math", "+", 44); return t("lookup")("math", "+"); })()',
      expected: 44,
    },
  ],
  solution: `function make_table(same_key) {
  const local_table = list("*table*");
  function assoc(key, records) {
    return is_null(records)
           ? undefined
           : same_key(key, head(head(records)))
           ? head(records)
           : assoc(key, tail(records));
  }
  function lookup(key_1, key_2) {
    const subtable = assoc(key_1, tail(local_table));
    if (is_undefined(subtable)) {
      return undefined;
    } else {
      const record = assoc(key_2, tail(subtable));
      return is_undefined(record) ? undefined : tail(record);
    }
  }
  function insert(key_1, key_2, value) {
    const subtable = assoc(key_1, tail(local_table));
    if (is_undefined(subtable)) {
      set_tail(local_table, pair(list(key_1, pair(key_2, value)), tail(local_table)));
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
`,
};

export const exercise_3_25: ExerciseSpec = {
  id: '3.25',
  starter: `// Tables whose values are stored under any number of keys, given as a list.
function make_table() {
  return list("*table*");
}
function lookup(keys, table) {
  // your answer
}
function insert(keys, value, table) {
  // your answer
}
`,
  tests: [
    {
      name: 'one key',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(list("x"), 3, t); return lookup(list("x"), t); })()',
      expected: 3,
    },
    {
      name: 'two keys, sharing the first',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(list("a", "b"), 1, t); insert(list("a", "c"), 2, t); return lookup(list("a", "b"), t) * 10 + lookup(list("a", "c"), t); })()',
      expected: 12,
    },
    {
      name: 'three keys beside one',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(list("x"), 3, t); insert(list("p", "q", "r"), 4, t); return lookup(list("p", "q", "r"), t) + lookup(list("x"), t); })()',
      expected: 7,
    },
    {
      name: 'a missing key',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(list("a", "b"), 1, t); return is_undefined(lookup(list("a", "z"), t)) && is_undefined(lookup(list("q", "b"), t)); })()',
      expected: true,
    },
    {
      name: 'inserting again replaces the value',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(list("a", "b"), 1, t); insert(list("a", "b"), 5, t); return lookup(list("a", "b"), t); })()',
      expected: 5,
    },
  ],
  solution: `// Each key leads to a subtable, itself a headed list, until the keys run
// out; the value sits in the tail of the last record.
function make_table() {
  return list("*table*");
}
function assoc(key, records) {
  return is_null(records)
         ? undefined
         : equal(key, head(head(records)))
         ? head(records)
         : assoc(key, tail(records));
}
function lookup(keys, table) {
  const record = assoc(head(keys), tail(table));
  return is_undefined(record)
         ? undefined
         : is_null(tail(keys))
         ? tail(record)
         : lookup(tail(keys), record);
}
function insert(keys, value, table) {
  const record = assoc(head(keys), tail(table));
  if (is_null(tail(keys))) {
    if (is_undefined(record)) {
      set_tail(table, pair(pair(head(keys), value), tail(table)));
    } else {
      set_tail(record, value);
    }
  } else {
    if (is_undefined(record)) {
      const subtable = list(head(keys));
      set_tail(table, pair(subtable, tail(table)));
      insert(tail(keys), value, subtable);
    } else {
      insert(tail(keys), value, record);
    }
  }
  return "ok";
}
`,
};

export const exercise_3_26: ExerciseSpec = {
  id: '3.26',
  prelude: repeatHelper,
  budget: 3_000_000,
  starter: `// A table of (key, value) records organized as a binary tree, keys being
// numbers ordered by <. lookup and insert should take a number of steps
// proportional to the depth of the tree, not to the number of records.
function make_table() {
  // your answer
}
function lookup(key, table) {
}
function insert(key, value, table) {
}
`,
  tests: [
    {
      name: 'finds what was inserted',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(5, "five", t); insert(2, "two", t); insert(8, "eight", t); return lookup(2, t) + lookup(8, t) + lookup(5, t); })()',
      expected: 'twoeightfive',
    },
    {
      name: 'a missing key',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(5, "five", t); return is_undefined(lookup(4, t)) && is_undefined(lookup(4, make_table())); })()',
      expected: true,
    },
    {
      name: 'inserting again replaces the value',
      kind: 'value',
      expr: '(() => { const t = make_table(); insert(5, "five", t); insert(5, "cinq", t); return lookup(5, t); })()',
      expected: 'cinq',
    },
    {
      name: '1000 records with keys spread over [0, 1), each found again quickly',
      kind: 'value',
      expr: '(() => { const t = make_table(); repeat_times(1000, i => insert((i * 0.6180339887) % 1, i, t)); return all_up_to(1000, i => lookup((i * 0.6180339887) % 1, t) === i); })()',
      expected: true,
    },
  ],
  solution: `// The table is a headed box whose tail is the tree. A tree is null or
// list(record, left, right), a record being pair(key, value).
function make_table() {
  return pair("*table*", null);
}
function make_tree(record) {
  return list(record, null, null);
}
function tree_record(tree) {
  return head(tree);
}
function left_branch(tree) {
  return tail(tree);
}
function right_branch(tree) {
  return tail(tail(tree));
}
function find(key, tree) {
  if (is_null(tree)) {
    return undefined;
  } else {
    const record = tree_record(tree);
    return key === head(record)
           ? record
           : key < head(record)
           ? find(key, head(left_branch(tree)))
           : find(key, head(right_branch(tree)));
  }
}
function lookup(key, table) {
  const record = find(key, tail(table));
  return is_undefined(record) ? undefined : tail(record);
}
// box is a pair whose tail (for the table) or head (for a branch) holds a tree.
function insert_into(key, value, tree, put) {
  if (is_null(tree)) {
    put(make_tree(pair(key, value)));
  } else {
    const record = tree_record(tree);
    if (key === head(record)) {
      set_tail(record, value);
    } else {
      const branch = key < head(record) ? left_branch(tree) : right_branch(tree);
      insert_into(key, value, head(branch), subtree => set_head(branch, subtree));
    }
  }
}
function insert(key, value, table) {
  insert_into(key, value, tail(table), tree => set_tail(table, tree));
  return "ok";
}
`,
};

export const exercise_3_27: ExerciseSpec = {
  id: '3.27',
  prelude: tableDefinitions,
  starter: `// make_table, lookup and insert (the one-dimensional table) are provided.
// memoize(f) returns a function that computes f(x) once for each x,
// keeping the results in a local table.
function memoize(f) {
  // your answer
}

const memo_fib = memoize(n => n === 0
                              ? 0
                              : n === 1
                              ? 1
                              : memo_fib(n - 1) + memo_fib(n - 2));

// Would const memo_fib = memoize(fib), with the fib of section 1.2.2,
// also run in a number of steps proportional to n? true or false.
const memoize_fib_would_work = undefined;
`,
  tests: [
    { name: 'memo_fib(30)', kind: 'value', expr: 'memo_fib(30)', expected: 832040 },
    { name: 'memo_fib(30) applies functions O(n) times, not O(φⁿ)', kind: 'calls', call: 'memo_fib(30)', fn: 'lambda', atMost: 120 },
    { name: 'memoize(fib)', kind: 'value', expr: 'memoize_fib_would_work', expected: false },
  ],
  solution: `function memoize(f) {
  const table = make_table();
  return x => {
    const previously_computed_result = lookup(x, table);
    if (is_undefined(previously_computed_result)) {
      const result = f(x);
      insert(x, result, table);
      return result;
    } else {
      return previously_computed_result;
    }
  };
}

const memo_fib = memoize(n => n === 0
                              ? 0
                              : n === 1
                              ? 1
                              : memo_fib(n - 1) + memo_fib(n - 2));

// No: fib calls fib, not memo_fib, so only the outermost call is remembered.
const memoize_fib_would_work = false;
`,
};
