import { test, expect } from '@playwright/test'
import { resetApp, chooseStudent, grantRobotSandbox } from './helpers.js'
import { ROBOT_STEP_MS } from '../../src/modules/robot/movement.js'
import { robotStages } from '../../src/data/robotLearning.js'

test.beforeEach(async ({ page }) => { await resetApp(page); await chooseStudent(page); await grantRobotSandbox(page) })
const open = (page, id) => page.goto(`/#/tools/robot?challenge=${id}`)
async function add(page, commands) { for (const id of commands) await page.locator(`[data-command="${id}"]`).click() }
const complete = page => expect(page.getByRole('dialog', { name: 'Gotowe', exact: true })).toBeVisible()

for (const [width, height] of [[1366, 768], [390, 844]]) {
  test(`completion fits the current viewport without scrolling, with focus and Escape (${width})`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await open(page, 'two-steps'); await add(page, ['forward', 'forward'])
    await page.locator('[data-run]').click()
    const scrollBeforeFinish = await page.evaluate(() => scrollY)
    await complete(page)
    const bounds = await page.locator('[data-robot-complete]').boundingBox()
    expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height)
    expect(await page.evaluate(() => scrollY)).toBe(scrollBeforeFinish)
    await expect(page.getByRole('link', { name: 'Następne zadanie' })).toBeFocused()
    await expect(page.locator('.robot-task-progress progress')).toHaveAttribute('value', '1')
    await page.keyboard.press('Shift+Tab')
    expect(await page.locator('[data-robot-complete]').evaluate(dialog => dialog.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-robot-complete]')).toBeHidden()
    await expect(page.locator('[data-run]')).toBeFocused()
    await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '1,2')
    await page.locator('[data-reset]').click()
    await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '1,4')
    await expect(page.locator('.robot-block')).toHaveCount(2)
  })
}

test('last course task has no dead next link and returns to the completed course', async ({ page }) => {
  await page.evaluate(async stages => {
    const state = await (await fetch('/__test/snapshot')).json()
    state.students.zosia.toolProgress.robot = Object.fromEntries(stages.flatMap(stage => stage.challenges).filter(id => id !== 'another-way').map(id => [id, { completed: true, runs: 1 }]))
    await fetch('/__test/seed', { method: 'POST', body: JSON.stringify(state) })
  }, robotStages)
  await open(page, 'another-way'); await add(page, ['forward', 'forward', 'right', 'forward', 'forward'])
  await page.locator('[data-run]').click(); await complete(page)
  await expect(page.locator('[data-next-robot-task]')).toHaveCount(0)
  await expect(page.locator('[data-completion-note]')).toContainText('To ostatnie zadanie ścieżki')
  await page.getByRole('dialog').getByRole('link', { name: 'Wróć do Robota' }).click()
  await expect(page.locator('.robot-learning-progress')).toContainText('6 z 6')
  await expect(page.locator('[data-create-route]')).toBeEnabled()
})

test('a single teacher grant cannot reveal a locked next task; the return action receives focus', async ({ page }) => {
  await page.evaluate(async () => {
    const state = await (await fetch('/__test/snapshot')).json()
    state.students.zosia.toolProgress.robotAccess = { challenges: ['first-turn'] }
    await fetch('/__test/seed', { method: 'POST', body: JSON.stringify(state) })
  })
  await open(page, 'first-turn'); await add(page, ['forward', 'right', 'forward'])
  await page.locator('[data-run]').click(); await complete(page)
  await expect(page.locator('[data-next-robot-task]')).toBeHidden()
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Wróć do Robota' })).toBeFocused()
})

