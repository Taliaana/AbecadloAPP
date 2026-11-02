import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryRepository, MemoryFiles } from '../support/memoryRepository.js'
import { storeTestFixture } from '../support/seed.js'
import { createService } from '../../server/services.js'
import { robotStages } from '../../src/data/robotLearning.js'
import { createRobotBoard } from '../../src/data/robotChallenges.js'
import { ApiError, type Role } from '../../server/model.js'

let repo: MemoryRepository, run: ReturnType<typeof createService>
const teacher: Role = { role: 'teacher', tokenId: 'teacher-access' }
const student: Role = { role: 'student', studentId: 'zosia', tokenId: 'student-access' }
const denied = (status: number) => (error: any) => error instanceof ApiError && error.status === status
beforeEach(() => { repo = new MemoryRepository(); const seed = storeTestFixture(); repo.state.students = seed.students; repo.state.assignments = seed.assignments; run = createService(repo, new MemoryFiles()) })
const project = () => ({ title: 'Moja plansza', type: 'Robot', completionType: 'teacher-review', data: { kind: 'robot-project', board: createRobotBoard(), program: [] } })

test('server rejects a locked route and early project; completion opens the next stage', async () => {
  await assert.rejects(run('POST', 'tools', { kind: 'robot-program', challengeId: 'first-turn', program: ['forward'] }, student), denied(409))
  await assert.rejects(run('POST', 'works', project(), student), denied(409))
  await run('POST', 'tools', { kind: 'robot-attempt', challengeId: 'two-steps', program: ['forward'] }, student)
  await assert.rejects(run('POST', 'tools', { kind: 'robot-program', challengeId: 'first-turn', program: ['forward'] }, student), denied(409))
  await run('POST', 'tools', { kind: 'robot-attempt', challengeId: 'two-steps', program: ['forward', 'forward'] }, student)
  await run('POST', 'tools', { kind: 'robot-program', challengeId: 'first-turn', program: ['forward'] }, student)
  const secondDevice = createService(repo, new MemoryFiles())
  assert.equal((await secondDevice('GET', 'session', {}, { ...student, tokenId: 'other-device' })).snapshot!.students.zosia.toolProgress.robot['two-steps'].completed, true)
  assert.equal(repo.state.students.zosia.progress[1], 'available')
})

test('only teacher grants exact exceptions; pupils cannot forge access in tool writes', async () => {
  await assert.rejects(run('POST', 'students/zosia/robot-access', { customBoard: true }, student), denied(403))
  await assert.rejects(run('POST', 'students/zosia/robot-access', { stageId: 'unknown' }, teacher), denied(400))
  await assert.rejects(run('POST', 'tools', { kind: 'robot-program', challengeId: 'first-turn', program: [], robotAccess: { customBoard: true } }, student))
  await run('POST', 'students/zosia/robot-access', { challengeId: 'wrong-turn', customBoard: true }, teacher)
  await run('POST', 'tools', { kind: 'robot-program', challengeId: 'wrong-turn', program: ['forward'] }, student)
  await assert.rejects(run('POST', 'tools', { kind: 'robot-program', challengeId: 'extra-step', program: ['forward'] }, student), denied(409))
  const work = (await run('POST', 'works', project(), student)).value
  await run('POST', 'students/zosia/robot-access', { customBoard: false, stageId: 'prediction' }, teacher)
  await run('PATCH', `works/${work.id}`, { title: 'Zachowana plansza' }, student)
  await assert.rejects(run('POST', 'works', project(), student), denied(409))
  await run('POST', 'tools', { kind: 'robot-program', challengeId: 'predict-edge', program: ['forward'] }, student)
  assert.equal(repo.state.students.zosia.toolProgress.robot['two-steps'], undefined)
  assert.equal(repo.state.students.antek.toolProgress.robotAccess, undefined)
})

test('six completed stages allow custom work, and historical programs keep their IDs and fields', async () => {
  repo.state.students.zosia.toolProgress.robot = Object.fromEntries(robotStages.flatMap(stage => stage.challenges).map(id => [id, { completed: true, runs: 3, routes: ['old'], program: ['forward'] }]))
  const work = (await run('POST', 'works', project(), student)).value
  assert.equal(work.data.kind, 'robot-project')
  await run('POST', 'tools', { kind: 'robot-program', challengeId: 'original', program: ['right'] }, student)
  assert.equal(repo.state.students.zosia.toolProgress.robot.original.completed, true)
  assert.equal(repo.state.students.zosia.toolProgress.robot.original.runs, 3)
  assert.deepEqual(repo.state.students.zosia.toolProgress.robot.original.routes, ['old'])
})

test('a teacher-assigned route works independently without unlocking or completing the main path', async () => {
  const assignment = (await run('POST', 'assignments', { title: 'Trasa nauczyciela', instruction: 'Obserwuj robota.', tool: 'robot', wholeClass: false, studentIds: ['zosia'], robotTask: { challengeId: 'first-turn' } }, teacher)).value
  const work = (await run('POST', 'works', { title: assignment.title, type: 'Robot', assignmentId: assignment.id, completionType: 'automatic', data: {} }, student)).value
  await run('POST', 'tools', { kind: 'robot-attempt', challengeId: 'first-turn', workId: work.id, program: ['forward', 'right', 'forward'] }, student)
  assert.equal(repo.state.students.zosia.toolProgress.robot[`assignment-${work.id}`].completed, true)
  assert.equal(repo.state.students.zosia.toolProgress.robot['first-turn'], undefined)
  assert.equal(repo.state.students.zosia.toolProgress.robot['two-steps'], undefined)
})

test('changing the kind of a generic work cannot bypass robot access or forge a teacher assignment', async () => {
  const data = { kind: 'robot-assignment', board: createRobotBoard(), program: [] }
  await assert.rejects(run('POST', 'works', { title: 'Podszyte zadanie', type: 'Robot', data }, student), denied(403))
  const work = (await run('POST', 'works', { title: 'Szkic', type: 'Szkic', data: {} }, student)).value
  await assert.rejects(run('PATCH', `works/${work.id}`, { data }, student), denied(403))
  await assert.rejects(run('PATCH', `works/${work.id}`, { data: { ...data, kind: 'robot-project' } }, student), denied(409))
  assert.equal(repo.state.students.zosia.works.find((item: any) => item.id === work.id).data.kind, undefined)
})
