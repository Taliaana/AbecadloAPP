import { implementedLessons } from '../data/lessons.js'
import { normalizeSpeechSettings } from '../data/speechSettings.js'
// A read-only projection of server data, never persisted in the browser.
let cache = { currentRole: null, currentStudentId: null, students: {}, assignments: [], teacher: {} }
let queue = Promise.resolve(), lastError = null
const unsaved = []
export const SCHEMA_VERSION = 3
export const STORAGE_KEYS = { current: 'abecadlo-state-v3', previous: 'abecadlo-state-v2', legacy: 'abecadlo-state-v1' }
function announce(message, failed = false) { globalThis.window?.dispatchEvent(new CustomEvent('pinktower:data-status', { detail: { message, failed } })) }
export async function request(path, body, method = 'POST') {
  let response, result
  try {
    const serialized = JSON.stringify(body || {})
    response = await fetch(`/api/${path}`, { method, credentials: 'same-origin', keepalive: method !== 'GET' && new TextEncoder().encode(serialized).length < 60000, headers: { 'Content-Type': 'application/json' }, ...(method !== 'GET' ? { body: serialized } : {}) })
    result = await response.json()
  } catch { throw new Error('Nie udało się połączyć. Spróbuj ponownie.') }
  if (!response.ok) { const error = new Error(result.error || 'Nie udało się połączyć. Spróbuj ponownie.'); error.status = response.status; throw error }
  if (result.snapshot && Number(result.snapshot.revision || 0) >= Number(cache.revision || 0)) cache = result.snapshot
  return result.value
}
function mutation(path, body, method = 'POST') {
  announce('Zapisywanie…')
  const operation = { path, body: structuredClone(body), method }
  unsaved.push(operation)
  const pending = queue.then(async () => {
    if (lastError) throw lastError
    const value = await request(operation.path, operation.body, operation.method)
    unsaved.splice(unsaved.indexOf(operation), 1)
    return value
  })
  queue = pending.catch(error => { lastError = error; announce(error.message, true) })
  pending.then(() => announce('Zapisano'), () => {})
  return pending
}
export async function flushData() { await queue; if (lastError) throw lastError }
export function clearDataError() { lastError = null }
export async function retryPending() {
  await queue; lastError = null
  try { while (unsaved.length) { const operation = unsaved[0]; await request(operation.path, operation.body, operation.method); unsaved.shift() } announce('Zapisano') }
  catch (error) { lastError = error; throw error }
}
export const hasUnsavedChanges = () => unsaved.length > 0
export const mustWaitForSave = () => Boolean(lastError) || unsaved.some(item => new TextEncoder().encode(JSON.stringify(item.body)).length >= 60000)
export async function revalidate() {
  await flushData()
  try { await request('session', null, 'GET') }
  catch (error) { if (![401,404].includes(error.status)) throw error; await request('auth/logout') }
  return cache
}
export const initializeStorage = revalidate
export const getStateSnapshot = () => structuredClone(cache)
export const getCurrentRole = () => cache.currentRole
export const getSpeechSettings = () => normalizeSpeechSettings(cache.teacher?.speechSettings)
export const saveSpeechSettings = settings => mutation('settings/speech', settings, 'PUT')
export async function enterTeacher(pin) { try { await mutation('auth/login', { pin }); return true } catch (error) { if ([401,429].includes(error.status)) { const index = unsaved.findIndex(item => item.path === 'auth/login'); if (index >= 0) unsaved.splice(index, 1); clearDataError(); return false } throw error } }
export const leaveRole = () => mutation('auth/logout')
export const clearCurrentStudent = leaveRole
export const setCurrentStudent = studentId => mutation('session/student', { studentId })
export const getAllStudents = ({ includeArchived = false } = {}) => Object.values(cache.students).filter(student => includeArchived || !student.archivedAt)
export const getProfiles = () => getAllStudents().map(student => student.profile)
export const getStudentById = studentId => cache.students[studentId] || null
export const getCurrentStudent = () => cache.students[cache.currentStudentId] || null
export const createStudentProfile = input => mutation('students', { ...input, operationId: crypto.randomUUID() })
export const updateStudentProfile = (studentId, changes) => mutation(`students/${studentId}`, { name: changes.name, className: changes.className }, 'PATCH')
export const archiveStudent = studentId => mutation(`students/${studentId}/archive`)
export const deleteStudentProfile = studentId => mutation(`students/${studentId}`, { confirmation: 'delete-student' }, 'DELETE')
export const updateCurrentAvatar = config => mutation('avatar', config, 'PUT')
export const getStudentProgress = (studentId = cache.currentStudentId) => cache.students[studentId]?.progress || {}
export const getCurrentLesson = studentId => { const progress = getStudentProgress(studentId); return implementedLessons.find(lesson => ['available','in-progress'].includes(progress[lesson.id])) || [...implementedLessons].reverse().find(lesson => progress[lesson.id] === 'completed') || implementedLessons[0] }
export const startLesson = lessonId => mutation('progress', { lessonId, action: getStudentProgress()[lessonId] === 'completed' ? 'repeat' : 'start' })
export const completeLesson = lessonId => mutation('progress', { lessonId, action: getStudentProgress()[lessonId] === 'completed' ? 'finish-repeat' : 'complete' })
export const unlockLessonForStudent = (studentId, lessonId) => mutation(`students/${studentId}/unlock`, { lessonId })
export const unlockNextLessonForStudent = studentId => { const progress = getStudentProgress(studentId); return unlockLessonForStudent(studentId, Math.max(...Object.entries(progress).filter(([, status]) => status !== 'locked').map(([id]) => Number(id)), 0) + 1) }
export const getUnlockedTools = (studentId = cache.currentStudentId) => cache.students[studentId]?.toolProgress?.unlockedTools || []
export const getTypingResults = (studentId = cache.currentStudentId) => cache.students[studentId]?.toolProgress?.typingResults || {}
export const getStudentWorks = (studentId = cache.currentStudentId) => cache.students[studentId]?.works || []
export const getAllWorks = () => getAllStudents({ includeArchived: true }).flatMap(student => student.works)
export const getWork = workId => getAllWorks().find(work => work.id === workId) || null
export const getResumableWork = (studentId = cache.currentStudentId) => getStudentWorks(studentId).filter(work => ['draft','returned'].includes(work.status)).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
export const getPendingWorks = () => getAllWorks().filter(work => work.status === 'waiting-review' && work.completionType === 'teacher-review')
export function createWork(input) { const { studentId, ...body } = input; return mutation('works', { ...body, operationId: crypto.randomUUID() }) }
export const updateWork = (workId, changes) => mutation(`works/${workId}`, changes, 'PATCH')
export const reviewWork = (workId, decision) => mutation(`works/${workId}/review`, { decision })
export const getAssignments = () => cache.assignments
export const getAssignment = assignmentId => cache.assignments.find(item => item.id === assignmentId) || null
export const getAssignmentsForStudent = (studentId = cache.currentStudentId) => cache.assignments.filter(item => item.status === 'active' && (item.wholeClass ? !item.className || item.className === getStudentById(studentId)?.className : item.studentIds.includes(studentId)))
export const createAssignment = input => mutation('assignments', { ...input, operationId: crypto.randomUUID() })
export const getDatabaseTestStatus = () => request('teacher/test-data', null, 'GET')
export const createDatabaseTestData = () => mutation('teacher/test-data', { operationId: crypto.randomUUID() })
export const deleteDatabaseTestData = () => mutation('teacher/test-data', { confirmation: 'delete-test-data' }, 'DELETE')
export async function getOrCreateAssignmentWork(assignmentId) {
  const existing = getStudentWorks().find(work => work.assignmentId === assignmentId)
  if (existing) return existing
  const assignment = getAssignment(assignmentId)
  return assignment ? createWork({ title: assignment.title, type: 'Szkic pomysłu', assignmentId, completionType: assignment.completionType, data: { thumbnail: 'assignment', note: '', selectedStages: [] } }) : null
}
export const saveTypingResult = (exerciseId, result) => mutation('tools', { kind: 'typing', exerciseId, result })
export const getRobotProgress = (studentId = cache.currentStudentId) => cache.students[studentId]?.toolProgress?.robot || {}
export const getRobotAccess = (studentId = cache.currentStudentId) => cache.students[studentId]?.toolProgress?.robotAccess || {}
export const grantRobotAccess = (studentId, access) => mutation(`students/${studentId}/robot-access`, access)
export const saveRobotProgram = (challengeId, program) => mutation('tools', { kind: 'robot-program', challengeId, program })
export const saveRobotAttempt = (challengeId, { program, workId }) => mutation('tools', { kind: 'robot-attempt', challengeId, program, ...(workId ? { workId } : {}) })
