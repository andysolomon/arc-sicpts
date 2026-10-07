import { describe, expect, it } from 'vitest';
import { evaluate, type Outcome } from '../evaluator/evaluate.ts';
import type { Segment } from '../evaluator/primitives.ts';
import {
  besideProgram,
  frameCoordMapProgram,
  pictureBasis,
  pictureLanguage,
  rightSplitProgram,
  segmentsToPainterProgram,
  splitsPrelude,
  squareLimitPrelude,
  squareLimitProgram,
  squareOfFourProgram,
  transformPainterProgram,
  wave4Program,
  waveFramesProgram,
} from './pictures.ts';

/** Run a program after a prelude and keep what it drew. */
function drawn(source: string, prelude: string, budget = 1_000_000): { outcome: Outcome; lines: Segment[] } {
  const lines: Segment[] = [];
  const outcome = evaluate(source, { prelude, budget, draw: (segment) => lines.push(segment) });
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return { outcome, lines };
}

/** A drawing as a set of lines, whatever the order and direction they were drawn in. */
function lineSet(lines: readonly Segment[]): string[] {
  const r = (x: number) => (Math.round(x * 1e6) / 1e6 + 0).toString();
  return lines
    .map(([x1, y1, x2, y2]) => (x1 < x2 || (x1 === x2 && y1 <= y2) ? [x1, y1, x2, y2] : [x2, y2, x1, y1]))
    .map((s) => s.map(r).join(' '))
    .sort();
}

const inBox = (lines: readonly Segment[], x0: number, y0: number, x1: number, y1: number): boolean =>
  lines.every(([a, b, c, d]) => [a, c].every((x) => x0 - 1e-9 <= x && x <= x1 + 1e-9) && [b, d].every((y) => y0 - 1e-9 <= y && y <= y1 + 1e-9));

