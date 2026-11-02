import { getRobotChallenge } from './robotChallenges.js'

// Keep challenge IDs and history intact. Repetition is a separate extension;
// moving its boards into early sequencing would change their teaching purpose.
export const robotStages = [
  { id: 'steps', title: 'Pierwsze kroki', goal: 'Układam polecenia po kolei.', challenges: ['two-steps'] },
  { id: 'turns', title: 'Pierwsze zakręty', goal: 'Obracam robota w lewo i w prawo.', challenges: ['first-turn', 'original'] },
  { id: 'obstacles', title: 'Omijam przeszkody', goal: 'Planuję bezpieczną drogę.', challenges: ['around-stone', 'turns', 'passage'] },
  { id: 'prediction', title: 'Przewiduję', goal: 'Najpierw przewiduję, potem sprawdzam.', challenges: ['predict-edge', 'predict-turn'] },
  { id: 'debug', title: 'Detektyw błędów', goal: 'Obserwuję i poprawiam program.', challenges: ['missing-step', 'wrong-turn', 'extra-step'] },
  { id: 'alternative', title: 'Inna droga', goal: 'Szukam własnego rozwiązania.', challenges: ['another-way'] },
]
export const robotExtensionIds = ['repeat-steps', 'repeat-turns']
const started = (progress, id) => Boolean(progress[id]?.completed || progress[id]?.runs > 0 || progress[id]?.program?.length)
export function robotLearningState(progress = {}, access = {}) {
  let precedingComplete = true
  const stages = robotStages.map((stage, index) => {
    const completed = stage.challenges.every(id => progress[id]?.completed === true)
    const standard = precedingComplete
    const granted = access.stages?.includes(stage.id) === true
    const tasks = stage.challenges.map(id => ({ ...getRobotChallenge(id), completed: progress[id]?.completed === true,
      unlocked: standard || granted || access.challenges?.includes(id) === true || started(progress, id) }))
    precedingComplete &&= completed
    return { ...stage, number: index + 1, tasks, completed, unlocked: tasks.some(task => task.unlocked), completedCount: tasks.filter(task => task.completed).length }
  })
  const completed = stages.every(stage => stage.completed)
  const next = stages.flatMap(stage => stage.tasks.map(task => ({ ...task, stage }))).find(task => task.unlocked && !task.completed)
  return { stages, completed, completedCount: stages.filter(stage => stage.completed).length, next,
    customBoard: completed || access.customBoard === true,
    extensions: robotExtensionIds.map(id => ({ ...getRobotChallenge(id), completed: progress[id]?.completed === true,
      unlocked: completed || access.challenges?.includes(id) === true || started(progress, id) })) }
}
export function canOpenRobotChallenge(id, progress = {}, access = {}) {
  const state = robotLearningState(progress, access)
  return [...state.stages.flatMap(stage => stage.tasks), ...state.extensions].some(task => task.id === id && task.unlocked)
}
export function robotTaskPosition(id) {
  const stageIndex = robotStages.findIndex(stage => stage.challenges.includes(id))
  if (stageIndex < 0) return null
  const stage = robotStages[stageIndex], index = stage.challenges.indexOf(id)
  return { stage, stageNumber: stageIndex + 1, taskNumber: index + 1, total: stage.challenges.length }
}
export function nextRobotChallenge(id) {
  const all = robotStages.flatMap(stage => stage.challenges)
  const index = all.indexOf(id)
  return index >= 0 ? all[index + 1] || null : null
}
