import {
  besideDefinition,
  cornerSplitDefinition,
  flipVertDefinition,
  pictureBasis,
  pictureFrameCoordMap,
  pictureFrames,
  pictureLanguage,
  pictureSegments,
  pictureSegmentsToPainter,
  pictureUnitFrame,
  pictureVectors,
  rightSplitDefinition,
  rotate90Definition,
  squareOfFourDefinition,
  transformPainterDefinition,
  upSplitDefinition,
} from '@sicp/lab';
import type { ExerciseSpec } from './spec.ts';

/** Exercises of §2.2.4. */

/**
 * The tests cannot see a drawing, so the preludes replace `draw_line` with one
 * that records each line, rounded to six places. `segments_of(painter)` paints
 * on the unit frame and returns the lines as `list(x1, y1, x2, y2)` each, and
 * `same_segments` compares two drawings whatever the order and direction of
 * their lines.
 */
const recording = `let recorded_lines = null;

function round6(x) {
  const r = math_round(x * 1000000) / 1000000;
  return r === 0 ? 0 : r;
}

function draw_line(start, end) {
  recorded_lines = pair(list(round6(head(start)), round6(tail(start)),
                             round6(head(end)), round6(tail(end))),
                        recorded_lines);
}

function segments_in(painter, frame) {
  recorded_lines = null;
  painter(frame);
  return reverse(recorded_lines);
}

function segments_of(painter) {
  return segments_in(painter, unit_frame);
}

function segment_key(s) {
  const x1 = list_ref(s, 0);
  const y1 = list_ref(s, 1);
  const x2 = list_ref(s, 2);
  const y2 = list_ref(s, 3);
  return x1 < x2 || (x1 === x2 && y1 <= y2)
    ? stringify(s)
    : stringify(list(x2, y2, x1, y1));
}

// Every line of ys is among the lines of xs.
function contains_segments(xs, ys) {
  const keys = map(segment_key, xs);
  return accumulate((y, ok) => ok && !is_null(member(segment_key(y), keys)), true, ys);
}

function same_segments(xs, ys) {
  return length(xs) === length(ys) && contains_segments(xs, ys) && contains_segments(ys, xs);
}

// Every endpoint lies in the box from (x0, y0) to (x1, y1).
function inside_box(xs, x0, y0, x1, y1) {
  return accumulate((s, ok) => ok &&
                      x0 <= list_ref(s, 0) && list_ref(s, 0) <= x1 &&
                      y0 <= list_ref(s, 1) && list_ref(s, 1) <= y1 &&
                      x0 <= list_ref(s, 2) && list_ref(s, 2) <= x1 &&
                      y0 <= list_ref(s, 3) && list_ref(s, 3) <= y1,
                    true, xs);
}
`;

const f = (...xs: number[][]): string => `list(${xs.map((x) => `list(${x.join(', ')})`).join(', ')})`;

export const exercise_2_44: ExerciseSpec = {
  id: '2.44',
  prelude: `${pictureLanguage}
${rightSplitDefinition}
${recording}`,
  starter: `// The prelude provides the picture language of this section: wave, letter_f,
// transform_painter, flip_vert, flip_horiz, beside, below, right_split and
// paint(painter).

function up_split(painter, n) {
  // your answer
}

function corner_split(painter, n) {
  if (n === 0) {
    return painter;
  } else {
    const up = up_split(painter, n - 1);
    const right = right_split(painter, n - 1);
    const top_left = beside(up, up);
    const bottom_right = below(right, right);
    const corner = corner_split(painter, n - 1);
    return beside(below(painter, top_left),
                  below(bottom_right, corner));
  }
}
`,
  tests: [
    { name: 'up_split(p, 0) is p', kind: 'value', expr: 'same_segments(segments_of(up_split(letter_f, 0)), segments_of(letter_f))', expected: true },
    {
      name: 'one level: the painter below two smaller copies',
      kind: 'value',
      expr: 'same_segments(segments_of(up_split(letter_f, 1)), segments_of(below(letter_f, beside(letter_f, letter_f))))',
      expected: true,
    },
    {
      name: 'two levels',
      kind: 'value',
      expr: 'same_segments(segments_of(up_split(letter_f, 2)), segments_of(below(letter_f, beside(below(letter_f, beside(letter_f, letter_f)), below(letter_f, beside(letter_f, letter_f))))))',
      expected: true,
    },
    { name: 'corner_split now runs: 19 copies at n = 2', kind: 'value', expr: 'length(segments_of(corner_split(letter_f, 2)))', expected: 57 },
  ],
  solution: `function up_split(painter, n) {
  if (n === 0) {
    return painter;
  } else {
    const smaller = up_split(painter, n - 1);
    return below(painter, beside(smaller, smaller));
  }
}

${cornerSplitDefinition}`,
};

