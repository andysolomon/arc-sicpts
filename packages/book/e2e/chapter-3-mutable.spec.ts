import { expect, test } from '@playwright/test';

test('§3.3.1 draws set_head as a pointer swinging to y, leaving two pairs behind', async ({ page }) => {
  await page.goto('/3/3.3.1');
  const scene = page.getByRole('region', { name: 'Box-and-pointer diagram' }).first();
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '3');
  await expect(scene.getByTestId('pair')).toHaveCount(5);
  await slider.fill('2');
  await expect(scene.getByTestId('caption')).toContainText('set_head(x, y)');
  await expect(scene.getByTestId('caption')).toContainText('2 pairs no longer reachable');
  await expect(scene.getByTestId('pair')).toHaveCount(5);
});

test('§3.3.1 shows z1 sharing one list where z2 has two', async ({ page }) => {
  await page.goto('/3/3.3.1');
  const scene = page.getByRole('region', { name: 'Box-and-pointer diagram' }).nth(4);
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await slider.fill('2');
  await expect(scene.getByTestId('caption')).toContainText('const z2');
  // x and z1: three pairs; z2: five more.
  await expect(scene.getByTestId('pair')).toHaveCount(8);
  await expect(scene.getByTestId('pair-name')).toHaveText(['x', 'z1', 'z2']);
});

test('§3.3.2 moves only the queue’s pointers', async ({ page }) => {
  await page.goto('/3/3.3.2');
  const scene = page.getByRole('region', { name: 'A queue: front and rear pointers' }).first();
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '6');
  await slider.fill('4');
  await expect(scene.getByTestId('caption')).toContainText('delete_queue(q)');
  // The queue pair and "b", "c": "a" is gone.
  await expect(scene.getByTestId('pair')).toHaveCount(3);
});

test('§3.3.3 draws a table of subtables', async ({ page }) => {
  await page.goto('/3/3.3.3');
  const scene = page.getByRole('region', { name: 'A table as a headed list of records' }).nth(1);
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await slider.fill(await slider.getAttribute('max') ?? '0');
  // Three spine pairs, a math subtable of 4 and 3 records, a letters subtable of 3 and 2 records.
  await expect(scene.getByTestId('pair')).toHaveCount(15);
});

test('exercise 3.13 checks a cycle by identity', async ({ page }) => {
  await page.goto('/3/3.3.1');
  const exercise = page.getByRole('article', { name: 'Exercise 3.13' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.13' });
  const status = exercise.getByTestId('check-status');

  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('0 / 3 hidden tests pass');

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    'function make_cycle(x) { set_tail(last_pair(x), x); return x; } ' +
      'const z = make_cycle(list("a", "b", "c")); const last_pair_returns = false;',
  );
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('3 / 3 hidden tests pass');
});
