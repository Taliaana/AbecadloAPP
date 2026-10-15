import { expect } from '@playwright/test'
export const equipmentNames = [['monitor', 'Monitor'], ['keyboard', 'Klawiatura'], ['mouse', 'Mysz'], ['computer', 'Komputer'], ['speakers', 'Głośniki'], ['printer', 'Drukarka']]

export async function reachEquipmentStage(page, stage) {
  if (stage <= 1) return
  for (const [, name] of equipmentNames) {
    await expect(page.locator('.equipment-name h3')).toHaveText(name.toLocaleUpperCase('pl-PL'))
    await expect.poll(() => page.locator('.equipment-portrait').evaluate(img => img.naturalWidth)).toBeGreaterThan(0)
    await page.locator('[data-device-next]').click()
  }
  await page.locator('[data-step-continue]').click()
  if (stage <= 2) return
  for (const [, name] of equipmentNames) {
    await page.locator('[data-copy-input]').fill(`  ${name.toLocaleUpperCase('pl-PL')}  `)
    await page.getByRole('button', { name: 'Sprawdź', exact: true }).click()
    await expect(page.getByText('Gotowe.', { exact: true })).toBeVisible()
    await page.locator('[data-device-next]').click()
  }
  await page.locator('[data-step-continue]').click()
  if (stage <= 3) return
  await page.getByRole('button', { name: 'Jestem gotowy' }).click()
  await page.locator('[data-step-continue]').click()
  if (stage <= 4) return
  for (const [id] of equipmentNames) {
    await page.locator(`[data-part="${id}"]`).click()
    await page.locator(`[data-zone="${id}"]`).first().click()
  }
  await page.locator('[data-step-continue]').click()
}

export async function finishEquipmentMatching(page) {
  for (const [id] of equipmentNames) {
    await page.locator(`[data-match="${id}"]`).click()
    await expect(page.locator('.equipment-description')).toBeVisible()
    await page.locator('[data-device-next]').click()
  }
}
