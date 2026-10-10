import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { formatDate } from '../../utils/dates.js'
import { getPendingWorks, getStudentById } from '../../storage/studentStorage.js'

export function teacherReviewView() {
  const works = getPendingWorks()
  const content = `<section class="teacher-page-heading"><div><p class="eyebrow">Panel nauczyciela</p><h1>Do sprawdzenia</h1><p>Prace, które uczniowie poprosili obejrzeć.</p></div></section>
    ${works.length ? `<div class="review-list">${works.map((work) => { const student = getStudentById(work.studentId); return `<a class="review-card" href="#/teacher/work/${work.id}">${avatar(student.profile, 'medium')}<span><strong>${work.title}</strong><small>${student.profile.name} · ${formatDate(work.updatedAt)}</small></span><span class="review-label">Czeka</span>${icon('arrow')}</a>` }).join('')}</div>` : `<div class="empty-state"><span class="empty-illustration">${icon('check')}</span><h2>Wszystko sprawdzone</h2><p>Nowe prace pojawią się tutaj, gdy uczeń poprosi o ich obejrzenie.</p></div>`}`
  return { html: teacherLayout(content, '/teacher/review') }
}
