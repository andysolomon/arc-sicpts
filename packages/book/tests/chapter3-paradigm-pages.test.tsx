import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it } from 'vitest';
import Page353 from '../content/3/3.5.3.mdx';
import Page354 from '../content/3/3.5.4.mdx';
import Page355 from '../content/3/3.5.5.mdx';
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

const exercisesOn = () => screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'));

describe('§3.5.3 to §3.5.5 pages', () => {
  it('render §3.5.3 with both pairs grids, the figures and fourteen exercises', () => {
    render(
      <MemoryRouter>
        <Page353 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(exercisesOn()).toEqual(Array.from({ length: 14 }, (_, k) => `Exercise 3.${63 + k}`));
    expect(screen.getAllByRole('region', { name: 'The order the pairs come out in' })).toHaveLength(2);
    expect(screen.getByText('Three parts make up pairs(S, T)')).toBeInTheDocument();
    expect(screen.getByText('integral as a signal-processing system')).toBeInTheDocument();
    expect(screen.getByText('An RC circuit and its signal-flow diagram')).toBeInTheDocument();
  });

  it('render §3.5.4 with the solve loop and exercises 3.77 to 3.80', () => {
    render(
      <MemoryRouter>
        <Page354 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(exercisesOn()).toEqual(['Exercise 3.77', 'Exercise 3.78', 'Exercise 3.79', 'Exercise 3.80']);
    expect(screen.getByText('A loop that solves dy/dt = f(y)')).toBeInTheDocument();
    expect(screen.getByText('A series RLC circuit as signals')).toBeInTheDocument();
  });

  it('render §3.5.5 with the joint account and exercises 3.81 and 3.82', () => {
    render(
      <MemoryRouter>
        <Page355 components={mdxComponents} />
      </MemoryRouter>,
    );
    expect(exercisesOn()).toEqual(['Exercise 3.81', 'Exercise 3.82']);
    expect(screen.getByText('A joint account as streams')).toBeInTheDocument();
  });
});
