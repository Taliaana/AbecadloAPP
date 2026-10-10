import { initialAssignments } from '../data/assignments.js'
import { lessons } from '../data/lessons.js'
import { profiles, sampleWorks } from '../data/profiles.js'
import { isWorkStatus } from '../data/workModel.js'

export const SCHEMA_VERSION = 2
export const STORAGE_KEYS = {
  current: 'abecadlo-state-v2',
  legacy: 'abecadlo-state-v1',
}

const IMPLEMENTED_LESSON_COUNT = 4
const TEACHER_PIN = '1234'

function createProgress() {
  return Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.id === 1 ? 'available' : 'locked']))
}

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}

function normalizeWork(work, studentId) {
  const thumbnail = work.data?.thumbnail || work.thumbnail || 'shapes'
  return {
    schemaVersion: 1,
    id: work.id || createId('work'),
    studentId,
    title: work.title || 'Bez tytułu',
    type: work.type || 'Praca',
    lessonId: work.lessonId ?? null,
    assignmentId: work.assignmentId ?? null,
    status: isWorkStatus(work.status) ? work.status : 'completed',
    createdAt: work.createdAt || new Date().toISOString(),
    updatedAt: work.updatedAt || work.createdAt || new Date().toISOString(),
    data: { ...work.data, thumbnail },
  }
}

function createWorkflowMock(studentId, index) {
  const statuses = ['draft', 'waiting-review', 'returned']
  return normalizeWork({
    id: `${studentId}-butterfly-draft`,
    title: 'Cykl życia motyla',
    type: 'Szkic pomysłu',
    assignmentId: 'assignment-butterfly',
    status: statuses[index] || 'draft',
    createdAt: '2026-10-10T10:30:00.000Z',
    updatedAt: '2026-10-10T10:30:00.000Z',
    data: {
      thumbnail: 'assignment',
      note: index === 1 ? 'Jajo, gąsienica, poczwarka i motyl.' : '',
      selectedStages: index === 1 ? ['jajo', 'gąsienica', 'poczwarka', 'motyl'] : [],
    },
  }, studentId)
}

function createStudent(profile, index) {
  return {
    profile: { ...profile, avatarConfig: { ...profile.avatarConfig } },
    progress: createProgress(),
    unlockedTools: [],
    works: [
      ...sampleWorks.map((work) => normalizeWork({ ...work, id: `${profile.id}-${work.id}` }, profile.id)),
      createWorkflowMock(profile.id, index),
    ],
    typingResults: {},
  }
}

function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    version: SCHEMA_VERSION,
    currentRole: null,
    currentStudentId: null,
    teacher: { id: 'teacher-demo', name: 'Nauczyciel' },
    assignments: initialAssignments.map((assignment) => ({ ...assignment, studentIds: [...assignment.studentIds] })),
    students: Object.fromEntries(profiles.map((profile, index) => [profile.id, createStudent(profile, index)])),
  }
}

export function migrateState(legacyState) {
  const next = createInitialState()
  if (!legacyState || typeof legacyState !== 'object') return next

  next.currentStudentId = legacyState.currentStudentId && next.students[legacyState.currentStudentId]
    ? legacyState.currentStudentId
    : null
  next.currentRole = next.currentStudentId ? 'student' : null

  Object.entries(next.students).forEach(([studentId, target], index) => {
    const source = legacyState.students?.[studentId]
    if (!source) return
    target.profile = {
      ...target.profile,
      ...source.profile,
      avatarConfig: { ...target.profile.avatarConfig, ...source.profile?.avatarConfig },
    }
    target.progress = { ...createProgress(), ...source.progress }
    target.unlockedTools = [...new Set(source.unlockedTools || [])]
    target.typingResults = { ...(source.typingResults || {}) }
    target.works = (source.works || []).map((work) => normalizeWork(work, studentId))
    if (!target.works.some((work) => work.assignmentId === 'assignment-butterfly')) {
      target.works.push(createWorkflowMock(studentId, index))
    }
  })

  return next
}

function parse(value) {
  try { return value ? JSON.parse(value) : null } catch { return null }
}

