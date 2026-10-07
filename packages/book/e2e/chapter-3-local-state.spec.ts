import { expect, test } from '@playwright/test';

test('every subsection of §3.1 is written', async ({ page }) => {
  await page.goto('/3/3.1');
  const rows = page.getByRole('listitem');
  await expect(rows.first()).toBeVisible();
  await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
});

test('§3.1.1 shows each assignment in the frame that holds the balance', async ({ page }) => {
  await page.goto('/3/3.1.1');
  const scenes = page.getByRole('region', { name: 'Frames and assignments' });
  await expect(scenes).toHaveCount(3);

  // The global withdraw: the program frame's balance ends at 35.
  const global = scenes.nth(0);
  await global.scrollIntoViewIfNeeded();
  const slider = global.getByRole('slider');
  await expect(slider).toBeEnabled();
  await slider.fill(await slider.getAttribute('max') ?? '0');
  await expect(global.locator('[data-testid="frame"][data-frame="E0"]')).toContainText('balance: 35');

  // W1 and W2 get a card each.
  const objects = page.getByRole('region', { name: 'Objects and their state' });
  await objects.scrollIntoViewIfNeeded();
  const objectsSlider = objects.getByRole('slider');
  await expect(objectsSlider).toBeEnabled();
  await objectsSlider.fill(await objectsSlider.getAttribute('max') ?? '0');
  await expect(objects.getByTestId('state-holder')).toHaveCount(2);
  await expect(objects.locator('[data-testid="state-cell"][data-value="10"]')).toHaveCount(1);
  await expect(objects.locator('[data-testid="state-cell"][data-value="30"]')).toHaveCount(1);
});

test('§3.1.2 plots the running estimate of π', async ({ page }) => {
  await page.goto('/3/3.1.2');
  const scene = page.getByRole('region', { name: 'What the program printed, plotted' });
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toBeEnabled({ timeout: 20_000 });
  await slider.fill(await slider.getAttribute('max') ?? '0');
  await expect(scene.getByTestId('caption')).toContainText('estimate of π: 40 of 40');
});

test('§3.1.3 tells separate accounts from a joint one', async ({ page }) => {
  await page.goto('/3/3.1.3');
  const scenes = page.getByRole('region', { name: 'Objects and their state' });
  await expect(scenes).toHaveCount(3);
  for (const [index, cards] of [
    [1, 2],
    [2, 1],
  ] as const) {
    const scene = scenes.nth(index);
    await scene.scrollIntoViewIfNeeded();
    const slider = scene.getByRole('slider');
    await expect(slider).toBeEnabled();
    await slider.fill(await slider.getAttribute('max') ?? '0');
    await expect(scene.getByTestId('state-holder')).toHaveCount(cards);
  }
  await expect(scenes.nth(2).getByTestId('state-holder')).toHaveAttribute('data-names', 'peter_acc,paul_acc');
});

test('exercise 3.8 checks both orders of evaluation', async ({ page }) => {
  await page.goto('/3/3.1.3');
  const exercise = page.getByRole('article', { name: 'Exercise 3.8' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.8' });
  const status = exercise.getByTestId('check-status');

  // Without state, f(0) + f(1) is 1 in either order: only the right-to-left test passes.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('function make_f() { return x => x; }');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('1 / 2 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('function make_f() { let called = false; return x => { if (called) { return 0; } else { called = true; return x; } }; }');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('2 / 2 hidden tests pass');
});
