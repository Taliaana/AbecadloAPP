import { teacherLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { createStudentProfile } from '../../storage/studentStorage.js'

export function teacherStudentFormView({ navigate }) {
  const content = `<a class="text-link no-print" href="#/teacher/class">${icon('back')} Wróć do klasy</a>
    <section class="form-card"><p class="eyebrow">Nowy profil</p><h1>Dodaj ucznia</h1><p>Zapisz tylko dane potrzebne do pracy w klasie.</p>
      <form data-student-form><label>Imię<input name="name" type="text" autocomplete="off" required maxlength="40" /></label><label>Klasa<input name="className" type="text" autocomplete="off" required maxlength="12" placeholder="np. 1A" /></label>
        <p class="form-error" data-form-error role="alert"></p><div class="form-actions"><a class="button button-secondary" href="#/teacher/class">Anuluj</a><button class="button button-primary" type="submit" disabled>Dodaj ucznia</button></div>
      </form></section>`
  return {
    html: teacherLayout(content, '/teacher/class'),
    mount(root) {
      const form = root.querySelector('[data-student-form]')
      const submit = form.querySelector('[type="submit"]')
      const validate = () => { submit.disabled = !form.elements.namedItem('name').value.trim() || !form.elements.namedItem('className').value.trim() }
      form.addEventListener('input', validate)
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const student = createStudentProfile({ name: data.get('name'), className: data.get('className') })
        if (!student) { root.querySelector('[data-form-error]').textContent = 'Wpisz imię i klasę.'; return }
        navigate(`/teacher/student/${student.id}`)
      })
    },
  }
}
