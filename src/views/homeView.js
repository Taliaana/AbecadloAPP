import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { progressDots } from '../components/progress.js'
import { implementedLessons } from '../data/lessons.js'
import { getAssignmentsForStudent, getResumableWork, getStudentProgress, getStudentWorks } from '../storage/studentStorage.js'
import { escapeHtml } from '../utils/html.js'

export function homeView({ student }) {
  const progress = getStudentProgress()
  const resumableWork = getResumableWork()
  const assignments = getAssignmentsForStudent()
  const works = getStudentWorks()
  const standaloneWork = resumableWork?.assignmentId ? null : resumableWork
  const assignmentItems = assignments
    .map((assignment) => ({ assignment, work: works.find((work) => work.assignmentId === assignment.id) || null }))
    .filter(({ work }) => work?.status !== 'completed')
  const nextLesson = implementedLessons.find((lesson) => ['available', 'in-progress'].includes(progress[lesson.id])) || [...implementedLessons].reverse().find((lesson) => progress[lesson.id] === 'completed') || implementedLessons[0]
  const isReview = progress[nextLesson.id] === 'completed'
  const content = `
    <section class="page-heading home-heading">
      <p class="eyebrow">Dzień dobry</p>
      <h1>Cześć, ${escapeHtml(student.profile.greetingName)}</h1>
      <p>Wybierz jedno zadanie i pracuj w swoim tempie.</p>
    </section>
    <section class="today-card" aria-labelledby="today-title">
      <div class="today-copy">
        <p class="eyebrow">Dzisiaj pracujesz nad</p>
        <span class="lesson-number">Lekcja ${nextLesson.id} · około ${nextLesson.estimatedMinutes} min</span>
        <h2 id="today-title">${nextLesson.title}</h2>
        <p>${nextLesson.description}</p>
        <a class="button button-primary" href="#/lesson/${nextLesson.id}">${isReview ? 'Powtórz' : progress[nextLesson.id] === 'in-progress' ? 'Kontynuuj' : 'Rozpocznij'} ${icon('arrow')}</a>
      </div>
      <div class="today-illustration" aria-hidden="true">
        <div class="mini-monitor"><span></span></div><div class="mini-keyboard"></div><div class="mini-plant">${icon('leaf')}</div>
      </div>
    </section>
    ${standaloneWork ? `<section class="resume-card"><span class="round-icon round-icon--blue">${icon('edit')}</span><div><p class="eyebrow">${standaloneWork.status === 'returned' ? 'Wróć do swojej pracy' : 'Masz rozpoczętą pracę'}</p><h2>${escapeHtml(standaloneWork.title)}</h2><p>${standaloneWork.status === 'returned' ? 'Możesz jeszcze popracować nad tą pracą.' : 'Wszystkie zmiany są zapisane.'}</p></div><a class="button button-primary" href="#/work/${escapeHtml(standaloneWork.id)}">Kontynuuj</a></section>` : ''}
    ${assignmentItems.length ? `<section class="assignment-section"><div><p class="eyebrow">Dodatkowe zadanie</p><h2>Od nauczyciela</h2></div><div class="assignment-list">${assignmentItems.map(({ assignment, work }) => {
      const title = escapeHtml(assignment.title)
      if (work?.status === 'waiting-review') return `<article class="assignment-card assignment-card--waiting" aria-label="${title}. Praca czeka na nauczyciela"><span class="round-icon round-icon--blue">${icon('check')}</span><span><strong>${title}</strong><small>Praca czeka na nauczyciela.</small></span></article>`
      const route = work ? `/work/${escapeHtml(work.id)}` : `/assignment/${escapeHtml(assignment.id)}`
      const label = work?.status === 'returned' ? 'Wróć do pracy' : work?.status === 'draft' ? 'Kontynuuj' : escapeHtml(assignment.instruction)
      return `<a class="assignment-card" href="#${route}"><span class="round-icon round-icon--yellow">${icon('brush')}</span><span><strong>${title}</strong><small>${label}</small></span>${icon('arrow')}</a>`
    }).join('')}</div></section>` : ''}
    <section class="quick-grid" aria-label="Pozostałe miejsca">
      <a class="quiet-card" href="#/workshop"><span class="round-icon round-icon--blue">${icon('shelf')}</span><span><strong>Pracownia</strong><small>Poznane narzędzia w jednym miejscu.</small></span>${icon('arrow')}</a>
      <a class="quiet-card" href="#/works"><span class="round-icon round-icon--yellow">${icon('works')}</span><span><strong>Moje prace</strong><small>Zobacz swoje cyfrowe portfolio.</small></span>${icon('arrow')}</a>
    </section>
    <section class="path-summary">
      <div><p class="eyebrow">Twoja ścieżka</p><h2>Małe kroki, po kolei</h2></div>
      ${progressDots(progress)}
      <a class="text-link" href="#/path">Zobacz wszystkie lekcje ${icon('arrow')}</a>
    </section>`
  return { html: appLayout(content, student, '/home') }
}
