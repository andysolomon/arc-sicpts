import { expect, test } from '@playwright/test';

test('§4.3.1 draws the search tree of a small amb program', async ({ page }) => {
  await page.goto('/4/4.3.1');
  const scene = page.getByRole('region', { name: 'The search tree' });
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '18');
  await slider.fill('18');
  await expect(scene.getByTestId('search-node-dead')).toHaveCount(4);
  await expect(scene.getByTestId('search-node-solution')).toHaveCount(2);
  await expect(scene.getByTestId('caption')).toContainText('2 values were found');
});

test('§4.3.1 runs the book’s interaction with the driver loop', async ({ page }) => {
  await page.goto('/4/4.3.1');
  const run = page.getByRole('button', { name: 'Run', exact: true });
  await run.nth(3).click();
  const output = page.getByTestId('output').nth(3);
  await expect(output).toContainText('amb-evaluate value: [8, [35, null]]', { timeout: 20_000 });
  await expect(output).toContainText('amb-evaluate value: [30, [11, null]]');
});

test('§4.3.2 solves the office move', async ({ page }) => {
  await page.goto('/4/4.3.2');
  await expect(page.getByRole('textbox', { name: 'office_move.sicp, editable program' })).toBeVisible();
  await page.getByRole('button', { name: 'Run', exact: true }).first().click();
  await expect(page.getByTestId('output').first()).toContainText('[["alyssa", [3, null]]', { timeout: 30_000 });
});

test('§4.3.3 checks a solution to exercise 4.52', async ({ page }) => {
  await page.goto('/4/4.3.3');
  const exercise = page.getByRole('article', { name: 'Exercise 4.52' });
  await exercise.getByRole('button', { name: 'Reveal solution' }).click();
  await expect(exercise).toContainText('is_falsy(pred_value)');
});
