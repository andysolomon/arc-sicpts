import { describe, expect, it } from 'vitest';
import { exerciseModules, exerciseSections } from 'virtual:exercise-catalog';
import { exercises } from '../content/exercises.ts';
import { exerciseFor } from '../src/mdx/exerciseCatalog.ts';

describe('lazy exercise catalog', () => {
  it('covers every checkable exercise and loads its original specification', async () => {
    expect(Object.keys(exerciseModules).sort()).toEqual(Object.keys(exercises).sort());
    for (const [id, spec] of Object.entries(exercises)) {
      expect(exerciseSections[id], id).toBeDefined();
      expect(await exerciseFor(id), id).toBe(spec);
    }
  });

  it('rejects an unknown exercise', async () => {
    await expect(exerciseFor('99.99')).rejects.toThrow('No exercise 99.99');
  });
});
