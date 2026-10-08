import { pages, type Page } from '../toc.ts';
import { manuscript } from 'virtual:manuscript-index';

export interface SearchEntry {
  page: Page;
  /** Lower-cased text the query is matched against. */
  haystack: string;
  exercises: readonly string[];
}

const blurbOf = (page: Page): string =>
  page.kind === 'chapter' ? page.chapter.blurb : page.kind === 'section' ? page.section.blurb : '';

/**
 * Searchable manuscript terms and exercise numbers are extracted at build time.
 * They do not require loading MDX, exercise answers, or the evaluator.
 */
export const searchIndex: SearchEntry[] = pages.map((page) => {
  const metadata = manuscript[page.kind === 'appendix' ? page.path.slice(1) : page.crumb];
  return {
    page,
    haystack: `${page.crumb} ${page.title} ${blurbOf(page)} ${metadata?.terms ?? ''}`.toLowerCase(),
    exercises: metadata?.exercises ?? [],
  };
});

export function search(query: string, limit = 8): Page[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const first = words[0] ?? '';
  return searchIndex
    .filter((entry) => words.every((word) => entry.haystack.includes(word)))
    .map((entry) => {
      const title = entry.page.title.toLowerCase();
      // Section numbers first, then title matches, then blurb matches.
      const rank = entry.exercises.some((id) => words.includes(id)) ? 0
        : entry.page.crumb.toLowerCase() === first ? 0
        : entry.page.crumb.toLowerCase().startsWith(first) ? 1 : title.includes(first) ? 2 : 3;
      return { page: entry.page, rank };
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((entry) => entry.page);
}
