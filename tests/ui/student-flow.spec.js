import { test, expect } from '@playwright/test'
import { chooseStudent, resetApp, seedTypewriting } from './helpers.js'
import { reachEquipmentStage, finishEquipmentMatching } from './equipmentHelpers.js'

test.beforeEach(async ({ page }) => { await resetApp(page) })

test('wybór profilu i automatyczne ukończenie lekcji odblokowuje następną', async ({ page }) => {
  await chooseStudent(page)
  await expect(page.getByRole('heading', { name: /Cześć, Zosiu/ })).toBeVisible()
  await page.getByRole('link', { name: /Rozpocznij/ }).click()

  await reachEquipmentStage(page, 5)
  await finishEquipmentMatching(page)

  await expect(page.getByText('Lekcja ukończona', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Przejdź dalej/ })).toBeVisible()
  await page.getByRole('link', { name: /Przejdź dalej/ }).click()
  await expect(page.getByRole('heading', { name: 'Kliknij niebieskie koło.' })).toBeVisible()
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.progress)
  expect(progress['1']).toBe('completed')
  expect(progress['2']).toBe('in-progress')
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.progress[1])).toBe('completed')
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