describe('section 2.2.4: the picture language', () => {
  it('paints the same wave into four frames: 4 × 17 lines', () => {
    const { lines } = drawn(waveFramesProgram, pictureBasis);
    expect(lines).toHaveLength(68);
    expect(inBox(lines, 0, 0, 1, 1)).toBe(true);
    // The first copy fills the square frame at the top left.
    expect(inBox(lines.slice(0, 17), 0.02, 0.52, 0.48, 0.98)).toBe(true);
  });

  it('builds wave4 from beside, below and flip_vert', () => {
    const { lines } = drawn(wave4Program, pictureLanguage);
    expect(lines).toHaveLength(68);
    // The first wave is drawn in the bottom-left quarter, its first line from (0.125, 0).
    expect(lines[0]).toEqual([0.125, 0, 0.175, 0.25]);
    expect(inBox(lines.slice(0, 17), 0, 0, 0.5, 0.5)).toBe(true);
    // Beside it, the flipped wave: the same line, upside down in the right half.
    expect(lines[17]![0]).toBeCloseTo(0.625, 12);
    expect(lines[17]![1]).toBeCloseTo(0.5, 12);
  });

  it('right_split(wave, 3) draws 15 waves, the big one in the left half', () => {
    const { lines, outcome } = drawn(rightSplitProgram, pictureLanguage);
    expect(lines).toHaveLength(15 * 17);
    expect(inBox(lines.slice(0, 17), 0, 0, 0.5, 1)).toBe(true);
    expect(outcome.steps).toBeLessThan(200_000);
  });

  it('square_limit(wave, 1) draws 24 waves, and the square_of_four version draws the same', () => {
    const first = drawn(squareLimitProgram, squareLimitPrelude);
    expect(first.lines).toHaveLength(24 * 17);
    // The animation traces 200 000 steps, enough for n = 1.
    expect(first.outcome.steps).toBeLessThan(200_000);
    const second = drawn(squareOfFourProgram.replace('paint(square_limit(letter_f, 1));', 'paint(square_limit(wave, 1));'), splitsPrelude);
    expect(lineSet(second.lines)).toEqual(lineSet(first.lines));
    // square_limit(wave, 2) needs 76 copies: 1292 lines.
    expect(drawn(squareLimitProgram.replace('square_limit(wave, 1)', 'square_limit(wave, 2)'), squareLimitPrelude).lines).toHaveLength(1292);
  });

  it('square_of_four: flipped_pairs draws wave4, and square_limit(letter_f, 1) draws 24 Fs', () => {
    const { lines } = drawn(squareOfFourProgram, splitsPrelude);
    expect(lines).toHaveLength(72);
    const flipped = drawn(squareOfFourProgram.replace('paint(square_limit(letter_f, 1));', 'paint(flipped_pairs(wave));'), splitsPrelude);
    expect(lineSet(flipped.lines)).toEqual(lineSet(drawn(wave4Program, pictureLanguage).lines));
  });

  it('frame_coord_map sends (0, 0) to the origin and (0.5, 0.5) to the centre', () => {
    const { outcome, lines } = drawn(frameCoordMapProgram, pictureBasis);
    expect(outcome).toMatchObject({ text: '[0.55, 0.5]', output: ['true'] });
    expect(lines).toHaveLength(4 + 17);
    expect(lines[0]).toEqual([0.15, 0.1, 0.75, 0.30000000000000004]);
  });

  it('segments_to_painter: one arrow, two frames', () => {
    const { lines } = drawn(segmentsToPainterProgram, pictureBasis);
    expect(lines).toHaveLength(6);
    expect(lines[0]).toEqual([0.05, 0.25, 0.45, 0.25]);
    // In the second frame edge1 points up, so the arrow does too.
    expect(lines[3]![0]).toBeCloseTo(0.5, 12);
    expect(lines[3]![1]).toBeCloseTo(0.55, 12);
    expect(lines[3]![2]).toBeCloseTo(0.5, 12);
    expect(lines[3]![3]).toBeCloseTo(0.95, 12);
  });

  it('the prelude’s faster painting draws exactly what the book’s functions draw', () => {
    // The program redeclares frame_coord_map and segments_to_painter as the book writes them.
    const book = segmentsToPainterProgram.replace(/const arrow[\s\S]*$/, 'segments_to_painter(wave_segments)(make_frame(make_vect(0.1, 0.2), make_vect(0.5, 0.1), make_vect(0.2, 0.7)));\n');
    const bookFrames = frameCoordMapProgram.replace(/const a_frame[\s\S]*$/, '');
    const fast = drawn('wave(make_frame(make_vect(0.1, 0.2), make_vect(0.5, 0.1), make_vect(0.2, 0.7)));', pictureBasis);
    expect(drawn(`${bookFrames}\n${book}`, pictureBasis).lines).toEqual(fast.lines);
  });

  it('transformations: three Fs in three quarters and a squashed wave', () => {
    const { lines } = drawn(transformPainterProgram, pictureBasis);
    expect(lines).toHaveLength(3 * 3 + 17);
    expect(inBox(lines.slice(0, 3), 0.5, 0.5, 1, 1)).toBe(true);
    expect(inBox(lines.slice(3, 6), 0, 0.5, 0.5, 1)).toBe(true);
    expect(inBox(lines.slice(6, 9), 0.5, 0, 1, 0.5)).toBe(true);
    expect(inBox(lines.slice(9), 0, 0, 0.5, 0.5)).toBe(true);
    // rotate90 turns the F's stem, (0.65, 0.55)–(0.65, 0.95), on its side.
    expect(lines[3]![1]).toBeCloseTo(0.65, 12);
    expect(lines[3]![3]).toBeCloseTo(0.65, 12);
  });

  it('beside paints the first painter on the left, then the second on the right', () => {
    const { lines } = drawn(besideProgram, pictureLanguage);
    expect(lines).toHaveLength(17 + 3 + 3);
    expect(inBox(lines.slice(0, 17), 0, 0, 0.5, 1)).toBe(true);
    expect(inBox(lines.slice(17), 0.5, 0, 1, 1)).toBe(true);
  });
});
