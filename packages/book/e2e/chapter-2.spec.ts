import { expect, test } from '@playwright/test';

test('every subsection of chapter 2 is written', async ({ page }) => {
  for (const section of ['2.1', '2.2', '2.3', '2.4', '2.5']) {
    await page.goto(`/2/${section}`);
    const rows = page.getByRole('listitem');
    await expect(rows.first()).toBeVisible();
    await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
  }
});

test('§2.2.2 draws shared structure as box-and-pointer diagrams', async ({ page }) => {
  await page.goto('/2/2.2.2');
  const scene = page.getByRole('region', { name: 'Box-and-pointer diagrams' }).first();
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '1');
  await slider.fill('1');
  await expect(scene.getByTestId('structure-label')).toHaveText('x_twice');
  await expect(scene.getByTestId('pair')).toHaveCount(12);
  await expect(scene.getByTestId('pointer')).toHaveCount(19);
});

test('§2.2.4 draws what the painter draws, under the editor and in the scene', async ({ page }) => {
  await page.goto('/2/2.2.4');
  await page.getByRole('button', { name: 'Run' }).first().click();
  const output = page.getByTestId('output').first();
  await expect(output).toHaveAttribute('data-status', 'done');
  await expect(output.getByTestId('segment')).toHaveCount(68);

  const scene = page.getByRole('region', { name: 'Painting, line by line' }).first();
  await scene.getByRole('slider').fill('15');
  await expect(scene.getByTestId('segment')).toHaveCount(68);
});

test('§2.3.4 decodes a message along the branches of the code tree', async ({ page }) => {
  await page.goto('/2/2.3.4');
  const scene = page.getByRole('region', { name: 'Huffman code trees' }).first();
  await scene.scrollIntoViewIfNeeded();
  await scene.getByRole('slider').fill('4');
  await expect(scene.getByTestId('caption')).toContainText('3 symbols in 8 bits, 100 0 1010');
});

test('§2.4.3 lights the table entry each generic operation looks up', async ({ page }) => {
  await page.goto('/2/2.4.3');
  const scene = page.getByRole('region', { name: 'The operation-and-type table' }).nth(1);
  await scene.scrollIntoViewIfNeeded();
  await scene.getByRole('slider').fill('5');
  await expect(scene.getByTestId('caption')).toContainText('get("real_part", list("polar"))');
});

test('an exercise can require that a function signals an error', async ({ page }) => {
  await page.goto('/2/2.1.4');
  const exercise = page.getByRole('article', { name: 'Exercise 2.10' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 2.10' });
  const status = exercise.getByTestId('check-status');
  const spansZero = 'function spans_zero(i) { return lower_bound(i) <= 0 && upper_bound(i) >= 0; } ';
  const divide = 'mul_interval(x, make_interval(1 / upper_bound(y), 1 / lower_bound(y)))';

  // The predicate is right, but division never uses it.
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(`${spansZero}function div_interval(x, y) { return ${divide}; }`);
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('4 / 6 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(`${spansZero}function div_interval(x, y) { return spans_zero(y) ? error("spans zero", y) : ${divide}; }`);
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('6 / 6 hidden tests pass');
});
