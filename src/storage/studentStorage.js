import { lessons } from '../data/lessons.js'
import { profiles, sampleWorks } from '../data/profiles.js'

const STORAGE_KEY = 'abecadlo-state-v1'
const IMPLEMENTED_LESSON_COUNT = 4

function createProgress() {
  return Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson.id === 1 ? 'available' : 'locked']))
}

function createInitialState() {
  return {
    version: 1,
    currentStudentId: null,
    students: Object.fromEntries(profiles.map((profile) => [profile.id, {
      profile,
      progress: createProgress(),
      unlockedTools: [],
      works: sampleWorks.map((work) => ({ ...work, id: `${profile.id}-${work.id}` })),
      typingResults: {},
    }])),
  }
}

function readState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored?.version === 1 ? stored : createInitialState()
  } catch {
    return createInitialState()
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function initializeStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) writeState(createInitialState())
}

export function getProfiles() {
  return Object.values(readState().students).map(({ profile }) => profile)
}

export function getCurrentStudent() {
  const state = readState()
  return state.currentStudentId ? state.students[state.currentStudentId] : null
}

export function setCurrentStudent(studentId) {
  const state = readState()
  if (!state.students[studentId]) return false
  state.currentStudentId = studentId
  writeState(state)
  return true
}

export function clearCurrentStudent() {
  const state = readState()
  state.currentStudentId = null
  writeState(state)
}

export function getStudentProgress() {
  return getCurrentStudent()?.progress || createProgress()
}

export function startLesson(lessonId) {
  const state = readState()
  const student = state.students[state.currentStudentId]
  if (!student || student.progress[lessonId] === 'locked') return false
  if (student.progress[lessonId] !== 'completed') student.progress[lessonId] = 'in-progress'
  writeState(state)
  return true
}

export function completeLesson(lessonId) {
  const state = readState()
  const student = state.students[state.currentStudentId]
  if (!student) return false
  student.progress[lessonId] = 'completed'
  if (lessonId < IMPLEMENTED_LESSON_COUNT && student.progress[lessonId + 1] === 'locked') student.progress[lessonId + 1] = 'available'
  if (lessonId === 2 && !student.unlockedTools.includes('mouse-practice')) student.unlockedTools.push('mouse-practice')
  if (lessonId === 3 && !student.unlockedTools.includes('typewriting')) student.unlockedTools.push('typewriting')
  writeState(state)
  return true
}

export function getUnlockedTools() {
  return getCurrentStudent()?.unlockedTools || []
}

export function getStudentWorks() {
  return getCurrentStudent()?.works || []
}

export function saveTypingResult(lessonId, result) {
  const state = readState()
  const student = state.students[state.currentStudentId]
  if (!student) return
  student.typingResults[lessonId] = { ...result, updatedAt: new Date().toISOString() }
  writeState(state)
}
