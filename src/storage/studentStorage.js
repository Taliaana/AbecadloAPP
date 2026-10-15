import { initialAssignments } from '../data/assignments.js'
import { isCompletionType } from '../data/completionTypes.js'
import { implementedLessons, lessons } from '../data/lessons.js'
import { profiles, sampleWorks } from '../data/profiles.js'
import { tools } from '../data/tools.js'
import { isWorkStatus } from '../data/workModel.js'
import { normalizeSpeechSettings } from '../data/speechSettings.js'
import { deleteStudentImages } from './imageStorage.js'

export const SCHEMA_VERSION = 3
export const STORAGE_KEYS = { current: 'abecadlo-state-v3', previous: 'abecadlo-state-v2', legacy: 'abecadlo-state-v1' }
const TEACHER_PIN = '1234'
const DEFAULT_AVATAR = { face: 'round', hair: 'short', hairColor: 'brown', shirtColor: 'green', backgroundColor: 'mint' }
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const lessonStatuses = new Set(['locked', 'available', 'in-progress', 'completed', 'review'])

function createProgress() {
  return Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.id === 1 ? 'available' : 'locked']))
}

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

function completionTypeForWork(work) {
  if (isCompletionType(work.completionType)) return work.completionType
  if (work.lessonId != null) return lessons.find((lesson) => lesson.id === Number(work.lessonId))?.completionType || 'teacher-review'
  if (work.assignmentId || ['Rysunek', 'Studio', 'Szkic pomysłu'].includes(work.type)) return 'teacher-review'
  return 'self-check'
}

function normalizeWork(work, studentId) {
  return {
    schemaVersion: 2,
    id: work.id || createId('work'),
    studentId,
    title: work.title || 'Bez tytułu',
    type: work.type || 'Praca',
    lessonId: work.lessonId ?? null,
    assignmentId: work.assignmentId ?? null,
    completionType: completionTypeForWork(work),
    status: isWorkStatus(work.status) ? work.status : 'completed',
    createdAt: work.createdAt || new Date().toISOString(),
    updatedAt: work.updatedAt || work.createdAt || new Date().toISOString(),
    data: { ...work.data, thumbnail: work.data?.thumbnail || work.thumbnail || 'shapes' },
  }
}

function createWorkflowMock(studentId, index) {
  const statuses = ['draft', 'waiting-review', 'returned']
  return normalizeWork({
    id: `${studentId}-butterfly-draft`, title: 'Cykl życia motyla', type: 'Szkic pomysłu',
    assignmentId: 'assignment-butterfly', completionType: 'teacher-review', status: statuses[index] || 'draft',
    createdAt: '2026-10-10T10:30:00.000Z', updatedAt: '2026-10-10T10:30:00.000Z',
    data: { thumbnail: 'assignment', note: index === 1 ? 'Jajo, gąsienica, poczwarka i motyl.' : '', selectedStages: index === 1 ? ['jajo', 'gąsienica', 'poczwarka', 'motyl'] : [] },
  }, studentId)
}

function normalizeProfile(profile, id) {
  return {
    id, name: String(profile?.name || 'Uczeń').trim(), greetingName: String(profile?.greetingName || profile?.name || 'Uczniu').trim(),
    className: String(profile?.className || '').trim(), avatar: profile?.avatar || 'leaf', color: profile?.color || 'green',
    avatarConfig: { ...DEFAULT_AVATAR, ...profile?.avatarConfig },
  }
}

function createStudent(profile, index = -1, withSamples = false) {
  const id = profile.id
  return {
    id, className: profile.className || '', createdAt: profile.createdAt || new Date().toISOString(), archivedAt: profile.archivedAt || null,
    profile: normalizeProfile(profile, id), progress: createProgress(), toolProgress: { unlockedTools: [], typingResults: {} },
    works: withSamples ? [...sampleWorks.map((work) => normalizeWork({ ...work, id: `${id}-${work.id}` }, id)), createWorkflowMock(id, index)] : [],
  }
}