export const exercise_2_45: ExerciseSpec = {
  id: '2.45',
  prelude: `${pictureLanguage}
${recording}`,
  starter: `// The prelude provides the picture language of this section: wave, letter_f,
// transform_painter, the flips, beside, below and paint(painter).

function split(big_op, small_op) {
  // your answer
}

const right_split = split(beside, below);
const up_split = split(below, beside);
`,
  tests: [
    { name: 'n = 0 gives the painter itself', kind: 'value', expr: 'same_segments(segments_of(right_split(letter_f, 0)), segments_of(letter_f))', expected: true },
    {
      name: 'right_split, one level',
      kind: 'value',
      expr: 'same_segments(segments_of(right_split(letter_f, 1)), segments_of(beside(letter_f, below(letter_f, letter_f))))',
      expected: true,
    },
    {
      name: 'up_split, one level',
      kind: 'value',
      expr: 'same_segments(segments_of(up_split(letter_f, 1)), segments_of(below(letter_f, beside(letter_f, letter_f))))',
      expected: true,
    },
    {
      name: 'right_split, two levels',
      kind: 'value',
      expr: 'same_segments(segments_of(right_split(letter_f, 2)), segments_of(beside(letter_f, below(beside(letter_f, below(letter_f, letter_f)), beside(letter_f, below(letter_f, letter_f))))))',
      expected: true,
    },
    { name: 'up_split(p, 3) draws 15 copies', kind: 'value', expr: 'length(segments_of(up_split(letter_f, 3)))', expected: 45 },
  ],
  solution: `function split(big_op, small_op) {
  function splitter(painter, n) {
    if (n === 0) {
      return painter;
    } else {
      const smaller = splitter(painter, n - 1);
      return big_op(painter, small_op(smaller, smaller));
    }
  }
  return splitter;
}

const right_split = split(beside, below);
const up_split = split(below, beside);
`,
};

