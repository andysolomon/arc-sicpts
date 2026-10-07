import { expect, test } from '@playwright/test';

test('every subsection of chapter 3 is written', async ({ page }) => {
  for (const section of ['3.1', '3.2', '3.3', '3.4', '3.5']) {
    await page.goto(`/3/${section}`);
    const rows = page.getByRole('listitem');
    await expect(rows.first()).toBeVisible();
    await expect(rows.filter({ hasText: 'planned' })).toHaveCount(0);
  }
});
