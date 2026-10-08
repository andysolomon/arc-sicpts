import { exerciseModules, exerciseSections } from 'virtual:exercise-catalog';
import { editorKey } from './editor/persistence.ts';
import { readStored, writeStored } from './storage.ts';
import type { Chapter, Section } from './toc.ts';

/** What the reader has achieved on one exercise, kept in localStorage. */
export interface ExerciseResult {
  passed: number;
  total: number;
  /** Older records omit this and need another check before claiming completion. */
  source?: string;
}

const key = (exerciseId: string): string => `sicp.exercise.${exerciseId}`;

export function readExercise(exerciseId: string): ExerciseResult | null {
  const stored = readStored(key(exerciseId));
  if (stored === null) return null;
  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== 'object' || value === null) return null;
    const { passed, total, source } = value as Record<string, unknown>;
    if (typeof passed !== 'number' || typeof total !== 'number' || !Number.isInteger(passed) || !Number.isInteger(total) || passed < 0 || total <= 0 || passed > total) return null;
    return { passed, total, ...(typeof source === 'string' && { source }) };
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
 * complete when every checkable exercise passes all its tests with its current
 * saved source. Proofs and essays have no checks and do not count.
 */
export function sectionStatus(chapter: Chapter, section: Section): SectionStatus {
  if (section.exercises === null) return 'not started';
  const [first, last] = section.exercises;
  const checkable = Array.from({ length: last - first + 1 }, (_, i) => `${chapter.id}.${first + i}`).filter(
    (id) => exerciseModules[id] !== undefined,
  );
  let attempted = 0;
  let solved = 0;
  for (const id of checkable) {
    const result = readExercise(id);
    if (result === null) continue;
    attempted++;
    const pageId = exerciseSections[id];
    const current = pageId === undefined ? null : readStored(editorKey(pageId, `ex-${id}`));
    if (result.source !== undefined && current === result.source && result.passed === result.total) solved++;
  }
  if (checkable.length > 0 && solved === checkable.length) return 'complete';
  return attempted > 0 ? 'in progress' : 'not started';
}