export const exercise_2_46: ExerciseSpec = {
  id: '2.46',
  prelude: pictureFrames,
  starter: `// The prelude provides make_frame, origin_frame, edge1_frame and edge2_frame.

function make_vect(x, y) {
  // your answer
}

function xcor_vect(v) {
  // your answer
}

function ycor_vect(v) {
  // your answer
}

function add_vect(v, w) {
  // your answer
}

function sub_vect(v, w) {
  // your answer
}

function scale_vect(s, v) {
  // your answer
}

function frame_coord_map(frame) {
  return v => add_vect(origin_frame(frame),
                       add_vect(scale_vect(xcor_vect(v),
                                           edge1_frame(frame)),
                                scale_vect(ycor_vect(v),
                                           edge2_frame(frame))));
}
`,
  tests: [
    { name: 'selectors undo the constructor', kind: 'value', expr: 'xcor_vect(make_vect(3, 4)) * 10 + ycor_vect(make_vect(3, 4))', expected: 34 },
    {
      name: '(1, 2) + (3, 5) = (4, 7)',
      kind: 'value',
      expr: 'xcor_vect(add_vect(make_vect(1, 2), make_vect(3, 5))) === 4 && ycor_vect(add_vect(make_vect(1, 2), make_vect(3, 5))) === 7',
      expected: true,
    },
    {
      name: '(1, 2) − (3, 5) = (−2, −3)',
      kind: 'value',
      expr: 'xcor_vect(sub_vect(make_vect(1, 2), make_vect(3, 5))) === -2 && ycor_vect(sub_vect(make_vect(1, 2), make_vect(3, 5))) === -3',
      expected: true,
    },
    {
      name: '3 · (1, −2) = (3, −6)',
      kind: 'value',
      expr: 'xcor_vect(scale_vect(3, make_vect(1, -2))) === 3 && ycor_vect(scale_vect(3, make_vect(1, -2))) === -6',
      expected: true,
    },
    {
      name: 'frame_coord_map maps the centre of the unit square to the centre of a frame',
      kind: 'value',
      expr: 'xcor_vect(frame_coord_map(make_frame(make_vect(1, 1), make_vect(2, 0), make_vect(0, 3)))(make_vect(0.5, 0.5))) === 2 && ycor_vect(frame_coord_map(make_frame(make_vect(1, 1), make_vect(2, 0), make_vect(0, 3)))(make_vect(0.5, 0.5))) === 2.5',
      expected: true,
    },
  ],
  solution: `function make_vect(x, y) {
  return pair(x, y);
}

function xcor_vect(v) {
  return head(v);
}

function ycor_vect(v) {
  return tail(v);
}

function add_vect(v, w) {
  return make_vect(xcor_vect(v) + xcor_vect(w),
                   ycor_vect(v) + ycor_vect(w));
}

function sub_vect(v, w) {
  return make_vect(xcor_vect(v) - xcor_vect(w),
                   ycor_vect(v) - ycor_vect(w));
}

function scale_vect(s, v) {
  return make_vect(s * xcor_vect(v), s * ycor_vect(v));
}

function frame_coord_map(frame) {
  return v => add_vect(origin_frame(frame),
                       add_vect(scale_vect(xcor_vect(v),
                                           edge1_frame(frame)),
                                scale_vect(ycor_vect(v),
                                           edge2_frame(frame))));
}
`,
};

const partsOf = (n: 1 | 2): string =>
  `map(select => select(make_frame_${n}(make_vect(1, 2), make_vect(3, 4), make_vect(5, 6))), list(origin_frame_${n}, edge1_frame_${n}, edge2_frame_${n}))`;

export const exercise_2_47: ExerciseSpec = {
  id: '2.47',
  prelude: pictureVectors,
  starter: `// The prelude provides make_vect, xcor_vect, ycor_vect and the vector arithmetic.

function make_frame_1(origin, edge1, edge2) {
  return list(origin, edge1, edge2);
}

function origin_frame_1(frame) {
  // your answer
}

function edge1_frame_1(frame) {
  // your answer
}

function edge2_frame_1(frame) {
  // your answer
}

function make_frame_2(origin, edge1, edge2) {
  return pair(origin, pair(edge1, edge2));
}

function origin_frame_2(frame) {
  // your answer
}

function edge1_frame_2(frame) {
  // your answer
}

function edge2_frame_2(frame) {
  // your answer
}
`,
  tests: [
    { name: 'list frames: origin, edge1, edge2', kind: 'value', expr: `equal(${partsOf(1)}, list(pair(1, 2), pair(3, 4), pair(5, 6)))`, expected: true },
    { name: 'pair frames: origin, edge1, edge2', kind: 'value', expr: `equal(${partsOf(2)}, list(pair(1, 2), pair(3, 4), pair(5, 6)))`, expected: true },
    {
      name: 'the two edge2 selectors differ',
      kind: 'value',
      expr: 'is_pair(edge2_frame_1(make_frame_1(1, 2, 3))) || is_pair(edge2_frame_2(make_frame_2(1, 2, 3))) ? "mixed up" : edge2_frame_1(make_frame_1(1, 2, 3)) + edge2_frame_2(make_frame_2(1, 2, 3))',
      expected: 6,
    },
  ],
  solution: `function make_frame_1(origin, edge1, edge2) {
  return list(origin, edge1, edge2);
}

function origin_frame_1(frame) {
  return head(frame);
}

function edge1_frame_1(frame) {
  return head(tail(frame));
}

function edge2_frame_1(frame) {
  return head(tail(tail(frame)));
}

function make_frame_2(origin, edge1, edge2) {
  return pair(origin, pair(edge1, edge2));
}

function origin_frame_2(frame) {
  return head(frame);
}

function edge1_frame_2(frame) {
  return head(tail(frame));
}

function edge2_frame_2(frame) {
  return tail(tail(frame));
}
`,
};

