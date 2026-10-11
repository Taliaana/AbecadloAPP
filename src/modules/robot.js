import { appLayout } from '../components/layout.js'
import { materialIllustration } from '../components/materialIllustrations.js'
import { robotChallenges, robotGroups, getRobotChallenge } from '../data/robotChallenges.js'
import { getRobotProgress, getStudentWorks, getWork, getAssignment } from '../storage/studentStorage.js'
import { escapeHtml } from '../utils/html.js'
import { robotExerciseView } from './robot/exercise.js'
import { robotProjectView } from './robot/project.js'
import { assignmentRobotWork, createRobotWork } from './robot/integration.js'

export function robotView(context) {
  const query = new URLSearchParams(location.hash.split('?')[1])
  const challenge = getRobotChallenge(query.get('challenge'))
  if (challenge) return robotExerciseView(context, { board: challenge })
  const progress = getRobotProgress()
  const repetitionKnown = ['two-steps', 'first-turn', 'turns'].every(id => progress[id]?.completed)
  const projects = getStudentWorks().filter(work => work.data.kind === 'robot-project')
  const content = `<section class="tool-header"><p class="eyebrow">Pracownia</p><h1>Robot</h1><p>Ułóż program. Obserwuj. Spróbuj ponownie.</p></section>
    <section class="robot-choices"><a class="tool-card" href="#/tools/robot?group=sequence"><span class="tool-object">${materialIllustration('robot')}</span><h2>Ćwicz</h2><p>Zacznij od krótkiej trasy.</p></a>
    <a class="tool-card" href="#/tools/robot?group=debug"><span class="tool-object">${materialIllustration('sequences')}</span><h2>Znajdź błąd</h2><p>Obejrzyj i popraw program.</p></a>
    <button class="tool-card" type="button" data-create-route><span class="tool-object">${materialIllustration('studio')}</span><h2>Stwórz trasę</h2><p>Przygotuj własną planszę.</p></button></section>
    ${robotGroups.filter(([id]) => id !== 'repeat' || repetitionKnown).map(([id, title]) => `<section class="robot-task-group" id="robot-group-${id}"><h2>${title}</h2><div class="robot-task-list">${robotChallenges.filter(task => task.group === id).map(task => `<a class="button button-secondary" href="#/tools/robot?challenge=${task.id}">${progress[task.id]?.completed ? '<span aria-label="Ukończone">✓</span>' : ''} ${task.title}</a>`).join('')}</div></section>`).join('')}
    ${!repetitionKnown ? '<p>Powtarzanie poznasz po trzech pierwszych trasach.</p>' : ''}
    ${projects.length ? `<section class="robot-task-group"><h2>Moje trasy</h2><div class="robot-task-list">${projects.map(work => `<a class="button button-secondary" href="#/work/${escapeHtml(work.id)}">${escapeHtml(work.title)}</a>`).join('')}</div></section>` : ''}`
  return { html: appLayout(content, context.student, '/workshop'), mount(root) {
    root.querySelector('[data-create-route]').addEventListener('click', () => {
      const work = createRobotWork(context.student.id); context.navigate(`/work/${work.id}`)
    })
    const group = query.get('group')
    if (robotGroups.some(([id]) => id === group)) root.querySelector(`#robot-group-${group}`)?.scrollIntoView({ block: 'start' })
  } }
}

export function robotWorkView(context) {
  const work = context.workId ? getWork(context.workId) : assignmentRobotWork(context.assignmentId, context.student.id)
  if (!work || work.studentId !== context.student.id) return { html: appLayout('<h1>To zadanie jeszcze czeka</h1><a class="button button-primary" href="#/home">Wróć do domu</a>', context.student, '/home') }
  if (work.data.kind === 'robot-project') return robotProjectView(context, work)
  const assignment = getAssignment(work.assignmentId)
  const board = work.data.board || getRobotChallenge(assignment?.robotTask?.challengeId || 'two-steps')
  return robotExerciseView(context, { board, work })
}
