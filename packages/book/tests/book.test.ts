import { beforeEach, describe, expect, it } from 'vitest';
import { exerciseSections } from 'virtual:exercise-catalog';
import { editorKey, shareUrl } from '../src/editor/persistence.ts';
import { readExercise, recordExercise, sectionStatus } from '../src/progress.ts';
import { search } from '../src/shell/searchIndex.ts';
import { chapters, findPage, neighbours, pages, pathOf, sidebarPath } from '../src/toc.ts';

const page = (path: string) => {
  const found = findPage(path);
  if (found === null) throw new Error(`no page at ${path}`);
  return found;
};

describe('table of contents', () => {
  it('covers five chapters, every section, the front matter and three appendices', () => {
    expect(chapters.map((c) => c.sections.length)).toEqual([3, 5, 5, 4, 5]);
    expect(pages[0]?.path).toBe('/front');
    expect(pages.filter((p) => p.kind === 'appendix').map((p) => p.path)).toEqual([
      '/appendix/grammar',
      '/appendix/laboratory-api',
      '/appendix/repl',
    ]);
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length);
  });

  it('routes sections as /:chapter/:section', () => {
    expect(pathOf('1')).toBe('/1');
    expect(pathOf('1.2')).toBe('/1/1.2');
    expect(pathOf('1.2.1')).toBe('/1/1.2.1');
    expect(page('/1/1.2.1')).toMatchObject({ crumb: '1.2.1', title: 'Linear Recursion and Iteration' });
    expect(page('/1/1.2.1/')).toBe(page('/1/1.2.1'));
    expect(findPage('/9/9.9')).toBeNull();
  });

  it('walks the book in reading order', () => {
    const { previous, next } = neighbours(page('/1/1.2.1'));
    expect(previous?.path).toBe('/1/1.2');
    expect(next?.path).toBe('/1/1.2.2');
    expect(neighbours(page('/front')).previous).toBeNull();
    expect(neighbours(page('/appendix/repl')).next).toBeNull();
  });

  it('marks the parent section in the sidebar for a subsection page', () => {
    expect(sidebarPath(page('/1/1.2.1'))).toBe('/1/1.2');
    expect(sidebarPath(page('/1'))).toBe('/1');
  });
});

describe('manuscript search', () => {
  it('finds sections by number and by words in titles or summaries', () => {
    expect(search('1.2.1')[0]?.path).toBe('/1/1.2.1');
    expect(search('garbage collection')[0]?.title).toBe('Storage Allocation and Garbage Collection');
    expect(search('newton').map((p) => p.crumb)).toContain('1.1.7');
    expect(search('   ')).toEqual([]);
    expect(search('zzzz')).toEqual([]);
  });

  it('finds concepts in the prose and ranks exact exercise numbers first', () => {
    expect(search('memoization').map((p) => p.crumb)).toContain('3.5.1');
    expect(search('exercise 1.9')[0]?.crumb).toBe('1.2.1');
    expect(search('2.52')[0]?.crumb).toBe('2.2.4');
    expect(search('declarations', 200).map((p) => p.path)).toContain('/appendix/grammar');
  });
});

describe('persistence', () => {
  it('names storage keys sicp.editor.<sectionId>.<editorIndex>', () => {
    expect(editorKey('1.2.1', '0')).toBe('sicp.editor.1.2.1.0');
  });

  it('encodes an editor into ?code= and names later editors', () => {
    const first = new URL(shareUrl('0', 'factorial(6);'));
    expect([...first.searchParams.keys()]).toEqual(['code']);
    const second = new URL(shareUrl('1', 'factorial(6);'));
    expect(second.searchParams.get('ed')).toBe('1');
    expect(second.searchParams.get('code')).toBe(first.searchParams.get('code'));
  });
});

describe('progress', () => {
  beforeEach(() => window.localStorage.clear());

  const chapter = chapters[0]!;
  const section = chapter.sections[0]!;

  it('derives the status dot from stored exercise results', () => {
    expect(sectionStatus(chapter, section)).toBe('not started');
    recordExercise('1.3', { passed: 2, total: 4 });
    expect(readExercise('1.3')).toEqual({ passed: 2, total: 4 });
    expect(sectionStatus(chapter, section)).toBe('in progress');
    for (let n = 1; n <= 8; n++) {
      const id = `1.${n}`;
      recordExercise(id, { passed: 4, total: 4, source: 'checked answer' });
      window.localStorage.setItem(editorKey(exerciseSections[id]!, `ex-${id}`), 'checked answer');
    }
    expect(sectionStatus(chapter, section)).toBe('complete');
    window.localStorage.setItem(editorKey(exerciseSections['1.3']!, 'ex-1.3'), 'edited answer');
    expect(sectionStatus(chapter, section)).toBe('in progress');
    window.localStorage.setItem(editorKey(exerciseSections['1.3']!, 'ex-1.3'), 'checked answer');
    expect(sectionStatus(chapter, section)).toBe('complete');
    window.localStorage.removeItem(editorKey(exerciseSections['1.3']!, 'ex-1.3'));
    expect(sectionStatus(chapter, section)).toBe('in progress');
    expect(sectionStatus(chapter, chapter.sections[1]!)).toBe('not started');
  });

  it('ignores stored values it does not understand', () => {
    window.localStorage.setItem('sicp.exercise.1.3', 'not json');
    expect(readExercise('1.3')).toBeNull();
  });

  it('keeps legacy results as history but requires another check for completion', () => {
    for (let n = 1; n <= 8; n++) recordExercise(`1.${n}`, { passed: 4, total: 4 });
    expect(sectionStatus(chapter, section)).toBe('in progress');
  });
});
