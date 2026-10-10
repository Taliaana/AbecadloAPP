import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { progressDots } from '../components/progress.js'
import { lessons } from '../data/lessons.js'
import { getStudentProgress } from '../storage/studentStorage.js'

export function homeView({ student }) {
  const progress = getStudentProgress()
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
        <a class="button button--primary" href="#/lesson/${nextLesson.id}">${isReview ? 'Powtórz' : progress[nextLesson.id] === 'in-progress' ? 'Kontynuuj' : 'Rozpocznij'} ${icon('arrow')}</a>
      </div>
      <div class="today-illustration" aria-hidden="true">
        <div class="mini-monitor"><span></span></div><div class="mini-keyboard"></div><div class="mini-plant">${icon('leaf')}</div>
      </div>
    </section>
    <section class="quick-grid" aria-label="Pozostałe miejsca">
      <a class="quiet-card" href="#/free-work"><span class="round-icon round-icon--blue">${icon('shelf')}</span><span><strong>Praca wolna</strong><small>Wracaj do poznanych narzędzi.</small></span>${icon('arrow')}</a>
      <a class="quiet-card" href="#/works"><span class="round-icon round-icon--yellow">${icon('works')}</span><span><strong>Moje prace</strong><small>Zobacz swoje cyfrowe portfolio.</small></span>${icon('arrow')}</a>
    </section>
    <section class="path-summary">
      <div><p class="eyebrow">Twoja ścieżka</p><h2>Małe kroki, po kolei</h2></div>
      ${progressDots(progress)}
      <a class="text-link" href="#/path">Zobacz wszystkie lekcje ${icon('arrow')}</a>
    </section>`
  return { html: appLayout(content, student, '/home') }
}
