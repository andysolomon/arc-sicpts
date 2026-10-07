import { expect, test } from '@playwright/test';

test('every section of chapter 5 is introduced and every subsection is written', async ({ page }) => {
  await page.goto('/5');
  await expect(page.getByTestId('introduction')).toContainText('register machine');
  for (const section of ['5.1', '5.2', '5.3', '5.4', '5.5']) {
    await page.goto(`/5/${section}`);
    await expect(page.getByTestId('introduction')).toBeVisible();
    const rows = page.getByRole('listitem').filter({ hasText: /live|planned/ });
    await expect(rows.first()).toBeVisible();
    await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
  }
});

test('§5.1.4 replays the factorial machine with its data paths and stack', async ({ page }) => {
  await page.goto('/5/5.1.4');
  const scene = page.getByTestId('animation').first();
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.getByTestId('button').first()).toBeVisible();
  const slider = scene.getByRole('slider');
  const max = Number(await slider.getAttribute('max'));
  expect(max).toBeGreaterThan(20);
  // Somewhere in the middle the stack holds saved values of n and continue.
  await slider.fill(String(Math.round(max / 2)));
  await expect(scene.getByTestId('stack-item').first()).toBeVisible();
  await slider.fill(String(max));
  await expect(scene.getByTestId('caption')).toContainText('done after');
  await expect(scene.locator('[data-register="val"]')).toContainText('24');
});

test('§5.4 shows the explicit-control evaluator at work', async ({ page }) => {
  await page.goto('/5/5.4');
  const scene = page.getByRole('region', { name: 'The explicit-control evaluator at work' }).first();
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.getByRole('img', { name: /Stack depth over the run/ })).toBeVisible();
  await scene.getByRole('slider').fill('1');
  await expect(scene.getByTestId('caption')).toContainText('Next:');
});

test('§5.3.2 collects garbage with the book’s stop-and-copy controller', async ({ page }) => {
  await page.goto('/5/5.3.2');
  const scene = page.getByRole('region', { name: 'Stop and copy' }).first();
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await slider.fill(await slider.getAttribute('max') ?? '0');
  await expect(scene.getByTestId('caption')).toContainText('were garbage');
});

test('§5.5 compiles the program in the editor', async ({ page }) => {
  await page.goto('/5/5.5.5');
  const scene = page.getByRole('region', { name: 'What the compiler produces' }).first();
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.getByTestId('compiled-line').first()).toBeVisible();
  await expect(scene.getByTestId('caption')).toContainText('instructions');
});

test('exercise 5.28 checks measured stack formulas', async ({ page }) => {
  await page.goto('/5/5.4.4');
  const exercise = page.getByRole('article', { name: 'Exercise 5.28' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 5.28' });
  const status = exercise.getByTestId('check-status');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('function recursive_depth(n) { return 5 * n + 3; } function recursive_pushes(n) { return 32 * n - 16; }');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('3 / 6 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('function recursive_depth(n) { return 5 * n + 3; } function recursive_pushes(n) { return 32 * n - 15; }');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('6 / 6 hidden tests pass');
});
