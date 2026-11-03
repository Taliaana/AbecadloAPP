// Real services only. No mock routes, screenshots, legacy import or broad cleanup.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { randomUUID, createHash } from 'node:crypto'
import { chromium } from '@playwright/test'
import { createServer as createViteServer } from 'vite'
import postgres from 'postgres'

const remote = process.env.PINKTOWER_VERIFY_URL
const origin = remote ? new URL(remote).origin : 'http://127.0.0.1:4175'
const pin = process.env.PINKTOWER_TEST_TEACHER_PIN || '1234'
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 })
let apiServer, vite, browser, teacher, observer, observerPage, stage = 'startup'
const owned = new Map()
const operations = new Set()
const results = []
const pass = name => { results.push(name); console.log(JSON.stringify({ passed: name })) }
async function request(context, path, method = 'GET', data) {
  const response = await context.request.fetch(`${origin}/api/${path}`, { method, headers: { Origin: origin }, ...(data !== undefined ? { data } : {}) })
  let body; try { body = await response.json() } catch { body = {} }
  return { status: response.status(), body }
}
async function ok(context, path, method, data) {
  const result = await request(context, path, method, data)
  assert.equal(result.status, 200, `${method || 'GET'} /api/${path}: ${result.status}`)
  return result.body
}
async function login(context) {
  const page = await context.newPage()
  await page.goto(`${origin}/#/teacher-login`)
  await page.locator('[data-pin]').fill(pin)
  await page.getByRole('button', { name: 'Wejdź do panelu', exact: true }).click()
  await page.getByRole('heading', { name: 'Klasa', exact: true }).waitFor()
  return page
}
async function ownCounts(studentId) {
  return sql.begin('read only', async tx => {
    const [row] = await tx`select
      (select count(*)::int from students where id=${studentId}) as students,
      (select count(*)::int from lesson_progress where student_id=${studentId}) as progress,
      (select count(*)::int from tool_progress where student_id=${studentId}) as tools,
      (select count(*)::int from works where student_id=${studentId}) as works,
      (select count(*)::int from lesson_attempts where student_id=${studentId}) as attempts,
      (select count(*)::int from assignment_targets where student_id=${studentId}) as targets,
      (select count(*)::int from work_assets where student_id=${studentId}) as assets`;
    return row
  })
}
try {
  if (!remote) {
    stage = 'local teacher PIN hash configuration'
    assert.match(process.env.TEACHER_PIN_HASH || '', /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/)
    // Local runtime uses the unchanged real API and real Supabase credentials.
    process.env.NODE_ENV = 'development'; process.env.APP_ORIGIN = origin
    const { default: handler } = await import('../api/index.ts')
    apiServer = createServer(handler)
    await new Promise((resolve, reject) => { apiServer.once('error', reject); apiServer.listen(3005, '127.0.0.1', resolve) })
    vite = await createViteServer({ configFile: false, server: { host: '127.0.0.1', port: 4175, strictPort: true, watch: { ignored: ['**/playwright-report/**', '**/test-results/**'] }, proxy: { '/api': { target: 'http://127.0.0.1:3005', changeOrigin: false } } } })
    await vite.listen()
  }
  browser = await chromium.launch()
  teacher = await browser.newContext()
  const second = observer = await browser.newContext(), pupil = await browser.newContext(), otherPupil = await browser.newContext(), anonymous = await browser.newContext()
  stage = 'health and teacher login'
  await ok(anonymous, 'health')
  assert.equal((await request(anonymous, 'teacher/test-data')).status, 401)
  const page = await login(teacher), pageB = observerPage = await login(second)
  const cookies = await teacher.cookies(origin), cookie = cookies.find(item => item.name === 'pinktower_session')
  assert.ok(cookie?.httpOnly); assert.equal(cookie.sameSite, 'Strict')
  if (origin.startsWith('https:')) assert.equal(cookie.secure, true)
  pass('real API health, UI teacher login and protected cookie')

  stage = 'create through database panel'
  page.on('request', req => { if (req.url().endsWith('/api/teacher/test-data') && req.method() === 'POST') operations.add(req.postDataJSON().operationId) })
  await page.getByText('Test bazy danych', { exact: true }).click()
  const createdResponse = page.waitForResponse(response => response.url().endsWith('/api/teacher/test-data') && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Utwórz dane testowe', exact: true }).click()
  const created = (await (await createdResponse).json()).value
  assert.ok(created?.id); owned.set(created.id, created)
  await page.locator(`a[href="#/teacher/student/${created.studentId}"]`).waitFor()
  const counts = await ownCounts(created.studentId)
  assert.equal(counts.students, 1); assert.equal(counts.progress, 30); assert.equal(counts.tools, 1); assert.equal(counts.works, 1); assert.equal(counts.targets, 1); assert.equal(counts.attempts, 1)
  const student = (await ok(teacher, `students/${created.studentId}`)).value
  assert.equal(student.testRunId, created.id); assert.ok(student.profile.avatarConfig)
  assert.equal(student.progress[1], 'completed'); assert.equal(student.toolProgress.typingResults.fj.correct, 8)
  await pageB.getByText('Test bazy danych', { exact: true }).click()
  await pageB.getByRole('button', { name: 'Odśwież dane z serwera', exact: true }).click()
  await pageB.locator(`a[href="#/teacher/student/${created.studentId}"]`).waitFor()
  await pageB.reload(); await pageB.locator(`a[href="#/teacher/student/${created.studentId}"]`).waitFor()
  pass('panel creates real SQL records; independent browser sees them after refetch and reload')

  stage = 'student session and ownership'
  const operationId = randomUUID()
  operations.add(operationId)
  const another = (await ok(teacher, 'teacher/test-data', 'POST', { operationId })).value
  owned.set(another.id, another)
  for (const [context, id] of [[pupil, created.studentId], [otherPupil, another.studentId]]) {
    const device = await login(context)
    await device.goto(`${origin}/#/profiles`)
    await device.locator(`[data-profile="${id}"]`).click()
    await device.locator('.home-welcome').waitFor()
    const snapshot = (await ok(context, 'session')).snapshot
    assert.equal(snapshot.currentRole, 'student'); assert.deepEqual(Object.keys(snapshot.students), [id])
  }
  assert.equal((await request(pupil, 'students')).status, 403)
  assert.equal((await request(pupil, 'teacher/test-data', 'POST', { operationId: randomUUID() })).status, 403)
  assert.equal((await request(pupil, `students/${another.studentId}`)).status, 403)
  const workId = student.works[0].id, note = `Verification ${randomUUID()}`
  await ok(pupil, `works/${workId}`, 'PATCH', { data: { note } })
  assert.equal((await ok(second, `works/${workId}`)).value.data.note, note)
  pass('student session, ownership, teacher-only protection and central work save')

  stage = 'private image upload and authorization'
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l0cAAAAASUVORK5CYII=', 'base64')
  const grant = (await ok(pupil, 'assets', 'POST', { workId, mimeType: 'image/png', size: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') })).value
  assert.equal((await pupil.request.put(grant.signedUrl, { data: bytes, headers: { 'Content-Type': 'image/png' } })).ok(), true)
  await ok(pupil, `assets/${grant.id}/finalize`, 'POST', {})
  const read = (await ok(pupil, `assets/${grant.id}`)).value
  assert.deepEqual(await (await pupil.request.get(read.url)).body(), bytes)
  assert.equal((await request(anonymous, `assets/${grant.id}`)).status, 401)
  assert.equal((await request(otherPupil, `assets/${grant.id}`)).status, 403)
  const storagePath = `${created.studentId}/${workId}/${grant.id}`
  const publicRead = await anonymous.request.get(`${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_STORAGE_BUCKET || 'pinktower-assets'}/${storagePath}`)
  assert.equal(publicRead.ok(), false)
  await ok(pupil, `works/${workId}`, 'PATCH', { data: { entries: { test: { imageId: grant.id, source: 'https://example.org/test' } } } })
  pass('real private Storage upload/read; anonymous and foreign pupil denied')

  stage = 'legacy fixture preparation'
  const currentStudent = (await ok(teacher, `students/${created.studentId}`)).value
  const assignment = (await ok(teacher, `assignments/${created.assignmentId}`)).value
  const source = { schemaVersion: 3, students: { [created.studentId]: currentStudent }, assignments: [assignment] }
  const raw = JSON.stringify(source)
  await page.evaluate(async ({ raw, bytes, imageId, studentId, workId }) => {
    localStorage.setItem('abecadlo-state-v3', raw)
    const req = indexedDB.open('pinktower-images', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('images', { keyPath: 'id' })
    const db = await new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })
    await new Promise((resolve, reject) => { const tx = db.transaction('images', 'readwrite'); tx.objectStore('images').put({ id: imageId, studentId, workId, blob: new Blob([new Uint8Array(bytes)], { type: 'image/png' }) }); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error) })
    db.close()
  }, { raw, bytes: [...bytes], imageId: grant.id, studentId: created.studentId, workId })
  stage = 'legacy detection link'
  // Simulate opening the app with a pre-existing copy, not injecting storage
  // into an already-rendered class view and expecting a storage event in that tab.
  const legacyPage = await teacher.newPage()
  await legacyPage.goto(`${origin}/#/teacher/class`)
  await legacyPage.getByRole('link', { name: 'Znaleziono dane zapisane na tym komputerze.' }).click()
  stage = 'legacy preview action'
  await legacyPage.getByRole('button', { name: 'Sprawdź dane', exact: true }).click()
  const importButton = legacyPage.getByRole('button', { name: 'Przenieś dane do PinkTower', exact: true })
  await importButton.waitFor()
  await legacyPage.locator('[data-migration-summary]').getByText('Zdjęcia: 1', { exact: true }).waitFor()
  assert.equal(await importButton.isEnabled(), true)
  assert.equal(await legacyPage.evaluate(() => localStorage.getItem('abecadlo-state-v3')), raw)
  assert.equal(await legacyPage.evaluate(() => localStorage.getItem('pinktower-migration-completed')), null)
  pass('legacy detection and real API preview on isolated local origin; no import executed')

  stage = 'logout revokes session'
  const old = (await pupil.cookies(origin)).find(item => item.name === 'pinktower_session')
  await ok(pupil, 'auth/logout', 'POST', {})
  assert.equal((await ok(pupil, 'session')).snapshot.currentRole, null)
  assert.equal((await request(pupil, `works/${workId}`)).status, 401)
  const revoked = await anonymous.request.get(`${origin}/api/session`, { headers: { Cookie: `${old.name}=${old.value}` } })
  assert.equal(revoked.status(), 401)
  pass('logout clears cookie and rejects the revoked session')
} catch (error) {
  console.error(JSON.stringify({ failedStage: stage, error: error.code || error.name }))
  if (stage.startsWith('legacy')) {
    console.error(JSON.stringify({ detail: error.message?.split('\n').slice(0, 3).join(' ') }))
    for (const context of browser?.contexts() || []) for (const page of context.pages()) {
      console.error(JSON.stringify({ page: page.url(), legacyPresent: await page.evaluate(() => Boolean(localStorage.getItem('abecadlo-state-v3'))).catch(() => null) }))
      if (await page.locator('[data-migration-status]').count()) console.error(JSON.stringify({ migrationStatus: await page.locator('[data-migration-status]').textContent(), migrationIssues: await page.locator('[data-migration-issues]').textContent() }))
    }
  }
  process.exitCode = 1
} finally {
  try {
    const recovered = await sql.begin('read only', tx => tx`select data from app_settings where id='testDataRuns'`)
    for (const run of recovered[0]?.data || []) if (operations.has(run.operationId)) owned.set(run.id, run)
    if (teacher) for (const [id, run] of owned) {
      await ok(teacher, 'teacher/test-data', 'DELETE', { confirmation: 'delete-test-data', testRunId: id })
      assert.ok(Object.values(await ownCounts(run.studentId)).every(count => count === 0), 'dependent SQL rows were not removed')
      assert.equal((await request(observer, `students/${run.studentId}`)).status, 404, 'observer still reads a removed student')
    }
    if (observerPage && owned.size) {
      const details = observerPage.locator('[data-database-test]')
      if (!(await details.evaluate(node => node.open))) await observerPage.getByText('Test bazy danych', { exact: true }).click()
      await observerPage.getByRole('button', { name: 'Odśwież dane z serwera', exact: true }).click()
      for (const run of owned.values()) await observerPage.locator(`a[href="#/teacher/student/${run.studentId}"]`).waitFor({ state: 'hidden' })
    }
    if (owned.size) pass('all own test sets and dependent SQL rows removed via scoped API')
    console.log(JSON.stringify({ target: remote ? 'production' : 'local-app-real-supabase', passed: results.length, ownTestSetsCleaned: owned.size }))
  } catch (error) { console.error(JSON.stringify({ cleanupFailed: true, error: error.code || error.name, detail: error.message?.slice(0, 300), ownRunIds: [...owned.keys()] })); process.exitCode = 1 }
  if (browser) for (const context of browser.contexts()) if ((await context.cookies(origin)).some(cookie => cookie.name === 'pinktower_session')) await request(context, 'auth/logout', 'POST', {}).catch(() => {})
  await browser?.close(); await vite?.close()
  if (apiServer) { apiServer.closeAllConnections(); await new Promise(resolve => apiServer.close(resolve)) }
  await sql.end({ timeout: 2 })
}
