import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { postgresRepository } from '../../server/db/repository.js'
import { supabaseFiles } from '../../server/storage/supabase.js'
import { createService } from '../../server/services.js'
import type { Role } from '../../server/model.js'

const configured = ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].every(key => process.env[key])
test('real Supabase: two repositories share a marked set, private upload/read and scoped cleanup', { skip: configured ? false : 'Brak credentials Supabase — prawdziwego testu nie wykonano.', timeout: 120_000 }, async () => {
  const a = postgresRepository(process.env.DATABASE_URL!), b = postgresRepository(process.env.DATABASE_URL!), files = supabaseFiles()
  const runA = createService(a, files), runB = createService(b, files)
  const teacher: Role = { role: 'teacher', tokenId: randomUUID() }, operationId = randomUUID()
  let created: any
  try {
    await a.health(); await b.health()
    created = (await runA('POST', 'teacher/test-data', { operationId }, teacher)).value
    const pupil = (await runB('GET', `students/${created.studentId}`, {}, teacher)).value
    assert.equal(pupil.testRunId, created.id); assert.equal(pupil.progress[1], 'completed')
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l0cAAAAASUVORK5CYII=', 'base64')
    const student: Role = { role: 'student', studentId: created.studentId, tokenId: randomUUID() }
    const workId = pupil.works[0].id
    const upload = (await runA('POST', 'assets', { workId, mimeType: 'image/png', size: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') }, student)).value
    const sent = await fetch(upload.signedUrl, { method: 'PUT', body: bytes, headers: { 'Content-Type': 'image/png' } }); assert.equal(sent.ok, true)
    await runA('POST', `assets/${upload.id}/finalize`, {}, student)
    const read = (await runB('GET', `assets/${upload.id}`, {}, student)).value
    const response = await fetch(read.url); assert.equal(response.ok, true)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes)
    await runA('DELETE', 'teacher/test-data', { confirmation: 'delete-test-data', testRunId: created.id }, teacher)
    await assert.rejects(runB('GET', `students/${created.studentId}`, {}, teacher), (error: any) => error.status === 404)
    await assert.rejects(runB('GET', `assignments/${created.assignmentId}`, {}, teacher), (error: any) => error.status === 404)
    await assert.rejects(runB('GET', `assets/${upload.id}`, {}, teacher), (error: any) => error.status === 404)
    const remaining = await b.transaction(state => ({ attempts: state.attempts.some(attempt => attempt.studentId === created.studentId), assets: state.assets.some(asset => asset.studentId === created.studentId) }))
    assert.deepEqual(remaining, { attempts: false, assets: false })
    await assert.rejects(files.inspect(`${created.studentId}/${workId}/${upload.id}`))
  } finally {
    try {
      // Even a lost create response can be recovered by its unique operation ID.
      const own = created || await a.transaction(state => (state.settings.testDataRuns || []).find((run: any) => run.operationId === operationId))
      if (own) await runA('DELETE', 'teacher/test-data', { confirmation: 'delete-test-data', testRunId: own.id }, teacher)
    } finally { await Promise.all([a.close?.(), b.close?.()]) }
  }
})
