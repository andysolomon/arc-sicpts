/**
 * Section 2.2.4: the picture language. Painters are functions of a frame that
 * draw with the primitive `draw_line`, and every combinator is written in
 * Source from vectors and frames upward.
 */

/**
 * Vectors as pairs (Exercise 2.46). The prelude writes the arithmetic on
 * `head` and `tail` directly: every line a painter draws maps two points, and
 * this keeps that cheap.
 */
export const pictureVectors = `function make_vect(x, y) {
  return pair(x, y);
}

function xcor_vect(v) {
  return head(v);
}

function ycor_vect(v) {
  return tail(v);
}

function add_vect(v, w) {
  return pair(head(v) + head(w), tail(v) + tail(w));
}

function sub_vect(v, w) {
  return pair(head(v) - head(w), tail(v) - tail(w));
}

function scale_vect(s, v) {
  return pair(s * head(v), s * tail(v));
}
`;

/** Frames as lists (Exercise 2.47). */
export const pictureFrames = `function make_frame(origin, edge1, edge2) {
  return list(origin, edge1, edge2);
}

function origin_frame(frame) {
  return head(frame);
}

function edge1_frame(frame) {
  return head(tail(frame));
}

function edge2_frame(frame) {
  return head(tail(tail(frame)));
}
`;

export const pictureFrameCoordMap = `// The book's frame_coord_map, with the frame's parts looked up once.
function frame_coord_map(frame) {
  const origin = origin_frame(frame);
  const edge1 = edge1_frame(frame);
  const edge2 = edge2_frame(frame);
  return v => add_vect(origin,
                       add_vect(scale_vect(head(v), edge1),
                                scale_vect(tail(v), edge2)));
}
`;

/** Segments as pairs of vectors (Exercise 2.48). */
export const pictureSegments = `function make_segment(start, end) {
  return pair(start, end);
}

function start_segment(segment) {
  return head(segment);
}

function end_segment(segment) {
  return tail(segment);
}
`;

/** The book's `segments_to_painter`, with the frame's map made once per frame. */
export const pictureSegmentsToPainter = `function segments_to_painter(segment_list) {
  return frame => {
           const m = frame_coord_map(frame);
           return for_each(segment =>
                             draw_line(m(head(segment)), m(tail(segment))),
                           segment_list);
         };
}
`;

/**
 * The stick figure of figure 2.10 (Exercise 2.49), seventeen segments, and an
 * F, which looks different under every flip and rotation.
 */
export const picturePainters = `// A segment from (x1, y1) to (x2, y2).
function seg(x1, y1, x2, y2) {
  return make_segment(make_vect(x1, y1), make_vect(x2, y2));
}

const wave_segments = list(
  seg(0.25, 0, 0.35, 0.5), seg(0.35, 0.5, 0.3, 0.6), seg(0.3, 0.6, 0.15, 0.4),
  seg(0.15, 0.4, 0, 0.65), seg(0, 0.85, 0.15, 0.6), seg(0.15, 0.6, 0.3, 0.65),
  seg(0.3, 0.65, 0.4, 0.65), seg(0.4, 0.65, 0.35, 0.85), seg(0.35, 0.85, 0.4, 1),
  seg(0.6, 1, 0.65, 0.85), seg(0.65, 0.85, 0.6, 0.65), seg(0.6, 0.65, 0.75, 0.65),
  seg(0.75, 0.65, 1, 0.35), seg(1, 0.15, 0.6, 0.45), seg(0.6, 0.45, 0.75, 0),
  seg(0.6, 0, 0.5, 0.3), seg(0.5, 0.3, 0.4, 0));

const wave = segments_to_painter(wave_segments);

const letter_f = segments_to_painter(list(
  seg(0.3, 0.1, 0.3, 0.9), seg(0.3, 0.9, 0.7, 0.9), seg(0.3, 0.55, 0.6, 0.55)));
`;

export const pictureUnitFrame = `const unit_frame = make_frame(make_vect(0, 0), make_vect(1, 0), make_vect(0, 1));

// Paint on the whole canvas.
function paint(painter) {
  return painter(unit_frame);
}
`;

/**
 * What every example of §2.2.4 starts from, given as the editors' prelude:
 * vectors, frames, segments, `segments_to_painter`, `wave`, `letter_f` and `paint`.
 */
export const pictureBasis = `${pictureVectors}
${pictureFrames}
${pictureFrameCoordMap}
${pictureSegments}
${pictureSegmentsToPainter}
${picturePainters}
${pictureUnitFrame}`;