export const exercise_2_48: ExerciseSpec = {
  id: '2.48',
  prelude: `${pictureVectors}
${pictureFrames}
${pictureFrameCoordMap}
${pictureUnitFrame}
${recording}`,
  starter: `// The prelude provides vectors (Exercise 2.46), frames, frame_coord_map and unit_frame.

function make_segment(start, end) {
  // your answer
}

function start_segment(segment) {
  // your answer
}

function end_segment(segment) {
  // your answer
}

function segments_to_painter(segment_list) {
  return frame =>
           for_each(segment =>
                      draw_line(
                          frame_coord_map(frame)
                              (start_segment(segment)),
                          frame_coord_map(frame)
                              (end_segment(segment))),
                    segment_list);
}
`,
  tests: [
    { name: 'start_segment', kind: 'value', expr: 'equal(start_segment(make_segment(make_vect(1, 2), make_vect(3, 4))), make_vect(1, 2))', expected: true },
    { name: 'end_segment', kind: 'value', expr: 'equal(end_segment(make_segment(make_vect(1, 2), make_vect(3, 4))), make_vect(3, 4))', expected: true },
    {
      name: 'segments_to_painter draws each segment from its start to its end',
      kind: 'value',
      expr: `equal(segments_of(segments_to_painter(list(make_segment(make_vect(0, 0), make_vect(1, 0.5)), make_segment(make_vect(0.25, 1), make_vect(0.75, 0))))), ${f([0, 0, 1, 0.5], [0.25, 1, 0.75, 0])})`,
      expected: true,
    },
  ],
  solution: `function make_segment(start, end) {
  return pair(start, end);
}

function start_segment(segment) {
  return head(segment);
}

function end_segment(segment) {
  return tail(segment);
}

function segments_to_painter(segment_list) {
  return frame =>
           for_each(segment =>
                      draw_line(
                          frame_coord_map(frame)
                              (start_segment(segment)),
                          frame_coord_map(frame)
                              (end_segment(segment))),
                    segment_list);
}
`,
};

const leftHalf = 'make_frame(make_vect(0, 0), make_vect(0.5, 0), make_vect(0, 1))';

