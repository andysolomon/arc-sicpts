import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import Page351 from '../content/3/3.5.1.mdx';
import Page352 from '../content/3/3.5.2.mdx';
import { mdxComponents } from '../src/mdx/components.tsx';

beforeAll(() => {
  // jsdom has no IntersectionObserver; the players only use it to autoplay.
  const global = globalThis as { IntersectionObserver?: unknown };
  global.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('§3.5.1 and §3.5.2 pages', () => {
  it('render their examples, the sieve figure and every exercise', () => {
    render(
      <MemoryRouter>
        <Page351 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Exercise 3.50', 'Exercise 3.51', 'Exercise 3.52']);
    expect(screen.getAllByRole('region', { name: 'Forcing a stream, one tail at a time' })).toHaveLength(2);
  });

  it('render §3.5.2 with ten exercises and figure 3.31', () => {
    render(
      <MemoryRouter>
        <Page352 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.getByText('Figure 3.31 · The prime sieve as a signal-processing system')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'The sieve as a cascade of filters' })).toBeInTheDocument();
  });
});
