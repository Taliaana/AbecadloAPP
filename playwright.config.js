import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/ui',
  timeout: 40_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: process.env.PINKTOWER_NO_SCREENSHOTS ? { mode: 'retain-on-failure', screenshots: false } : 'retain-on-failure',
    screenshot: process.env.PINKTOWER_NO_SCREENSHOTS ? 'off' : 'only-on-failure',
  },
})
