import { teacherLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { createAssignment, getAllStudents } from '../../storage/studentStorage.js'
import { escapeHtml } from '../../utils/html.js'

export function teacherAssignmentView({ navigate }) {
  const students = getAllStudents()
  return {
    html: teacherLayout(`<a class="text-link" href="#/teacher/class">${icon('back')} Wróć do klasy</a><section class="form-card"><p class="eyebrow">Dodatkowe zadanie</p><h1>Nowe zadanie</h1><form data-assignment-form>
      <label>Tytuł<input name="title" required value="Cykl życia motyla" /></label><label>Polecenie<textarea name="instruction" required>Przedstaw cykl życia motyla.</textarea></label><label>Narzędzie<select name="tool"><option value="studio">Studio (praca otwarta)</option></select></label>
      <fieldset><legend>Dla kogo?</legend><label class="check-label"><input type="radio" name="audience" value="wholeClass" checked /> Cała klasa</label><label class="check-label"><input type="radio" name="audience" value="selected" /> Wybrani uczniowie</label><div class="student-checks">${students.map((student) => `<label class="check-label"><input type="checkbox" name="studentIds" value="${escapeHtml(student.profile.id)}" /> ${escapeHtml(student.profile.name)}</label>`).join('')}</div></fieldset>
      <label class="check-label"><input type="checkbox" name="addToCourse" /> Dodaj do programu w przyszłości</label><div class="form-actions"><a class="button button-secondary" href="#/teacher/class">Anuluj</a><button class="button button-primary" type="submit">Utwórz zadanie</button></div>
    </form></section>`, '/teacher/class'),
    mount(root) {
      root.querySelector('[data-assignment-form]').addEventListener('submit', (event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget); const wholeClass = data.get('audience') === 'wholeClass'
        const assignment = createAssignment({ title: data.get('title'), instruction: data.get('instruction'), tool: data.get('tool'), wholeClass, studentIds: data.getAll('studentIds'), addToCourse: data.has('addToCourse') })
        if (assignment) navigate('/teacher/class')
      })
    },
  }
}