function normalizeCurrentState(state) {
  if (!state || state.schemaVersion !== SCHEMA_VERSION) return migrateState(state)
  const base = createInitialState()
  const normalized = {
    ...base,
    ...state,
    teacher: { ...base.teacher, ...state.teacher },
    assignments: Array.isArray(state.assignments) ? state.assignments : base.assignments,
    students: { ...base.students },
  }
  Object.entries(base.students).forEach(([studentId, fallback]) => {
    const source = state.students?.[studentId]
    if (!source) return
    normalized.students[studentId] = {
      ...fallback,
      ...source,
      profile: { ...fallback.profile, ...source.profile, avatarConfig: { ...fallback.profile.avatarConfig, ...source.profile?.avatarConfig } },
      progress: { ...createProgress(), ...source.progress },
      unlockedTools: [...new Set(source.unlockedTools || [])],
      works: (source.works || []).map((work) => normalizeWork(work, studentId)),
      typingResults: { ...(source.typingResults || {}) },
    }
  })
  return normalized
}

function readState() {
  const current = parse(localStorage.getItem(STORAGE_KEYS.current))
  if (current) return normalizeCurrentState(current)
  const legacy = parse(localStorage.getItem(STORAGE_KEYS.legacy))
  return migrateState(legacy)
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEYS.current, JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION, version: SCHEMA_VERSION }))
}

export function initializeStorage() {
  writeState(readState())
}

export function getStateSnapshot() {
  return structuredClone(readState())
}

export function getCurrentRole() {
  return readState().currentRole
}

export function selectRole(role) {
  if (!['student', 'teacher'].includes(role)) return false
  const state = readState()
  state.currentRole = role
  if (role === 'teacher') state.currentStudentId = null
  writeState(state)
  return true
}

export function enterTeacher(pin) {
  if (String(pin) !== TEACHER_PIN) return false
  return selectRole('teacher')
}

export function leaveRole() {
  const state = readState()
  state.currentRole = null
  state.currentStudentId = null
  writeState(state)
}

export function getProfiles() {
  return Object.values(readState().students).map(({ profile }) => profile)
}

export function getAllStudents() {
  return Object.values(readState().students)
}

export function getStudentById(studentId) {
  return readState().students[studentId] || null
}

export function getCurrentStudent() {
  const state = readState()
  return state.currentStudentId ? state.students[state.currentStudentId] : null
}

export function setCurrentStudent(studentId) {
  const state = readState()
  if (!state.students[studentId]) return false
  state.currentRole = 'student'
  state.currentStudentId = studentId
  writeState(state)
  return true
}

export function clearCurrentStudent() {
  const state = readState()
  state.currentStudentId = null
  state.currentRole = 'student'
  writeState(state)
}

export function updateCurrentAvatar(avatarConfig) {
  const state = readState()
  const student = state.students[state.currentStudentId]
  if (!student) return false
  student.profile.avatarConfig = { ...student.profile.avatarConfig, ...avatarConfig }
  writeState(state)
  return true
}

export function getStudentProgress(studentId = null) {
  const state = readState()
  const id = studentId || state.currentStudentId
  return state.students[id]?.progress || createProgress()
}

export function getCurrentLesson(studentId) {
  const progress = getStudentProgress(studentId)
  return lessons.find((lesson) => ['available', 'in-progress'].includes(progress[lesson.id]))
    || [...lessons].reverse().find((lesson) => progress[lesson.id] === 'completed')
    || lessons[0]
}

export function startLesson(lessonId) {
  const state = readState()
  const student = state.students[state.currentStudentId]
  if (!student || student.progress[lessonId] === 'locked') return false
  if (student.progress[lessonId] !== 'completed') student.progress[lessonId] = 'in-progress'
  writeState(state)
  return true
}

export function completeLessonForStudent(studentId, lessonId) {
  const state = readState()
  const student = state.students[studentId]
  if (!student || student.progress[lessonId] === 'locked') return false
  student.progress[lessonId] = 'completed'
  if (lessonId < IMPLEMENTED_LESSON_COUNT && student.progress[lessonId + 1] === 'locked') student.progress[lessonId + 1] = 'available'
  if (lessonId === 2 && !student.unlockedTools.includes('mouse-practice')) student.unlockedTools.push('mouse-practice')
  if (lessonId === 3 && !student.unlockedTools.includes('typewriting')) student.unlockedTools.push('typewriting')
  writeState(state)
  return true
}

export function completeLesson(lessonId) {
  const state = readState()
  return state.currentStudentId ? completeLessonForStudent(state.currentStudentId, lessonId) : false
}

export function unlockLessonForStudent(studentId, lessonId) {
  const state = readState()
  const student = state.students[studentId]
  if (!student || !lessons.some((lesson) => lesson.id === Number(lessonId))) return false
  if (student.progress[lessonId] === 'locked') student.progress[lessonId] = 'available'
  writeState(state)
  return true
}

