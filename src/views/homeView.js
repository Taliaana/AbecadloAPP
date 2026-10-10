import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { progressDots } from '../components/progress.js'
import { lessons } from '../data/lessons.js'
import { getAssignmentsForStudent, getResumableWork, getStudentProgress } from '../storage/studentStorage.js'

export function homeView({ student }) {
  const progress = getStudentProgress()
  const resumableWork = getResumableWork()
  const assignments = getAssignmentsForStudent()
  const nextLesson = lessons.find((lesson) => ['available', 'in-progress'].includes(progress[lesson.id])) || [...lessons].reverse().find((lesson) => progress[lesson.id] === 'completed') || lessons[0]
  const isReview = progress[nextLesson.id] === 'completed'
  const content = `
    <section class="page-heading home-heading">
      <p class="eyebrow">Dzień dobry</p>
      <h1>Cześć, ${student.profile.greetingName}</h1>
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
    ${resumableWork ? `<section class="resume-card"><span class="round-icon round-icon--blue">${icon('edit')}</span><div><p class="eyebrow">${resumableWork.status === 'returned' ? 'Wróć do swojej pracy' : 'Masz rozpoczętą pracę'}</p><h2>${resumableWork.title}</h2><p>${resumableWork.status === 'returned' ? 'Możesz jeszcze popracować nad tą pracą.' : 'Wszystkie zmiany są zapisane.'}</p></div><a class="button button-primary" href="#/work/${resumableWork.id}">Kontynuuj</a></section>` : ''}
    ${assignments.length ? `<section class="assignment-section"><div><p class="eyebrow">Dodatkowe zadanie</p><h2>Od nauczyciela</h2></div><div class="assignment-list">${assignments.map((assignment) => `<a class="assignment-card" href="#/assignment/${assignment.id}"><span class="round-icon round-icon--yellow">${icon('brush')}</span><span><strong>${assignment.title}</strong><small>${assignment.instruction}</small></span>${icon('arrow')}</a>`).join('')}</div></section>` : ''}
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
