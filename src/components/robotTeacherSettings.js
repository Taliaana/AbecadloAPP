import { robotStages } from '../data/robotLearning.js'
import { robotChallenges } from '../data/robotChallenges.js'
import { getRobotAccess, grantRobotAccess } from '../storage/studentStorage.js'

export function robotTeacherSettings(student) {
  const access = getRobotAccess(student.id)
  return `<details class="teacher-exception robot-teacher-settings no-print"><summary>Robot · Tryb niestandardowy</summary><p>Dopasuj dostęp do potrzeb ucznia. Pozostałe etapy nadal wynikają z ukończonych zadań.</p>
    <form data-robot-access><label>Odblokuj etap lub planszę<select name="grant"><option value="">Bez dodatkowego odblokowania</option><optgroup label="Etapy">${robotStages.map((stage, i) => `<option value="stage:${stage.id}">${i + 1}. ${stage.title}</option>`).join('')}</optgroup><optgroup label="Pojedyncze plansze">${robotChallenges.map(task => `<option value="challenge:${task.id}">${task.title}</option>`).join('')}</optgroup></select></label>
    <label class="checkbox-label"><input type="checkbox" name="customBoard" ${access.customBoard ? 'checked' : ''}>Pozwól tworzyć własną planszę wcześniej</label>
    <div class="form-actions"><button type="submit" class="button button-secondary">Zapisz dostęp Robota</button></div><p class="form-feedback" role="status" data-robot-access-status></p></form><p>Konkretną trasę możesz też przydzielić przez „Nowe zadanie”.</p></details>`
}
export function mountRobotTeacherSettings(root, studentId) {
  root.querySelector('[data-robot-access]')?.addEventListener('submit', async event => {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form), [type, value] = String(data.get('grant')).split(':')
    const button = form.querySelector('button'), feedback = form.querySelector('[data-robot-access-status]')
    button.disabled = true
    try {
      await grantRobotAccess(studentId, { customBoard: data.has('customBoard'), ...(type === 'stage' ? { stageId: value } : type === 'challenge' ? { challengeId: value } : {}) })
      feedback.textContent = 'Ustawienia Robota zapisane.'
    } catch (error) { feedback.textContent = error.message }
    finally { button.disabled = false }
  })
}
