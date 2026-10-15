import { test, expect } from '@playwright/test'
import { chooseStudent, enterTeacher, resetApp } from './helpers.js'

test('przyciski głosu startują, zatrzymują i zmieniają aktywny tekst; późne zdarzenia nie gaszą nowego głosu', async ({ page }) => {
  await page.addInitScript(() => {
    window.spoken = []; window.cancelled = 0; window.voiceList = []
    window.SpeechSynthesisUtterance = function(text) { this.text = text }
    const synthesis = new EventTarget()
    synthesis.getVoices = () => window.voiceList
    synthesis.cancel = () => { window.cancelled++ }
    synthesis.speak = message => window.spoken.push(message)
    Object.defineProperty(window, 'speechSynthesis', { value: synthesis })
  })
  await resetApp(page); await chooseStudent(page); await page.goto('/#/lesson/1')
  expect(await page.evaluate(() => window.spoken.length)).toBe(0)
  await page.evaluate(() => { window.voiceList = [{ lang: 'en-US', name: 'English' }, { lang: 'pl-PL', name: 'Polski Natural' }]; speechSynthesis.dispatchEvent(new Event('voiceschanged')) })
  expect(await page.evaluate(() => window.spoken.length)).toBe(0)
  const name = page.locator('[data-speak="Monitor."]')
  const instruction = page.locator('.equipment-instruction [data-speak]')
  await name.click()
  await expect(name).toHaveAttribute('aria-pressed', 'true')
  await expect(name).toHaveAccessibleName('Zatrzymaj odsłuch: Monitor')
  const settings = await page.evaluate(() => { const m = window.spoken[0]; return { lang: m.lang, rate: m.rate, pitch: m.pitch, volume: m.volume, voice: m.voice.name } })
  expect(settings).toEqual({ lang: 'pl-PL', rate: .9, pitch: 1, volume: 1, voice: 'Polski Natural' })
  await name.click()
  await expect(name).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.spoken.length)).toBe(1)
  await name.click(); await instruction.click()
  await expect(name).toHaveAttribute('aria-pressed', 'false')
  await expect(instruction).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.spoken[1].onend())
  await expect(instruction).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.spoken[2].onend())
  await expect(instruction).toHaveAttribute('aria-pressed', 'false')
  await name.click()
  const before = await page.evaluate(() => window.cancelled)
  await page.locator('[data-device-next]').click()
  expect(await page.evaluate(() => window.cancelled)).toBeGreaterThan(before)
  await expect(page.locator('[data-speak="Klawiatura."]')).toHaveAttribute('aria-pressed', 'false')
})

test('nauczyciel porównuje, zapisuje i przywraca głos; uczeń korzysta z zapisanej opcji', async ({ page }) => {
  await page.addInitScript(() => {
    window.spoken = []
    window.SpeechSynthesisUtterance = function(text) { this.text = text }
    window.voiceList = []
    const synthesis = new EventTarget()
    synthesis.getVoices = () => window.voiceList
    synthesis.cancel = () => {}
    synthesis.speak = message => window.spoken.push(message)
    Object.defineProperty(window, 'speechSynthesis', { value: synthesis })
  })
  await resetApp(page); await enterTeacher(page)
  await page.getByRole('link', { name: 'Głos i odsłuch', exact: true }).click()
  const select = page.getByLabel('Głos', { exact: true })
  await expect(page.getByLabel('Wariant czytania')).toHaveValue('calm')
  await expect(select.locator('option')).toHaveCount(1)
  await page.evaluate(() => {
    window.voiceList = [{ name: 'Polski Natural', voiceURI: 'natural', lang: 'pl-PL' }, { name: 'Polski systemowy', voiceURI: 'system', lang: 'pl-PL' }, { name: 'English Premium', voiceURI: 'en', lang: 'en-US' }]
    speechSynthesis.dispatchEvent(new Event('voiceschanged'))
  })
  await expect(select.locator('option')).toHaveCount(3)
  await select.selectOption('system')
  await page.getByLabel('Wariant czytania').selectOption('slower')
  expect(await page.evaluate(() => window.spoken.length)).toBe(0)
  await page.getByRole('button', { name: 'Odsłuchaj', exact: true }).click()
  expect(await page.evaluate(() => ({ voice: window.spoken.at(-1).voice.voiceURI, rate: window.spoken.at(-1).rate }))).toEqual({ voice: 'system', rate: .85 })
  await page.getByRole('button', { name: 'Zatrzymaj odsłuch', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('abecadlo-state-v3')).teacher.speechSettings)).toBeUndefined()
  await page.getByRole('button', { name: 'Zapisz ustawienia' }).click()
  await expect(page.getByText('Zapisano ustawienia głosu.', { exact: true })).toBeVisible()
  await page.reload()
  // A temporarily empty voice list must retain the saved choice and restore it later.
  await expect(select).toHaveValue('system')
  await expect(page.locator('#voice-availability')).toContainText('teraz niedostępny')
  await page.evaluate(() => { window.voiceList = [{ name: 'Polski systemowy', voiceURI: 'system', lang: 'pl-PL' }]; speechSynthesis.dispatchEvent(new Event('voiceschanged')) })
  await expect(select).toHaveValue('system')
  await expect(page.locator('#voice-availability')).not.toContainText('teraz niedostępny')
  for (const [width, height] of [[1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  }
  await page.getByRole('link', { name: 'Wróć do klasy' }).click()
  await page.getByRole('button', { name: 'Zmień rolę' }).click()
  await chooseStudent(page)
  // Stay in the SPA: switching role must not discard the global voice choice.
  await page.getByRole('link', { name: /Rozpocznij/ }).first().click()
  await page.getByRole('button', { name: 'Posłuchaj: Monitor', exact: true }).click()
  expect(await page.evaluate(() => ({ voice: window.spoken.at(-1).voice.voiceURI, rate: window.spoken.at(-1).rate }))).toEqual({ voice: 'system', rate: .85 })
})
