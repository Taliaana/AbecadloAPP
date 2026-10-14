import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
const phase = process.argv[2] || 'after'
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4182', '--strictPort'], { stdio: 'ignore' })
const base = 'http://127.0.0.1:4182'
let browser
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) break } catch {} await new Promise(r => setTimeout(r, 150)) }
  browser = await chromium.launch()
  const page = await browser.newPage()
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await mkdir(`docs/ui-audit/${phase}`, { recursive: true })
  for (const [width, height] of phase === 'before' ? [[1366,768]] : [[1440,900],[1366,768],[1024,768],[390,844]]) {
    await page.setViewportSize({ width, height })
    await page.goto(`${base}/#/welcome`)
    await page.evaluate(() => localStorage.clear()); await page.reload()
    async function capture(name) {
      await page.evaluate(() => document.fonts.ready)
      await page.locator('h1').waitFor()
      await page.evaluate(async () => {
        document.querySelector('main').getBoundingClientRect()
        await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))
      })
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }) })
      await page.waitForTimeout(100)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
      await page.screenshot({ path: `docs/ui-audit/${phase}/${name}-${width}.png` })
      if (overflow && phase === 'after') throw new Error(`Overflow: ${name}, ${width}`)
      if (overflow) console.log(`Overflow before: ${name}, ${width}`, await page.evaluate(() => [...document.querySelectorAll('main, .role-grid, .profile-intro, img')].map(el => ({ cls:el.className, rect:el.getBoundingClientRect().toJSON() }))))
    }
    await capture('role')
    await page.locator('[data-role="student"]').click(); await capture('profiles')
    await page.locator('[data-profile="zosia"]').click()
    for (const [name, route] of [['home','home'],['workshop','workshop'],['portfolio','works'],['lesson','lesson/1'],['robot','tools/robot?challenge=first-turn'],['avatar','avatar']]) {
      await page.goto(`${base}/#/${route}`); await capture(name)
    }
    await page.goto(`${base}/#/welcome`); await page.locator('[data-role="teacher"]').click()
    await page.locator('[data-pin]').fill('1234'); await page.locator('[data-teacher-form]').evaluate(form => form.requestSubmit())
    for (const [name, route] of [['class','teacher/class'],['review','teacher/review'],['teacher-works','teacher/works'],['form','teacher/assignments/new']]) {
      await page.goto(`${base}/#/${route}`); await capture(name)
    }
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(`UI audit ${phase}: screenshots saved, browser errors: ${errors.length}.`)
} finally { await browser?.close(); vite.kill() }
