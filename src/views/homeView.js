import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { materialIllustration } from '../components/materialIllustrations.js'
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
  const lessonAction = isReview ? 'Powtórz' : progress[nextLesson.id] === 'in-progress' ? 'Kontynuuj' : 'Rozpocznij'
  const content = `
    <section class="home-welcome">
      <div><p class="eyebrow">Dzień dobry</p><h1>Cześć, ${escapeHtml(student.profile.greetingName)}</h1></div>
      <p>Przygotowaliśmy spokojne miejsce na dzisiejszą pracę.</p>
    </section>
    <section class="today-card" aria-labelledby="today-title">
      <div class="today-material" aria-hidden="true">
        <span class="material-number">${nextLesson.id}</span>
        ${materialIllustration('computer')}
      </div>
      <div class="today-copy">
        <p class="eyebrow">Twoja praca na dziś</p>
        <h2 id="today-title">${nextLesson.title}</h2>
        <p>${nextLesson.description}</p>
        <div class="today-action"><a class="button button-primary" href="#/lesson/${nextLesson.id}">${lessonAction} ${icon('arrow')}</a><span class="lesson-number">Lekcja ${nextLesson.id} · około ${nextLesson.estimatedMinutes} min</span></div>
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
    <section class="home-places" aria-labelledby="places-title">
      <div class="section-heading"><p class="eyebrow">Twoje miejsca</p><h2 id="places-title">Wróć do poznanych materiałów</h2></div>
      <div class="quick-grid">
        <a class="quiet-card quiet-card--workshop" href="#/workshop"><span class="place-illustration">${materialIllustration('workshop')}</span><span><strong>Pracownia</strong><small>Narzędzia ułożone na cyfrowej półce.</small></span>${icon('arrow')}</a>
        <a class="quiet-card quiet-card--portfolio" href="#/works"><span class="place-illustration">${materialIllustration('portfolio')}</span><span><strong>Moje prace</strong><small>Spokojna galeria Twoich pomysłów.</small></span>${icon('arrow')}</a>
      </div>
    </section>
    <section class="path-summary">
      <div><p class="eyebrow">Twoja ścieżka</p><h2>Każda rzecz ma swój czas</h2><a class="text-link" href="#/path">Zobacz lekcje ${icon('arrow')}</a></div>
      ${progressDots(progress)}
    </section>`
  return { html: appLayout(content, student, '/home') }
}
