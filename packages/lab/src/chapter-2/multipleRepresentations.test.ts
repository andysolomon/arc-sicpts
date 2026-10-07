import { describe, expect, it } from 'vitest';
import { evaluate, type PrepareOptions } from '../evaluator/evaluate.ts';
import { createStepTracer } from '../inspect/stepTrace.ts';
import { listToString } from '../evaluator/values.ts';
import {
  dataDirectedPrelude,
  dataDirectedProgram,
  dispatchProgram,
  messagePassingProgram,
  operationTableProgram,
  polarProgram,
  rectangularProgram,
  taggedComplexDefinitions,
  taggedComplexProgram,
  typeTagProgram,
} from './multipleRepresentations.ts';

const run = (source: string, options: PrepareOptions = {}) => {
  const outcome = evaluate(source, options);
  if (outcome.status !== 'done') throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  return outcome;
};
const value = (source: string, options?: PrepareOptions): unknown => run(source, options).value;
const text = (source: string, options?: PrepareOptions): string => run(source, options).text;
const list = (source: string, options?: PrepareOptions): string => listToString(run(source, options).value as never);

describe('section 2.4.1: representations for complex numbers', () => {
  it('Ben stores real and imaginary parts, and his product picks up roundoff', () => {
    expect(text(`${rectangularProgram} list(z1, z2, sum);`)).toBe('[[3, 1], [[1, 1], [[4, 2], null]]]');
    expect(text(rectangularProgram)).toBe('[2.0000000000000004, 4]');
  });

  it('Alyssa stores magnitude and angle; the same arithmetic gives the same numbers', () => {
    expect(text(polarProgram)).toBe('[4.47213595499958, 1.1071487177940904]');
    expect(text(`${polarProgram} sum;`)).toBe('[4.47213595499958, 0.4636476090008061]');
    expect(list(`${polarProgram} list(real_part(sum), imag_part(sum), real_part(product), imag_part(product));`)).toBe(
      'list(4, 2, 2.0000000000000004, 4)',
    );
    // The angles of 3 + i and 1 + i add up to the product's.
    expect(value(`${polarProgram} angle(z1) + angle(z2) - angle(product);`)).toBe(0);
  });
});

describe('section 2.4.2: tagged data', () => {
  it('tells the same pair apart by its tag', () => {
    expect(run(typeTagProgram)).toMatchObject({ text: '[3, 4]', output: ['"polar"'] });
  });

  it('keeps both representations in one program', () => {
    expect(text(`${taggedComplexProgram} list(z1, z2, sum);`)).toBe(
      '[["rectangular", [3, 1]], [["polar", [1.4142135623730951, 0.7853981633974483]], [["rectangular", [4, 2]], null]]]',
    );
    expect(text(taggedComplexProgram)).toBe('["polar", [4.47213595499958, 1.1071487177940904]]');
  });

  it('sends each real_part to the code for its own type', () => {
    const tracer = createStepTracer(dispatchProgram, 5000);
    expect(value(dispatchProgram, { prelude: taggedComplexDefinitions, hooks: [tracer.hooks] })).toBe(5);
    const called = tracer.records.flatMap((r) => (r.event.kind === 'call' ? [r.event.name] : []));
    expect(called).toContain('real_part_rectangular');
    expect(called).toContain('real_part_polar');
  });
});

describe('section 2.4.3: data-directed programming', () => {
  it('puts entries in the table and gets them out again, or undefined', () => {
    expect(run(operationTableProgram)).toMatchObject({ text: 'undefined', output: ['0.5'] });
  });

  it('installs two packages and dispatches through the table', () => {
    expect(run(dataDirectedProgram, { prelude: dataDirectedPrelude })).toMatchObject({
      text: '1.0000000000000002',
      output: ['3.1622776601683795'],
    });
    const tracer = createStepTracer(dataDirectedProgram, 10_000);
    run(dataDirectedProgram, { prelude: dataDirectedPrelude, hooks: [tracer.hooks] });
    const calls = tracer.records.flatMap((r) => (r.event.kind === 'call' ? [r.event] : []));
    expect(calls.filter((c) => c.name === 'put')).toHaveLength(12);
    expect(calls.filter((c) => c.name === 'get').map((c) => c.args.join(', '))).toEqual([
      '"make_from_real_imag", "rectangular"',
      '"make_from_mag_ang", "polar"',
      '"magnitude", ["rectangular", null]',
      '"real_part", ["polar", null]',
    ]);
  });

  it('reports a type it has no method for', () => {
    const outcome = evaluate(`${dataDirectedProgram} real_part(attach_tag("cartesian", pair(1, 2)));`, { prelude: dataDirectedPrelude });
    expect(outcome.status).toBe('error');
    if (outcome.status === 'error') expect(outcome.error.message).toContain('no method for these types');
  });

  it('makes a data object of a function that answers messages', () => {
    expect(run(messagePassingProgram)).toMatchObject({ text: '0.9272952180016122', output: ['5'] });
    expect(value(`${messagePassingProgram} is_function(z) && real_part(z) === 3;`)).toBe(true);
  });
});
