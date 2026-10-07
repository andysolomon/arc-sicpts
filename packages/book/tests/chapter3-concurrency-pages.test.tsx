import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import Page341 from '../content/3/3.4.1.mdx';
import Page342 from '../content/3/3.4.2.mdx';
import { mdxComponents } from '../src/mdx/components.tsx';

beforeAll(() => {
  // jsdom has no IntersectionObserver; the players and figure 3.29 only use it to start animating.
  const global = globalThis as { IntersectionObserver?: unknown };
  global.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
});

describe('§3.4 pages', () => {
  it('render §3.4.1 with its two scenes, figure 3.29 and exercise 3.38', () => {
    render(
      <MemoryRouter>
        <Page341 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Exercise 3.38']);
    expect(screen.getByRole('region', { name: 'Interleaved threads' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Final values over many interleavings' })).toBeInTheDocument();
    expect(screen.getByText('Two withdrawals, interleaved')).toBeInTheDocument();
    expect(screen.getByText('3.38 · 1 of 1 shown')).toBeInTheDocument();
  });

  it('render §3.4.2 with eight examples and ten of its eleven exercises', () => {
    render(
      <MemoryRouter>
        <Page342 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(
      ['3.39', '3.40', '3.41', '3.42', '3.43', '3.44', '3.45', '3.46', '3.47', '3.48'].map((id) => `Exercise ${id}`),
    );
    expect(screen.getAllByRole('region', { name: 'Interleaved threads' })).toHaveLength(2);
    expect(screen.getAllByRole('region', { name: 'Final values over many interleavings' })).toHaveLength(5);
    expect(screen.getByText('3.39 – 3.49 · 10 of 11 shown')).toBeInTheDocument();
  });
});
