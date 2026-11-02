import { test, expect } from '@playwright/test'
import { chooseStudent, resetApp, grantRobotSandbox } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await resetApp(page)
  await chooseStudent(page); await grantRobotSandbox(page)
  await page.goto('/#/workshop')
  await page.getByRole('link', { name: /Robot/ }).click()
  await page.goto('/#/tools/robot?challenge=original')
})

test('program z bloczków dochodzi do celu krok po kroku', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Uruchom program', exact: true })).toBeDisabled()
  await page.locator('[data-command="forward"]').dragTo(page.locator('.robot-program'))
  for (const command of ['forward', 'forward', 'right', 'forward', 'forward']) await page.locator(`[data-command="${command}"]`).click()
  await expect(page.locator('.robot-block')).toHaveCount(6)
  await page.getByRole('button', { name: 'Uruchom program', exact: true }).click()
  await expect(page.locator('.is-executing')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeVisible()
  await expect(page.locator('[data-cell="3,1"] .robot-token')).toBeVisible()
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.locator('[data-cell="1,4"] .robot-token')).toBeVisible()
  await expect(page.locator('.robot-block')).toHaveCount(6)
})

test('błędna trasa, zmiana kolejności, reset i czyszczenie', async ({ page }) => {
  await page.locator('[data-command="forward"]').click()
  await page.locator('[data-command="right"]').click()
  await page.getByRole('button', { name: 'Przesuń polecenie 2 w górę' }).click()
  await expect(page.locator('.robot-block').first()).toContainText('Obróć w prawo')
  await page.getByRole('button', { name: 'Uruchom program', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Robot nie dotarł do celu. Sprawdź swój program.')
  await expect(page.locator('[data-cell="2,4"] .robot-token')).toBeVisible()
  await page.getByRole('button', { name: 'Wyczyść program', exact: true }).click()
  await expect(page.locator('.robot-block')).toHaveCount(0)
  await expect(page.locator('[data-cell="2,4"] .robot-token')).toBeVisible()
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.locator('[data-cell="1,4"] .robot-token')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Uruchom program', exact: true })).toBeDisabled()
})

test('reset zatrzymuje wykonywanie i mały ekran nie ma overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (let index = 0; index < 4; index++) await page.locator('[data-command="forward"]').click()
  await page.getByRole('button', { name: 'Uruchom program', exact: true }).click()
  await expect(page.locator('.is-executing')).toHaveCount(1)
  await page.getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await page.waitForTimeout(650)
  await expect(page.locator('[data-cell="1,4"] .robot-token')).toBeVisible()
  await expect(page.locator('.robot-block')).toHaveCount(4)
  expect(await page.evaluate(async () => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
