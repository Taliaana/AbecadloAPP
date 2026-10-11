import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import process from 'node:process'
import { chromium } from '@playwright/test'

const phase = process.argv[2]
if (!['before', 'after'].includes(phase)) throw new Error('Użycie: node scripts/capture-ui-review.mjs before|after')

const outputDirectory = `docs/ui-redesign/${phase}`
await mkdir(outputDirectory, { recursive: true })

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: process.cwd(),
  stdio: 'ignore',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch('http://127.0.0.1:4173')).ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  throw new Error('Nie udało się uruchomić Vite.')
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 })

async function screenshot(name) {
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${outputDirectory}/${name}.png`, fullPage: true })
}

try {
  await waitForServer()
  await page.goto('http://127.0.0.1:4173/#/welcome')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.locator('[data-role="student"]').click()
  await screenshot('profile-selection')

  await page.locator('[data-profile="zosia"]').click()
  await screenshot('home')
  await page.goto('http://127.0.0.1:4173/#/path')
  await screenshot('learning-path')

  await page.evaluate(() => {
    const key = 'abecadlo-state-v3'
    const state = JSON.parse(localStorage.getItem(key))
    state.students.zosia.toolProgress.unlockedTools = ['mouse-practice', 'typewriting']
    localStorage.setItem(key, JSON.stringify(state))
  })
  await page.goto('http://127.0.0.1:4173/#/workshop')
  await screenshot('workshop')
  await page.goto('http://127.0.0.1:4173/#/works')
  await screenshot('portfolio')

  await page.goto('http://127.0.0.1:4173/#/welcome')
  await page.locator('[data-role="teacher"]').click()
  await page.locator('[data-pin]').fill('1234')
  await page.locator('[data-teacher-form]').evaluate((form) => form.requestSubmit())
  await page.waitForURL(/teacher\/class/)
  await screenshot('teacher-class')
} finally {
  await browser.close()
  vite.kill()
}