export const exercise_2_49: ExerciseSpec = {
  id: '2.49',
  prelude: `${pictureVectors}
${pictureFrames}
${pictureFrameCoordMap}
${pictureSegments}
${pictureSegmentsToPainter}
${pictureUnitFrame}
${recording}`,
  starter: `// The prelude provides vectors, frames, segments, segments_to_painter and
// unit_frame; paint(painter) paints on the unit frame.

// A shorthand for the segment from (x1, y1) to (x2, y2).
function seg(x1, y1, x2, y2) {
  return make_segment(make_vect(x1, y1), make_vect(x2, y2));
}

// Replace each null with a list of segments.
const outline = segments_to_painter(null);

const x_painter = segments_to_painter(null);

const diamond = segments_to_painter(null);

const wave = segments_to_painter(null);
`,
  tests: [
    { name: 'the outline of the frame', kind: 'value', expr: `same_segments(segments_of(outline), ${f([0, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 0, 0])})`, expected: true },
    { name: 'an X through opposite corners', kind: 'value', expr: `same_segments(segments_of(x_painter), ${f([0, 0, 1, 1], [1, 0, 0, 1])})`, expected: true },
    {
      name: 'a diamond through the midpoints of the sides',
      kind: 'value',
      expr: `same_segments(segments_of(diamond), ${f([0.5, 0, 1, 0.5], [1, 0.5, 0.5, 1], [0.5, 1, 0, 0.5], [0, 0.5, 0.5, 0])})`,
      expected: true,
    },
    {
      name: 'the outline follows its frame',
      kind: 'value',
      expr: `same_segments(segments_in(outline, ${leftHalf}), ${f([0, 0, 0.5, 0], [0.5, 0, 0.5, 1], [0.5, 1, 0, 1], [0, 1, 0, 0])})`,
      expected: true,
    },
    {
      name: 'wave: at least ten segments, inside its frame',
      kind: 'value',
      expr: `length(segments_of(wave)) >= 10 && inside_box(segments_of(wave), 0, 0, 1, 1) && inside_box(segments_in(wave, ${leftHalf}), 0, 0, 0.5, 1)`,
      expected: true,
    },
  ],
  solution: `function seg(x1, y1, x2, y2) {
  return make_segment(make_vect(x1, y1), make_vect(x2, y2));
}

const outline = segments_to_painter(list(
  seg(0, 0, 1, 0), seg(1, 0, 1, 1), seg(1, 1, 0, 1), seg(0, 1, 0, 0)));

const x_painter = segments_to_painter(list(
  seg(0, 0, 1, 1), seg(1, 0, 0, 1)));

const diamond = segments_to_painter(list(
  seg(0.5, 0, 1, 0.5), seg(1, 0.5, 0.5, 1), seg(0.5, 1, 0, 0.5), seg(0, 0.5, 0.5, 0)));

const wave = segments_to_painter(list(
  seg(0.25, 0, 0.35, 0.5), seg(0.35, 0.5, 0.3, 0.6), seg(0.3, 0.6, 0.15, 0.4),
  seg(0.15, 0.4, 0, 0.65), seg(0, 0.85, 0.15, 0.6), seg(0.15, 0.6, 0.3, 0.65),
  seg(0.3, 0.65, 0.4, 0.65), seg(0.4, 0.65, 0.35, 0.85), seg(0.35, 0.85, 0.4, 1),
  seg(0.6, 1, 0.65, 0.85), seg(0.65, 0.85, 0.6, 0.65), seg(0.6, 0.65, 0.75, 0.65),
  seg(0.75, 0.65, 1, 0.35), seg(1, 0.15, 0.6, 0.45), seg(0.6, 0.45, 0.75, 0),
  seg(0.6, 0, 0.5, 0.3), seg(0.5, 0.3, 0.4, 0)));
`,
};