function normalizeStudent(source, id, fallbackProfile = {}) {
  const profile = normalizeProfile({ ...fallbackProfile, ...source?.profile, className: source?.className ?? source?.profile?.className ?? fallbackProfile.className }, id)
  return {
    id, className: profile.className, createdAt: source?.createdAt || fallbackProfile.createdAt || new Date().toISOString(), archivedAt: source?.archivedAt || null,
    profile, progress: { ...createProgress(), ...Object.fromEntries(Object.entries(isRecord(source?.progress) ? source.progress : {}).filter(([, status]) => lessonStatuses.has(status))) },
    toolProgress: {
      ...source?.toolProgress,
      unlockedTools: [...new Set([source?.toolProgress?.unlockedTools, source?.unlockedTools].find(Array.isArray) || [])].filter(id => typeof id === 'string'),
      typingResults: { ...([source?.toolProgress?.typingResults, source?.typingResults].find(isRecord) || {}) },
    },
    works: (Array.isArray(source?.works) ? source.works : []).filter(isRecord).map((work) => normalizeWork(work, id)),
  }
}

function normalizeAssignment(assignment) {
  const tool = tools.find((item) => item.id === assignment.tool)
  return { ...assignment, completionType: isCompletionType(assignment.completionType) ? assignment.completionType : tool?.completionType || 'teacher-review', studentIds: [...new Set(Array.isArray(assignment.studentIds) ? assignment.studentIds : [])].filter(id => typeof id === 'string'), wholeClass: Boolean(assignment.wholeClass), addToCourse: Boolean(assignment.addToCourse) }
}

function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION, version: SCHEMA_VERSION, currentRole: null, currentStudentId: null,
    teacher: { id: 'teacher-demo', name: 'Nauczyciel' }, assignments: initialAssignments.map(normalizeAssignment),
    students: Object.fromEntries(profiles.map((profile, index) => [profile.id, createStudent(profile, index, true)])),
  }
}

export function migrateState(oldState) {
  const next = createInitialState()
  if (!isRecord(oldState)) return next
  next.teacher = { ...next.teacher, ...oldState.teacher }
  next.assignments = Array.isArray(oldState.assignments) ? oldState.assignments.filter(isRecord).map(normalizeAssignment) : next.assignments
  // In v3 the saved roster is authoritative, including an intentionally empty class.
  // Keep the original seed behavior only for legacy v1/v2 migration.
  if ((oldState.schemaVersion ?? oldState.version) >= 3 && isRecord(oldState.students)) next.students = {}
  Object.entries(isRecord(oldState.students) ? oldState.students : {}).filter(([, source]) => isRecord(source)).forEach(([id, source]) => {
    next.students[id] = normalizeStudent(source, id, profiles.find((profile) => profile.id === id) || { id })
  })
  next.currentStudentId = oldState.currentStudentId && next.students[oldState.currentStudentId] && !next.students[oldState.currentStudentId].archivedAt ? oldState.currentStudentId : null
  next.currentRole = ['student', 'teacher'].includes(oldState.currentRole) ? oldState.currentRole : next.currentStudentId ? 'student' : null
  return next
}

function parse(value) { try { return value ? JSON.parse(value) : null } catch { return null } }
function readState() {
  const current = parse(localStorage.getItem(STORAGE_KEYS.current))
  if (current?.schemaVersion === SCHEMA_VERSION) return migrateState(current)
  return migrateState(current || parse(localStorage.getItem(STORAGE_KEYS.previous)) || parse(localStorage.getItem(STORAGE_KEYS.legacy)))
}
function writeState(state) { localStorage.setItem(STORAGE_KEYS.current, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION, version: SCHEMA_VERSION })) }

