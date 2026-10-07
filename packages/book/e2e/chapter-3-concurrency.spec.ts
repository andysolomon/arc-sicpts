import { expect, test } from '@playwright/test';

test('§3.4.1 draws the lost withdrawal and lets the reader pick another seed', async ({ page }) => {
  await page.goto('/3/3.4.1');
  const scene = page.getByRole('region', { name: 'Interleaved threads' });
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toBeEnabled();
  const max = await slider.getAttribute('max');
  await slider.fill(max ?? '0');
  await expect(scene.getByTestId('caption')).toContainText("The program's value is 90. One write overwrote");
  await expect(scene.locator('[data-testid="lane-row"][data-lost="true"]')).toHaveCount(1);

  await scene.getByRole('button', { name: 'Another seed' }).click();
  await expect(scene.getByRole('spinbutton', { name: 'seed' })).toHaveValue('2');
  // A new trace restarts the timeline, so seek to the end again until the new run is the one on screen.
  await expect(async () => {
    await scene.getByRole('slider').fill((await scene.getByRole('slider').getAttribute('max')) ?? '0');
    await expect(scene.getByTestId('caption')).toContainText("The program's value is 65.", { timeout: 500 });
  }).toPass();
});

test('§3.4.1 runs the deposit 60 times and finds only the five possible balances', async ({ page }) => {
  await page.goto('/3/3.4.1');
  const scene = page.getByRole('region', { name: 'Final values over many interleavings' });
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '59', { timeout: 20_000 });
  await slider.fill('59');
  await expect(scene.getByTestId('caption')).toContainText('60 runs');
  const values = await scene.getByTestId('outcome-bar').evaluateAll((bars) => bars.map((bar) => bar.getAttribute('data-value')));
  expect(values.every((v) => ['30', '50', '70', '90', '140'].includes(v ?? ''))).toBe(true);
  expect(values).toEqual(expect.arrayContaining(['70', '90']));
});

test('§3.4.2 serialization collapses the outcomes, and opposite exchanges can deadlock', async ({ page }) => {
  await page.goto('/3/3.4.2');
  const histograms = page.getByRole('region', { name: 'Final values over many interleavings' });
  await expect(histograms).toHaveCount(5);

  const unserialized = histograms.nth(0);
  await unserialized.scrollIntoViewIfNeeded();
  await expect(unserialized.getByRole('slider')).toHaveAttribute('max', '59', { timeout: 20_000 });
  await expect(unserialized.getByTestId('outcome-bar')).toHaveCount(5);

  const serialized = histograms.nth(1);
  await serialized.scrollIntoViewIfNeeded();
  await expect(serialized.getByRole('slider')).toHaveAttribute('max', '59', { timeout: 20_000 });
  const values = await serialized.getByTestId('outcome-bar').evaluateAll((bars) => bars.map((bar) => bar.getAttribute('data-value')));
  expect(values).toEqual(['101', '121']);

  const deadlock = histograms.nth(4);
  await deadlock.scrollIntoViewIfNeeded();
  await expect(deadlock.getByRole('slider')).toHaveAttribute('max', '59', { timeout: 30_000 });
  await expect(deadlock.locator('[data-testid="outcome-bar"][data-value="did not finish"]')).toHaveCount(1);
});

test('exercise 3.46 accepts a test_and_set that two threads can both win', async ({ page }) => {
  await page.goto('/3/3.4.2');
  const exercise = page.getByRole('article', { name: 'Exercise 3.46' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.46' });
  const status = exercise.getByTestId('check-status');

  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('1 / 2 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    'function non_atomic_test_and_set(cell) { if (head(cell)) { return true; } else { set_head(cell, true); return false; } }',
  );
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('2 / 2 hidden tests pass');
});
