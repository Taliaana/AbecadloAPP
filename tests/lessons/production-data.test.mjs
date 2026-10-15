import test from 'node:test'
import assert from 'node:assert/strict'
globalThis.localStorage = { data: {}, getItem(key) { return this.data[key] ?? null }, setItem(key, value) { this.data[key] = value } }
const storage = await import('../../src/storage/studentStorage.js')
test('current production state survives new lesson and repeated initialization unchanged', () => {
  storage.initializeStorage()
  storage.setCurrentStudent('zosia'); storage.completeLesson(1); storage.completeLesson(2)
  storage.saveTypingResult('fj', { correct: 8, attempts: 8 })
  storage.saveRobotAttempt('two-steps', { success: true, route: 'route', program: ['forward', 'forward'] })
  const pupil = storage.createStudentProfile({ name: 'Maria', className: '2B' })
  const assignment = storage.createAssignment({ title: 'Badam skały', instruction: 'Zbierz zdjęcia.', tool: 'research-board', wholeClass: false, studentIds: [pupil.id] })
  const work = storage.createWork({ studentId: pupil.id, title: 'Skały', assignmentId: assignment.id, type: 'Tablica badawcza', data: { kind: 'research-board', entries: { granit: { imageId: 'blob-reference', source: 'https://example.org' } }, answers: ['Ziarna'] } })
  storage.updateWork(work.id, { status: 'waiting-review' })
  const before = storage.getStateSnapshot()
  storage.initializeStorage(); storage.initializeStorage()
  assert.deepEqual(storage.getStateSnapshot(), before)
  assert.equal(storage.SCHEMA_VERSION, 3)
  assert.equal(storage.getStudentById('zosia').progress[1], 'completed')
  storage.startLesson(1) // Reopening the new lesson is a review, never a reset.
  assert.deepEqual(storage.getStateSnapshot(), before)
  assert.equal(storage.getStudentById(pupil.id).progress[1], 'available')
  assert.equal(storage.getWork(work.id).status, 'waiting-review')
})
