import { pages, type Page } from '../toc.ts';

export interface SearchEntry {
  page: Page;
  /** Lower-cased text the query is matched against. */
  haystack: string;
}

const blurbOf = (page: Page): string =>
  page.kind === 'chapter' ? page.chapter.blurb : page.kind === 'section' ? page.section.blurb : '';

/**
 * A stub index over titles, numbers and blurbs. Full-text search over the
 * prose can replace `haystack` without changing the dialog.
 */
export const searchIndex: SearchEntry[] = pages.map((page) => ({
  page,
  haystack: `${page.crumb} ${page.title} ${blurbOf(page)}`.toLowerCase(),
}));

export function search(query: string, limit = 8): Page[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const first = words[0] ?? '';
  return searchIndex
    .filter((entry) => words.every((word) => entry.haystack.includes(word)))
    .map((entry) => {
      const title = entry.page.title.toLowerCase();
      // Section numbers first, then title matches, then blurb matches.
      const rank = entry.page.crumb.toLowerCase().startsWith(first) ? 0 : title.includes(first) ? 1 : 2;
      return { page: entry.page, rank };
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((entry) => entry.page);
}