for (const [cell, feedback] of [
  ['2,3', 'Tak właśnie wykonał program.'],
  ['0,0', 'Robot dotarł gdzie indziej. Sprawdź, który krok to zmienił.'],
]) {
  test(`prediction conceals the answer, uses a fixed program and compares ${cell}`, async ({ page }) => {
    await open(page, 'predict-turn')
    await expect(page.locator('.robot-goal')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /, cel$/ })).toHaveCount(0)
    await expect(page.locator('.robot-cell-label')).toHaveText('Start')
    await expect(page.locator('.robot-block')).toHaveCount(3)
    await expect(page.locator('.robot-program button, .robot-program [draggable="true"]')).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Polecenia robota' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Sprawdź przewidywanie' })).toBeDisabled()
    await page.locator(`[data-cell="${cell}"]`).click()
    await expect(page.locator(`[data-cell="${cell}"]`)).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Sprawdź przewidywanie' }).click()
    await expect(page.locator('.robot-goal')).toHaveCount(0)
    await complete(page)
    await expect(page.locator('[data-completion-text]')).toHaveText(feedback)
    await expect(page.locator('[data-prediction-position]')).toContainText('kolumna 3, wiersz 4')
    await page.getByRole('button', { name: 'Obejrzyj trasę' }).click()
    await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '2,3')
    await expect(page.locator('.robot-goal')).toBeVisible()
    await page.locator('[data-reset]').click()
    await expect(page.locator('.robot-goal')).toHaveCount(0)
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0)
    await expect(page.locator('[data-run]')).toBeDisabled()
    await expect(page.locator('.robot-block')).toHaveCount(3)
  })
}

test('success and progress are shown only after actual execution and acknowledged save', async ({ page }) => {
  await open(page, 'two-steps'); await add(page, ['forward', 'forward'])
  let release, entered
  const held = new Promise(resolve => { release = resolve })
  const saving = new Promise(resolve => { entered = resolve })
  await page.route('**/api/tools', async route => {
    if (route.request().postDataJSON()?.kind === 'robot-attempt') { entered(); await held }
    await route.continue()
  })
  try {
    await page.locator('[data-run]').click(); await saving
    await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '1,2')
    await expect(page.locator('[data-robot-complete]')).toBeHidden()
    await expect(page.locator('.robot-task-progress progress')).toHaveAttribute('value', '0')
  } finally { release() }
  await complete(page)
  await expect(page.locator('.robot-task-progress progress')).toHaveAttribute('value', '1')
  const state = await (await page.request.get('/__test/snapshot')).json()
  expect(state.students.zosia.toolProgress.robot['two-steps'].completed).toBe(true)
})

test('an old edited prediction is preserved until the pupil explicitly restores the supplied program', async ({ page }) => {
  await page.evaluate(async () => {
    const state = await (await fetch('/__test/snapshot')).json()
    state.students.zosia.toolProgress.robot = { 'predict-turn': { program: ['forward'], runs: 2, completed: false } }
    await fetch('/__test/seed', { method: 'POST', body: JSON.stringify(state) })
  })
  await open(page, 'predict-turn')
  await expect(page.locator('.robot-block')).toHaveCount(1)
  const before = await (await page.request.get('/__test/snapshot')).json()
  expect(before.students.zosia.toolProgress.robot['predict-turn'].program).toEqual(['forward'])
  await page.getByRole('button', { name: 'Przywróć program zadania' }).click()
  await expect(page.locator('.robot-block')).toHaveCount(3)
  await expect(page.locator('[data-restore-prediction]')).toBeHidden()
  await page.locator('[data-cell="2,3"]').click(); await page.locator('[data-run]').click(); await complete(page)
  const after = await (await page.request.get('/__test/snapshot')).json()
  expect(after.students.zosia.toolProgress.robot['predict-turn'].runs).toBe(3)
  expect(after.students.zosia.toolProgress.robot['predict-turn'].program).toEqual(['forward', 'right', 'forward'])
})

test('repeating a prediction returns keyboard focus to the board when Run is disabled', async ({ page }) => {
  await open(page, 'predict-turn')
  await page.locator('[data-cell="2,3"]').click(); await page.locator('[data-run]').click(); await complete(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Spróbuj ponownie', exact: true }).click()
  await expect(page.locator('[data-run]')).toBeDisabled()
  await expect(page.locator('.robot-board button').first()).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-cell="0,0"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-run]')).toBeEnabled()
})