// letter_f is the vertical stroke (0.3, 0.1)–(0.3, 0.9), the top bar to (0.7, 0.9)
// and the middle bar (0.3, 0.55)–(0.6, 0.55).
export const exercise_2_50: ExerciseSpec = {
  id: '2.50',
  prelude: `${pictureBasis}
${transformPainterDefinition}
${flipVertDefinition}
${rotate90Definition}
${recording}`,
  starter: `// The prelude provides wave, letter_f, transform_painter, flip_vert,
// rotate90 and paint(painter). letter_f is an F, so you can see which way
// it has been turned.

function flip_horiz(painter) {
  // your answer
}

function rotate180(painter) {
  // your answer
}

function rotate270(painter) {
  // your answer
}
`,
  tests: [
    { name: 'flip_horiz mirrors left and right', kind: 'value', expr: `same_segments(segments_of(flip_horiz(letter_f)), ${f([0.7, 0.1, 0.7, 0.9], [0.7, 0.9, 0.3, 0.9], [0.7, 0.55, 0.4, 0.55])})`, expected: true },
    { name: 'rotate180 turns it upside down', kind: 'value', expr: `same_segments(segments_of(rotate180(letter_f)), ${f([0.7, 0.9, 0.7, 0.1], [0.7, 0.1, 0.3, 0.1], [0.7, 0.45, 0.4, 0.45])})`, expected: true },
    { name: 'rotate270 turns it clockwise by a quarter', kind: 'value', expr: `same_segments(segments_of(rotate270(letter_f)), ${f([0.1, 0.7, 0.9, 0.7], [0.9, 0.7, 0.9, 0.3], [0.55, 0.7, 0.55, 0.4])})`, expected: true },
    { name: 'rotate270 undoes rotate90', kind: 'value', expr: 'same_segments(segments_of(rotate270(rotate90(wave))), segments_of(wave))', expected: true },
  ],
  solution: `function flip_horiz(painter) {
  return transform_painter(painter,
                           make_vect(1, 0),
                           make_vect(0, 0),
                           make_vect(1, 1));
}

function rotate180(painter) {
  return transform_painter(painter,
                           make_vect(1, 1),
                           make_vect(0, 1),
                           make_vect(1, 0));
}

function rotate270(painter) {
  return transform_painter(painter,
                           make_vect(0, 1),
                           make_vect(0, 0),
                           make_vect(1, 1));
}
`,
};

// letter_f below an upside-down letter_f: the first painter in the bottom half.
const fOverFlippedF = f(
  [0.3, 0.05, 0.3, 0.45],
  [0.3, 0.45, 0.7, 0.45],
  [0.3, 0.275, 0.6, 0.275],
  [0.3, 0.95, 0.3, 0.55],
  [0.3, 0.55, 0.7, 0.55],
  [0.3, 0.725, 0.6, 0.725],
);

export const exercise_2_51: ExerciseSpec = {
  id: '2.51',
  prelude: `${pictureBasis}
${transformPainterDefinition}
${flipVertDefinition}
${rotate90Definition}
function rotate270(painter) {
  return transform_painter(painter,
                           make_vect(0, 1),
                           make_vect(0, 0),
                           make_vect(1, 1));
}

${besideDefinition}
${recording}`,
  starter: `// The prelude provides wave, letter_f, transform_painter, flip_vert,
// rotate90, rotate270, beside and paint(painter).

// Like beside: paint painter1 in the bottom half and painter2 in the top half.
function below(painter1, painter2) {
  // your answer
}

// The same, from beside and rotations.
function below_by_rotation(painter1, painter2) {
  // your answer
}
`,
  tests: [
    { name: 'below: the first painter at the bottom', kind: 'value', expr: `same_segments(segments_of(below(letter_f, flip_vert(letter_f))), ${fOverFlippedF})`, expected: true },
    { name: 'below_by_rotation: the same picture', kind: 'value', expr: `same_segments(segments_of(below_by_rotation(letter_f, flip_vert(letter_f))), ${fOverFlippedF})`, expected: true },
    {
      name: 'the two agree on wave',
      kind: 'value',
      expr: 'same_segments(segments_of(below(wave, letter_f)), segments_of(below_by_rotation(wave, letter_f)))',
      expected: true,
    },
    { name: 'below_by_rotation is built with beside', kind: 'calls', call: 'below_by_rotation(letter_f, wave)', fn: 'beside', atMost: 2 },
  ],
  solution: `function below(painter1, painter2) {
  const split_point = make_vect(0, 0.5);
  const paint_bottom = transform_painter(painter1,
                                         make_vect(0, 0),
                                         make_vect(1, 0),
                                         split_point);
  const paint_top = transform_painter(painter2,
                                      split_point,
                                      make_vect(1, 0.5),
                                      make_vect(0, 1));
  return frame => {
             paint_bottom(frame);
             paint_top(frame);
         };
}

function below_by_rotation(painter1, painter2) {
  return rotate90(beside(rotate270(painter1), rotate270(painter2)));
}
`,
};

