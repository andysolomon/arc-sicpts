import { expect, test } from '@playwright/test';

test('§3.3.4 draws the half-adder run as a timing diagram', async ({ page }) => {
  await page.goto('/3/3.3.4');
  await expect(page.getByRole('img', { name: /^Half-adder: D is A or B/ })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Full-adder: two half-adders and an or-gate' })).toBeVisible();

  const scenes = page.getByRole('region', { name: 'Signals over simulated time' });
  await expect(scenes).toHaveCount(3);
  const run = scenes.first();
  await run.scrollIntoViewIfNeeded();
  const slider = run.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '4');
  await slider.fill('4');
  await expect(run.getByTestId('timing-row')).toHaveCount(2);
  await expect(run.getByTestId('timing-change')).toHaveCount(3);
  await expect(run.getByTestId('caption')).toContainText('At time 16, sum becomes 0. The agenda is empty: sum = 0, carry = 1.');

  // Every wire of the hand-wired half-adder gets a row.
  const wires = scenes.nth(1);
  await wires.scrollIntoViewIfNeeded();
  await expect(wires.getByTestId('timing-row')).toHaveCount(6);
});

test('§3.3.4 checks an or-gate written as a primitive function box', async ({ page }) => {
  await page.goto('/3/3.3.4');
  const exercise = page.getByRole('article', { name: 'Exercise 3.28' });
  const editor = exercise.getByRole('textbox', { name: 'Your answer to exercise 3.28' });
  const status = exercise.getByTestId('check-status');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type(
    'function or_gate(a1, a2, output) { function act() { const v = logical_or(get_signal(a1), get_signal(a2)); ' +
      'after_delay(or_gate_delay, () => set_signal(output, v)); } add_action(a1, act); add_action(a2, act); return "ok"; }',
  );
  await exercise.getByRole('button', { name: 'Check' }).click();
  await expect(status).toHaveText('5 / 5 hidden tests pass');
});

test('§3.3.5 shows values spreading through the Celsius–Fahrenheit network', async ({ page }) => {
  await page.goto('/3/3.3.5');
  await expect(page.getByRole('img', { name: /^Celsius–Fahrenheit converter/ }).first()).toBeVisible();

  const scenes = page.getByRole('region', { name: 'Values spreading through the network' });
  await expect(scenes).toHaveCount(3);
  const session = scenes.first();
  await session.scrollIntoViewIfNeeded();
  const slider = session.getByRole('slider');
  await expect(slider).toHaveAttribute('max', '5');
  await slider.fill('1');
  await expect(session.locator('[data-connector="C"]')).toHaveAttribute('data-value', '25');
  await expect(session.locator('[data-connector="F"]')).toHaveAttribute('data-value', '77');
  await slider.fill('5');
  await expect(session.locator('[data-connector="C"]')).toHaveAttribute('data-value', '100');

  const network = scenes.nth(2);
  await network.scrollIntoViewIfNeeded();
  await expect(network.getByRole('slider')).toHaveAttribute('max', '14');
  await network.getByRole('slider').fill('6');
  await expect(network.locator('[data-connector="v"]')).toHaveAttribute('data-value', '45');
});
