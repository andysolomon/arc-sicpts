import { expect, test } from '@playwright/test';

test('every subsection of §3.2 is written', async ({ page }) => {
  await page.goto('/3/3.2');
  const rows = page.getByRole('listitem');
  await expect(rows.first()).toBeVisible();
  await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
});

test('§3.2.1 looks names up in the simple environment structure', async ({ page }) => {
  await page.goto('/3/3.2.1');
  const figure = page.getByRole('figure').filter({ hasText: 'A simple environment structure' });
  await expect(figure.getByTestId('simple-verdict')).toContainText('In environment A, x is 7');
  await figure.getByRole('group', { name: 'environment' }).getByRole('button', { name: 'B' }).click();
  await expect(figure.getByTestId('simple-verdict')).toContainText('In environment B, x is 3');
});

test('§3.2.3 W1 points at the frame that holds balance', async ({ page }) => {
  await page.goto('/3/3.2.3');
  const scene = page.getByRole('region', { name: 'Frames and lookups' }).first();
  await expect(scene.getByTestId('caption')).toContainText('Press step above');
  await page.getByRole('button', { name: 'Run to end' }).first().click();
  await expect(scene.locator('[data-testid="env-pointer"][data-from="E0.W1"]')).toHaveAttribute('data-to', 'E1');
  const e1 = scene.locator('[data-testid="frame"][data-frame="E1"]');
  await expect(e1).toContainText('balance');
  await expect(e1).toContainText('50');
  await expect(scene.locator('[data-testid="frame"][data-frame="E2"]')).toContainText('W1(50)');
});

test('§3.2.4 stops at a name used before its declaration', async ({ page }) => {
  await page.goto('/3/3.2.4');
  const scene = page.getByRole('region', { name: 'Frames and lookups' }).nth(2);
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toBeEnabled();
  await slider.fill(await slider.getAttribute('max') ?? '0');
  await expect(scene.getByTestId('caption')).toContainText('Name z used before its declaration was evaluated');
});

test('exercise 3.9 checks the frame counts', async ({ page }) => {
  await page.goto('/3/3.2.2');
  const exercise = page.getByRole('article', { name: 'Exercise 3.9' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.9' });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    'function frames_recursive(n) { return n; } function frames_iterative(n) { return n + 2; } ' +
      'const enclosing = "program"; const most_pending_recursive = 6; const most_pending_iterative = 1;',
  );
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(exercise.getByTestId('check-status')).toHaveText('6 / 6 hidden tests pass');
});
