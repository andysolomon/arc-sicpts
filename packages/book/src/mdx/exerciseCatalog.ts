import { exerciseModules } from 'virtual:exercise-catalog';
import type { ExerciseSpec } from '../../content/exercises/spec.ts';

const modules = import.meta.glob<Record<string, ExerciseSpec>>('../../content/exercises/*.ts');
const pending = new Map<string, Promise<ExerciseSpec>>();

/** Load just the module containing this exercise; neighboring exercises share the request. */
export function exerciseFor(id: string): Promise<ExerciseSpec> {
  const known = pending.get(id);
  if (known !== undefined) return known;
  const file = exerciseModules[id];
  const load = file === undefined ? undefined : modules[file];
  if (load === undefined) return Promise.reject(new Error(`No exercise ${id} in the catalog`));
  const result = load().then((module) => {
    const spec = Object.values(module).find((candidate) => candidate.id === id);
    if (spec === undefined) throw new Error(`No exercise ${id} in ${file}`);
    return spec;
  });
  pending.set(id, result);
  return result;
}
