import { expect, test } from '@playwright/test';

test('§3.5.3 plots three sequences converging to π at very different speeds', async ({ page }) => {
  await page.goto('/3/3.5.3');
  const plots = page.getByRole('region', { name: 'What the program printed, plotted' });
  const pi = plots.nth(1);
  await pi.scrollIntoViewIfNeeded();
  await expect(pi.getByTestId('series')).toHaveCount(3);
  await expect(pi.getByTestId('series').nth(2)).toHaveAttribute('data-label', 'accelerated');
  await pi.getByRole('slider').fill('7');
  await expect(pi.getByTestId('caption')).toContainText('accelerated: 8 of 8, latest 3.14159');
});

test('§3.5.3 lights the pairs in the order interleave produces them, and stream_append never leaves row 1', async ({ page }) => {
  await page.goto('/3/3.5.3');
  const grids = page.getByRole('region', { name: 'The order the pairs come out in' });
  await expect(grids).toHaveCount(2);

  const appended = grids.nth(0);
  await appended.scrollIntoViewIfNeeded();
  await expect(appended.getByRole('slider')).toHaveAttribute('max', '30');
  await appended.getByRole('slider').fill('30');
  await expect(appended.getByTestId('caption')).toContainText('All 31 pairs come from row 1');
  await expect(appended.locator('[data-testid="pairs-cell"][data-grid="program"][data-i="2"][data-order=""]')).toHaveCount(10);

  const interleaved = grids.nth(1);
  await interleaved.scrollIntoViewIfNeeded();
  await interleaved.getByRole('slider').fill('4');
  await expect(interleaved.getByTestId('caption')).toContainText('Pair 5: (2, 3). 4 pairs come before it');
  await interleaved.getByRole('slider').fill('30');
  await expect(interleaved.locator('[data-testid="pairs-cell"][data-grid="program"][data-i="5"][data-j="5"]')).toHaveAttribute('data-order', '31');
  await expect(interleaved.getByTestId('caption')).toContainText('row 1 gave 16, row 2 gave 8, row 3 gave 4');
});

test('§3.5.3 shows the signal-flow figures', async ({ page }) => {
  await page.goto('/3/3.5.3');
  await expect(page.getByText('integral as a signal-processing system')).toBeVisible();
  await expect(page.getByText('An RC circuit and its signal-flow diagram')).toBeVisible();
  await expect(page.getByText('Three parts make up pairs(S, T)')).toBeVisible();
});

test('§3.5.3 checks exercise 3.64 against the hidden tests', async ({ page }) => {
  await page.goto('/3/3.5.3');
  const exercise = page.getByRole('article', { name: 'Exercise 3.64' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.64' });
  const status = exercise.getByTestId('check-status');

  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('0 / 4 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    'function stream_limit(s, tol) { const a = head(s); const b = head(stream_tail(s)); return math_abs(b - a) < tol ? b : stream_limit(stream_tail(s), tol); } ' +
      'function sqrt(x, tolerance) { return stream_limit(sqrt_stream(x), tolerance); }',
  );
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('4 / 4 hidden tests pass');
});

test('§3.5.4 solves dy/dt = y and plots it beside e^t', async ({ page }) => {
  await page.goto('/3/3.5.4');
  await expect(page.getByText('A loop that solves dy/dt = f(y)')).toBeVisible();
  const plot = page.getByRole('region', { name: 'What the program printed, plotted' });
  await plot.scrollIntoViewIfNeeded();
  await expect(plot.getByTestId('series')).toHaveCount(2);
  await plot.getByRole('slider').fill('10');
  await expect(plot.getByTestId('caption')).toContainText('solve: 11 of 11, latest 2.71692');
  await expect(page.getByRole('article')).toHaveCount(4);
});

test('§3.5.5 estimates π from a stream of experiments', async ({ page }) => {
  await page.goto('/3/3.5.5');
  const plot = page.getByRole('region', { name: 'What the program printed, plotted' });
  await plot.scrollIntoViewIfNeeded();
  await expect(plot.getByTestId('series')).toHaveCount(1, { timeout: 15_000 });
  await expect(plot.getByTestId('series')).toHaveAttribute('data-label', 'estimate of π');
  await expect(page.getByText('A joint account as streams')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(2);
});
