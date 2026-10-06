import { readStored, writeStored } from './storage.ts';
import type { Chapter, Section } from './toc.ts';

/** What the reader has achieved on one exercise, kept in localStorage. */
export interface ExerciseResult {
  passed: number;
  total: number;
}

const key = (exerciseId: string): string => `sicp.exercise.${exerciseId}`;

export function readExercise(exerciseId: string): ExerciseResult | null {
  const stored = readStored(key(exerciseId));
  if (stored === null) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== 'object' || value === null) return null;
    const { passed, total } = value as Record<string, unknown>;
    return typeof passed === 'number' && typeof total === 'number' ? { passed, total } : null;
  } catch {
    return null;
  }
}

export function recordExercise(exerciseId: string, result: ExerciseResult): void {
  writeStored(key(exerciseId), JSON.stringify(result));
}

export type SectionStatus = 'complete' | 'in progress' | 'not started';

/**
 * A section is in progress once any of its exercises has been checked, and
 * complete when every exercise of the section passes all of its tests.
 */
export function sectionStatus(chapter: Chapter, section: Section): SectionStatus {
  if (section.exercises === null) return 'not started';
  const [first, last] = section.exercises;
  let attempted = 0;
  let solved = 0;
  for (let n = first; n <= last; n++) {
    const result = readExercise(`${chapter.id}.${n}`);
    if (result === null) continue;
    attempted++;
    if (result.total > 0 && result.passed === result.total) solved++;
  }
  if (solved === last - first + 1) return 'complete';
  return attempted > 0 ? 'in progress' : 'not started';
}
