import { expect } from '@playwright/test'
import { getNatureFriend } from '../../src/data/natureFriends.js'

export async function selectNatureFriend(page, species) {
  const friend=getNatureFriend(species)
  await page.locator(`[data-animal-group="${friend.group}"]`).click()
  await page.locator(`button[data-species="${species}"]`).click()
}

export async function resetApp(page) {
  await page.context().clearCookies()
  await page.request.post('/__test/reset')
  await page.goto('/#/welcome')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

export async function chooseStudent(page, name = 'Zosia', grade = '1') {
  await page.getByRole('button', { name: 'Uczeń' }).click()
  await expect(page.locator('[data-pin], [data-grade], .home-welcome').first()).toBeVisible()
  if (await page.locator('.home-welcome').count()) {
    await page.goto('/#/teacher-login?prepare=student')
    await expect(page.locator('[data-pin]')).toBeVisible()
  }
  if (await page.locator('[data-pin]').count()) {
    await page.locator('[data-pin]').fill('1234')
    await page.getByRole('button', { name: 'Wejdź do panelu' }).click()
  }
  await page.locator(`[data-grade="${grade}"]`).click()
  await page.getByRole('button', { name: new RegExp(name) }).click()
  await expect(page.locator('.main-nav')).toBeVisible()
}

export async function enterTeacher(page) {
  await page.goto('/#/welcome')
  await page.getByRole('button', { name: 'Nauczyciel' }).click()
  await page.locator('[data-pin]').fill('1234')
  await page.getByRole('button', { name: 'Wejdź do panelu' }).click()
  await expect(page.getByRole('heading', { name: 'Klasa' })).toBeVisible()
}

export async function seedTypewriting(page) {
  await page.evaluate(() => {
    return (async () => {
    const state = await (await fetch('/__test/snapshot')).json()
    state.students.zosia.progress[1] = 'completed'
    state.students.zosia.progress[2] = 'completed'
    state.students.zosia.progress[3] = 'completed'
    state.students.zosia.progress[4] = 'available'
    state.students.zosia.toolProgress.unlockedTools = ['mouse-practice', 'typewriting']
    await fetch('/__test/seed', { method: 'POST', body: JSON.stringify(state) })
    })()
  })
}

// Execution suites use an explicit custom-mode fixture. Progression itself is
// tested without these grants in robot-progression.spec.js.
export async function grantRobotSandbox(page) {
  await page.evaluate(async () => {
    const state = await (await fetch('/__test/snapshot')).json()
    state.students.zosia.toolProgress.robotAccess = { stages: ['steps', 'turns', 'obstacles', 'prediction', 'debug', 'alternative'], challenges: ['repeat-steps', 'repeat-turns'], customBoard: true }
    await fetch('/__test/seed', { method: 'POST', body: JSON.stringify(state) })
  })
}