export function unlockNextLessonForStudent(studentId) {
  const progress = getStudentProgress(studentId)
  const highestOpen = Math.max(...Object.entries(progress).filter(([, status]) => status !== 'locked').map(([id]) => Number(id)))
  const nextId = highestOpen + 1
  if (nextId > IMPLEMENTED_LESSON_COUNT) return false
  return unlockLessonForStudent(studentId, nextId)
}

export function getUnlockedTools(studentId = null) {
  const state = readState()
  const id = studentId || state.currentStudentId
  return state.students[id]?.unlockedTools || []
}

export function getStudentWorks(studentId = null) {
  const state = readState()
  const id = studentId || state.currentStudentId
  return state.students[id]?.works || []
}

export function getAllWorks() {
  return Object.values(readState().students).flatMap((student) => student.works)
}

export function getWork(workId) {
  return getAllWorks().find((work) => work.id === workId) || null
}

export function getResumableWork(studentId = null) {
  return getStudentWorks(studentId)
    .filter((work) => ['draft', 'returned'].includes(work.status))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null
}

export function getPendingWorks() {
  return getAllWorks().filter((work) => work.status === 'waiting-review')
}

export function saveWork(work) {
  const state = readState()
  const student = state.students[work.studentId]
  if (!student || !isWorkStatus(work.status)) return null
  const normalized = normalizeWork({ ...work, updatedAt: new Date().toISOString() }, work.studentId)
  const index = student.works.findIndex((item) => item.id === normalized.id)
  if (index >= 0) student.works[index] = normalized
  else student.works.push(normalized)
  writeState(state)
  return normalized
}

export function createWork({ studentId, title, type, lessonId = null, assignmentId = null, data = {} }) {
  const work = normalizeWork({
    id: createId('work'), title, type, lessonId, assignmentId, status: 'draft',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), data,
  }, studentId)
  return saveWork(work)
}

export function updateWork(workId, changes) {
  const current = getWork(workId)
  if (!current) return null
  const status = changes.status ?? current.status
  if (!isWorkStatus(status)) return null
  return saveWork({
    ...current,
    ...changes,
    status,
    data: changes.data ? { ...current.data, ...changes.data } : current.data,
  })
}

export function reviewWork(workId, decision) {
  const work = getWork(workId)
  if (!work || work.status !== 'waiting-review' || !['completed', 'returned'].includes(decision)) return null
  const updated = updateWork(workId, { status: decision })
  if (updated && decision === 'completed' && updated.lessonId != null) completeLessonForStudent(updated.studentId, updated.lessonId)
  return updated
}

export function getAssignments() {
  return readState().assignments
}

export function getAssignment(assignmentId) {
  return getAssignments().find((assignment) => assignment.id === assignmentId) || null
}

export function getAssignmentsForStudent(studentId = null) {
  const state = readState()
  const id = studentId || state.currentStudentId
  return state.assignments.filter((assignment) => assignment.status === 'active' && (assignment.wholeClass || assignment.studentIds.includes(id)))
}

export function createAssignment(input) {
  const state = readState()
  const assignment = {
    id: createId('assignment'),
    title: input.title.trim(),
    instruction: input.instruction.trim(),
    tool: input.tool || 'studio',
    studentIds: input.wholeClass ? [] : [...new Set(input.studentIds || [])],
    wholeClass: Boolean(input.wholeClass),
    status: 'active',
    createdAt: new Date().toISOString(),
    addToCourse: Boolean(input.addToCourse),
  }
  if (!assignment.title || !assignment.instruction) return null
  state.assignments.push(assignment)
  writeState(state)
  return assignment
}

export function getOrCreateAssignmentWork(assignmentId, studentId = null) {
  const state = readState()
  const id = studentId || state.currentStudentId
  const assignment = state.assignments.find((item) => item.id === assignmentId)
  const student = state.students[id]
  if (!assignment || !student) return null
  const existing = student.works.find((work) => work.assignmentId === assignmentId)
  if (existing) return existing
  return createWork({ studentId: id, title: assignment.title, type: 'Szkic pomysłu', assignmentId, data: { thumbnail: 'assignment', note: '', selectedStages: [] } })
}

export function saveTypingResult(lessonId, result) {
  const state = readState()
  const student = state.students[state.currentStudentId]
  if (!student) return
  student.typingResults[lessonId] = { ...result, updatedAt: new Date().toISOString() }
  writeState(state)
}
