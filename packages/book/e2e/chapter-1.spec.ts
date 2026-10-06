import { expect, test } from '@playwright/test';

test('every subsection of chapter 1 is written', async ({ page }) => {
  for (const section of ['1.1', '1.2', '1.3']) {
    await page.goto(`/1/${section}`);
    const rows = page.getByRole('listitem');
    await expect(rows.first()).toBeVisible();
    await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
  }
});

test('§1.2.2 marks the repeated calls of the tree recursion', async ({ page }) => {
  await page.goto('/1/1.2.2');
  const scene = page.getByRole('region', { name: 'The tree of calls' });
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '31');
  await slider.fill('31');
  await expect(scene.getByTestId('repeated-call')).toHaveCount(9);
});

test('§1.2.3 measures each call in the worker and plots it', async ({ page }) => {
  await page.goto('/1/1.2.3');
  const scene = page.getByRole('region', { name: 'Orders of growth, measured' });
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '8');
  await slider.fill('8');
  await expect(scene.getByTestId('growth-point')).toHaveCount(8);
  await expect(scene.getByTestId('caption')).toContainText('fib: n ×4 → calls ×1459');
  await expect(scene.getByRole('row', { name: /fib\(20\) 21891 20/ })).toBeVisible();
});

test('§1.3.1 to §1.3.4 draw the general methods from the trace', async ({ page }) => {
  await page.goto('/1/1.3.1');
  const integral = page.getByRole('region', { name: 'The integral as a sum of rectangles' });
  await integral.getByRole('slider').fill('20');
  await expect(integral.getByTestId('strip')).toHaveCount(20);

  await page.goto('/1/1.3.3');
  await expect(page.getByRole('region', { name: 'Halving the interval' }).getByTestId('interval')).toContainText('of 12');
  const cobwebs = page.getByRole('region', { name: 'Searching for a fixed point' });
  await expect(cobwebs).toHaveCount(3);
  await expect(cobwebs.nth(2).getByRole('list', { name: 'Guesses' }).getByRole('listitem')).toHaveCount(4);

  await page.goto('/1/1.3.4');
  const newton = page.getByRole('region', { name: 'Newton’s method for any g' });
  await expect(newton.getByRole('list', { name: 'Guesses' }).getByRole('listitem')).toHaveCount(4);
});

test('an exercise checks for logarithmic growth, not just the value', async ({ page }) => {
  await page.goto('/1/1.2.4');
  const exercise = page.getByRole('article', { name: 'Exercise 1.16' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 1.16' });
  const status = exercise.getByTestId('check-status');

  // Right values, wrong process: linear and recursive.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('function fast_expt(b, n) { return n === 0 ? 1 : b * fast_expt(b, n - 1); }');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('2 / 4 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    'function fast_expt_iter(a, b, n) { return n === 0 ? a : n % 2 === 0 ? fast_expt_iter(a, b * b, n / 2) : fast_expt_iter(a * b, b, n - 1); } ' +
      'function fast_expt(b, n) { return fast_expt_iter(1, b, n); }',
  );
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('4 / 4 hidden tests pass');
});
