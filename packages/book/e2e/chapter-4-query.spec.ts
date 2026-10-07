import { expect, test } from '@playwright/test';

test('§4.4.1 runs a query and draws its stream of frames', async ({ page }) => {
  await page.goto('/4/4.4.1');
  const editor = page.getByRole('button', { name: 'Run', exact: true }).first();
  await editor.click();
  await expect(page.getByTestId('output-value').first()).toHaveText('2');

  const scene = page.getByRole('region', { name: 'The stream of frames' }).first();
  await scene.scrollIntoViewIfNeeded();
  const slider = scene.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '7');
  await slider.fill('2');
  await expect(scene.getByTestId('new-binding')).toHaveText('$x = list("Hacker", "Alyssa", "P")');
  await slider.fill('7');
  await expect(scene.getByTestId('query-tally')).toContainText('matches 2 / 9');
});

test('§4.4.2 shows a rule unified with renamed variables', async ({ page }) => {
  await page.goto('/4/4.4.2');
  const scene = page.getByRole('region', { name: 'The stream of frames' }).nth(1);
  await scene.scrollIntoViewIfNeeded();
  await scene.getByRole('slider').fill('1');
  await expect(scene).toContainText(/lives_near\(\$person_1_\d+, \$person_2_\d+\)/);
  await expect(scene).toContainText('body: and(address(');
});

test('§4.4.3 shows the married loop running out of steps', async ({ page }) => {
  await page.goto('/4/4.4.3');
  await page.getByRole('button', { name: 'Run', exact: true }).nth(1).click();
  await expect(page.getByTestId('output-budget')).toBeVisible();
});

test('a query exercise checks the answers, not the text', async ({ page }) => {
  await page.goto('/4/4.4.1');
  const exercise = page.getByTestId('exercise-4.53');
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(exercise.getByTestId('check-status')).toContainText('0 / 3');
});
