import { expect } from '@playwright/test'

export async function resetApp(page) {
  await page.context().clearCookies()
  await page.request.post('/__test/reset')
  await page.goto('/#/welcome')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

export async function chooseStudent(page, name = 'Zosia') {
  await page.getByRole('button', { name: 'Uczeń' }).click()
  await expect(page.locator('[data-pin], [data-profile], .home-welcome').first()).toBeVisible()
  if (await page.locator('.home-welcome').count()) {
    await page.goto('/#/teacher-login?prepare=student')
    await expect(page.locator('[data-pin]')).toBeVisible()
  }
  if (await page.locator('[data-pin]').count()) {
    await page.locator('[data-pin]').fill('1234')
    await page.getByRole('button', { name: 'Wejdź do panelu' }).click()
  }
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
