import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { getAllStudents, getCurrentLesson, getPendingWorks } from '../../storage/studentStorage.js'

export function teacherClassView() {
  const students = getAllStudents()
  const pending = getPendingWorks()
  const content = `<section class="teacher-page-heading"><div><p class="eyebrow">Panel nauczyciela</p><h1>Klasa</h1><p>Postęp uczniów i dodatkowe zadania.</p></div><a class="button button--primary no-print" href="#/teacher/assignments/new">${icon('plus')} Nowe zadanie</a></section>
    <div class="teacher-summary"><article><strong>${students.length}</strong><span>uczniów</span></article><article><strong>${pending.length}</strong><span>prac do sprawdzenia</span></article></div>
    <section class="teacher-table-card"><div class="teacher-table-head"><span>Uczeń</span><span>Aktualna lekcja</span><span>Status</span><span></span></div>
      ${students.map((student) => {
        const lesson = getCurrentLesson(student.profile.id)
        const hasPending = student.works.some((work) => work.status === 'waiting-review')
        const hasReturned = student.works.some((work) => work.status === 'returned')
        return `<a class="teacher-student-row" href="#/teacher/student/${student.profile.id}">${avatar(student.profile, 'small')}<strong>${student.profile.name}</strong><span>Lekcja ${lesson.id}: ${lesson.shortTitle}</span><span>${hasPending ? 'Czeka na sprawdzenie' : hasReturned ? 'Kontynuuje pracę' : 'Pracuje'}</span>${icon('arrow')}</a>`
      }).join('')}
    </section>`
  return { html: teacherLayout(content, '/teacher/class') }
}
