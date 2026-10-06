import * as section_1_1 from './exercises/1.1.ts';
import * as section_1_2 from './exercises/1.2.ts';
import * as section_1_3 from './exercises/1.3.ts';
import type { ExerciseSpec } from './exercises/spec.ts';

export type { ExerciseSpec } from './exercises/spec.ts';

/** Every checkable exercise, by number. Each section's module exports only specs. */
export const exercises: Readonly<Record<string, ExerciseSpec>> = Object.fromEntries(
  [section_1_1, section_1_2, section_1_3].flatMap((section) => Object.values(section)).map((spec) => [spec.id, spec]),
);
