import * as section_1_1 from './exercises/1.1.ts';
import * as section_1_2 from './exercises/1.2.ts';
import * as section_1_3 from './exercises/1.3.ts';
import * as section_2_1 from './exercises/2.1.ts';
import * as section_2_2 from './exercises/2.2.ts';
import * as section_2_2_4 from './exercises/2.2.4.ts';
import * as section_2_3 from './exercises/2.3.ts';
import * as section_2_4 from './exercises/2.4.ts';
import * as section_2_5 from './exercises/2.5.ts';
import * as section_2_5_3 from './exercises/2.5.3.ts';
import * as section_5_1 from './exercises/5.1.ts';
import * as section_5_2 from './exercises/5.2.ts';
import * as section_5_3 from './exercises/5.3.ts';
import * as section_5_4 from './exercises/5.4.ts';
import * as section_5_5 from './exercises/5.5.ts';
import * as section_5_5_5 from './exercises/5.5.5.ts';
import * as section_4_1 from './exercises/4.1.ts';
import * as section_4_2 from './exercises/4.2.ts';
import * as section_4_3 from './exercises/4.3.ts';
import * as section_4_4 from './exercises/4.4.ts';
import * as section_3_1 from './exercises/3.1.ts';
import * as section_3_2 from './exercises/3.2.ts';
import * as section_3_3 from './exercises/3.3.ts';
import * as section_3_3_simulation from './exercises/3.3-simulation.ts';
import * as section_3_4 from './exercises/3.4.ts';
import * as section_3_5 from './exercises/3.5.ts';
import * as section_3_5_paradigm from './exercises/3.5-paradigm.ts';
import type { ExerciseSpec } from './exercises/spec.ts';

export { programOf, type ExerciseSpec } from './exercises/spec.ts';

const sections: readonly Readonly<Record<string, ExerciseSpec>>[] = [
  section_1_1,
  section_1_2,
  section_1_3,
  section_2_1,
  section_2_2,
  section_2_2_4,
  section_2_3,
  section_2_4,
  section_2_5,
  section_2_5_3,
  section_3_1,
  section_3_2,
  section_3_3,
  section_3_3_simulation,
  section_3_4,
  section_3_5,
  section_3_5_paradigm,
  section_5_1,
  section_5_2,
  section_5_3,
  section_5_4,
  section_5_5,
  section_5_5_5,
  section_4_1,
  section_4_2,
  section_4_3,
  section_4_4,
];

/** Every checkable exercise, by number. Each section's module exports only specs. */
export const exercises: Readonly<Record<string, ExerciseSpec>> = Object.fromEntries(
  sections.flatMap((section) => Object.values(section)).map((spec) => [spec.id, spec]),
);
