import { chromium, expect } from '@playwright/test'
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
  for (const [name, query] of [['library', ''], ['obstacles', '?challenge=around-stone'], ['repeat', '?challenge=repeat-steps'], ['home', null], ['workshop', null]]) {
    await page.goto(`http://127.0.0.1:4177/#/${query === null ? name : 'tools/robot' + query}`)
    if (name === 'repeat') {
      if (await page.locator('[data-clear]').isEnabled()) await page.locator('[data-clear]').click()
      await page.locator('[data-command="repeat"]').click()
      await page.getByRole('button', { name: 'Idź naprzód do powtórzenia 1', exact: true }).click()
    }
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250)
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }) })
    await page.waitForTimeout(200)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    if (overflow) throw new Error(`overflow ${name} ${width}`)
    await page.screenshot({ path: `test-results/robot-review/${name}-${width}.png` })
    if (name === 'repeat' && width === 390) {
      await page.locator('.robot-program-panel').scrollIntoViewIfNeeded()
      await page.screenshot({ path: 'test-results/robot-review/program-390.png' })
    }
  }
}
await page.goto('http://127.0.0.1:4177/#/tools/robot')
await page.getByRole('button', { name: /Stwórz trasę/ }).click()
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(250)
await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }) })
await page.waitForTimeout(200)
await page.screenshot({ path: 'test-results/robot-review/editor-390.png' })
await page.setViewportSize({ width: 1366, height: 768 })
for (const [id, commands] of [
  ['two-steps', ['forward', 'forward']],
  ['around-stone', ['right', 'forward', 'left', 'forward', 'forward', 'forward', 'left', 'forward']],
  ['wrong-turn', ['forward', 'right', 'forward']],
]) {
  await page.goto(`http://127.0.0.1:4177/#/tools/robot?challenge=${id}`)
  if (await page.locator('[data-clear]').isEnabled()) await page.locator('[data-clear]').click()
  for (const command of commands) await page.locator(`[data-command="${command}"]`).click()
  await page.locator('[data-run]').click()
  await expect(page.locator('[data-robot-complete]')).toBeVisible({ timeout: 8000 })
  console.log(`Browser walkthrough completed: ${id}`)
}
await page.goto('http://127.0.0.1:4177/#/tools/robot?challenge=repeat-steps')
await page.locator('[data-repeat-times]').selectOption('3')
await page.locator('[data-run]').click()
await expect(page.locator('[data-robot-complete]')).toBeVisible()
await expect(page.getByRole('heading', { name: 'Gotowe', exact: true })).toBeInViewport()
await page.waitForTimeout(250)
await page.screenshot({ path: 'test-results/robot-review/completed-1366.png' })
await page.goto('http://127.0.0.1:4177/#/tools/robot')
await page.getByRole('button', { name: /Stwórz trasę/ }).click()
await page.getByRole('button', { name: 'Cel', exact: true }).click()
await page.locator('[data-cell="1,2"]').click()
await page.getByRole('button', { name: 'Ułóż program' }).click()
for (let i = 0; i < 2; i++) await page.locator('[data-command="forward"]').click()
await page.locator('[data-run]').click()
await expect(page.locator('[data-robot-complete]')).toBeVisible()
await expect(page.locator('[data-project-status]')).toHaveText('Twoja trasa prowadzi do celu.')
console.log('Browser walkthrough completed: repeat and own board')
await browser.close()
console.log('Robot UI review: 23 screenshots, no horizontal overflow; five successful routes.')
