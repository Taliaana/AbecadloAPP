import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { getAllStudents, getCurrentLesson, getPendingWorks } from '../../storage/studentStorage.js'
import { escapeHtml } from '../../utils/html.js'
import { restoreControlFocus } from '../../utils/focus.js'

export function teacherClassView({ render }) {
  let selectedClass = 'all'

  function current() {
    const allStudents = getAllStudents()
    const classNames = [...new Set(allStudents.map((student) => student.className).filter(Boolean))].sort()
    const students = selectedClass === 'all' ? allStudents : allStudents.filter((student) => student.className === selectedClass)
    const pending = getPendingWorks()
    const content = `<section class="teacher-page-heading teacher-page-heading--class"><div><p class="eyebrow">Obserwacja klasy</p><h1>Klasa</h1><p>Zobacz, gdzie dzieci pracują i które prace chcą wspólnie obejrzeć.</p></div><div class="heading-actions no-print"><a class="button button-secondary" href="#/teacher/assignments/new">${icon('plus')} Nowe zadanie</a><a class="button button-primary" href="#/teacher/students/new">${icon('plus')} Dodaj ucznia</a></div></section>
      <section class="teacher-observation">
        <div class="teacher-summary"><article><span class="summary-mark summary-mark--sage"></span><strong>${allStudents.length}</strong><span>dzieci pracuje</span></article><article><span class="summary-mark summary-mark--ochre"></span><strong>${pending.length}</strong><span>prac do obejrzenia</span></article></div>
        <label class="teacher-filter class-filter">Półka klasy<select data-class-filter aria-label="Filtruj uczniów według klasy"><option value="all">Wszystkie klasy</option>${classNames.map((name) => `<option value="${escapeHtml(name)}" ${name === selectedClass ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label>
      </section>
      <section class="teacher-table-card" aria-label="Lista uczniów"><div class="teacher-table-head"><span>Uczeń</span><span>Klasa</span><span>Aktualna praca</span><span>Obserwacja</span><span></span></div>
        ${students.length ? students.map((student) => {
          const lesson = getCurrentLesson(student.id)
          const hasPending = student.works.some((work) => work.status === 'waiting-review' && work.completionType === 'teacher-review')
          const hasReturned = student.works.some((work) => work.status === 'returned')
          return `<a class="teacher-student-row" href="#/teacher/student/${escapeHtml(student.id)}">${avatar(student.profile, 'small')}<strong>${escapeHtml(student.profile.name)}</strong><span>${escapeHtml(student.className)}</span><span>Lekcja ${lesson.id}: ${lesson.shortTitle}</span><span>${hasPending ? 'Praca czeka na obejrzenie' : hasReturned ? 'Kontynuuje pracę' : 'Pracuje'}</span>${icon('arrow')}</a>`
        }).join('') : '<div class="table-empty">W tej klasie nie ma jeszcze uczniów.</div>'}
      </section>`
    return { html: teacherLayout(content, '/teacher/class'), mount }
  }

  function mount(root) {
    root.querySelector('[data-class-filter]')?.addEventListener('change', (event) => {
      selectedClass = event.target.value
      render(current())
      restoreControlFocus(root, '[data-class-filter]')
    })
  }

  return current()
}
