import { expect, test } from '@playwright/test';

test('open §1.2.1, edit, run, see output and bars', async ({ page }) => {
  await page.goto('/1/1.2.1');
  await expect(page.getByRole('heading', { level: 1, name: 'Linear Recursion and Iteration' })).toBeVisible();
  await expect(page.getByText('§ 1.2.1 · Functions and the Processes They Generate')).toBeVisible();

  const editor = page.getByRole('textbox', { name: /factorial\.sicp/ });
  const output = page.getByTestId('output').first();
  const shape = page.getByTestId('process-shape');
  await expect(editor).toContainText('fact_iter(1, 1, 6);');
  await expect(shape).toContainText('no trace yet');

  // Run the program as supplied.
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByTestId('output-value')).toHaveText('720');
  await expect(output).toContainText(/evaluate · \d+ steps · /);
  const charts = shape.getByRole('img');
  await expect(charts).toHaveCount(2);
  await expect(charts.nth(0).locator('rect')).toHaveCount(12);
  await expect(charts.nth(1).locator('rect')).toHaveCount(8);
  await expect(shape).toContainText('factorial(6) · recursive · max depth 6');
  await expect(shape).toContainText('fact_iter(1, 1, 6) · iterative · max depth 1');

  // Edit: add a call at the end, then run with the keyboard.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('factorial(4);');
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.getByTestId('output-value')).toHaveText('24');
  await expect(charts).toHaveCount(3);
  await expect(charts.nth(2).locator('rect')).toHaveCount(8);
  await expect(shape).toContainText('factorial(4) · recursive · max depth 4');
  await expect(page.getByRole('img', { name: 'Stack depth grows to 4 then shrinks to 1' })).toBeVisible();

  // The edit survives a reload; Reset brings back the supplied source.
  await page.reload();
  await expect(editor).toContainText('factorial(4);');
  await page.getByRole('button', { name: 'Reset' }).first().click();
  await expect(editor).not.toContainText('factorial(4);');
  await expect(shape).toContainText('no trace yet');
});

test('a runaway program is stopped by the step budget', async ({ page }) => {
  await page.goto('/1/1.2.1');
  const editor = page.getByRole('textbox', { name: /factorial\.sicp/ });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('function forever(n) { return forever(n + 1); }');
  await page.keyboard.press('Enter');
  await page.keyboard.type('forever(0);');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByTestId('output-budget')).toContainText('budget exhausted after 100 000 steps');
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible();
});

test('an exercise is checked against hidden tests', async ({ page }) => {
  await page.goto('/1/1.2.1');
  const exercise = page.getByTestId('exercise-1.9');
  await expect(exercise.getByTestId('check-status')).toHaveText('not checked yet');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(exercise.getByTestId('check-status')).toHaveText('2 / 4 hidden tests pass');

  await exercise.getByRole('button', { name: 'Reveal solution' }).click();
  await expect(exercise.getByText(/pending operations accumulate/)).toBeVisible();
  await expect(exercise.getByRole('button', { name: 'Hide solution' })).toHaveAttribute('aria-expanded', 'true');
});

test('the shell navigates by contents, keyboard and drawer', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/front$/);
  await page.getByRole('link', { name: /Start Chapter 1/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Building Abstractions with Functions' })).toBeVisible();

  const sidebar = page.getByRole('navigation', { name: 'Table of contents' });
  await sidebar.getByRole('link', { name: /Functions and the Processes They Generate/ }).click();
  await expect(page).toHaveURL(/\/1\/1\.2$/);
  await page.keyboard.press(']');
  await expect(page).toHaveURL(/\/1\/1\.2\.1$/);
  await expect(sidebar.getByRole('link', { name: /Functions and the Processes/ })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('[');
  await expect(page).toHaveURL(/\/1\/1\.2$/);

  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Search sections' }).fill('1.1.7');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/1\/1\.1\.7$/);

  // Below 980px the sidebar becomes a drawer.
  await page.setViewportSize({ width: 600, height: 800 });
  await expect(sidebar).toHaveCount(0);
  await page.getByRole('button', { name: 'Contents' }).click();
  const drawer = page.getByRole('dialog', { name: 'Contents' });
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await page.getByRole('button', { name: 'Contents' }).click();
  await drawer.getByRole('link', { name: /Front matter/ }).click();
  await expect(page).toHaveURL(/\/front$/);
  await expect(drawer).toHaveCount(0);
});