test('one overlay interpolates all four directions without reparenting or size changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await open(page, 'original')
  await page.evaluate(() => document.fonts.ready)
  await add(page, ['forward', 'right', 'forward', 'right', 'forward', 'right', 'forward'])
  await page.evaluate(() => {
    window.robotNode = document.querySelector('.robot-token')
    window.robotTweens = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function(frames, options) {
      const tween = animate.call(this, frames, options)
      if (this.matches('.robot-token--moving')) {
        tween.pause(); tween.currentTime = options.duration / 2
        const from = new DOMMatrix(frames[0].transform), to = new DOMMatrix(frames[1].transform)
        const middle = new DOMMatrix(getComputedStyle(this).transform)
        window.robotTweens.push({ from: [from.e, from.f], to: [to.e, to.f], middle: [middle.e, middle.f], duration: options.duration, width: this.getBoundingClientRect().width, height: this.getBoundingClientRect().height, parent: this.parentElement.className, layer: getComputedStyle(this).zIndex })
        tween.currentTime = 0; tween.play()
      }
      return tween
    }
  })
  await page.locator('[data-run]').click()
  await expect(page.locator('.robot-message')).toContainText('Robot nie dotarł do celu')
  const moves = await page.evaluate(() => window.robotTweens)
  expect(moves).toHaveLength(4)
  expect(moves.map(move => [Math.sign(move.to[0] - move.from[0]), Math.sign(move.to[1] - move.from[1])])).toEqual([[0, -1], [1, 0], [0, 1], [-1, 0]])
  for (const move of moves) {
    expect(move.parent).toBe('robot-board'); expect(Number(move.layer)).toBeGreaterThan(0)
    expect(move.duration).toBeGreaterThanOrEqual(150); expect(move.duration).toBeLessThan(ROBOT_STEP_MS)
    expect(move.middle[0]).toBeCloseTo((move.from[0] + move.to[0]) / 2, 0)
    expect(move.middle[1]).toBeCloseTo((move.from[1] + move.to[1]) / 2, 0)
    expect(move.width).toBeCloseTo(moves[0].width, 0); expect(move.height).toBeCloseTo(moves[0].height, 0)
  }
  expect(await page.evaluate(() => window.robotNode === document.querySelector('.robot-token'))).toBe(true)
  await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '1,4')
})

for (const reducedMotion of ['no-preference', 'reduce']) {
  test(`Stop, reset and immediate restart cancel movement deterministically (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await open(page, 'two-steps'); await add(page, ['forward', 'forward'])
    await page.locator('[data-run]').click()
    await expect(page.locator('[data-path="0"]')).toHaveAttribute('aria-current', 'step')
    if (reducedMotion === 'reduce') expect(await page.locator('.robot-token').evaluate(token => token.getAnimations({ subtree: true }).length)).toBe(0)
    await page.locator('[data-stop]').click()
    await expect(page.locator('[aria-current="step"]')).toHaveCount(0)
    expect(await page.locator('.robot-token').evaluate(token => token.getAnimations({ subtree: true }).length)).toBe(0)
    const stopped = await page.locator('.robot-board').getAttribute('data-robot-position')
    await page.waitForTimeout(ROBOT_STEP_MS * 2 + 100)
    await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', stopped)
    await expect(page.locator('[data-robot-complete]')).toBeHidden()
    await page.locator('[data-run]').click(); await page.locator('[data-reset]').click()
    await expect(page.locator('.robot-board')).toHaveAttribute('data-robot-position', '1,4')
    expect(await page.locator('.robot-token').evaluate(token => token.getAnimations({ subtree: true }).length)).toBe(0)
    await page.locator('[data-run]').click(); await complete(page)
    const state = await (await page.request.get('/__test/snapshot')).json()
    expect(state.students.zosia.toolProgress.robot['two-steps'].runs).toBe(1)
    await expect(page.locator('[data-stop]')).toBeDisabled()
  })
}
