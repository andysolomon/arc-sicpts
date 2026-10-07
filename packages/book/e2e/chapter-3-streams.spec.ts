import { expect, test } from '@playwright/test';

test('§3.5.1 grows the interval only as far as the second prime, and shows what memo saves', async ({ page }) => {
  await page.goto('/3/3.5.1');
  const scenes = page.getByRole('region', { name: 'Forcing a stream, one tail at a time' });
  await expect(scenes).toHaveCount(2);

  const primes = scenes.nth(0);
  await primes.scrollIntoViewIfNeeded();
  const slider = primes.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '9');
  await slider.fill('9');
  await expect(primes.getByTestId('stream-cell')).toHaveCount(10);
  await expect(primes.getByTestId('stream-promise')).toBeVisible();
  await expect(primes.getByTestId('caption')).toContainText('10 computations for 10 elements, none repeated');

  const memo = scenes.nth(1);
  await memo.scrollIntoViewIfNeeded();
  await memo.getByRole('slider').fill('13');
  await expect(memo.getByTestId('stream-count')).toHaveCount(4);
  await expect(memo.getByTestId('caption')).toContainText('stream_map_optimized: 5 computations for 5 elements, none repeated');
});

test('§3.5.2 sends candidates through the sieve’s filters', async ({ page }) => {
  await page.goto('/3/3.5.2');
  const sieve = page.getByRole('region', { name: 'The sieve as a cascade of filters' });
  await sieve.scrollIntoViewIfNeeded();
  const slider = sieve.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '29');
  await slider.fill('8');
  await expect(sieve.getByTestId('sieve-candidate')).toHaveText('11');
  await expect(sieve.getByTestId('sieve-prime')).toHaveText(['2', '3', '5', '7', '11']);
  await expect(sieve.getByTestId('caption')).toContainText('11 is not a multiple of 2, 3, 5 or 7');
  await expect(page.getByText('Figure 3.31 · The prime sieve as a signal-processing system')).toBeVisible();
});

test('§3.5.2 checks exercise 3.53 against the hidden tests', async ({ page }) => {
  await page.goto('/3/3.5.2');
  const exercise = page.getByRole('article', { name: 'Exercise 3.53' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.53' });
  const status = exercise.getByTestId('check-status');

  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('0 / 4 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('const s = pair(1, () => add_streams(s, s)); function element_of_s(n) { return math_pow(2, n); }');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('4 / 4 hidden tests pass');
});
