import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createService } from '../../server/services.js'
import { MemoryRepository, MemoryFiles } from '../support/memoryRepository.js'
import { storeTestFixture } from '../support/seed.js'
import type { Role } from '../../server/model.js'

const teacher: Role = { role: 'teacher', tokenId: 'database-panel' }
function setup() {
  const repo = new MemoryRepository(), files = new MemoryFiles(), run = createService(repo, files)
  return { repo, files, run }
}
const create = (run: ReturnType<typeof createService>) => run('POST', 'teacher/test-data', { operationId: randomUUID() }, teacher)
const remove = (run: ReturnType<typeof createService>, testRunId?: string) => run('DELETE', 'teacher/test-data', { confirmation: 'delete-test-data', ...(testRunId ? { testRunId } : {}) }, teacher)

test('test set persists through the repository and normal API reads; retry cannot duplicate it', async () => {
  const { repo, files, run } = setup(), operationId = randomUUID()
  const first = (await run('POST', 'teacher/test-data', { operationId }, teacher)).value
  assert.equal((await run('POST', 'teacher/test-data', { operationId }, teacher)).value.id, first.id)
  const secondDevice = createService(repo, files)
  const pupil = (await secondDevice('GET', `students/${first.studentId}`, {}, teacher)).value
  assert.equal(pupil.isTestData, true); assert.equal(pupil.testRunId, first.id)
  assert.equal(pupil.progress[1], 'completed'); assert.ok(pupil.profile.avatarConfig)
  assert.equal(pupil.toolProgress.typingResults.fj.correct, 8)
  assert.equal(pupil.works.length, 1)
  assert.equal((await secondDevice('GET', 'assignments', {}, teacher)).value.length, 1)
  assert.equal((await secondDevice('GET', 'teacher/test-data', {}, teacher)).value.students, 1)
})

test('cleanup removes test dependencies and assets but preserves ordinary and imported data even with forged flags', async () => {
  const { repo, files, run } = setup()
  const legacy: any = storeTestFixture()
  legacy.students.zosia.isTestData = true; legacy.students.zosia.testRunId = randomUUID()
  await run('POST', 'migration/import', { source: legacy, assets: [] }, teacher)
  const normal = structuredClone(repo.state.students), assignments = structuredClone(repo.state.assignments), imports = structuredClone(repo.state.imports)
  const created = (await create(run)).value
  const student: Role = { role: 'student', tokenId: 'test-student', studentId: created.studentId }
  const work = repo.state.students[created.studentId].works[0]
  const grant = (await run('POST', 'assets', { workId: work.id, mimeType: 'image/png', size: 24, hash: 'a'.repeat(64) }, student)).value
  const asset = repo.state.assets.find(asset => asset.id === grant.id)
  files.objects.set(asset.storagePath, { size: 24, mimeType: 'image/png', hash: asset.hash })
  assert.equal(asset.testRunId, created.id)
  await remove(run)
  assert.deepEqual(repo.state.students, normal); assert.deepEqual(repo.state.assignments, assignments); assert.deepEqual(repo.state.imports, imports)
  assert.equal(repo.state.assets.length, 0); assert.equal(repo.state.attempts.length, 0)
  assert.equal(files.objects.has(asset.storagePath), false)
  assert.equal((await run('GET', 'teacher/test-data', {}, teacher)).value.students, 0)
  assert.equal((await remove(run)).value.deletedRuns, 0)
})

test('teacher role and explicit confirmation are required; callers cannot supply deletion IDs', async () => {
  const { run } = setup(), student: Role = { role: 'student', studentId: 'someone', tokenId: 'pupil' }
  for (const session of [null, student]) for (const method of ['GET', 'POST', 'DELETE']) await assert.rejects(run(method, 'teacher/test-data', {}, session), (error: any) => error.status === (session ? 403 : 401))
  await assert.rejects(run('DELETE', 'teacher/test-data', {}, teacher))
  await assert.rejects(run('DELETE', 'teacher/test-data', { confirmation: 'delete-test-data', studentId: 'zosia' }, teacher))
  await assert.rejects(run('POST', 'students', { name: 'Fake', className: 'TEST', isTestData: true }, teacher))
})

test('remote cleanup failure preserves records for retry; scoped cleanup leaves other test sets intact', async () => {
  const { repo, files, run } = setup()
  const a = (await create(run)).value, b = (await create(run)).value
  repo.state.assets.push({ id: randomUUID(), studentId: a.studentId, workId: repo.state.students[a.studentId].works[0].id, storagePath: 'test/path' })
  const original = files.remove.bind(files)
  files.remove = async () => { throw new Error('offline') }
  await assert.rejects(remove(run, a.id))
  assert.ok(repo.state.students[a.studentId]); assert.ok(repo.state.students[b.studentId])
  files.remove = original
  await remove(run, a.id)
  assert.equal(repo.state.students[a.studentId], undefined); assert.ok(repo.state.students[b.studentId])
  const secondDevice = createService(repo, files)
  assert.equal((await secondDevice('GET', 'teacher/test-data', {}, teacher)).value.students, 1)
})

test('changed technical markers or references from ordinary work block cleanup before file removal', async () => {
  const { repo, files, run } = setup(), created = (await create(run)).value
  const normal = storeTestFixture(); Object.assign(repo.state.students, normal.students)
  repo.state.students.zosia.works[0].assignmentId = created.assignmentId
  await assert.rejects(remove(run), (error: any) => error.status === 409)
  assert.ok(repo.state.students[created.studentId]); assert.equal(files.deleted.length, 0)
  repo.state.students.zosia.works[0].assignmentId = null
  repo.state.students[created.studentId].isTestData = false
  await assert.rejects(remove(run), (error: any) => error.status === 409)
  assert.ok(repo.state.students.zosia)
})
