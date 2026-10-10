import { teacherLayout } from '../../components/layout.js'
import { avatar, icon } from '../../components/icons.js'
import { workStatus } from '../../components/workStatus.js'
import { formatDate } from '../../utils/dates.js'
import { downloadWork } from '../../utils/workExport.js'
import { getAssignment, getStudentById, getWork, reviewWork } from '../../storage/studentStorage.js'

export function teacherWorkDetailView({ workId, navigate }) {
  const work = getWork(workId)
  if (!work) return { html: teacherLayout('<section class="empty-state"><h1>Nie znaleziono pracy</h1><a class="button button-primary" href="#/teacher/works">Wróć do prac</a></section>', '/teacher/works') }
  const student = getStudentById(work.studentId)
  const assignment = work.assignmentId ? getAssignment(work.assignmentId) : null
  const content = `<a class="text-link no-print" href="#/teacher/works">${icon('back')} Wróć do prac</a>
    <article class="work-detail printable-work"><header><div>${workStatus(work.status)}<p class="eyebrow">${work.type}</p><h1>${work.title}</h1><p>${avatar(student.profile, 'small')} ${student.profile.name} · ${formatDate(work.updatedAt)}</p></div><div class="work-detail-tools no-print"><button class="button button-ghost" type="button" data-print>${icon('print')} Drukuj</button><button class="button button-ghost" type="button" data-download>${icon('download')} Pobierz</button></div></header>
      <div class="work-document"><p class="eyebrow">${work.lessonId ? `Lekcja ${work.lessonId}` : assignment ? `Dodatkowe zadanie · ${assignment.title}` : 'Portfolio'}</p><h2>${work.data.note || 'Praca wizualna ucznia'}</h2>${work.data.selectedStages?.length ? `<div class="stage-preview">${work.data.selectedStages.map((stage, index) => `<span><b>${index + 1}</b>${stage}</span>`).join('')}</div>` : '<div class="work-placeholder">Podgląd pracy</div>'}</div>
      ${work.status === 'waiting-review' && work.completionType === 'teacher-review' ? `<footer class="review-actions no-print"><div><p class="eyebrow">Wspólne obejrzenie</p><h2>Co dalej z tą pracą?</h2></div><button class="button button-secondary" type="button" data-decision="returned">Kontynuuj pracę</button><button class="button button-primary" type="button" data-decision="completed">Zakończ pracę</button></footer>` : ''}
    </article>`
  return {
    html: teacherLayout(content, work.status === 'waiting-review' ? '/teacher/review' : '/teacher/works'),
    mount(root) {
      root.querySelector('[data-print]').addEventListener('click', () => window.print())
      root.querySelector('[data-download]').addEventListener('click', () => downloadWork(work, student.profile.name))
      root.querySelectorAll('[data-decision]').forEach((button) => button.addEventListener('click', () => {
        reviewWork(work.id, button.dataset.decision); navigate('/teacher/review')
      }))
    },
  }
}
