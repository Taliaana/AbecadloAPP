import { createWork, getAssignmentsForStudent, getStudentWorks } from '../../storage/studentStorage.js'
import { createRobotBoard, getRobotChallenge } from '../../data/robotChallenges.js'

export function assignmentRobotWork(assignmentId, studentId) {
  const assignment = getAssignmentsForStudent(studentId).find(item => item.id === assignmentId && item.tool === 'robot')
  if (!assignment) return null
  const existing = getStudentWorks(studentId).find(item => item.assignmentId === assignmentId)
  if (existing) return existing
  const board = assignment.robotTask?.board || getRobotChallenge(assignment.robotTask?.challengeId || 'two-steps')
  if (!board) return null
  return createWork({ studentId, title: assignment.title, type: 'Robot — zadanie', assignmentId,
    completionType: 'automatic', data: { kind: 'robot-assignment', board, program: board.initialProgram || [], thumbnail: 'robot' } })
}

export function createRobotWork(studentId) {
  return createWork({ studentId, title: 'Moja trasa', type: 'Robot — własna trasa', completionType: 'teacher-review',
    data: { kind: 'robot-project', board: createRobotBoard(), program: [], thumbnail: 'robot', editorMode: true, share: { scope: 'local', version: 1 } } })
}