export const exercise_2_52: ExerciseSpec = {
  id: '2.52',
  prelude: `${pictureLanguage}
${rightSplitDefinition}
${upSplitDefinition}
${cornerSplitDefinition}
${squareOfFourDefinition}
${recording}`,
  starter: `// The prelude provides the whole picture language of this section:
// wave_segments, wave, letter_f, seg(x1, y1, x2, y2), the flips and
// rotations, identity, beside, below, right_split, up_split, corner_split,
// square_of_four and paint(painter).

// 1. The lowest level: wave with some segments added, a smile for example.
const smiling_wave = segments_to_painter(wave_segments); // your answer

// 2. The middle level: corner_split with one copy of up_split and of
//    right_split instead of two.
function simple_corner_split(painter, n) {
  // your answer
}

// 3. The top level: a square limit, made with square_of_four and
//    corner_split, whose four largest copies sit in the corners of the
//    square, the bottom-left one upright, and which stays symmetric.
function square_limit_out(painter, n) {
  // your answer
}
`,
  tests: [
    {
      name: 'smiling_wave is wave plus at least one segment',
      kind: 'value',
      expr: 'length(segments_of(smiling_wave)) > 17 && contains_segments(segments_of(smiling_wave), segments_of(wave)) && inside_box(segments_of(smiling_wave), 0, 0, 1, 1)',
      expected: true,
    },
    {
      name: 'simple_corner_split, one level',
      kind: 'value',
      expr: 'same_segments(segments_of(simple_corner_split(letter_f, 1)), segments_of(beside(below(letter_f, letter_f), below(letter_f, letter_f))))',
      expected: true,
    },
    {
      name: 'simple_corner_split, two levels: 11 copies',
      kind: 'value',
      expr: 'same_segments(segments_of(simple_corner_split(letter_f, 2)), segments_of(beside(below(letter_f, up_split(letter_f, 1)), below(right_split(letter_f, 1), simple_corner_split(letter_f, 1)))))',
      expected: true,
    },
    { name: 'square_limit_out: 24 copies at n = 1', kind: 'value', expr: 'length(segments_of(square_limit_out(letter_f, 1)))', expected: 72 },
    {
      name: 'square_limit_out: an upright F in the bottom-left corner, a quarter of the size',
      kind: 'value',
      expr: `contains_segments(segments_of(square_limit_out(letter_f, 1)), ${f([0.075, 0.025, 0.075, 0.225], [0.075, 0.225, 0.175, 0.225], [0.075, 0.1375, 0.15, 0.1375])})`,
      expected: true,
    },
    {
      name: 'square_limit_out: symmetric both ways',
      kind: 'value',
      expr: 'same_segments(segments_of(flip_horiz(square_limit_out(letter_f, 1))), segments_of(square_limit_out(letter_f, 1))) && same_segments(segments_of(flip_vert(square_limit_out(letter_f, 1))), segments_of(square_limit_out(letter_f, 1)))',
      expected: true,
    },
  ],
  budget: 1_000_000,
  solution: `const smiling_wave = segments_to_painter(append(wave_segments, list(
  seg(0.45, 0.78, 0.5, 0.75), seg(0.5, 0.75, 0.55, 0.78))));

function simple_corner_split(painter, n) {
  if (n === 0) {
    return painter;
  } else {
    const up = up_split(painter, n - 1);
    const right = right_split(painter, n - 1);
    const corner = simple_corner_split(painter, n - 1);
    return beside(below(painter, up),
                  below(right, corner));
  }
}

function square_limit_out(painter, n) {
  const combine4 = square_of_four(flip_vert, rotate180,
                                  identity, flip_horiz);
  return combine4(corner_split(painter, n));
}
`,
};
