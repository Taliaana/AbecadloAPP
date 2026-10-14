import { teacherLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { createAssignment, getAllStudents } from '../../storage/studentStorage.js'
import { escapeHtml } from '../../utils/html.js'
import { robotChallenges, robotGroups } from '../../data/robotChallenges.js'

export function teacherAssignmentView({ navigate }) {
  const students = getAllStudents()
  return {
    html: teacherLayout(`<a class="text-link" href="#/teacher/class">${icon('back')} Wróć do klasy</a><section class="form-card"><p class="eyebrow">Dodatkowe zadanie</p><h1>Nowe zadanie</h1><form data-assignment-form>
      <label>Tytuł<input name="title" required value="Cykl życia motyla" /></label><label>Polecenie<textarea name="instruction" required>Przedstaw cykl życia motyla.</textarea></label><label>Narzędzie<select name="tool" aria-label="Narzędzie"><option value="studio">Studio (praca otwarta)</option><option value="research-board">Tablica badawcza – skały</option><option value="robot">Robot (samodzielna kontrola)</option></select></label>
      <label data-robot-task hidden>Plansza Robota<select name="robotChallenge">${robotGroups.map(([id, label]) => `<optgroup label="${label}">${robotChallenges.filter(task => task.group === id).map(task => `<option value="${task.id}">${task.title}</option>`).join('')}</optgroup>`).join('')}${students.some(student => student.works.some(work => work.data.kind === 'robot-project' && work.data.solved)) ? `<optgroup label="Trasy uczniów">${students.flatMap(student => student.works.filter(work => work.data.kind === 'robot-project' && work.data.solved).map(work => `<option value="work:${escapeHtml(work.id)}">${escapeHtml(student.profile.name)} — ${escapeHtml(work.title)}</option>`)).join('')}</optgroup>` : ''}</select></label>
      <fieldset><legend>Dla kogo?</legend><label class="check-label"><input type="radio" name="audience" value="wholeClass" checked /> Cała klasa</label><label class="check-label"><input type="radio" name="audience" value="selected" /> Wybrani uczniowie</label><div class="student-checks">${students.map((student) => `<label class="check-label"><input type="checkbox" name="studentIds" value="${escapeHtml(student.profile.id)}" /> ${escapeHtml(student.profile.name)}</label>`).join('')}</div></fieldset>
      <label class="check-label"><input type="checkbox" name="addToCourse" /> Dodaj do programu w przyszłości</label><div class="form-actions"><a class="button button-secondary" href="#/teacher/class">Anuluj</a><button class="button button-primary" type="submit">Utwórz zadanie</button></div>
    </form></section>`, '/teacher/class'),
    mount(root) {
      const form = root.querySelector('[data-assignment-form]')
      const choices = root.querySelector('.student-checks')
      const feedback = document.createElement('p')
      feedback.className = 'form-feedback'; feedback.setAttribute('role', 'status')
      form.querySelector('.form-actions').before(feedback)
      function updateAudience() {
        const selected = form.elements.audience.value === 'selected'
        choices.hidden = !selected
        choices.querySelectorAll('input').forEach(input => { input.disabled = !selected })
        feedback.textContent = ''
      }
      form.querySelectorAll('[name="audience"]').forEach(input => input.addEventListener('change', updateAudience))
      updateAudience()
      root.querySelector('[name="tool"]').addEventListener('change', event => { root.querySelector('[data-robot-task]').hidden = event.target.value !== 'robot' })
      root.querySelector('[data-assignment-form]').addEventListener('submit', (event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget); const wholeClass = data.get('audience') === 'wholeClass'
        if (!wholeClass && !data.getAll('studentIds').length) { feedback.textContent = 'Wybierz przynajmniej jednego ucznia.'; choices.querySelector('input')?.focus(); return }
        const selected = String(data.get('robotChallenge'))
        const sourceWork = selected.startsWith('work:') ? students.flatMap(student => student.works).find(work => work.id === selected.slice(5)) : null
        const assignment = createAssignment({ title: data.get('title'), instruction: data.get('instruction'), tool: data.get('tool'), wholeClass, studentIds: data.getAll('studentIds'), addToCourse: data.has('addToCourse'), robotTask: sourceWork ? { board: { ...sourceWork.data.board, mode: 'build', initialProgram: [] }, sourceWorkId: sourceWork.id } : { challengeId: selected } })
        if (assignment) navigate('/teacher/class')
      })
    },
  }
}
