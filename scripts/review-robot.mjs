import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const browser = await chromium.launch()
const page = await browser.newPage()
await mkdir('test-results/robot-review', { recursive: true })
await page.goto('http://127.0.0.1:4177/#/welcome')
await page.evaluate(() => localStorage.clear()); await page.reload()
await page.getByRole('button', { name: 'Uczeń' }).click()
await page.getByRole('button', { name: /Zosia/ }).click()
for (const [width, height] of [[1440, 900], [1366, 768], [1024, 768], [390, 844]]) {
  await page.setViewportSize({ width, height })
  for (const [name, query] of [['library', ''], ['obstacles', '?challenge=around-stone'], ['repeat', '?challenge=repeat-steps']]) {
    await page.goto(`http://127.0.0.1:4177/#/tools/robot${query}`)
    if (name === 'repeat') {
      await page.locator('[data-command="repeat"]').click()
      await page.getByRole('button', { name: 'Idź naprzód do powtórzenia 1', exact: true }).click()
    }
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (overflow) throw new Error(`overflow ${name} ${width}`)
    await page.screenshot({ path: `test-results/robot-review/${name}-${width}.png`, fullPage: true })
  }
}
await page.goto('http://127.0.0.1:4177/#/tools/robot')
await page.getByRole('button', { name: /Stwórz trasę/ }).click()
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250)
await page.screenshot({ path: 'test-results/robot-review/editor-390.png', fullPage: true })
await browser.close()
console.log('Robot UI review: 13 screenshots, no horizontal overflow.')
