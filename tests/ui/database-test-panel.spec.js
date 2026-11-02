import { test, expect } from '@playwright/test'
import { resetApp, enterTeacher } from './helpers.js'

test('database panel uses API and both teacher sessions see creation and scoped cleanup without reload', async ({ page, browser }) => {
  await resetApp(page); await enterTeacher(page)
  const otherContext = await browser.newContext(), other = await otherContext.newPage()
  try {
    await other.goto('/#/welcome'); await enterTeacher(other)
    await page.getByText('Test bazy danych', { exact: true }).click()
    await expect(page.locator('[data-database-status]')).toContainText('Backend i baza odpowiadają')
    await page.getByRole('button', { name: 'Utwórz dane testowe', exact: true }).click()
    await expect(page.locator('.teacher-student-row').filter({ hasText: 'Uczeń testowy' })).toHaveCount(1)
    await expect(page.locator('[data-database-status]')).toContainText('Uczniowie testowi: 1')
    await other.getByText('Test bazy danych', { exact: true }).click()
    await other.getByRole('button', { name: 'Odśwież dane z serwera', exact: true }).click()
    await expect(other.locator('.teacher-student-row').filter({ hasText: 'Uczeń testowy' })).toHaveCount(1)
    await page.getByRole('link', { name: 'Prace', exact: true }).click()
    await expect(page.getByText('Praca testowa', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Klasa', exact: true }).click()
    await page.getByText('Test bazy danych', { exact: true }).click()
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'Usuń dane testowe', exact: true }).click()
    await expect(page.locator('[data-database-feedback]')).toContainText('Usunięto dane testowe')
    await expect(page.locator('.teacher-student-row')).toHaveCount(3)
    await other.getByRole('button', { name: 'Odśwież dane z serwera', exact: true }).click()
    await expect(other.locator('.teacher-student-row')).toHaveCount(3)
    await expect(other.locator('.teacher-student-row').filter({ hasText: 'Uczeń testowy' })).toHaveCount(0)
  } finally { await otherContext.close() }
})
