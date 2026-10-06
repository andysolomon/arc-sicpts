import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Another preview may own 4173; PORT picks a different one for a local run.
const PORT = Number(process.env['PORT'] ?? 4173);

// Use a system Chromium when one is named or found, so the tests also run on
// distributions Playwright does not ship browsers for.
const systemChromium = [process.env['CHROMIUM_PATH'], '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(
  (path): path is string => path !== undefined && existsSync(path),
);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env['CI'] !== undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(systemChromium !== undefined && { launchOptions: { executablePath: systemChromium } }),
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 120_000,
  },
});