export function initializeStorage() { writeState(readState()) }
export function getStateSnapshot() { return structuredClone(readState()) }
export function getCurrentRole() { return readState().currentRole }
export function getSpeechSettings() { return normalizeSpeechSettings(readState().teacher.speechSettings) }
export function saveSpeechSettings(settings) {
  const state = readState()
  state.teacher.speechSettings = normalizeSpeechSettings(settings)
  writeState(state)
  return structuredClone(state.teacher.speechSettings)
}
export function selectRole(role) { if (!['student', 'teacher'].includes(role)) return false; const state = readState(); state.currentRole = role; if (role === 'teacher') state.currentStudentId = null; writeState(state); return true }
export function enterTeacher(pin) { return String(pin) === TEACHER_PIN ? selectRole('teacher') : false }
export function leaveRole() { const state = readState(); state.currentRole = null; state.currentStudentId = null; writeState(state) }
export function getProfiles() { return getAllStudents().map(({ profile }) => profile) }
export function getAllStudents({ includeArchived = false } = {}) { return Object.values(readState().students).filter((student) => includeArchived || !student.archivedAt) }
export function getStudentById(studentId) { return readState().students[studentId] || null }
export function getCurrentStudent() { const state = readState(); return state.currentStudentId ? state.students[state.currentStudentId] : null }
export function setCurrentStudent(studentId) { const state = readState(); if (!state.students[studentId] || state.students[studentId].archivedAt) return false; state.currentRole = 'student'; state.currentStudentId = studentId; writeState(state); return true }
export function clearCurrentStudent() { const state = readState(); state.currentStudentId = null; state.currentRole = 'student'; writeState(state) }

export function createStudentProfile({ name, className }) {
  const cleanName = String(name || '').trim(); const cleanClass = String(className || '').trim()
  if (!cleanName || !cleanClass) return null
  const state = readState(); const id = createId('student'); const student = createStudent({ id, name: cleanName, greetingName: cleanName, className: cleanClass, createdAt: new Date().toISOString() })
  state.students[id] = student; writeState(state); return student
}

export function updateStudentProfile(studentId, changes) {
  const state = readState(); const student = state.students[studentId]
  if (!student) return null
  const name = String(changes.name ?? student.profile.name).trim(); const className = String(changes.className ?? student.className).trim()
  if (!name || !className) return null
  student.className = className; student.profile = { ...student.profile, name, greetingName: changes.greetingName || name, className }
  writeState(state); return structuredClone(student)
}

export function archiveStudent(studentId) { const state = readState(); const student = state.students[studentId]; if (!student) return false; student.archivedAt = new Date().toISOString(); if (state.currentStudentId === studentId) state.currentStudentId = null; writeState(state); return true }
export async function deleteStudentProfile(studentId) {
  if (!getStudentById(studentId)) return false
  // Keep the profile if image cleanup fails, so the teacher can retry safely.
  await deleteStudentImages(studentId)
  const state = readState()
  delete state.students[studentId]
  state.assignments = state.assignments.map(assignment => ({ ...assignment, studentIds: assignment.studentIds.filter(id => id !== studentId) }))
  if (state.currentStudentId === studentId) state.currentStudentId = null
  // Migration retains old keys; remove this pupil there as well, not other pupils.
  for (const key of [STORAGE_KEYS.previous, STORAGE_KEYS.legacy]) {
    const legacy = parse(localStorage.getItem(key))
    if (!isRecord(legacy)) continue
    if (isRecord(legacy.students)) delete legacy.students[studentId]
    if (Array.isArray(legacy.assignments)) legacy.assignments = legacy.assignments.map(assignment => isRecord(assignment) && Array.isArray(assignment.studentIds) ? { ...assignment, studentIds: assignment.studentIds.filter(id => id !== studentId) } : assignment)
    if (legacy.currentStudentId === studentId) legacy.currentStudentId = null
    localStorage.setItem(key, JSON.stringify(legacy))
  }
  writeState(state)
  return true
}
export function updateCurrentAvatar(avatarConfig) { const state = readState(); const student = state.students[state.currentStudentId]; if (!student) return false; student.profile.avatarConfig = { ...student.profile.avatarConfig, ...avatarConfig }; writeState(state); return true }
export function getStudentProgress(studentId = null) { const state = readState(); const id = studentId || state.currentStudentId; return state.students[id]?.progress || createProgress() }
export function getCurrentLesson(studentId) { const progress = getStudentProgress(studentId); return implementedLessons.find((lesson) => ['available', 'in-progress'].includes(progress[lesson.id])) || [...implementedLessons].reverse().find((lesson) => progress[lesson.id] === 'completed') || implementedLessons[0] }