export const transformPainterDefinition = `function transform_painter(painter, origin, corner1, corner2) {
  return frame => {
           const m = frame_coord_map(frame);
           const new_origin = m(origin);
           return painter(make_frame(
                              new_origin,
                              sub_vect(m(corner1), new_origin),
                              sub_vect(m(corner2), new_origin)));
         };
}
`;

export const flipVertDefinition = `function flip_vert(painter) {
  return transform_painter(painter,
                           make_vect(0, 1),
                           make_vect(1, 1),
                           make_vect(0, 0));
}
`;

export const rotate90Definition = `function rotate90(painter) {
  return transform_painter(painter,
                           make_vect(1, 0),
                           make_vect(1, 1),
                           make_vect(0, 0));
}
`;

/** The answers to Exercise 2.50. */
export const flipHorizAndRotationsDefinitions = `function flip_horiz(painter) {
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
`;

/** `identity`, the flips and the rotations. */
export const pictureTransformations = `function identity(x) {
  return x;
}

${flipVertDefinition}
${flipHorizAndRotationsDefinitions}
${rotate90Definition}`;

export const besideDefinition = `function beside(painter1, painter2) {
  const split_point = make_vect(0.5, 0);
  const paint_left  = transform_painter(painter1,
                                        make_vect(0, 0),
                                        split_point,
                                        make_vect(0, 1));
  const paint_right = transform_painter(painter2,
                                        split_point,
                                        make_vect(1, 0),
                                        make_vect(0.5, 1));
  return frame => {
             paint_left(frame);
             paint_right(frame);
         };
}
`;

/** The answer to Exercise 2.51, written like `beside`. */
export const belowDefinition = `function below(painter1, painter2) {
  const split_point = make_vect(0, 0.5);
  const paint_bottom = transform_painter(painter1,
                                         make_vect(0, 0),
                                         make_vect(1, 0),
                                         split_point);
  const paint_top    = transform_painter(painter2,
                                         split_point,
                                         make_vect(1, 0.5),
                                         make_vect(0, 1));
  return frame => {
             paint_bottom(frame);
             paint_top(frame);
         };
}
`;

/** `pictureBasis` with the means of combination: transformations, `beside` and `below`. */
export const pictureLanguage = `${pictureBasis}
${transformPainterDefinition}
${pictureTransformations}
${besideDefinition}
${belowDefinition}`;

export const rightSplitDefinition = `function right_split(painter, n) {
  if (n === 0) {
    return painter;
  } else {
    const smaller = right_split(painter, n - 1);
    return beside(painter, below(smaller, smaller));
  }
}
`;

/** The answer to Exercise 2.44. */
export const upSplitDefinition = `function up_split(painter, n) {
  if (n === 0) {
    return painter;
  } else {
    const smaller = up_split(painter, n - 1);
    return below(painter, beside(smaller, smaller));
  }
}
`;

export const cornerSplitDefinition = `function corner_split(painter, n) {
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
`;

export const squareOfFourDefinition = `function square_of_four(tl, tr, bl, br) {
  return painter => {
    const top = beside(tl(painter), tr(painter));
    const bottom = beside(bl(painter), br(painter));
    return below(bottom, top);
  };
}
`;

/** The prelude of the square-limit example: the picture language and `up_split`. */
export const squareLimitPrelude = `${pictureLanguage}
${upSplitDefinition}`;

/** The prelude of the `square_of_four` example: the picture language and the three splits. */
export const splitsPrelude = `${pictureLanguage}
${rightSplitDefinition}
${upSplitDefinition}
${cornerSplitDefinition}`;

/** Figure 2.10: one painter, four frames. Prelude: `pictureBasis`. */
export const waveFramesProgram = `const square_frame = make_frame(make_vect(0.02, 0.52),
                                make_vect(0.46, 0),
                                make_vect(0, 0.46));
const leaning = make_frame(make_vect(0.54, 0.52),
                           make_vect(0.38, 0.06),
                           make_vect(0.06, 0.4));
const turned = make_frame(make_vect(0.48, 0.02),
                          make_vect(0, 0.46),
                          make_vect(-0.46, 0));
const squashed = make_frame(make_vect(0.52, 0.02),
                            make_vect(0.3, 0.16),
                            make_vect(0.16, 0.3));

wave(square_frame);
wave(leaning);
wave(turned);
wave(squashed);
`;

/** Figure 2.12. Prelude: `pictureLanguage`. */
export const wave4Program = `const wave2 = beside(wave, flip_vert(wave));
const wave4 = below(wave2, wave2);

paint(wave4);
`;

