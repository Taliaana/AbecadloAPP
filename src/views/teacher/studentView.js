import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { workStatus } from '../../components/workStatus.js'
import { implementedLessons, lessons } from '../../data/lessons.js'
import { formatDate } from '../../utils/dates.js'
import { escapeHtml } from '../../utils/html.js'
import { archiveStudent, getAssignmentsForStudent, getCurrentLesson, getStudentById, unlockLessonForStudent, unlockNextLessonForStudent, updateStudentProfile } from '../../storage/studentStorage.js'

export function teacherStudentView({ studentId, render, navigate }) {
  function current() {
    const student = getStudentById(studentId)
    if (!student || student.archivedAt) return { html: teacherLayout('<section class="empty-state"><h1>Profil jest w archiwum</h1><a class="button button-primary" href="#/teacher/class">Wróć do klasy</a></section>', '/teacher/class') }
    const currentLesson = getCurrentLesson(studentId)
    const nextLesson = lessons.find((lesson) => lesson.id === currentLesson.id + 1 && lesson.implemented)
    const completed = implementedLessons.filter((lesson) => student.progress[lesson.id] === 'completed')
    const activeWorks = student.works.filter((work) => work.status !== 'completed')
    const assignments = getAssignmentsForStudent(studentId)
    const content = `<a class="text-link no-print" href="#/teacher/class">${icon('back')} Wróć do klasy</a>
      <section class="student-detail-header">${avatar(student.profile, 'large')}<div><p class="eyebrow">Uczeń · ${escapeHtml(student.className)}</p><h1>${escapeHtml(student.profile.name)}</h1><p>Aktualnie: Lekcja ${currentLesson.id} · ${currentLesson.title}</p></div><button class="button button-secondary no-print" type="button" data-unlock-next ${!nextLesson ? 'disabled aria-describedby="unlock-note"' : ''}>Odblokuj następną lekcję</button></section>
      ${!nextLesson ? '<p class="teacher-note" id="unlock-note">Kolejna lekcja nie jest jeszcze dostępna.</p>' : ''}
      <div class="teacher-detail-grid">
        <section class="detail-card"><p class="eyebrow">Lekcje</p><h2>${completed.length} ukończone</h2><div class="compact-list">${implementedLessons.map((lesson) => `<span>${student.progress[lesson.id] === 'completed' ? icon('check') : student.progress[lesson.id] === 'locked' ? icon('lock') : '●'} ${lesson.id}. ${lesson.shortTitle}</span>`).join('')}</div>
          <details class="teacher-exception no-print"><summary>Odblokuj wybraną lekcję</summary><form data-unlock-form><label>Wyjątkowe odblokowanie<select name="lessonId">${implementedLessons.filter((lesson) => student.progress[lesson.id] === 'locked').map((lesson) => `<option value="${lesson.id}">${lesson.id}. ${lesson.title}</option>`).join('')}</select></label><button class="button button-ghost" type="submit">Odblokuj</button></form></details>
        </section>
        <section class="detail-card"><p class="eyebrow">Rozpoczęte prace</p><h2>${activeWorks.length}</h2><div class="compact-list">${activeWorks.map((work) => `<a href="#/teacher/work/${escapeHtml(work.id)}"><span>${escapeHtml(work.title)}</span>${workStatus(work.status)}</a>`).join('') || '<p>Brak rozpoczętych prac.</p>'}</div></section>
        <section class="detail-card"><p class="eyebrow">Portfolio</p><h2>${student.works.filter((work) => work.status === 'completed').length} prac</h2><div class="compact-list">${student.works.filter((work) => work.status === 'completed').slice(0, 3).map((work) => `<a href="#/teacher/work/${escapeHtml(work.id)}"><span>${escapeHtml(work.title)}</span><time>${formatDate(work.updatedAt)}</time></a>`).join('')}</div></section>
        <section class="detail-card"><p class="eyebrow">Dodatkowe zadania</p><h2>${assignments.length}</h2><div class="compact-list">${assignments.map((assignment) => `<span>${escapeHtml(assignment.title)}</span>`).join('') || '<p>Brak zadań.</p>'}</div></section>
      </div>
      <details class="student-settings no-print"><summary>Edytuj profil ucznia</summary><form data-edit-student><label>Imię<input name="name" value="${escapeHtml(student.profile.name)}" required maxlength="40" /></label><label>Klasa<input name="className" value="${escapeHtml(student.className)}" required maxlength="12" /></label><div class="form-actions"><button class="button button-secondary" type="submit">Zapisz zmiany</button><button class="button button-danger" type="button" data-archive-student>Archiwizuj ucznia</button></div></form><p>Archiwizacja ukrywa profil na liście i zachowuje wszystkie prace.</p></details>`
    return { html: teacherLayout(content, '/teacher/class'), mount }
  }
  function mount(root) {
    root.querySelector('[data-unlock-next]')?.addEventListener('click', () => { unlockNextLessonForStudent(studentId); render(current()) })
    root.querySelector('[data-unlock-form]')?.addEventListener('submit', (event) => {
      event.preventDefault(); unlockLessonForStudent(studentId, Number(new FormData(event.currentTarget).get('lessonId'))); render(current())
    })
    root.querySelector('[data-edit-student]')?.addEventListener('submit', (event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget)
      updateStudentProfile(studentId, { name: data.get('name'), className: data.get('className') }); render(current())
    })
    root.querySelector('[data-archive-student]')?.addEventListener('click', (event) => {
      if (event.currentTarget.dataset.confirm !== 'true') { event.currentTarget.dataset.confirm = 'true'; event.currentTarget.textContent = 'Kliknij ponownie, aby archiwizować'; return }
      archiveStudent(studentId); navigate('/teacher/class')
    })
  }
  return current()
}
