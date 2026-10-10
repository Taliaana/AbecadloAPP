import { teacherLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { workStatus } from '../../components/workStatus.js'
import { formatDate } from '../../utils/dates.js'
import { downloadWork, printWorkCard } from '../../utils/workExport.js'
import { getAllStudents, getAllWorks, getAssignment, getStudentById } from '../../storage/studentStorage.js'

export function teacherWorksView({ render }) {
  let selectedStudent = 'all'
  function current() {
    const students = getAllStudents()
    const works = getAllWorks().filter((work) => selectedStudent === 'all' || work.studentId === selectedStudent)
    const content = `<section class="teacher-page-heading"><div><p class="eyebrow">Panel nauczyciela</p><h1>Prace</h1><p>Portfolio i prace w toku całej klasy.</p></div><label class="teacher-filter no-print">Uczeń<select data-student-filter><option value="all">Cała klasa</option>${students.map((student) => `<option value="${student.profile.id}" ${selectedStudent === student.profile.id ? 'selected' : ''}>${student.profile.name}</option>`).join('')}</select></label></section>
      <div class="teacher-works-list">${works.map((work) => {
        const student = getStudentById(work.studentId); const assignment = work.assignmentId ? getAssignment(work.assignmentId) : null
        return `<article class="teacher-work-card" data-work-card="${work.id}"><div class="teacher-work-preview work-thumbnail--${work.data.thumbnail || 'shapes'}"><span>${work.type}</span></div><div class="teacher-work-copy"><div>${workStatus(work.status)}<span class="work-origin">${work.lessonId ? `Lekcja ${work.lessonId}` : assignment ? `Zadanie: ${assignment.title}` : 'Portfolio'}</span></div><h2>${work.title}</h2><p>${student.profile.name} · ${formatDate(work.updatedAt)}</p></div><div class="teacher-work-actions no-print"><a class="button button--ghost" href="#/teacher/work/${work.id}">${icon('eye')} Podgląd</a><button class="button button--ghost" type="button" data-print="${work.id}">${icon('print')} Drukuj</button><button class="button button--ghost" type="button" data-download="${work.id}">${icon('download')} Pobierz</button></div></article>`
      }).join('')}</div>`
    return { html: teacherLayout(content, '/teacher/works'), mount }
  }
  function mount(root) {
    root.querySelector('[data-student-filter]').addEventListener('change', (event) => { selectedStudent = event.target.value; render(current()) })
    root.querySelectorAll('[data-download]').forEach((button) => button.addEventListener('click', () => {
      const work = getAllWorks().find((item) => item.id === button.dataset.download); downloadWork(work, getStudentById(work.studentId).profile.name)
    }))
    root.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => printWorkCard(root.querySelector(`[data-work-card="${button.dataset.print}"]`))))
  }
  return current()
}
