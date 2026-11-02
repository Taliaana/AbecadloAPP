import { appLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { materialIllustration } from '../../components/materialIllustrations.js'
import { getRobotProgress, getRobotAccess, getStudentWorks } from '../../storage/studentStorage.js'
import { robotLearningState } from '../../data/robotLearning.js'
import { escapeHtml } from '../../utils/html.js'
import { createRobotWork } from './integration.js'

const taskLink = task => task.unlocked
  ? `<a class="button button-secondary" href="#/tools/robot?challenge=${task.id}"><span aria-hidden="true">${task.completed ? '✓' : '→'}</span> ${escapeHtml(task.title)}<small>${task.completed ? 'Powtórz' : 'Otwórz'}</small></a>`
  : `<button class="button button-secondary" disabled><span aria-hidden="true">○</span> ${escapeHtml(task.title)}<small>Później</small></button>`

export function robotLearningView(context) {
  const state = robotLearningState(getRobotProgress(), getRobotAccess())
  const projects = getStudentWorks().filter(work => work.data.kind === 'robot-project')
  const query = new URLSearchParams(location.hash.split('?')[1])
  const chosen = query.get('stage') || query.get('group') || state.next?.stage.id
  const next = state.next
  const content = `<section class="tool-header"><p class="eyebrow">Pracownia · Programowanie</p><h1>Robot</h1><p>Planuj. Obserwuj. Odkrywaj.</p></section>
    <section class="robot-learning-hero"><div><p class="eyebrow">${state.completed ? 'Twoja ścieżka jest ukończona' : 'Kontynuuj naukę'}</p>
      <h2>${next ? next.stage.title : 'Wróć do poznanych zadań'}</h2><p>${next ? next.stage.goal : 'Możesz powtórzyć trasę albo stworzyć własną planszę.'}</p>
      <p class="robot-learning-progress">${icon('check')} Ukończone etapy: ${state.completedCount} z ${state.stages.length}</p>
      <a class="button button-primary" href="#/tools/robot?challenge=${next?.id || 'two-steps'}">${next ? 'Kontynuuj naukę' : 'Powtórz zadanie'} ${icon('arrow')}</a></div>
      <span class="robot-learning-illustration" aria-hidden="true">${materialIllustration('robot')}</span></section>
    <section class="robot-learning-path" aria-label="Etapy nauki Robota"><h2>Twoja droga</h2><ol>
      ${state.stages.map(stage => `<li><details class="robot-stage" ${stage.id === chosen ? 'open' : ''}><summary><span class="robot-stage-number" aria-hidden="true">${stage.completed ? '✓' : stage.number}</span><span><strong>${stage.title}</strong><small>${stage.completed ? 'Ukończony · możesz powtórzyć' : stage.unlocked ? 'Możesz pracować' : 'Po wcześniejszych etapach'} · ${stage.completedCount} z ${stage.tasks.length} zadań</small></span>${icon(stage.unlocked ? 'arrow' : 'lock')}</summary>
      <div class="robot-stage-content"><p>${stage.goal}</p><div class="robot-task-list">${stage.tasks.map(taskLink).join('')}</div></div></details></li>`).join('')}</ol></section>
    <section class="robot-learning-extras"><div class="detail-card"><p class="eyebrow">Tworzę samodzielnie</p><h2>Moja plansza</h2><p>${state.customBoard ? 'Ustaw robota, cel i własne przeszkody.' : 'Najpierw ukończ sześć etapów. Nauczyciel może pozwolić Ci zacząć wcześniej.'}</p><button class="button button-secondary" type="button" data-create-route ${state.customBoard ? '' : 'disabled'}>Moja plansza</button></div>
      <div class="detail-card"><p class="eyebrow">Dodatkowy materiał</p><h2>Powtarzam polecenia</h2><p>${state.extensions.some(task => task.unlocked) ? 'Te same polecenia możesz wykonać kilka razy.' : 'Po ścieżce poznasz bloczek Powtórz.'}</p><div class="robot-task-list">${state.extensions.map(taskLink).join('')}</div></div></section>
    ${projects.length ? `<section class="robot-task-group"><h2>Moje zapisane plansze</h2><div class="robot-task-list">${projects.map(work => `<a class="button button-secondary" href="#/work/${escapeHtml(work.id)}">${escapeHtml(work.title)}</a>`).join('')}</div></section>` : ''}`
  return { html: appLayout(content, context.student, '/workshop'), mount(root) {
    root.querySelector('[data-create-route]').addEventListener('click', async event => {
      if (!robotLearningState(getRobotProgress(), getRobotAccess()).customBoard) return
      const button = event.currentTarget
      button.disabled = true
      try { const work = await createRobotWork(context.student.id); context.navigate(`/work/${work.id}`) }
      finally { if (button.isConnected) button.disabled = false }
    })
  } }
}
