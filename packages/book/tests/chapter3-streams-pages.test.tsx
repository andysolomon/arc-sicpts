import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Page351 from '../content/3/3.5.1.mdx';
import Page352 from '../content/3/3.5.2.mdx';
import { mdxComponents } from '../src/mdx/components.tsx';

// Composition tests check the assembled page, not CodeMirror or program execution.
vi.mock('../src/editor/CodeEditor.tsx', () => ({ CodeEditor: () => null }));
// Keep asynchronous worker jobs pending until cleanup.
vi.mock('../src/lab/client.ts', () => ({
  labClient: () => ({ submit: () => ({ id: 1, cancel() {}, finished: new Promise(() => {}) }) }),
}));

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
  it('render their examples, the sieve figure and every exercise', async () => {
    render(
      <MemoryRouter>
        <Page351 components={mdxComponents} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-label'))).toEqual(['Exercise 3.50', 'Exercise 3.51', 'Exercise 3.52']);
      expect(screen.getAllByRole('region', { name: 'Forcing a stream, one tail at a time' })).toHaveLength(2);
    }, { timeout: 10_000 });
  }, 15_000);

  it('render §3.5.2 with ten exercises and figure 3.31', async () => {
    render(
      <MemoryRouter>
        <Page352 components={mdxComponents} />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(10);
      expect(screen.getByText('Figure 3.31 · The prime sieve as a signal-processing system')).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'The sieve as a cascade of filters' })).toBeInTheDocument();
    }, { timeout: 10_000 });
  }, 15_000);
});
