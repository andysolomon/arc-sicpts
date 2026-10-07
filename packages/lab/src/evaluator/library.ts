/**
 * The list and stream libraries of Source §2 and §3, written in Source itself.
 * `prepare` evaluates them into a frame named `library` between the global
 * frame of primitives and the program, so a program sees every name here and
 * can shadow any of them with a declaration of its own.
 *
 * `list_to_string` and `display_list` are primitives (in `primitives.ts`): they
 * have to cope with circular structure, which Source code cannot detect.
 */

export const listLibrary = `
function equal(xs, ys) {
  return is_pair(xs)
    ? is_pair(ys) && equal(head(xs), head(ys)) && equal(tail(xs), tail(ys))
    : xs === ys;
}

function length(xs) {
  function iter(xs, n) {
    return is_null(xs) ? n : iter(tail(xs), n + 1);
  }
  return iter(xs, 0);
}

function map(f, xs) {
  return is_null(xs) ? null : pair(f(head(xs)), map(f, tail(xs)));
}

function build_list(f, n) {
  function build(i, rest) {
    return i < 0 ? rest : build(i - 1, pair(f(i), rest));
  }
  return build(n - 1, null);
}

function for_each(f, xs) {
  if (is_null(xs)) {
    return true;
  } else {
    f(head(xs));
    return for_each(f, tail(xs));
  }
}

function reverse(xs) {
  function rev(original, reversed) {
    return is_null(original) ? reversed : rev(tail(original), pair(head(original), reversed));
  }
  return rev(xs, null);
}

function append(xs, ys) {
  return is_null(xs) ? ys : pair(head(xs), append(tail(xs), ys));
}

function member(v, xs) {
  return is_null(xs) ? null : v === head(xs) ? xs : member(v, tail(xs));
}

function remove(v, xs) {
  return is_null(xs) ? null : v === head(xs) ? tail(xs) : pair(head(xs), remove(v, tail(xs)));
}

function remove_all(v, xs) {
  return is_null(xs)
    ? null
    : v === head(xs)
    ? remove_all(v, tail(xs))
    : pair(head(xs), remove_all(v, tail(xs)));
}

function filter(pred, xs) {
  return is_null(xs)
    ? null
    : pred(head(xs))
    ? pair(head(xs), filter(pred, tail(xs)))
    : filter(pred, tail(xs));
}

function enum_list(start, end) {
  return start > end ? null : pair(start, enum_list(start + 1, end));
}

function list_ref(xs, n) {
  return n === 0 ? head(xs) : list_ref(tail(xs), n - 1);
}

function accumulate(f, initial, xs) {
  return is_null(xs) ? initial : f(head(xs), accumulate(f, initial, tail(xs)));
}
`;

/**
 * Streams as in Source §3: a pair whose tail is a function of no arguments.
 * These tails are not memoized; §3.5.1 shows how to add that.
 */
export const streamLibrary = `
function stream_tail(s) {
  return tail(s)();
}

function is_stream(s) {
  return is_null(s) || (is_pair(s) && is_function(tail(s)) && is_stream(stream_tail(s)));
}

function list_to_stream(xs) {
  return is_null(xs) ? null : pair(head(xs), () => list_to_stream(tail(xs)));
}

function stream_to_list(s) {
  return is_null(s) ? null : pair(head(s), stream_to_list(stream_tail(s)));
}

function stream_length(s) {
  return is_null(s) ? 0 : 1 + stream_length(stream_tail(s));
}

function stream_map(f, s) {
  return is_null(s) ? null : pair(f(head(s)), () => stream_map(f, stream_tail(s)));
}

function build_stream(f, n) {
  function build(i) {
    return i >= n ? null : pair(f(i), () => build(i + 1));
  }
  return build(0);
}

function stream_for_each(f, s) {
  if (is_null(s)) {
    return true;
  } else {
    f(head(s));
    return stream_for_each(f, stream_tail(s));
  }
}

function stream_reverse(s) {
  function rev(original, reversed) {
    return is_null(original)
      ? reversed
      : rev(stream_tail(original), pair(head(original), () => reversed));
  }
  return rev(s, null);
}

function stream_append(xs, ys) {
  return is_null(xs) ? ys : pair(head(xs), () => stream_append(stream_tail(xs), ys));
}

function stream_member(v, s) {
  return is_null(s) ? null : head(s) === v ? s : stream_member(v, stream_tail(s));
}

function stream_remove(v, s) {
  return is_null(s)
    ? null
    : v === head(s)
    ? stream_tail(s)
    : pair(head(s), () => stream_remove(v, stream_tail(s)));
}

function stream_remove_all(v, s) {
  return is_null(s)
    ? null
    : v === head(s)
    ? stream_remove_all(v, stream_tail(s))
    : pair(head(s), () => stream_remove_all(v, stream_tail(s)));
}

function stream_filter(pred, s) {
  return is_null(s)
    ? null
    : pred(head(s))
    ? pair(head(s), () => stream_filter(pred, stream_tail(s)))
    : stream_filter(pred, stream_tail(s));
}

function enum_stream(start, end) {
  return start > end ? null : pair(start, () => enum_stream(start + 1, end));
}

function integers_from(n) {
  return pair(n, () => integers_from(n + 1));
}

function eval_stream(s, n) {
  return n === 0 ? null : pair(head(s), eval_stream(stream_tail(s), n - 1));
}

function stream_ref(s, n) {
  return n === 0 ? head(s) : stream_ref(stream_tail(s), n - 1);
}
`;

/** Both libraries, in the order `prepare` evaluates them. */
export const library = `${listLibrary}${streamLibrary}`;
