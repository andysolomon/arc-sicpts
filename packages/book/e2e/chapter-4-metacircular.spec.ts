import { expect, test } from '@playwright/test';

test('every subsection of §4.1 is written', async ({ page }) => {
  await page.goto('/4/4.1');
  const rows = page.getByRole('listitem');
  await expect(rows.first()).toBeVisible();
  await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
});

test('§4.1.1 runs a program through the metacircular evaluator and draws the cycle', async ({ page }) => {
  await page.goto('/4/4.1.1');
  const example = page.getByTestId('output').first();
  await page.getByRole('button', { name: 'Run', exact: true }).first().click();
  await expect(example.getByTestId('output-value')).toHaveText('10');

  const scene = page.getByRole('region', { name: 'The evaluate–apply cycle' });
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.getByTestId('keyframe-counter')).toHaveText(/ \/ 20$/);
  await scene.getByRole('slider').fill('10');
  await expect(scene.getByTestId('caption')).toContainText('apply a compound function');
});

test('§4.1.2 draws the tagged lists of the string given to parse', async ({ page }) => {
  await page.goto('/4/4.1.2');
  const scene = page.getByRole('region', { name: 'What parse returns' });
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.getByTestId('component')).toHaveCount(7);
});

test('an exercise rewrites part of the evaluator and is checked by running programs through it', async ({ page }) => {
  await page.goto('/4/4.1.2');
  const exercise = page.getByRole('article', { name: 'Exercise 4.4' });
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(exercise.getByTestId('check-status')).toHaveText('0 / 5 hidden tests pass', { timeout: 20_000 });
});