export function startLesson(lessonId) { const state = readState(); const student = state.students[state.currentStudentId]; if (!student || !lessons.some(lesson => lesson.id === Number(lessonId) && lesson.implemented) || !lessonStatuses.has(student.progress[lessonId]) || student.progress[lessonId] === 'locked') return false; if (student.progress[lessonId] !== 'completed') student.progress[lessonId] = 'in-progress'; writeState(state); return true }
export function completeLessonForStudent(studentId, lessonId) {
  const state = readState(); const student = state.students[studentId]
  if (!student || !lessons.some(lesson => lesson.id === Number(lessonId) && lesson.implemented) || !lessonStatuses.has(student.progress[lessonId]) || student.progress[lessonId] === 'locked') return false
  student.progress[lessonId] = 'completed'
  const nextLesson = lessons.find((lesson) => lesson.id === Number(lessonId) + 1)
  if (nextLesson?.implemented && student.progress[nextLesson.id] === 'locked') student.progress[nextLesson.id] = 'available'
  if (lessonId === 2 && !student.toolProgress.unlockedTools.includes('mouse-practice')) student.toolProgress.unlockedTools.push('mouse-practice')
  if (lessonId === 3 && !student.toolProgress.unlockedTools.includes('typewriting')) student.toolProgress.unlockedTools.push('typewriting')
  writeState(state); return true
}
export function completeLesson(lessonId) { const state = readState(); return state.currentStudentId ? completeLessonForStudent(state.currentStudentId, lessonId) : false }
export function unlockLessonForStudent(studentId, lessonId) { const state = readState(); const student = state.students[studentId]; if (!student || !implementedLessons.some((lesson) => lesson.id === Number(lessonId))) return false; if (student.progress[lessonId] === 'locked') student.progress[lessonId] = 'available'; writeState(state); return true }
export function unlockNextLessonForStudent(studentId) { const progress = getStudentProgress(studentId); const open = Object.entries(progress).filter(([, status]) => status !== 'locked').map(([id]) => Number(id)); const nextId = Math.max(...open, 0) + 1; return implementedLessons.some((lesson) => lesson.id === nextId) && unlockLessonForStudent(studentId, nextId) }
export function getUnlockedTools(studentId = null) { const state = readState(); const id = studentId || state.currentStudentId; return state.students[id]?.toolProgress.unlockedTools || [] }
export function getTypingResults(studentId = null) { const state = readState(); const id = studentId || state.currentStudentId; return state.students[id]?.toolProgress.typingResults || {} }
export function getStudentWorks(studentId = null) { const state = readState(); const id = studentId || state.currentStudentId; return state.students[id]?.works || [] }
export function getAllWorks() { return Object.values(readState().students).flatMap((student) => student.works) }
export function getWork(workId) { return getAllWorks().find((work) => work.id === workId) || null }
export function getResumableWork(studentId = null) { return getStudentWorks(studentId).filter((work) => ['draft', 'returned'].includes(work.status)).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null }
export function getPendingWorks() { return getAllWorks().filter((work) => work.status === 'waiting-review' && work.completionType === 'teacher-review') }

export function saveWork(work) {
  const state = readState(); const student = state.students[work.studentId]
  if (!student || !isWorkStatus(work.status)) return null
  const normalized = normalizeWork({ ...work, updatedAt: new Date().toISOString() }, work.studentId); const index = student.works.findIndex((item) => item.id === normalized.id)
  if (index >= 0) student.works[index] = normalized; else student.works.push(normalized)
  writeState(state); return normalized
}
export function createWork({ studentId, title, type, lessonId = null, assignmentId = null, completionType = 'teacher-review', data = {} }) { if (!isCompletionType(completionType)) return null; return saveWork(normalizeWork({ id: createId('work'), title, type, lessonId, assignmentId, completionType, status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), data }, studentId)) }
export function updateWork(workId, changes) { const current = getWork(workId); if (!current) return null; const status = changes.status ?? current.status; if (!isWorkStatus(status) || (status === 'waiting-review' && current.completionType !== 'teacher-review')) return null; return saveWork({ ...current, ...changes, status, data: changes.data ? { ...current.data, ...changes.data } : current.data }) }
export function reviewWork(workId, decision) { const work = getWork(workId); if (!work || work.completionType !== 'teacher-review' || work.status !== 'waiting-review' || !['completed', 'returned'].includes(decision)) return null; const updated = updateWork(workId, { status: decision }); if (updated && decision === 'completed' && updated.lessonId != null) completeLessonForStudent(updated.studentId, updated.lessonId); return updated }

