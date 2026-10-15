import { test, expect } from '@playwright/test'
import { chooseStudent, resetApp } from './helpers.js'
import { reachEquipmentStage, finishEquipmentMatching } from './equipmentHelpers.js'

test('oglądanie, dobrowolny polski odsłuch i przepisywanie ze spokojną korektą', async ({ page }) => {
  await page.addInitScript(() => {
    window.spoken = []
    window.SpeechSynthesisUtterance = function(text) { this.text = text }
    Object.defineProperty(window, 'speechSynthesis', { value: { cancel() {}, getVoices: () => [{ lang: 'pl-PL' }], speak: message => window.spoken.push({ text: message.text, lang: message.lang }) } })
  })
  await resetApp(page); await chooseStudent(page); await page.goto('/#/lesson/1')
  expect(await page.evaluate(() => window.spoken)).toEqual([])
  await page.getByRole('button', { name: 'Posłuchaj: Monitor', exact: true }).click()
  expect(await page.evaluate(() => window.spoken)).toEqual([{ text: 'Monitor.', lang: 'pl-PL' }])
  await reachEquipmentStage(page, 2)
  await page.locator('[data-copy-input]').fill('monitr')
  await page.getByRole('button', { name: 'Sprawdź', exact: true }).click()
  await expect(page.getByText('Spójrz jeszcze raz na wzór.')).toBeVisible()
  await expect(page.locator('[data-device-next]')).toBeHidden()
  await page.locator('[data-copy-input]').fill('  MONITOR  ')
  await page.getByRole('button', { name: 'Sprawdź', exact: true }).click()
  await expect(page.getByText('Gotowe.', { exact: true })).toBeVisible()
  await expect(page.locator('[data-device-next]')).toBeEnabled()
})

test('strefy tolerują przesunięcie; wzór po minucie nie resetuje ułożonego sprzętu', async ({ page }) => {
  await resetApp(page); await chooseStudent(page)
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.goto('/#/lesson/1'); await reachEquipmentStage(page, 4)
  await page.locator('[data-part="monitor"]').click()
  await page.locator('[data-zone="keyboard"]').click()
  await expect(page.locator('[data-zone="monitor"]')).not.toHaveClass(/is-filled/)
  await expect(page.locator('[data-placement-status]')).toContainText('spróbuj ponownie')
  const station = page.locator('[data-station]')
  const dt = await page.evaluateHandle(() => { const transfer = new DataTransfer(); transfer.setData('text/plain', 'monitor'); return transfer })
  const rect = await station.boundingBox()
  // Far from the exact centre of the monitor slot, still within the broad back/centre region.
  await station.dispatchEvent('drop', { dataTransfer: dt, clientX: rect.x + rect.width * .31, clientY: rect.y + rect.height * .1 })
  await expect(page.locator('[data-zone="monitor"]')).toHaveClass(/is-filled/)
  await expect(page.locator('[data-show-model]')).toBeHidden()
  await page.clock.fastForward(59_999)
  await expect(page.locator('[data-show-model]')).toBeHidden()
  await page.clock.fastForward(1)
  await page.getByRole('button', { name: 'Pokaż wzór' }).click()
  await expect(page.getByRole('dialog', { name: 'Wzór stanowiska' })).toBeVisible()
  await page.clock.fastForward(5000)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-zone="monitor"]')).toHaveClass(/is-filled/)
  await expect(page.locator('[data-part="monitor"]')).toHaveCount(0)
  for (const [width, height] of [[1440, 900], [1366, 768], [1024, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    for (const zone of await page.locator('[data-zone]').all()) {
      const bounds = await zone.boundingBox()
      expect(bounds.width).toBeGreaterThanOrEqual(44); expect(bounds.height).toBeGreaterThanOrEqual(44)
    }
  }
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.getByRole('button', { name: 'Pokaż wzór' }).click()
  await page.getByRole('button', { name: 'Wróć do układania' }).click()
  await expect(page.locator('[data-zone="monitor"]')).toHaveClass(/is-filled/)
})

test('brak głosu nie blokuje pięciu etapów; obserwacja kończy się po 18 sekundach', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { value: undefined }) })
  await resetApp(page); await chooseStudent(page); await page.clock.install()
  await page.goto('/#/lesson/1')
  await expect(page.getByRole('button', { name: 'Posłuchaj: Monitor', exact: true })).toBeDisabled()
  await reachEquipmentStage(page, 3)
  await page.clock.fastForward(18_000)
  await expect(page.getByText('Ukończyłeś ten etap.')).toBeVisible()
  await page.locator('[data-step-continue]').click()
  for (const id of ['monitor', 'keyboard', 'mouse', 'computer', 'speakers', 'printer']) {
    await page.locator(`[data-part="${id}"]`).focus(); await page.keyboard.press('Enter')
    await page.locator(`[data-zone="${id}"]`).first().focus(); await page.keyboard.press('Enter')
  }
  await page.locator('[data-step-continue]').click()
  await page.locator('[data-match="mouse"]').click()
  await expect(page.locator('[data-match-status]')).toContainText('Posłuchaj nazw')
  await expect(page.locator('[data-device-next]')).toHaveCount(0)
  await finishEquipmentMatching(page)
  await expect(page.getByText('Lekcja ukończona', { exact: true })).toBeVisible()
})

test('typografia używa rzeczywistych lokalnych fontów dla polskich tekstów', async ({ page }, testInfo) => {
  await resetApp(page); await chooseStudent(page)
  await page.evaluate(() => document.fonts.ready)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const report = {}
  for (const [label, selector, family] of [['heading', '.home-welcome h1', 'Fredoka'], ['body', '.home-welcome > p', 'Nunito Sans'], ['button', '.today-action .button', 'Fredoka']]) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector })
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
    report[label] = fonts.filter(font => font.glyphCount > 0)
    expect(report[label].some(font => font.familyName.includes(family) && font.isCustomFont)).toBeTruthy()
    expect(report[label].every(font => !/Segoe|system-ui/.test(font.familyName))).toBeTruthy()
  }
  await page.goto('/#/lesson/1'); await page.evaluate(() => document.fonts.ready)
  const lessonDocument = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: lessonDocument.root.nodeId, selector: '.lesson-header h1' })
  report.lessonTitle = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts.filter(font => font.glyphCount > 0)
  expect(report.lessonTitle.every(font => font.familyName.includes('Fredoka') && font.isCustomFont)).toBeTruthy()
  console.log('Rendered fonts:', JSON.stringify(report))
  await testInfo.attach('rendered-fonts', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
})
