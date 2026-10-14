import { test, expect } from '@playwright/test'
import { chooseStudent, resetApp, enterTeacher } from './helpers.js'

test('avatar aktualizuje podgląd w miejscu i zachowuje focus klawiatury', async ({ page }) => {
  await resetApp(page); await chooseStudent(page)
  await page.getByRole('link', { name: /Edytuj avatar/ }).click()
  const option = page.locator('[data-trait="hair"][data-value="short"]')
  await option.focus(); await page.keyboard.press('Enter')
  await expect(option).toHaveAttribute('aria-pressed', 'true')
  await expect(option).toBeFocused()
  await expect(page.locator('[data-trait="hair"][data-value="bob"]')).toHaveAttribute('aria-pressed', 'false')
  const preview = await page.locator('.avatar-preview [aria-live]').innerHTML()
  await page.locator('[data-trait="hair"][data-value="tufts"]').focus(); await page.keyboard.press('Enter')
  expect(await page.locator('.avatar-preview [aria-live]').innerHTML()).not.toBe(preview)
  await page.getByRole('button', { name: 'Zapisz avatar' }).click()
  await expect(page.getByRole('heading', { name: 'Cześć, Zosiu' })).toBeVisible()
  await page.getByRole('link', { name: /Edytuj avatar/ }).click()
  await expect(page.locator('[data-trait="hair"][data-value="tufts"]')).toHaveAttribute('aria-pressed', 'true')
})

test('filtry zachowują focus i pokazują pustą listę prac bez reloadu', async ({ page }) => {
  await resetApp(page); await enterTeacher(page)
  await page.getByRole('link', { name: /Dodaj ucznia/ }).click()
  await page.getByLabel('Imię', { exact: true }).fill('Maria')
  await page.getByLabel('Klasa', { exact: true }).fill('1C')
  await page.getByRole('button', { name: 'Dodaj ucznia', exact: true }).click()
  await page.getByRole('link', { name: 'Wróć do klasy', exact: true }).click()
  await page.locator('[data-class-filter]').selectOption('1C')
  await expect(page.locator('[data-class-filter]')).toBeFocused()
  await expect(page.locator('.teacher-student-row')).toHaveCount(1)
  await expect(page.locator('.teacher-student-row')).toContainText('Maria')
  await page.getByRole('link', { name: 'Prace', exact: true }).click()
  const filter = page.locator('[data-student-filter]')
  await filter.selectOption({ label: 'Maria' })
  await expect(filter).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Tutaj pojawią się prace' })).toBeVisible()
  await filter.selectOption('all')
  await expect(page.locator('.teacher-work-card').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tutaj pojawią się prace' })).toHaveCount(0)
})

test('wybrani uczniowie wymagają odbiorcy; pola reagują na wybór grupy', async ({ page }) => {
  await resetApp(page); await enterTeacher(page)
  await page.getByRole('link', { name: /Nowe zadanie/ }).click()
  await expect(page.locator('.student-checks')).toBeHidden()
  await page.getByRole('radio', { name: 'Wybrani uczniowie' }).check()
  await expect(page.locator('.student-checks')).toBeVisible()
  await page.getByRole('button', { name: 'Utwórz zadanie' }).click()
  await expect(page.getByRole('status')).toHaveText('Wybierz przynajmniej jednego ucznia.')
  await page.getByRole('checkbox', { name: 'Zosia', exact: true }).check()
  await page.getByRole('button', { name: 'Utwórz zadanie' }).click()
  await expect(page.getByRole('heading', { name: 'Klasa', exact: true })).toBeVisible()
})

test('edycja profilu zachowuje formularz i potwierdza aktualizację', async ({ page }) => {
  await resetApp(page); await enterTeacher(page)
  await page.locator('.teacher-student-row').filter({ hasText: 'Zosia' }).click()
  await page.locator('.student-settings summary').click()
  await page.getByLabel('Imię', { exact: true }).fill('Zofia')
  await page.getByRole('button', { name: 'Zapisz zmiany', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Zofia', exact: true })).toBeVisible()
  await expect(page.locator('.student-settings')).toHaveAttribute('open', '')
  await expect(page.getByRole('status')).toHaveText('Zmiany zapisane.')
  await expect(page.getByRole('button', { name: 'Zapisz zmiany', exact: true })).toBeFocused()
  await page.getByRole('link', { name: 'Wróć do klasy', exact: true }).click()
  await expect(page.locator('.teacher-student-row').filter({ hasText: 'Zofia' })).toBeVisible()
})

test('PIN obsługuje wejście z klawiatury i spokojny komunikat błędu', async ({ page }) => {
  await resetApp(page); await page.getByRole('button', { name: /Nauczyciel/ }).click()
  await expect(page.locator('[data-pin]')).toBeFocused()
  await page.keyboard.type('0000'); await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Sprawdź PIN')
  await page.locator('[data-pin]').fill('1234'); await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Klasa', exact: true })).toBeVisible()
})

test('wspólne przyciski mają czytelne disabled i widoczny spinner', async ({ page }) => {
  await resetApp(page); await chooseStudent(page)
  await page.goto('/#/tools/robot?challenge=two-steps')
  await page.locator('[data-command="forward"]').click()
  const primary = page.locator('[data-run]')
  expect((await primary.boundingBox()).height).toBeGreaterThanOrEqual(50)
  await primary.evaluate(el => { el.setAttribute('aria-busy', 'true'); el.disabled = true })
  const spinner = await primary.evaluate(el => ({ border: getComputedStyle(el, '::after').borderTopColor, content: getComputedStyle(el, '::after').content }))
  expect(spinner.border).not.toBe('rgba(0, 0, 0, 0)')
  expect(spinner.content).not.toBe('none')
  await expect(primary).toBeDisabled()
})

for (const [width,height] of [[1440,900],[1366,768],[1024,768],[390,844]]) {
  test(`cały interfejs mieści się w viewportcie ${width}`, async ({ page }) => {
    await page.setViewportSize({ width,height }); await resetApp(page)
    await expect(page.getByRole('heading', { name: 'Witaj' })).toBeVisible()
    await chooseStudent(page)
    for (const route of ['home','path','workshop','works','avatar','lesson/1','tools/robot?challenge=first-turn']) {
      await page.goto(`/#/${route}`)
      await expect(page.locator('h1').first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      for (const button of await page.locator('button:visible, a.button:visible').all()) {
        const r = await button.boundingBox()
        expect(r.x).toBeGreaterThanOrEqual(-1); expect(r.x+r.width).toBeLessThanOrEqual(width+1)
      }
    }
    await enterTeacher(page)
    for (const route of ['teacher/class','teacher/review','teacher/works','teacher/assignments/new','teacher/students/new']) {
      await page.goto(`/#/${route}`)
      await expect(page.locator('h1').first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (width === 390 && route === 'teacher/class') {
        for (const card of await page.locator('.teacher-summary article').all()) {
          const r = await card.boundingBox(); expect(r.x+r.width).toBeLessThanOrEqual(width)
        }
        const row = page.locator('.teacher-student-row').first()
        const avatar = await row.locator('.avatar').boundingBox(), name = await row.locator('strong').boundingBox()
        expect(avatar.x).toBeLessThan(name.x)
      }
    }
  })
}
