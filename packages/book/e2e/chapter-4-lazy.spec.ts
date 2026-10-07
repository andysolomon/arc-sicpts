import { expect, test } from '@playwright/test';

test('§4.2.1 runs try_me lazily and shows head(null) never forced', async ({ page }) => {
  await page.goto('/4/4.2.1');
  const scene = page.getByRole('region', { name: 'Thunks, delayed and forced' });
  await expect(scene.getByTestId('thunk-row')).toHaveCount(2);
  await scene.getByRole('slider').fill('2');
  await expect(scene.getByTestId('caption')).toContainText('Never forced: head(null)');

  const output = page.getByTestId('output').nth(1);
  await page.getByRole('button', { name: 'Run', exact: true }).nth(1).click();
  await expect(output).toContainText('L-evaluate value: 1');
});

test('§4.2.2 memoizes the thunk for id(10), and the unmemoized evaluator does not', async ({ page }) => {
  await page.goto('/4/4.2.2');
  const scenes = page.getByRole('region', { name: 'Thunks, delayed and forced' });
  const memo = scenes.nth(0);
  await memo.getByRole('slider').fill('6');
  await expect(memo.getByTestId('caption')).toContainText('stored values were reused once');
  const plain = scenes.nth(1);
  await plain.getByRole('slider').fill('7');
  await expect(plain.getByText('evaluated 2×')).toBeVisible();

  await page.getByRole('button', { name: 'Run', exact: true }).nth(1).click();
  await expect(page.getByTestId('output').nth(1)).toContainText('L-evaluate value: 1');
});

test('§4.2.3 solves dy/dt = y with lazy lists', async ({ page }) => {
  await page.goto('/4/4.2.3');
  await page.getByRole('button', { name: 'Run', exact: true }).nth(2).click();
  await expect(page.getByTestId('output').nth(2)).toContainText('2.704813829421526', { timeout: 20_000 });
});

test('exercise 4.25 checks the reader’s predictions', async ({ page }) => {
  await page.goto('/4/4.2.2');
  const exercise = page.getByRole('article', { name: 'Exercise 4.25' });
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(exercise.getByTestId('check-status')).toContainText('0 / 3 hidden tests pass');
});
