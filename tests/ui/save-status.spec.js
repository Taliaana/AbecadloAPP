import { test, expect } from '@playwright/test'
import { enterTeacher, resetApp } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
  await page.clock.install()
})

test('successful save confirmation disappears after 2.5 seconds', async ({ page }) => {
  await enterTeacher(page)
  const status = page.locator('.data-status')
  await expect(status).toHaveText('Zapisano')
  await expect(status).toBeVisible()
  await page.clock.runFor(2500)
  await expect(status).toBeHidden()
  await expect(status).toBeEmpty()
})

test('a previous success timer cannot hide saving or a subsequent error', async ({ page }) => {
  await enterTeacher(page)
  const status = page.locator('.data-status')
  await expect(status).toHaveText('Zapisano')
  await page.clock.runFor(1000)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pinktower:data-status', { detail: { message: 'Zapisywanie…' } })))
  await page.clock.runFor(3000)
  await expect(status).toBeVisible()
  await expect(status).toHaveText('Zapisywanie…')
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('pinktower:data-status', { detail: { message: 'Zapisano' } }))
    window.dispatchEvent(new CustomEvent('pinktower:data-status', { detail: { message: 'Nie udało się zapisać.', failed: true } }))
  })
  await page.clock.runFor(3000)
  await expect(status).toBeVisible()
  await expect(status).toContainText('Nie udało się zapisać.')
  await expect(status.getByRole('button', { name: 'Spróbuj ponownie' })).toBeVisible()
})

test('another success restarts the confirmation lifetime', async ({ page }) => {
  await enterTeacher(page)
  const status = page.locator('.data-status')
  await expect(status).toHaveText('Zapisano')
  await page.clock.runFor(2000)
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pinktower:data-status', { detail: { message: 'Zapisano' } })))
  await page.clock.runFor(1000)
  await expect(status).toBeVisible()
  await page.clock.runFor(1500)
  await expect(status).toBeHidden()
})