export function getAssignments() { return readState().assignments }
export function getAssignment(assignmentId) { return getAssignments().find((assignment) => assignment.id === assignmentId) || null }
export function getAssignmentsForStudent(studentId = null) { const state = readState(); const id = studentId || state.currentStudentId; return state.assignments.filter((assignment) => assignment.status === 'active' && (assignment.wholeClass || assignment.studentIds.includes(id))) }
export function createAssignment(input) {
  const state = readState(); const tool = tools.find((item) => item.id === (input.tool || 'studio'))
  const assignment = normalizeAssignment({ id: createId('assignment'), title: String(input.title || '').trim(), instruction: String(input.instruction || '').trim(), tool: input.tool || 'studio', completionType: input.completionType || tool?.completionType || 'teacher-review', studentIds: input.wholeClass ? [] : input.studentIds, wholeClass: input.wholeClass, status: 'active', createdAt: new Date().toISOString(), addToCourse: input.addToCourse, ...(input.tool === 'robot' ? { robotTask: structuredClone(input.robotTask || { challengeId: 'two-steps' }) } : {}) })
  if (!assignment.title || !assignment.instruction) return null
  state.assignments.push(assignment); writeState(state); return assignment
}
export function getOrCreateAssignmentWork(assignmentId, studentId = null) { const state = readState(); const id = studentId || state.currentStudentId; const assignment = state.assignments.find((item) => item.id === assignmentId); const student = state.students[id]; if (!assignment || !student) return null; const existing = student.works.find((work) => work.assignmentId === assignmentId); return existing || createWork({ studentId: id, title: assignment.title, type: 'Szkic pomysłu', assignmentId, completionType: assignment.completionType, data: { thumbnail: 'assignment', note: '', selectedStages: [] } }) }
export function saveTypingResult(lessonId, result) { const state = readState(); const student = state.students[state.currentStudentId]; if (!student) return; student.toolProgress.typingResults[lessonId] = { ...result, updatedAt: new Date().toISOString() }; writeState(state) }

export function getRobotProgress(studentId = null) {
  const state = readState(); return state.students[studentId || state.currentStudentId]?.toolProgress.robot || {}
}
export function saveRobotProgram(challengeId, program) {
  const state = readState(); const student = state.students[state.currentStudentId]; if (!student) return
  student.toolProgress.robot ||= {}
  const previous = student.toolProgress.robot[challengeId] || { runs: 0, completed: false, routes: [] }
  student.toolProgress.robot[challengeId] = { ...previous, program: structuredClone(program), updatedAt: new Date().toISOString() }
  writeState(state)
}
export function saveRobotAttempt(challengeId, { success, route, program }) {
  const state = readState(); const student = state.students[state.currentStudentId]; if (!student) return null
  student.toolProgress.robot ||= {}
  const previous = student.toolProgress.robot[challengeId] || { runs: 0, completed: false, routes: [] }
  const routes = [...new Set([...previous.routes, ...(success ? [route] : [])])].slice(0, 2)
  const result = { ...previous, runs: previous.runs + 1, completed: previous.completed || success, routes,
    alternative: routes.length > 1, program: structuredClone(program), updatedAt: new Date().toISOString(),
    completedAt: previous.completedAt || (success ? new Date().toISOString() : null) }
  student.toolProgress.robot[challengeId] = result; writeState(state); return result
}
