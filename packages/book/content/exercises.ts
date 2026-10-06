import * as section_1_1 from './exercises/1.1.ts';
import * as section_1_2 from './exercises/1.2.ts';
import * as section_1_3 from './exercises/1.3.ts';
import * as section_3_1 from './exercises/3.1.ts';
import * as section_3_2 from './exercises/3.2.ts';
import * as section_3_3 from './exercises/3.3.ts';
import * as section_3_3_simulation from './exercises/3.3-simulation.ts';
import * as section_3_4 from './exercises/3.4.ts';
import * as section_3_5 from './exercises/3.5.ts';
import * as section_3_5_paradigm from './exercises/3.5-paradigm.ts';
import type { ExerciseSpec } from './exercises/spec.ts';

export type { ExerciseSpec } from './exercises/spec.ts';

/** Every checkable exercise, by number. Each section's module exports only specs. */
export const exercises: Readonly<Record<string, ExerciseSpec>> = Object.fromEntries(
  [section_1_1, section_1_2, section_1_3, section_3_1, section_3_2, section_3_3, section_3_3_simulation, section_3_4, section_3_5, section_3_5_paradigm]
    .flatMap((section): ExerciseSpec[] => Object.values(section))
    .map((spec) => [spec.id, spec]),
);
