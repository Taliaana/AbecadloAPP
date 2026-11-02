import { test } from 'node:test'
import assert from 'node:assert/strict'
globalThis.localStorage = { data: {}, getItem(key) { return this.data[key] || null }, setItem(key, value) { this.data[key] = value } }
const storage = await import('../support/legacyStorage.js')
const { assignmentRobotWork, createRobotWork } = await import('../../src/modules/robot/integration.js')
const repository = await import('../../src/storage/studentStorage.js')
// Transport fixture for testing the existing frontend Robot/repository wiring.
// Real authorization and simulation are exercised in tests/backend/domain.test.ts.
async function useApiFixture() {
  globalThis.fetch = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : {}
    let value
    if (url === '/api/works') value = storage.createWork({ ...body, studentId: storage.getCurrentStudent().id })
    else if (/\/review$/.test(url)) value = storage.reviewWork(url.split('/')[3], body.decision)
    else if (url.startsWith('/api/works/')) value = storage.updateWork(url.split('/')[3], body)
    return { ok: true, json: async () => ({ value, snapshot: storage.getStateSnapshot() }) }
  }
  await repository.initializeStorage()
}

test('saving a robot draft preserves history and isolates students', () => {
  storage.initializeStorage(); storage.setCurrentStudent('zosia')
  storage.saveRobotProgram('draft-only', ['right'])
  assert.equal(storage.getRobotProgress()['draft-only'].runs, 0)
  storage.saveRobotAttempt('draft-only', { success: true, route: 'a', program: ['forward'] })
  storage.saveRobotProgram('draft-only', ['left'])
  assert.equal(storage.getRobotProgress()['draft-only'].runs, 1)
  assert.equal(storage.getRobotProgress()['draft-only'].completed, true)
  assert.deepEqual(storage.getRobotProgress()['draft-only'].program, ['left'])
  storage.setCurrentStudent('lena'); assert.deepEqual(storage.getRobotProgress(), {})
})

test('robot history persists independently and preserves original progress and typing', () => {
  storage.initializeStorage(); storage.setCurrentStudent('zosia'); storage.saveTypingResult('fj', { correct: 8, attempts: 8 })
  const before = storage.getStudentProgress()
  storage.saveRobotAttempt('two-steps', { success: false, route: 'a', program: ['forward'] })
  storage.saveRobotAttempt('two-steps', { success: true, route: 'a', program: ['forward', 'forward'] })
  storage.saveRobotAttempt('two-steps', { success: true, route: 'b', program: ['right'] })
  storage.initializeStorage()
  assert.equal(storage.getRobotProgress()['two-steps'].runs, 3)
  assert.equal(storage.getRobotProgress()['two-steps'].alternative, true)
  assert.equal(storage.getTypingResults().fj.correct, 8)
  assert.deepEqual(storage.getStudentProgress(), before)
  storage.setCurrentStudent('antek'); assert.deepEqual(storage.getRobotProgress(), {})
})
test('robot assignment uses existing works and never enters teacher review', async () => {
  storage.setCurrentStudent('zosia')
  const assignment = storage.createAssignment({ title: 'Trasa', instruction: 'Ułóż program.', tool: 'robot', wholeClass: false, studentIds: ['zosia'], robotTask: { challengeId: 'two-steps' } })
  await useApiFixture()
  const work = await assignmentRobotWork(assignment.id, 'zosia')
  assert.equal(work.completionType, 'automatic'); assert.equal(work.data.board.id, 'two-steps')
  assert.equal(await assignmentRobotWork(assignment.id, 'antek'), null)
  assert.equal((await assignmentRobotWork(assignment.id, 'zosia')).id, work.id)
  assert.equal(await repository.updateWork(work.id, { status: 'waiting-review' }), null)
  await repository.updateWork(work.id, { status: 'completed', data: { program: ['forward', 'forward'] } })
  assert.equal(storage.getPendingWorks().some(item => item.id === work.id), false)
})
test('creative robot work keeps JSON and existing review lifecycle', async () => {
  await useApiFixture()
  const work = await createRobotWork('zosia')
  await repository.updateWork(work.id, { data: { program: ['forward'] } })
  storage.initializeStorage(); assert.deepEqual(storage.getWork(work.id).data.program, ['forward'])
  storage.updateWork(work.id, { status: 'waiting-review' })
  assert.equal(storage.getPendingWorks().some(item => item.id === work.id), true)
  storage.reviewWork(work.id, 'returned'); assert.equal(storage.getWork(work.id).status, 'returned')
  storage.updateWork(work.id, { status: 'waiting-review' }); storage.reviewWork(work.id, 'completed')
  assert.equal(storage.getWork(work.id).status, 'completed')
})
