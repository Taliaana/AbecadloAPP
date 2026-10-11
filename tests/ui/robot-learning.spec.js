import { test, expect } from '@playwright/test'
import { chooseStudent, resetApp, enterTeacher } from './helpers.js'

test.beforeEach(async ({ page }) => { await resetApp(page); await chooseStudent(page) })
async function task(page, id) { await page.goto(`/#/tools/robot?challenge=${id}`) }
async function add(page, commands) { for (const command of commands) await page.locator(`[data-command="${command}"]`).click() }
async function run(page) { await page.getByRole('button', { name: 'Uruchom', exact: true }).click() }
async function done(page) { await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeVisible() }

test('przeszkoda i brzeg zatrzymują program przed polem', async ({ page }) => {
  await task(page, 'around-stone'); await add(page, ['forward', 'right']); await run(page)
  await expect(page.getByRole('status')).toHaveText('Robot zatrzymał się przed przeszkodą. Sprawdź swój program.')
  await expect(page.locator('[data-cell="1,4"] .robot-token')).toBeVisible()
  await task(page, 'original'); await add(page, ['left', 'forward', 'forward']); await run(page)
  await expect(page.getByRole('status')).toHaveText('Robot dotarł do brzegu planszy. Sprawdź program.')
})

test('przewidywanie jest wymagane i porównuje rzeczywisty wynik', async ({ page }) => {
  await task(page, 'predict-turn')
  await expect(page.locator('[data-run]')).toBeDisabled()
  await page.locator('[data-cell="1,2"]').click(); await run(page); await done(page)
  await expect(page.locator('[data-completion-text]')).toHaveText('Robot dotarł gdzie indziej. Sprawdź, który krok to zmienił.')
  await page.locator('[data-reset]').click(); await page.locator('[data-cell="2,3"]').click(); await run(page); await done(page)
  await expect(page.locator('[data-completion-text]')).toHaveText('Tak właśnie wykonał program.')
})

test('dziecko obserwuje błędny program i poprawia skręt', async ({ page }) => {
  await task(page, 'wrong-turn'); await run(page)
  await expect(page.getByRole('status')).toHaveText('Robot nie dotarł do celu. Sprawdź swój program.')
  await page.getByRole('button', { name: 'Usuń polecenie 2', exact: true }).click()
  await add(page, ['right'])
  await page.getByRole('button', { name: 'Przesuń polecenie 3 w górę', exact: true }).click()
  await run(page); await done(page)
})

test('dwie różne trasy są akceptowane bez ocen', async ({ page }) => {
  await task(page, 'another-way'); await add(page, ['forward', 'forward', 'right', 'forward', 'forward']); await run(page); await done(page)
  await page.locator('[data-other-route]').click()
  await add(page, ['right', 'forward', 'forward', 'left', 'forward', 'forward']); await run(page); await done(page)
  await expect(page.locator('[data-completion-text]')).toHaveText('To inne rozwiązanie.')
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.toolProgress.robot['another-way'])
  expect(history.alternative).toBe(true)
})

test('powtórz ma kontener, dziecko dodaje jego zawartość i uruchamia', async ({ page }) => {
  await task(page, 'repeat-steps'); await add(page, ['repeat'])
  await expect(page.locator('[data-run]')).toBeDisabled()
  await page.locator('[data-repeat-times]').selectOption('3')
  await page.getByRole('button', { name: 'Idź naprzód do powtórzenia 1', exact: true }).click()
  await expect(page.locator('.robot-repeat-body .robot-block')).toHaveCount(1)
  await run(page); await done(page)
})

test('własna trasa zapisuje planszę i program po reloadzie, trafia do nauczyciela', async ({ page }) => {
  await page.goto('/#/tools/robot'); await page.getByRole('button', { name: /Stwórz trasę/ }).click()
  await page.getByLabel('Nazwa trasy').fill('Trasa do kwiatu')
  await page.getByRole('button', { name: 'Cel', exact: true }).click(); await page.locator('[data-cell="1,2"]').click()
  await page.getByRole('button', { name: 'Przeszkoda', exact: true }).click(); await page.locator('[data-cell="3,3"]').click()
  await page.reload()
  await expect(page.getByLabel('Nazwa trasy')).toHaveValue('Trasa do kwiatu')
  await expect(page.locator('[data-cell="3,3"]')).toHaveClass(/has-obstacle/)
  await page.getByRole('button', { name: 'Ułóż program', exact: true }).click()
  await add(page, ['forward', 'forward']); await page.reload()
  await expect(page.locator('.robot-block')).toHaveCount(2)
  await run(page); await done(page)
  await page.getByRole('button', { name: /Pokaż nauczycielowi/ }).click()
  await expect(page.getByText('Praca czeka na nauczyciela.')).toBeVisible()
  await enterTeacher(page); await page.getByRole('link', { name: /Do obejrzenia/ }).click()
  await page.getByRole('link', { name: /Trasa do kwiatu/ }).click()
  await expect(page.locator('.robot-board--preview')).toBeVisible()
  await page.getByRole('button', { name: 'Zakończ pracę', exact: true }).click()
})

test('nauczyciel przydziela planszę i automatyczne rozwiązanie nie czeka na review', async ({ page }) => {
  await enterTeacher(page); await page.getByRole('link', { name: /Nowe zadanie/ }).click()
  await page.getByLabel('Tytuł', { exact: true }).fill('Robot do kwiatu')
  await page.getByLabel('Narzędzie', { exact: true }).selectOption('robot')
  await page.getByLabel('Plansza Robota').selectOption('two-steps')
  await page.getByRole('button', { name: 'Utwórz zadanie' }).click()
  await page.goto('/#/welcome'); await chooseStudent(page)
  await page.getByRole('link', { name: /Robot do kwiatu/ }).click()
  await add(page, ['forward', 'forward']); await run(page); await done(page)
  await page.goto('/#/home'); await expect(page.getByRole('link', { name: /Robot do kwiatu/ })).toHaveCount(0)
  await enterTeacher(page); await page.getByRole('link', { name: /Do obejrzenia/ }).click()
  await expect(page.getByRole('link', { name: /Robot do kwiatu/ })).toHaveCount(0)
})

test('klawiatura dodaje i przestawia polecenia; plansze mieszczą się na breakpointach', async ({ page }) => {
  await task(page, 'first-turn')
  await page.locator('[data-command="forward"]').focus(); await page.keyboard.press('Enter')
  await page.locator('[data-command="right"]').focus(); await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Przesuń polecenie 2 w górę', exact: true }).focus(); await page.keyboard.press('Enter')
  await expect(page.locator('.robot-block').first()).toContainText('Skręć w prawo')
  for (const [width, height] of [[1440, 900], [1366, 768], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.locator('[data-run]')).toBeVisible()
  }
})
