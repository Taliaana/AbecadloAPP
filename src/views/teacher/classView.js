import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { getAllStudents, getCurrentLesson, getPendingWorks } from '../../storage/studentStorage.js'

export function teacherClassView({ render }) {
  let selectedClass = 'all'

  function current() {
    const allStudents = getAllStudents()
    const classNames = [...new Set(allStudents.map((student) => student.className).filter(Boolean))].sort()
    const students = selectedClass === 'all' ? allStudents : allStudents.filter((student) => student.className === selectedClass)
    const pending = getPendingWorks()
    const content = `<section class="teacher-page-heading"><div><p class="eyebrow">Panel nauczyciela</p><h1>Klasa</h1><p>Obserwuj, gdzie dzieci pracują i czego potrzebują.</p></div><div class="heading-actions no-print"><a class="button button-secondary" href="#/teacher/assignments/new">${icon('plus')} Nowe zadanie</a><a class="button button-primary" href="#/teacher/students/new">${icon('plus')} Dodaj ucznia</a></div></section>
      <div class="teacher-summary"><article><strong>${allStudents.length}</strong><span>aktywnych uczniów</span></article><article><strong>${pending.length}</strong><span>prac do obejrzenia</span></article></div>
      <label class="teacher-filter class-filter">Klasa<select data-class-filter aria-label="Filtruj uczniów według klasy"><option value="all">Wszystkie klasy</option>${classNames.map((name) => `<option value="${name}" ${name === selectedClass ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
      <section class="teacher-table-card" aria-label="Lista uczniów"><div class="teacher-table-head"><span>Uczeń</span><span>Klasa</span><span>Aktualna lekcja</span><span>Status</span><span></span></div>
        ${students.length ? students.map((student) => {
          const lesson = getCurrentLesson(student.id)
          const hasPending = student.works.some((work) => work.status === 'waiting-review' && work.completionType === 'teacher-review')
          const hasReturned = student.works.some((work) => work.status === 'returned')
          return `<a class="teacher-student-row" href="#/teacher/student/${student.id}">${avatar(student.profile, 'small')}<strong>${student.profile.name}</strong><span>${student.className}</span><span>Lekcja ${lesson.id}: ${lesson.shortTitle}</span><span>${hasPending ? 'Praca czeka na obejrzenie' : hasReturned ? 'Kontynuuje pracę' : 'Pracuje'}</span>${icon('arrow')}</a>`
        }).join('') : '<div class="table-empty">W tej klasie nie ma jeszcze uczniów.</div>'}
      </section>`
    return { html: teacherLayout(content, '/teacher/class'), mount }
  }

  function mount(root) {
    root.querySelector('[data-class-filter]')?.addEventListener('change', (event) => {
      selectedClass = event.target.value
      render(current())
    })
  }

  return current()
}
