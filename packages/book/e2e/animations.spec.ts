import { expect, test } from '@playwright/test';

test('§1.1.1 collapses a combination step by step, following edits', async ({ page }) => {
  await page.goto('/1/1.1.1');
  const scene = page.getByRole('region', { name: 'Collapsing a combination' });
  await expect(scene).toBeVisible();
  await expect(scene.getByTestId('term')).toHaveText('137 + 349');
  await scene.getByRole('button', { name: 'Next keyframe' }).click();
  await expect(scene.getByTestId('term')).toHaveText('486');
  await expect(scene.getByTestId('caption')).toContainText('137 + 349 → 486');

  // The picture is drawn from the editor's text.
  const editor = page.getByRole('textbox', { name: /arithmetic\.sicp/ });
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('2 * 21;');
  await expect(scene.getByTestId('term')).toHaveText('2 * 21');
  await page.getByRole('button', { name: 'Reset' }).first().click();
  await expect(scene.getByTestId('term')).toHaveText('137 + 349');
});

test('§1.1.3 the tree follows the stepper', async ({ page }) => {
  await page.goto('/1/1.1.3');
  const scene = page.getByRole('region', { name: 'The expression as a tree' });
  await expect(scene.getByTestId('caption')).toContainText('Press step above');
  await expect(scene.getByRole('slider')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run to end' }).click();
  await expect(page.getByTestId('step-counter')).toContainText(/step \d+ \/ \d+/);
  await expect(scene.getByTestId('value')).toHaveCount(4);
  await expect(scene.getByTestId('caption')).toContainText('→ 390');
  await page.getByRole('button', { name: 'Step back' }).click();
  await expect(scene.getByTestId('value')).toHaveCount(3);
});

test('§1.1.5 shows the model and the machine, with an order toggle', async ({ page }) => {
  await page.goto('/1/1.1.5');
  const model = page.getByRole('region', { name: 'The substitution model' });
  await model.getByRole('button', { name: 'normal order' }).click();
  await expect(model.getByRole('button', { name: 'normal order' })).toHaveAttribute('aria-pressed', 'true');
  const slider = model.getByRole('slider');
  await slider.fill('3');
  await expect(model.getByTestId('term')).toHaveText('(5 + 1) * (5 + 1) + square(5 * 2)');

  const machine = page.getByRole('region', { name: 'What the machine does instead' });
  await page.getByRole('button', { name: 'Run to end' }).click();
  // E0 plus the three most recent call frames; the oldest finished frame has been dropped.
  await expect(machine.getByTestId('frame')).toHaveCount(4);
  await expect(machine.getByTestId('frame').last()).toContainText('x: 10');
});

test('§1.1.7 plots the guesses the program printed', async ({ page }) => {
  await page.goto('/1/1.1.7');
  const scene = page.getByRole('region', { name: 'Newton’s method, drawn' });
  await expect(scene.getByRole('list', { name: 'Guesses' }).getByRole('listitem')).toHaveCount(4);
  await expect(scene.getByTestId('caption')).toContainText('Guess 1: 1.');
});

test('§1.2.1 keeps the process shape and adds the pending chain', async ({ page }) => {
  await page.goto('/1/1.2.1');
  await expect(page.getByTestId('process-shape')).toBeVisible();
  const scene = page.getByRole('region', { name: 'What the process leaves pending' });
  await scene.getByRole('slider').fill('23');
  await expect(scene.getByTestId('term')).toHaveText('6 * (5 * (4 * (3 * (2 * 1))))');
});

test('diagrams are drawn from the programs on the page', async ({ page }) => {
  await page.goto('/1/1.1.4');
  await expect(page.getByRole('img', { name: 'Each function is built from the ones below it' })).toBeVisible();
  await page.goto('/1/1.1.8');
  await expect(page.getByRole('img', { name: 'sqrt with its 3 internal functions' })).toBeVisible();
  await page.goto('/appendix/laboratory-api');
  await expect(page.getByRole('img', { name: /Requests flow from the page/ })).toBeVisible();
});
