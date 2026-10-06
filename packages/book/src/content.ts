import type { MDXContent } from 'mdx/types';
import { lazy, type LazyExoticComponent } from 'react';

/**
 * Written content, discovered at build time. A section exists as a page as
 * soon as it is in the table of contents; it has prose once a file such as
 * `content/1/1.2.1.mdx` exists.
 */
const modules = import.meta.glob<{ default: MDXContent }>('../content/**/*.mdx');

const loaders = new Map(
  Object.entries(modules).map(([file, load]) => {
    // '../content/1/1.2.1.mdx' -> '1.2.1'; '../content/appendix/grammar.mdx' -> 'appendix/grammar'
    const relative = file.replace('../content/', '').replace(/\.mdx$/, '');
    const id = relative.startsWith('appendix/') ? relative : (relative.split('/').pop() ?? relative);
    return [id, load] as const;
  }),
);

const components = new Map<string, LazyExoticComponent<MDXContent>>();

export const hasContent = (id: string): boolean => loaders.has(id);

export function contentFor(id: string): LazyExoticComponent<MDXContent> | null {
  const load = loaders.get(id);
  if (load === undefined) return null;
  let component = components.get(id);
  if (component === undefined) {
    component = lazy(load);
    components.set(id, component);
  }
  return component;
}
