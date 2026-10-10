import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { workStatus } from '../../components/workStatus.js'
import { lessons } from '../../data/lessons.js'
import { formatDate } from '../../utils/dates.js'
import { getAssignmentsForStudent, getCurrentLesson, getStudentById, unlockLessonForStudent, unlockNextLessonForStudent } from '../../storage/studentStorage.js'

export function teacherStudentView({ studentId, render, navigate }) {
  function current() {
    const student = getStudentById(studentId)
    if (!student) return { html: teacherLayout('<section class="empty-state"><h1>Nie znaleziono ucznia</h1><a class="button button--primary" href="#/teacher/class">Wróć do klasy</a></section>', '/teacher/class') }
    const currentLesson = getCurrentLesson(studentId)
    const completed = lessons.filter((lesson) => student.progress[lesson.id] === 'completed')
    const activeWorks = student.works.filter((work) => work.status !== 'completed')
    const assignments = getAssignmentsForStudent(studentId)
    const content = `<a class="text-link no-print" href="#/teacher/class">${icon('back')} Wróć do klasy</a>
      <section class="student-detail-header">${avatar(student.profile, 'large')}<div><p class="eyebrow">Uczeń</p><h1>${student.profile.name}</h1><p>Aktualnie: Lekcja ${currentLesson.id} · ${currentLesson.title}</p></div><button class="button button--secondary no-print" type="button" data-unlock-next ${currentLesson.id >= 4 ? 'disabled aria-describedby="unlock-note"' : ''}>Odblokuj następną lekcję</button></section>
      ${currentLesson.id >= 4 ? '<p class="teacher-note" id="unlock-note">Treść kolejnej lekcji powstanie w następnym etapie projektu.</p>' : ''}
      <div class="teacher-detail-grid">
        <section class="detail-card"><p class="eyebrow">Lekcje</p><h2>${completed.length} ukończone</h2><div class="compact-list">${lessons.slice(0, 4).map((lesson) => `<span>${student.progress[lesson.id] === 'completed' ? icon('check') : student.progress[lesson.id] === 'locked' ? icon('lock') : '●'} ${lesson.id}. ${lesson.shortTitle}</span>`).join('')}</div>
          <details class="teacher-exception no-print"><summary>Odblokuj wybraną lekcję</summary><form data-unlock-form><label>Wyjątkowe odblokowanie<select name="lessonId">${lessons.slice(0, 4).filter((lesson) => student.progress[lesson.id] === 'locked').map((lesson) => `<option value="${lesson.id}">${lesson.id}. ${lesson.title}</option>`).join('')}</select></label><button class="button button--ghost" type="submit">Odblokuj</button></form></details>
        </section>
        <section class="detail-card"><p class="eyebrow">Rozpoczęte prace</p><h2>${activeWorks.length}</h2><div class="compact-list">${activeWorks.map((work) => `<a href="#/teacher/work/${work.id}"><span>${work.title}</span>${workStatus(work.status)}</a>`).join('') || '<p>Brak rozpoczętych prac.</p>'}</div></section>
        <section class="detail-card"><p class="eyebrow">Portfolio</p><h2>${student.works.filter((work) => work.status === 'completed').length} prac</h2><div class="compact-list">${student.works.filter((work) => work.status === 'completed').slice(0, 3).map((work) => `<a href="#/teacher/work/${work.id}"><span>${work.title}</span><time>${formatDate(work.updatedAt)}</time></a>`).join('')}</div></section>
        <section class="detail-card"><p class="eyebrow">Dodatkowe zadania</p><h2>${assignments.length}</h2><div class="compact-list">${assignments.map((assignment) => `<span>${assignment.title}</span>`).join('') || '<p>Brak zadań.</p>'}</div></section>
      </div>`
    return { html: teacherLayout(content, '/teacher/class'), mount }
  }
  function mount(root) {
    root.querySelector('[data-unlock-next]')?.addEventListener('click', () => { unlockNextLessonForStudent(studentId); render(current()) })
    root.querySelector('[data-unlock-form]')?.addEventListener('submit', (event) => {
      event.preventDefault(); unlockLessonForStudent(studentId, Number(new FormData(event.currentTarget).get('lessonId'))); render(current())
    })
  }
  return current()
}
