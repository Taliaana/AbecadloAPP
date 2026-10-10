import { test, expect } from '@playwright/test'
import { chooseStudent, resetApp, seedTypewriting } from './helpers.js'

test.beforeEach(async ({ page }) => { await resetApp(page) })

test('wybór profilu i automatyczne ukończenie lekcji odblokowuje następną', async ({ page }) => {
  await chooseStudent(page)
  await expect(page.getByRole('heading', { name: /Cześć, Zosiu/ })).toBeVisible()
  await page.getByRole('link', { name: /Rozpocznij/ }).click()

  for (const part of ['monitor', 'tower', 'keyboard', 'mouse', 'headphones']) {
    await page.locator(`[data-part="${part}"]`).click()
    await page.locator(`[data-zone="${part}"]`).click()
  }
  await expect(page.getByText('Ukończyłeś ten etap.')).toBeVisible()
  await page.getByRole('button', { name: /Dalej/ }).click()

  for (const answer of ['keyboard', 'mouse', 'headphones']) await page.locator(`[data-answer="${answer}"]`).click()
  await expect(page.getByText('Ukończyłeś ten etap.')).toBeVisible()
  await page.getByRole('button', { name: /Dalej/ }).click()
  await page.locator('[data-posture="correct"]').click()

  await expect(page.getByText('Lekcja ukończona', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Przejdź dalej/ })).toBeVisible()
  await page.getByRole('link', { name: /Przejdź dalej/ }).click()
  await expect(page.getByRole('heading', { name: 'Kliknij niebieskie koło.' })).toBeVisible()
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.progress)
  expect(progress['1']).toBe('completed')
  expect(progress['2']).toBe('in-progress')
})

test('Typewriting zachowuje niezależny postęp narzędzia', async ({ page }) => {
  await chooseStudent(page)
  await seedTypewriting(page)
  await page.goto('/#/workshop')
  await page.getByRole('link', { name: /Typewriting/ }).click()
  for (const key of ['f', 'j', 'f', 'f', 'j', 'j', 'f', 'j']) await page.keyboard.press(key)
  await expect(page.getByRole('heading', { name: 'Dokładność: 8/8' })).toBeVisible()
  await page.reload()
  const result = await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.toolProgress.typingResults.fj)
  expect(result.correct).toBe(8)
})

test('można zmienić ucznia bez mieszania danych', async ({ page }) => {
  await chooseStudent(page, 'Zosia')
  await page.goto('/#/welcome')
  await page.getByRole('button', { name: 'Uczeń' }).click()
  await page.getByRole('button', { name: /Antek/ }).click()
  await expect(page.getByRole('heading', { name: /Cześć, Antku/ })).toBeVisible()
})
