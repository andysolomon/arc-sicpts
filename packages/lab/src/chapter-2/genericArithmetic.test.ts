import { describe, expect, it } from 'vitest';
import { evaluate, prepare } from '../evaluator/evaluate.ts';
import {
  coercionProgram,
  complexPackagePrelude,
  complexPackageProgram,
  complexSelectorsInstall,
  crossTypeProgram,
  genericArithmeticDefinitions,
  genericBaseDefinitions,
  javascriptNumberProgram,
  plainNumberArithmeticDefinitions,
  rationalPackageProgram,
} from './genericArithmetic.ts';

const text = (source: string, prelude?: string): string => {
  const outcome = evaluate(source, prelude === undefined ? {} : { prelude });
  if (outcome.status !== 'done') {
    throw new Error(outcome.status === 'error' ? outcome.error.message : outcome.status);
  }
  return outcome.text;
};

const errorOf = (source: string, prelude?: string): string => {
  const outcome = evaluate(source, prelude === undefined ? {} : { prelude });
  return outcome.status === 'error' ? outcome.error.message : `no error: ${outcome.status}`;
};

/** How many times `follow` applies `fn` after the program has run, counting only closures declared in `frame` when given. */
const callsOf = (source: string, follow: string, fn: string, prelude: string, frame?: string): number => {
  const session = prepare(source, { prelude });
  session.machine.run();
  if (session.machine.status !== 'done') throw new Error(session.machine.status);
  let count = 0;
  const measured = session.follow(follow, {
    hooks: [{ onCall: (info) => void (info.name === fn && (frame === undefined || info.closure.env.frame.id === frame) && count++) }],
  });
  measured.run();
  if (measured.status !== 'done') throw new Error(measured.status);
  return count;
};

describe('section 2.5.1: generic arithmetic operations', () => {
  it('adds tagged ordinary numbers through apply_generic', () => {
    expect(text(javascriptNumberProgram)).toBe('["javascript_number", 7]');
    expect(text(`${javascriptNumberProgram} sub(mul(seven, seven), make_javascript_number(9));`)).toBe(
      '["javascript_number", 40]',
    );
  });

  it('plugs the rational package in without changing the base', () => {
    expect(text(rationalPackageProgram, genericBaseDefinitions)).toBe('["rational", [5, 6]]');
    expect(text(`${rationalPackageProgram} one_half;`, genericBaseDefinitions)).toBe('["rational", [1, 2]]');
    expect(text(`${rationalPackageProgram} div(sum, one_half);`, genericBaseDefinitions)).toBe('["rational", [5, 3]]');
  });

  it('tags a complex number twice, as in figure 2.24', () => {
    expect(text(`${complexPackageProgram} z;`, complexPackagePrelude)).toBe('["complex", ["rectangular", [3, 4]]]');
    // mul_complex works in magnitudes and angles, so the product comes back polar.
    const product = text(complexPackageProgram, complexPackagePrelude);
    expect(product).toMatch(/^\["complex", \["polar", \[25, 1\.85459043600322\d*\]\]\]$/);
  });

  it('has no method for magnitude on "complex" until Alyssa’s four lines are added', () => {
    const z = 'const z = make_complex_from_real_imag(3, 4);\n';
    expect(errorOf(`${z} magnitude(z);`, genericArithmeticDefinitions)).toContain(
      'no method for these types -- apply_generic ["magnitude", [["complex", null], null]]',
    );
    expect(text(`${z}${complexSelectorsInstall} magnitude(z);`, genericArithmeticDefinitions)).toBe('5');
    // magnitude(z) then invokes apply_generic twice: once on "complex", once on "rectangular".
    expect(callsOf(`${z}${complexSelectorsInstall}`, 'magnitude(z);', 'apply_generic', genericArithmeticDefinitions)).toBe(2);
  });

  it('lets plain numbers be "javascript_number" data after Exercise 2.78', () => {
    expect(text('add(3, mul(4, 5));', plainNumberArithmeticDefinitions)).toBe('23');
    expect(text('magnitude(add(make_complex_from_real_imag(1, 2), make_complex_from_real_imag(2, 2)));', plainNumberArithmeticDefinitions)).toBe('5');
  });
});

describe('section 2.5.2: combining data of different types', () => {
  it('adds a complex and an ordinary number with a cross-type method, in that order only', () => {
    expect(text(crossTypeProgram, genericArithmeticDefinitions)).toBe('["complex", ["rectangular", [8, 4]]]');
    expect(errorOf(`${crossTypeProgram} add(make_javascript_number(5), z);`, genericArithmeticDefinitions)).toContain(
      'no method for these types',
    );
  });

  it('coerces the ordinary number to complex, then tries again', () => {
    expect(text(coercionProgram, genericArithmeticDefinitions)).toBe('["complex", ["rectangular", [8, 4]]]');
    const swapped = coercionProgram.replace('add(make_javascript_number(5), z);', 'add(z, make_javascript_number(5));');
    expect(text(swapped, genericArithmeticDefinitions)).toBe('["complex", ["rectangular", [8, 4]]]');
    const definitions = coercionProgram.replace('add(make_javascript_number(5), z);', '');
    // The program's apply_generic runs twice: no method for the mixed types, then the method for two complex numbers.
    expect(callsOf(definitions, 'add(make_javascript_number(5), z);', 'apply_generic', genericArithmeticDefinitions, 'E0')).toBe(2);
    // Two rational numbers have no coercion to try, so the error is the same as before.
    expect(errorOf(`${definitions} add(make_rational(1, 2), z);`, genericArithmeticDefinitions)).toContain(
      'no method for these types',
    );
  });
});
