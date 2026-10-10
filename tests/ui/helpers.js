import { expect } from '@playwright/test'

export async function resetApp(page) {
  await page.goto('/#/welcome')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

export async function chooseStudent(page, name = 'Zosia') {
  await page.getByRole('button', { name: 'Uczeń' }).click()
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
    const key = 'abecadlo-state-v3'
    const state = JSON.parse(localStorage.getItem(key))
    state.students.zosia.progress[1] = 'completed'
    state.students.zosia.progress[2] = 'completed'
    state.students.zosia.progress[3] = 'completed'
    state.students.zosia.progress[4] = 'available'
    state.students.zosia.toolProgress.unlockedTools = ['mouse-practice', 'typewriting']
    localStorage.setItem(key, JSON.stringify(state))
  })
}
