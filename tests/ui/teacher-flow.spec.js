import { test, expect } from '@playwright/test'
import { chooseStudent, enterTeacher, resetApp } from './helpers.js'

test.beforeEach(async ({ page }) => { await resetApp(page) })

test('nauczyciel dodaje ucznia, przypisuje klasę i dane trwają po reloadzie', async ({ page }) => {
  await enterTeacher(page)
  await page.getByRole('link', { name: /Dodaj ucznia/ }).click()
  await page.getByLabel('Imię').fill('Maria')
  await page.getByLabel('Klasa').fill('1C')
  await page.getByRole('button', { name: 'Dodaj ucznia' }).click()
  await expect(page.getByRole('heading', { name: 'Maria' })).toBeVisible()
  await page.goto('/#/teacher/class')
  await page.getByLabel('Filtruj uczniów według klasy').selectOption('1C')
  await expect(page.getByRole('link', { name: /Maria/ })).toBeVisible()
  await page.reload()
  await page.getByLabel('Filtruj uczniów według klasy').selectOption('1C')
  await expect(page.getByRole('link', { name: /Maria/ })).toBeVisible()
})

test('otwarta praca może wrócić do dziecka i zostać zakończona bez oceny', async ({ page }) => {
  await chooseStudent(page, 'Zosia')
  await page.getByRole('link', { name: 'Kontynuuj', exact: true }).click()
  await page.getByRole('button', { name: /jajo/i }).click()
  await page.getByLabel('Krótka notatka').fill('Mój spokojny szkic')
  await page.getByRole('button', { name: /Pokaż nauczycielowi/ }).click()
  await expect(page.getByText('Praca czeka na nauczyciela.')).toBeVisible()

  await enterTeacher(page)
  await page.getByRole('link', { name: /Do obejrzenia/ }).click()
  await page.getByRole('link', { name: /Cykl życia motyla/ }).first().click()
  await page.getByRole('button', { name: 'Kontynuuj pracę' }).click()

  await page.goto('/#/welcome')
  await chooseStudent(page, 'Zosia')
  await expect(page.getByText('Możesz jeszcze popracować nad tą pracą.')).toBeVisible()
  await page.getByRole('link', { name: 'Kontynuuj', exact: true }).click()
  await expect(page.getByText('Możesz jeszcze popracować nad tą pracą.')).toBeVisible()
  await page.getByRole('button', { name: /Pokaż nauczycielowi/ }).click()

  await enterTeacher(page)
  await page.getByRole('link', { name: /Do obejrzenia/ }).click()
  await page.getByRole('link', { name: /Cykl życia motyla/ }).first().click()
  await page.getByRole('button', { name: 'Zakończ pracę' }).click()
  await expect(page.getByRole('heading', { name: 'Do obejrzenia' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Cykl życia motyla Zosia/ })).toHaveCount(0)
})

test('dodatkowe zadanie pojawia się uczniowi i nie zmienia lekcji', async ({ page }) => {
  await enterTeacher(page)
  await page.getByRole('link', { name: /Nowe zadanie/ }).click()
  await page.getByLabel('Tytuł').fill('Mój znak klasy')
  await page.getByLabel('Polecenie').fill('Narysuj prosty znak swojej klasy.')
  await page.getByRole('button', { name: 'Utwórz zadanie' }).click()
  await page.goto('/#/welcome')
  await chooseStudent(page, 'Lena')
  await expect(page.getByRole('link', { name: /Mój znak klasy/ })).toBeVisible()
  await expect(page.getByText(/Lekcja 1/).first()).toBeVisible()
})
