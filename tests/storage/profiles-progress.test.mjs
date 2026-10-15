import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = {
  data: {},
  getItem(key) { return this.data[key] ?? null },
  setItem(key, value) { this.data[key] = value },
}
const storage = await import('../../src/storage/studentStorage.js')
beforeEach(() => { localStorage.data = {} })

// Saved v3 shape from before profile deletion/Lekcje; no use of today's initializer.
function previousV3State() {
  const date = '2026-10-10T10:30:00.000Z'
  const progress = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i + 1, i === 0 ? 'completed' : i === 1 ? 'in-progress' : 'locked']))
  const students = Object.fromEntries(['zosia', 'antek', 'lena', 'student-existing-uuid'].map(id => [id, {
    id, className: '2A', createdAt: date, archivedAt: null,
    profile: { id, name: id, greetingName: id, className: '2A', avatar: 'leaf', color: 'green', avatarConfig: { face: 'round', hair: 'short', hairColor: 'brown', shirtColor: 'green', backgroundColor: 'mint' } },
    progress: { ...progress },
    toolProgress: { unlockedTools: ['mouse-practice', 'typewriting'], typingResults: { fj: { correct: 8, attempts: 8, updatedAt: date } }, robot: { 'two-steps': { completed: true, runs: 3, routes: ['route'], program: ['forward', 'forward'] } } },
    works: [{ schemaVersion: 2, id: `${id}-work`, studentId: id, title: 'Moje skały', type: 'Tablica badawcza', lessonId: null, assignmentId: 'assignment-existing', completionType: 'teacher-review', status: 'waiting-review', createdAt: date, updatedAt: date, data: { kind: 'research-board', thumbnail: 'shapes', entries: { granit: { imageId: `${id}-blob`, source: 'https://example.org/skaly' } }, answers: ['Granit'] } }],
  }]))
  return { schemaVersion: 3, version: 3, currentRole: 'student', currentStudentId: 'zosia', teacher: { id: 'teacher-demo', name: 'Nauczyciel' }, students,
    assignments: [{ id: 'assignment-existing', title: 'Skały', instruction: 'Zbierz zdjęcia.', tool: 'research-board', completionType: 'teacher-review', studentIds: ['zosia', 'antek'], wholeClass: false, addToCourse: false, status: 'active', createdAt: date }],
  }
}

test('previous v3 profiles, progress, toolProgress, images references and assignments survive repeated startup', () => {
  const saved = previousV3State()
  localStorage.setItem('abecadlo-state-v3', JSON.stringify(saved))
  storage.initializeStorage(); storage.initializeStorage()
  assert.deepEqual(storage.getStateSnapshot(), saved)
  assert.equal(storage.STORAGE_KEYS.current, 'abecadlo-state-v3')
  assert.equal(storage.SCHEMA_VERSION, 3)
})

test('IDs are unique for identical names and stable across edits and startup', () => {
  storage.initializeStorage()
  const first = storage.createStudentProfile({ name: 'Maria', className: '2A' })
  const second = storage.createStudentProfile({ name: 'Maria', className: '2A' })
  assert.notEqual(first.id, second.id)
  storage.updateStudentProfile(first.id, { name: 'Marysia', className: '2B' })
  storage.initializeStorage()
  assert.equal(storage.getStudentById(first.id).profile.id, first.id)
  assert.equal(storage.getStudentById(second.id).profile.name, 'Maria')
  assert.equal(storage.getStudentById(first.id).progress[1], 'available')
})

test('deletion removes all owned data and assignment links without resurrecting seed profiles', async () => {
  localStorage.setItem(storage.STORAGE_KEYS.current, JSON.stringify(previousV3State()))
  localStorage.setItem(storage.STORAGE_KEYS.legacy, JSON.stringify({ version: 1, currentStudentId: 'zosia', students: { zosia: { works: [{ id: 'old-zosia-work' }] }, antek: { works: [] } } }))
  const otherStudent = storage.getStudentById('antek')
  assert.equal(await storage.deleteStudentProfile('zosia'), true)
  storage.initializeStorage(); storage.initializeStorage()
  assert.equal(storage.getStudentById('zosia'), null)
  assert.equal(storage.getCurrentStudent(), null)
  assert.equal(storage.getStateSnapshot().currentStudentId, null)
  assert.equal(storage.getWork('zosia-work'), null)
  assert.deepEqual(storage.getAssignment('assignment-existing').studentIds, ['antek'])
  assert.deepEqual(storage.getStudentById('antek'), otherStudent)
  const legacy = JSON.parse(localStorage.getItem(storage.STORAGE_KEYS.legacy))
  assert.equal(legacy.students.zosia, undefined)
  assert.equal(legacy.currentStudentId, null)
  assert.deepEqual(legacy.students.antek, { works: [] })
  assert.equal(await storage.deleteStudentProfile('zosia'), false)
  for (const student of storage.getAllStudents({ includeArchived: true })) await storage.deleteStudentProfile(student.id)
  storage.initializeStorage()
  assert.deepEqual(storage.getStateSnapshot().students, {})
})

test('repeating every implemented lesson preserves completion, unlocked lessons and existing results', () => {
  localStorage.setItem(storage.STORAGE_KEYS.current, JSON.stringify(previousV3State()))
  for (const id of [2, 3, 4]) { storage.startLesson(id); storage.completeLesson(id) }
  const before = storage.getStateSnapshot()
  for (const id of [1, 2, 3, 4]) {
    assert.equal(storage.startLesson(id), true)
    assert.equal(storage.getStudentProgress()[id], 'completed')
    storage.initializeStorage()
    assert.deepEqual(storage.getStateSnapshot(), before)
    assert.equal(storage.completeLesson(id), true)
    assert.deepEqual(storage.getStateSnapshot(), before)
  }
})

test('invalid progress and malformed collections are normalized; unknown lessons cannot be started or completed', () => {
  const saved = previousV3State()
  saved.students.zosia.progress[2] = 'anything'
  saved.students.zosia.works = {}
  saved.students.zosia.toolProgress.unlockedTools = 'typewriting'
  saved.assignments[0].studentIds = 'zosia'
  localStorage.setItem(storage.STORAGE_KEYS.current, JSON.stringify(saved))
  storage.initializeStorage()
  assert.equal(storage.getStudentProgress()[2], 'locked')
  assert.deepEqual(storage.getStudentWorks(), [])
  assert.deepEqual(storage.getUnlockedTools(), [])
  assert.deepEqual(storage.getAssignments()[0].studentIds, [])
  for (const id of [2, 5, 999]) {
    assert.equal(storage.startLesson(id), false)
    assert.equal(storage.completeLesson(id), false)
  }
})
