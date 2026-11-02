import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ApiError, type Files, type Graph } from './model.js'

type TestRun = { id: string; operationId: string; studentId: string; assignmentId: string; createdAt: string; deletedAt?: string }
const createInput = z.object({ operationId: z.uuid() }).strict()
const deleteInput = z.object({ confirmation: z.literal('delete-test-data'), testRunId: z.uuid().optional() }).strict()

function runs(state: Graph): TestRun[] { return state.settings.testDataRuns || [] }
export function testDataSummary(state: Graph) {
  const active = runs(state).filter(run => !run.deletedAt)
  return { runs: active.map(({ id, studentId, createdAt }) => ({ id, studentId, createdAt })), students: active.filter(run => state.students[run.studentId]).length }
}

export function createTestData(state: Graph, body: unknown, progress: Record<string, string>) {
  const { operationId } = createInput.parse(body)
  const existing = runs(state).find(run => run.operationId === operationId)
  if (existing) return existing
  const id = randomUUID(), studentId = randomUUID(), assignmentId = randomUUID(), workId = randomUUID()
  const createdAt = new Date().toISOString(), tag = { isTestData: true, testRunId: id }
  const avatarConfig = { face: 'round', hair: 'bob', hairColor: 'brown', shirtColor: 'coral', backgroundColor: 'rose' }
  state.students[studentId] = {
    ...tag, id: studentId, className: 'TEST', createdAt, archivedAt: null,
    profile: { id: studentId, name: 'Uczeń testowy', greetingName: 'Uczniu testowy', className: 'TEST', avatar: 'leaf', color: 'coral', avatarConfig },
    progress: { ...progress, 1: 'completed', 2: 'available' },
    toolProgress: { unlockedTools: ['mouse-practice'], typingResults: { fj: { correct: 8, attempts: 8, wpm: 12, updatedAt: createdAt } } },
    works: [{ ...tag, schemaVersion: 2, id: workId, studentId, assignmentId, lessonId: null, title: 'Praca testowa', type: 'Szkic pomysłu', completionType: 'teacher-review', status: 'draft', createdAt, updatedAt: createdAt, data: { thumbnail: 'assignment', note: 'To są dane testowe bazy PinkTower.', selectedStages: [] } }],
  }
  state.assignments.push({ ...tag, id: assignmentId, title: 'Zadanie testowe', instruction: 'Sprawdź zapis swojej pracy.', tool: 'studio', completionType: 'teacher-review', studentIds: [studentId], wholeClass: false, addToCourse: false, status: 'active', createdAt })
  state.attempts.push({ ...tag, id: randomUUID(), studentId, lessonId: 1, startedAt: createdAt, finishedAt: createdAt, repeat: false })
  const run: TestRun = { id, operationId, studentId, assignmentId, createdAt }
  state.settings.testDataRuns = [...runs(state), run]
  return run
}

export async function deleteTestData(state: Graph, body: unknown, files: Files) {
  const input = deleteInput.parse(body)
  const selected = runs(state).filter(run => !run.deletedAt && (!input.testRunId || run.id === input.testRunId))
  const studentIds = new Set(selected.map(run => run.studentId)), assignmentIds = new Set(selected.map(run => run.assignmentId))
  // Only server-registered IDs qualify. Imported flags or a matching name never do.
  for (const run of selected) {
    const student = state.students[run.studentId], assignment = state.assignments.find(item => item.id === run.assignmentId)
    if ((student && (student.isTestData !== true || student.testRunId !== run.id)) || (assignment && (assignment.isTestData !== true || assignment.testRunId !== run.id))) throw new ApiError(409, 'Oznaczenie danych zmieniło się. Niczego nie usunięto.')
  }
  if (Object.values(state.students).some(student => !studentIds.has(student.id) && student.works.some((work: any) => assignmentIds.has(work.assignmentId))) || state.assignments.some(assignment => assignmentIds.has(assignment.id) && (assignment.wholeClass || assignment.studentIds.some((id: string) => !studentIds.has(id))))) throw new ApiError(409, 'Zestaw jest powiązany ze zwykłymi danymi. Niczego nie usunięto.')
  const paths = state.assets.filter(asset => studentIds.has(asset.studentId)).map(asset => asset.storagePath)
  // Keep all DB metadata on failure so a teacher can retry cleanup.
  if (paths.length) {
    await files.remove(paths)
    state.settings.assetCleanup ||= []
    state.settings.assetCleanup.push({ paths, until: Date.now() + 3 * 3600_000 })
  }
  for (const studentId of studentIds) delete state.students[studentId]
  state.assets = state.assets.filter(asset => !studentIds.has(asset.studentId))
  state.attempts = state.attempts.filter(attempt => !studentIds.has(attempt.studentId))
  state.assignments = state.assignments.filter(assignment => !assignmentIds.has(assignment.id))
  state.assignments.forEach(assignment => { assignment.studentIds = assignment.studentIds.filter((id: string) => !studentIds.has(id)) })
  state.imports.forEach(job => { job.assets = (job.assets || []).filter((asset: any) => !studentIds.has(asset.studentId)) })
  selected.forEach(run => { run.deletedAt = new Date().toISOString() })
  return { deletedStudents: studentIds.size, deletedRuns: selected.length }
}
