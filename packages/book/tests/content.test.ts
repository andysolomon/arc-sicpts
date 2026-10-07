import * as lab from '@sicp/lab';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exercises } from '../content/exercises.ts';
import { chapters, pages } from '../src/toc.ts';

/**
 * Every written page compiles, and what it refers to exists: the programs it
 * imports, the exercise specs it shows, and the sections it says it enables.
 */

const modules = import.meta.glob('../content/[0-9]*/*.mdx');
const files = Object.keys(modules).sort();
const text = (file: string): string => readFileSync(new URL(file, import.meta.url), 'utf8');
const idOf = (file: string): string => file.split('/').pop()!.replace(/\.mdx$/, '');

describe.each(files.map((file) => ({ file, id: idOf(file) })))('$id', ({ file, id }) => {
  const source = text(file);

  it('compiles', async () => {
    const loaded = (await modules[file]!()) as { default: unknown };
    expect(typeof loaded.default).toBe('function');
  });

  it('imports only programs the Laboratory exports', () => {
    for (const match of source.matchAll(/import \{([^}]*)\} from '@sicp\/lab'/g)) {
      for (const name of match[1]!.split(',').map((n) => n.trim()).filter(Boolean)) {
        expect(lab, `${name} in ${id}`).toHaveProperty(name);
        expect(typeof (lab as Record<string, unknown>)[name], name).toBe('string');
      }
    }
  });

  it('numbers its examples 0, 1, 2, …', () => {
    const indexes = [...source.matchAll(/<Example index=\{(\d+)\}/g)].map((m) => Number(m[1]));
    expect(indexes).toEqual(indexes.map((_, i) => i));
  });

  it('shows exercises that have specs', () => {
    const shown = [...source.matchAll(/<Exercise id="([\d.]+)"/g)].map((m) => m[1]!);
    for (const exercise of shown) expect(exercises, `exercise ${exercise}`).toHaveProperty([exercise]);
    // Chapter 2 shows every exercise of the range. Chapters 1 and 5 leave out
    // the ones no check can judge (proofs, essays, major projects) and count them.
    const total = /<Exercises range="[^"]*" total=\{(\d+)\}/.exec(source);
    if (total !== null && id.startsWith('2.')) expect(shown).toHaveLength(Number(total[1]));
    if (total !== null) expect(shown.length).toBeLessThanOrEqual(Number(total[1]));
  });

  it('enables only sections that are in the contents', () => {
    for (const match of source.matchAll(/(?:id: |\[|, )'([\d.]+)'/g)) {
      expect(pages.map((p) => p.crumb), `${match[1]} in ${id}`).toContain(match[1]);
    }
  });
});

describe('chapter 2', () => {
  const chapter = chapters.find((c) => c.id === '2')!;

  it('has a written page for every subsection', () => {
    const written = new Set(files.map(idOf));
    const missing = chapter.sections.flatMap((s) => s.subsections.map((sub) => sub.id)).filter((id) => !written.has(id));
    expect(missing).toEqual([]);
  });

  it('shows every exercise from 2.1 to 2.97 exactly once', () => {
    const shown = files
      .filter((file) => idOf(file).startsWith('2.'))
      .flatMap((file) => [...text(file).matchAll(/<Exercise id="([\d.]+)"/g)].map((m) => m[1]!));
    expect(shown.toSorted((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1]))).toEqual(
      Array.from({ length: 97 }, (_, i) => `2.${i + 1}`),
    );
  });
});

describe('chapter 5', () => {
  const chapter = chapters.find((c) => c.id === '5')!;
  const ids = (prefix: string) =>
    files
      .filter((file) => idOf(file) === prefix || idOf(file).startsWith(`${prefix}.`))
      .flatMap((file) => [...text(file).matchAll(/<Exercise id="([\d.]+)"/g)].map((m) => m[1]!));

  it('has a written page for the chapter, every section and every subsection', () => {
    const written = new Set(files.map(idOf));
    const expected = ['5', ...chapter.sections.flatMap((s) => [s.id, ...s.subsections.map((sub) => sub.id)])];
    expect(expected.filter((id) => !written.has(id))).toEqual([]);
  });

  it('shows each exercise at most once, within its section’s range', () => {
    const shown = ids('5');
    expect(new Set(shown).size).toBe(shown.length);
    for (const section of chapter.sections) {
      const [first, last] = section.exercises ?? [0, -1];
      for (const exercise of ids(section.id)) {
        const n = Number(exercise.split('.')[1]);
        expect(n, `exercise ${exercise} in ${section.id}`).toBeGreaterThanOrEqual(first);
        expect(n, `exercise ${exercise} in ${section.id}`).toBeLessThanOrEqual(last);
      }
    }
  });
});
