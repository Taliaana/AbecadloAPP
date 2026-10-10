import { test, expect } from '@playwright/test'
import { chooseStudent, enterTeacher, resetApp } from './helpers.js'

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'school-laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'small', width: 390, height: 844 },
]

for (const viewport of viewports) {
  test(`layout nie ma poziomego overflow: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await resetApp(page)
    await chooseStudent(page)
    for (const route of ['/#/home', '/#/workshop', '/#/works', '/#/lesson/1']) {
      await page.goto(route)
      await expect(page.locator('#main-content')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
    }
  })
}

test('design system zapewnia kontener, nawigację, focus i przyciski 44px', async ({ page }) => {
  await resetApp(page)
  await chooseStudent(page)
  const primary = page.locator('.button-primary').first()
  expect((await primary.boundingBox()).height).toBeGreaterThanOrEqual(44)
  await primary.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  expect(await primary.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await expect(page.locator('.main-content')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Główna nawigacja' })).toBeVisible()
  await page.goto('/#/lesson/3')
  await page.goto('/#/home')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
})

test('formularz i panel nauczyciela mieszczą się na małym ekranie', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await resetApp(page)
  await enterTeacher(page)
  await expect(page.getByRole('navigation', { name: 'Panel nauczyciela' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await page.getByRole('link', { name: /Dodaj ucznia/ }).click()
  await expect(page.locator('.form-card')).toBeVisible()
  const disabledSubmit = page.getByRole('button', { name: 'Dodaj ucznia' })
  await expect(disabledSubmit).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  await testInfo.attach('teacher-student-form-small', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})

test('wizualny smoke: główne widoki tworzą stabilne zrzuty do raportu', async ({ page }, testInfo) => {
  await resetApp(page)
  await chooseStudent(page)
  for (const [name, route] of [['home', '/#/home'], ['workshop', '/#/workshop'], ['lesson', '/#/lesson/1']]) {
    await page.goto(route)
    await page.locator('#main-content').focus()
    await page.waitForTimeout(240)
    await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  }
  await enterTeacher(page)
  for (const [name, route] of [['class', '/#/teacher/class'], ['review', '/#/teacher/review']]) {
    await page.goto(route)
    await page.locator('#main-content').focus()
    await page.waitForTimeout(240)
    await testInfo.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  }
})
