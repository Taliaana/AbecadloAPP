import { appLayout } from '../components/layout.js'
import { robotLearningView } from './robot/learningView.js'
import { canOpenRobotChallenge } from '../data/robotLearning.js'
import { getRobotChallenge } from '../data/robotChallenges.js'
import { getRobotProgress, getRobotAccess, getWork, getAssignment } from '../storage/studentStorage.js'
import { robotExerciseView } from './robot/exercise.js'
import { robotProjectView } from './robot/project.js'
import { assignmentRobotWork } from './robot/integration.js'

export function robotView(context) {
  const query = new URLSearchParams(location.hash.split('?')[1])
  const challenge = getRobotChallenge(query.get('challenge'))
  if (challenge && canOpenRobotChallenge(challenge.id, getRobotProgress(), getRobotAccess())) return robotExerciseView(context, { board: challenge })
  return robotLearningView(context)
}

export async function robotWorkView(context) {
  const work = context.workId ? getWork(context.workId) : await assignmentRobotWork(context.assignmentId, context.student.id)
  if (!work || work.studentId !== context.student.id) return { html: appLayout('<h1>To zadanie jeszcze czeka</h1><a class="button button-primary" href="#/home">Wróć do domu</a>', context.student, '/home') }
  if (work.data.kind === 'robot-project') return robotProjectView(context, work)
  const assignment = getAssignment(work.assignmentId)
  const board = work.data.board || getRobotChallenge(assignment?.robotTask?.challengeId || 'two-steps')
  return robotExerciseView(context, { board, work })
}
