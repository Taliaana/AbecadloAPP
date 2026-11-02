import { test, expect } from '@playwright/test'
import { resetApp } from './helpers.js'

test('teacher PIN form submits a six-digit code without truncation', async ({ page }) => {
  await resetApp(page)
  await page.goto('/#/teacher-login')
  let submitted
  await page.route('**/api/auth/login', async route => {
    submitted = route.request().postDataJSON().pin
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Test' }) })
  })
  const input = page.locator('[data-pin]')
  await input.pressSequentially('456789')
  await expect(input).toHaveValue('456789')
  await input.press('Enter')
  await expect.poll(() => submitted).toBe('456789')
})