/** Figure 2.13: `right_split`. Prelude: `pictureLanguage`. */
export const rightSplitProgram = `${rightSplitDefinition}
paint(right_split(wave, 3));
`;

/** Figure 2.9: `corner_split` and `square_limit`. Prelude: `squareLimitPrelude`. */
export const squareLimitProgram = `${rightSplitDefinition}
${cornerSplitDefinition}
function square_limit(painter, n) {
  const quarter = corner_split(painter, n);
  const half = beside(flip_horiz(quarter), quarter);
  return below(flip_vert(half), half);
}

paint(square_limit(wave, 1));
`;

/** `square_of_four` and the patterns it captures. Prelude: `splitsPrelude`. */
export const squareOfFourProgram = `${squareOfFourDefinition}
function flipped_pairs(painter) {
  const combine4 = square_of_four(identity, flip_vert,
                                  identity, flip_vert);
  return combine4(painter);
}

function square_limit(painter, n) {
  const combine4 = square_of_four(flip_horiz, identity,
                                  rotate180, flip_vert);
  return combine4(corner_split(painter, n));
}

paint(square_limit(letter_f, 1));
`;

/** The frame coordinate map. Prelude: `pictureBasis`. */
export const frameCoordMapProgram = `function frame_coord_map(frame) {
  return v => add_vect(origin_frame(frame),
                       add_vect(scale_vect(xcor_vect(v),
                                           edge1_frame(frame)),
                                scale_vect(ycor_vect(v),
                                           edge2_frame(frame))));
}

const a_frame = make_frame(make_vect(0.15, 0.1),
                           make_vect(0.6, 0.2),
                           make_vect(0.2, 0.6));
const m = frame_coord_map(a_frame);

// The unit square's corners, mapped into the frame.
draw_line(m(make_vect(0, 0)), m(make_vect(1, 0)));
draw_line(m(make_vect(1, 0)), m(make_vect(1, 1)));
draw_line(m(make_vect(1, 1)), m(make_vect(0, 1)));
draw_line(m(make_vect(0, 1)), m(make_vect(0, 0)));
wave(a_frame);

display(equal(m(make_vect(0, 0)), origin_frame(a_frame)));
m(make_vect(0.5, 0.5));
`;

/** Painters from line segments. Prelude: `pictureBasis`. */
export const segmentsToPainterProgram = `function segments_to_painter(segment_list) {
  return frame =>
           for_each(segment =>
                      draw_line(
                          frame_coord_map(frame)
                              (start_segment(segment)),
                          frame_coord_map(frame)
                              (end_segment(segment))),
                    segment_list);
}

const arrow = segments_to_painter(list(
  make_segment(make_vect(0.1, 0.5), make_vect(0.9, 0.5)),
  make_segment(make_vect(0.9, 0.5), make_vect(0.7, 0.65)),
  make_segment(make_vect(0.9, 0.5), make_vect(0.7, 0.35))));

arrow(make_frame(make_vect(0, 0), make_vect(0.5, 0), make_vect(0, 0.5)));
arrow(make_frame(make_vect(0.75, 0.5), make_vect(0, 0.5), make_vect(-0.5, 0)));
`;

/** Transforming painters. Prelude: `pictureBasis`. */
export const transformPainterProgram = `${transformPainterDefinition}
function flip_vert(painter) {
  return transform_painter(painter,
                           make_vect(0, 1),  // new origin
                           make_vect(1, 1),  // new end of edge1
                           make_vect(0, 0)); // new end of edge2
}

function shrink_to_upper_right(painter) {
  return transform_painter(painter,
                           make_vect(0.5, 0.5),
                           make_vect(1, 0.5),
                           make_vect(0.5, 1));
}

function rotate90(painter) {
  return transform_painter(painter,
                           make_vect(1, 0),
                           make_vect(1, 1),
                           make_vect(0, 0));
}

function squash_inwards(painter) {
  return transform_painter(painter,
                           make_vect(0, 0),
                           make_vect(0.65, 0.35),
                           make_vect(0.35, 0.65));
}

const quarter = shrink_to_upper_right(letter_f);
paint(quarter);
paint(rotate90(quarter));
paint(flip_vert(quarter));
squash_inwards(wave)(make_frame(make_vect(0, 0), make_vect(0.5, 0), make_vect(0, 0.5)));
`;

/** `beside` from `transform_painter`. Prelude: `pictureLanguage`. */
export const besideProgram = `${besideDefinition}
paint(beside(wave, below(letter_f, rotate90(letter_f))));
`;
