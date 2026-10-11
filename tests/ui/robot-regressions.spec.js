import { test, expect } from '@playwright/test'
import { resetApp, chooseStudent } from './helpers.js'

test.beforeEach(async ({ page }) => { await resetApp(page); await chooseStudent(page) })
async function open(page, id = 'two-steps') { await page.goto(`/#/tools/robot?challenge=${id}`) }
async function add(page, commands) { for (const id of commands) await page.locator(`[data-command="${id}"]`).click() }

test('robot wykonuje cały program, także instrukcje po wejściu na cel', async ({ page }) => {
  await open(page); await add(page, ['forward', 'forward', 'forward']); await page.locator('[data-run]').click()
  await expect(page.locator('[data-cell="1,1"] .robot-token')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Robot nie dotarł do celu')
  await expect(page.locator('[data-robot-complete]')).toBeHidden()
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0)
  await expect(page.locator('[data-command="forward"]')).toBeEnabled()
})

test('Stop anuluje ruchy, highlight i timer; ponowne uruchomienie ma jedną sekwencję', async ({ page }) => {
  await open(page, 'original'); await add(page, ['forward', 'right', 'forward', 'forward'])
  await page.locator('[data-run]').click()
  await expect(page.locator('[data-path="0"]')).toHaveClass(/is-executing/)
  await expect(page.locator('[data-cell="1,3"] .robot-token')).toBeVisible()
  await expect(page.locator('[data-run]')).toBeDisabled()
  await page.locator('[data-stop]').click()
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0)
  await page.waitForTimeout(1800)
  await expect(page.locator('[data-cell="1,3"] .robot-token')).toBeVisible()
  await page.locator('[data-run]').click()
  await expect(page.locator('[data-run]')).toBeDisabled()
  await expect(page.locator('[data-path="1"]')).toHaveClass(/is-executing/)
  await expect(page.locator('.robot-token')).toHaveAttribute('aria-label', /kierunek prawo/)
  await expect(page.getByRole('status')).toContainText('Robot nie dotarł do celu')
  await expect(page.locator('[data-cell="3,3"] .robot-token')).toBeVisible()
  await expect(page.locator('[data-stop]')).toBeDisabled()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.toolProgress.robot.original.runs)).toBe(1)
})

test('szkic programu przeżywa reload, Reset i zmianę widoku; drag oraz klawiatura nadal działają', async ({ page }) => {
  await open(page); await add(page, ['forward']); await page.reload()
  await expect(page.locator('.robot-block')).toHaveCount(1)
  await page.locator('[data-run]').click(); await expect(page.getByRole('status')).toContainText('Robot nie dotarł do celu')
  await page.locator('[data-reset]').click()
  await expect(page.locator('[data-cell="1,4"] .robot-token')).toBeVisible()
  await expect(page.locator('.robot-block')).toHaveCount(1)
  await page.locator('[data-command="forward"]').dragTo(page.locator('.robot-program'))
  await expect(page.locator('.robot-block')).toHaveCount(2)
  await page.locator('[data-run]').focus(); await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeVisible()
  await page.locator('[data-clear]').click(); await expect(page.locator('.robot-block')).toHaveCount(0)
  await page.locator('[data-command="forward"]').focus(); await page.keyboard.press('Enter')
  await page.goto('/#/home'); await open(page)
  await expect(page.locator('.robot-block')).toHaveCount(1)
  await expect(page.locator('.robot-block')).toContainText('Idź naprzód')
})

test('ukończone zadanie nauczyciela pozostaje ukończone i chronione przed edycją', async ({ page }) => {
  const id = await page.evaluate(async () => {
    const storage = await import('/src/storage/studentStorage.js')
    return storage.createAssignment({ title: 'Trasa', instruction: 'Robot', tool: 'robot', wholeClass: true, robotTask: { challengeId: 'two-steps' } }).id
  })
  await page.goto(`/#/assignment/${id}`); await add(page, ['forward', 'forward']); await page.locator('[data-run]').click()
  await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeVisible()
  await expect(page.locator('[data-command="forward"]')).toBeDisabled()
  await expect(page.locator('[data-clear]')).toBeDisabled()
  await page.locator('[data-reset]').click(); await page.reload()
  await expect(page.locator('[data-command="forward"]')).toBeDisabled()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).students.zosia.works.at(-1).status)).toBe('completed')
})

test('Powtórz nie kończy się przed wykonaniem wszystkich powtórzeń', async ({ page }) => {
  await open(page, 'repeat-steps'); await add(page, ['repeat'])
  await page.locator('[data-repeat-times]').selectOption('4')
  await page.locator('[data-add-child="forward"]').click(); await page.locator('[data-run]').click()
  await expect(page.locator('[data-cell="1,0"] .robot-token')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Robot nie dotarł do celu')
})

test('plansza, przyciski i mobilna nawigacja pozostają w szerokości ekranu', async ({ page }) => {
  await open(page, 'repeat-steps'); await add(page, ['repeat']); await page.locator('[data-add-child="forward"]').click()
  for (const [width, height] of [[1440,900],[1366,768],[1024,768],[390,844]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const nav = await page.locator('.main-nav').boundingBox()
    expect(nav.y).toBeGreaterThanOrEqual(0)
    expect(nav.y + nav.height).toBeLessThanOrEqual(height)
    for (const item of await page.locator('.robot-actions button').all()) {
      const bounds = await item.boundingBox()
      expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    }
    if (width === 1366) {
      const run = await page.locator('[data-run]').boundingBox()
      expect(run.y + run.height).toBeLessThanOrEqual(height)
    }
  }
})

test('drag przestawia bloczki także w programie z maksymalną liczbą poleceń', async ({ page }) => {
  await open(page, 'original')
  await page.evaluate(async () => {
    const storage = await import('/src/storage/studentStorage.js')
    storage.saveRobotProgram('original', ['right', ...Array(29).fill('forward')])
  })
  await page.reload()
  const transfer = await page.evaluateHandle(() => new DataTransfer())
  await page.locator('[data-path="0"]').dispatchEvent('dragstart', { dataTransfer: transfer })
  await page.locator('[data-path="2"]').dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.locator('.robot-block')).toHaveCount(30)
  await expect(page.locator('[data-path="0"]')).toContainText('Idź naprzód')
  await expect(page.locator('[data-path="1"]')).toContainText('Skręć w prawo')
  await page.reload()
  await expect(page.locator('[data-path="1"]')).toContainText('Skręć w prawo')
})
