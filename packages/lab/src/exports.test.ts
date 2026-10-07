import { describe, expect, it } from 'vitest';
import * as chapter1_exponentiation from './chapter-1/exponentiation.ts';
import * as chapter1_factorial from './chapter-1/factorial.ts';
import * as chapter1_gcd from './chapter-1/gcd.ts';
import * as chapter1_generalMethods from './chapter-1/generalMethods.ts';
import * as chapter1_growth from './chapter-1/growth.ts';
import * as chapter1_lambdas from './chapter-1/lambdas.ts';
import * as chapter1_primality from './chapter-1/primality.ts';
import * as chapter1_returnedValues from './chapter-1/returnedValues.ts';
import * as chapter1_sums from './chapter-1/sums.ts';
import * as chapter1_treeRecursion from './chapter-1/treeRecursion.ts';
import * as chapter2_dataAbstraction from './chapter-2/dataAbstraction.ts';
import * as chapter2_genericArithmetic from './chapter-2/genericArithmetic.ts';
import * as chapter2_multipleRepresentations from './chapter-2/multipleRepresentations.ts';
import * as chapter2_pictures from './chapter-2/pictures.ts';
import * as chapter2_sequences from './chapter-2/sequences.ts';
import * as chapter2_symbolicAlgebra from './chapter-2/symbolicAlgebra.ts';
import * as chapter2_symbolicData from './chapter-2/symbolicData.ts';

/**
 * `index.ts` re-exports each section's programs with `export *`. Two modules
 * exporting the same name make that name ambiguous, and it silently drops out
 * of the package, so every name must come from exactly one module. A new
 * module of programs belongs in this list too.
 */

const modules: Record<string, Record<string, unknown>> = { chapter1_exponentiation, chapter1_factorial, chapter1_gcd, chapter1_generalMethods, chapter1_growth, chapter1_lambdas, chapter1_primality, chapter1_returnedValues, chapter1_sums, chapter1_treeRecursion, chapter2_dataAbstraction, chapter2_genericArithmetic, chapter2_multipleRepresentations, chapter2_pictures, chapter2_sequences, chapter2_symbolicAlgebra, chapter2_symbolicData };

describe('the programs the package re-exports', () => {
  it('have one module per name', () => {
    const owners = new Map<string, string[]>();
    for (const [module, exports] of Object.entries(modules)) {
      for (const name of Object.keys(exports)) owners.set(name, [...(owners.get(name) ?? []), module]);
    }
    expect([...owners].filter(([, found]) => found.length > 1)).toEqual([]);
  });
});
