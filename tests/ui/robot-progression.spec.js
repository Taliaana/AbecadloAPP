import { test, expect } from '@playwright/test'
import { resetApp, chooseStudent, enterTeacher } from './helpers.js'

test.beforeEach(async ({ page }) => { await resetApp(page); await chooseStudent(page) })

test('first success immediately opens the next stage and next task, including after reload', async ({ page }) => {
  await page.goto('/#/tools/robot')
  await expect(page.locator('[data-create-route]')).toBeDisabled()
  await expect(page.locator('a[href="#/tools/robot?challenge=first-turn"]')).toHaveCount(0)
  await page.getByRole('link', { name: 'Kontynuuj naukę' }).click()
  await expect(page.locator('.robot-session .eyebrow')).toHaveText('Etap 1 · Zadanie 1/1')
  await page.locator('[data-command="forward"]').click({ clickCount: 2 })
  await expect(page.locator('.robot-block')).toHaveCount(2)
  await page.locator('[data-run]').click()
  await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Następne zadanie' }).click()
  await expect(page.locator('.robot-session .eyebrow')).toHaveText('Etap 2 · Zadanie 1/2')
  await page.locator('[data-command="right"]').click()
  await page.locator('[data-command="forward"]').click()
  await page.getByRole('button', { name: 'Usuń ostatnie', exact: true }).click()
  await expect(page.locator('.robot-block')).toHaveCount(1)
  await page.getByRole('button', { name: 'Cofnij zmianę', exact: true }).click()
  await expect(page.locator('.robot-block')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.robot-block')).toHaveCount(2)
  await page.locator('[data-reset]').click()
  await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '1,4')
  await expect(page.locator('.robot-block')).toHaveCount(2)
  await page.goto('/#/tools/robot')
  await expect(page.locator('.robot-learning-progress')).toContainText('1 z 6')
})

test('locked URL cannot bypass progression on the client or server', async ({ page }) => {
  await page.goto('/#/tools/robot?challenge=wrong-turn')
  await expect(page.locator('.robot-learning-hero')).toBeVisible()
  await expect(page.locator('.robot-board')).toHaveCount(0)
  const denied = await page.evaluate(async () => {
    const r = await fetch('/api/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'robot-program', challengeId: 'wrong-turn', program: ['forward'] }) })
    return r.status
  })
  expect(denied).toBe(409)
})

test('teacher can grant one route and early creation without completing stages', async ({ page }) => {
  await enterTeacher(page)
  await page.locator('a[href="#/teacher/student/zosia"]').click()
  await page.getByText('Robot · Tryb niestandardowy', { exact: true }).click()
  await page.getByLabel('Odblokuj etap lub planszę').selectOption('challenge:wrong-turn')
  await page.getByLabel('Pozwól tworzyć własną planszę wcześniej').check()
  await page.getByRole('button', { name: 'Zapisz dostęp Robota' }).click()
  await expect(page.locator('[data-robot-access-status]')).toHaveText('Ustawienia Robota zapisane.')
  await page.goto('/#/welcome'); await chooseStudent(page)
  await page.goto('/#/tools/robot?challenge=wrong-turn')
  await expect(page.locator('.robot-board')).toBeVisible()
  await page.goto('/#/tools/robot')
  await expect(page.locator('.robot-learning-progress')).toContainText('0 z 6')
  await page.locator('[data-create-route]').click()
  await expect(page.getByLabel('Nazwa trasy')).toBeVisible()
  await page.getByRole('link', { name: 'Wróć do Robota' }).click()
  await expect(page.getByRole('link', { name: 'Moja plansza', exact: true })).toBeVisible()
})

test('old programs and completions survive; lesson progress stays independent', async ({ page }) => {
  await page.evaluate(async () => {
    const state = await (await fetch('/__test/snapshot')).json()
    state.students.zosia.toolProgress.robot = { original: { completed: true, runs: 3, routes: ['existing'], program: ['right'] } }
    await fetch('/__test/seed', { method: 'POST', body: JSON.stringify(state) })
  })
  await page.goto('/#/tools/robot?challenge=original')
  await expect(page.locator('.robot-block')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('.robot-block')).toContainText('Obróć w prawo')
  await page.goto('/#/tools/robot')
  await expect(page.locator('[data-create-route]')).toBeDisabled()
  const snapshot = await (await page.request.get('/__test/snapshot')).json()
  expect(snapshot.students.zosia.toolProgress.robot.original.runs).toBe(3)
  expect(snapshot.students.zosia.progress[1]).toBe('available')
})

test('teacher changes refresh the open path on focus without replacing an active exercise', async ({ page, browser }) => {
  await page.goto('/#/tools/robot')
  await expect(page.locator('[data-create-route]')).toBeDisabled()
  const origin = new URL(page.url()).origin
  const teacher = await browser.newContext()
  try {
    const login = await teacher.request.post(`${origin}/api/auth/login`, { headers: { Origin: origin }, data: { pin: '1234' } })
    expect(login.status()).toBe(200)
    const grant = data => teacher.request.post(`${origin}/api/students/zosia/robot-access`, { headers: { Origin: origin }, data })
    expect((await grant({ customBoard: true })).status()).toBe(200)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.locator('[data-create-route]')).toBeEnabled()
    await page.getByRole('link', { name: 'Kontynuuj naukę' }).click()
    await page.locator('[data-command="forward"]').click()
    await page.locator('.robot-token').evaluate(element => { element.dataset.retained = 'yes' })
    expect((await grant({ stageId: 'debug' })).status()).toBe(200)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect.poll(() => page.evaluate(async () => (await import('/src/storage/studentStorage.js')).getRobotAccess().stages?.includes('debug'))).toBe(true)
    await expect(page.locator('.robot-token')).toHaveAttribute('data-retained', 'yes')
    await expect(page.locator('.robot-block')).toHaveCount(1)
  } finally { await teacher.close() }
})

test('stage path and exercise fit desktop, school laptop, tablet and phone', async ({ page }) => {
  for (const [width, height] of [[1440, 900], [1366, 768], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/#/tools/robot')
    await expect(page.locator('.robot-stage')).toHaveCount(6)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'Kontynuuj naukę' }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const bounds = await page.locator('[data-run]').boundingBox()
    if (width >= 1366) expect(bounds.y + bounds.height).toBeLessThanOrEqual(height)
  }
})
