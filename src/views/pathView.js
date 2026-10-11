import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { lessons, moduleNames } from '../data/lessons.js'
import { getStudentProgress } from '../storage/studentStorage.js'

const labels = { completed: 'Ukończona', available: 'Dostępna', 'in-progress': 'Rozpoczęta', locked: 'Jeszcze niedostępna', review: 'Do powtórki' }

export function pathView({ student }) {
  const progress = getStudentProgress()
  const groups = moduleNames.map((name, index) => ({ name, lessons: lessons.filter((lesson) => lesson.moduleId === index + 1) }))
  const content = `<section class="path-heading"><div><p class="eyebrow">Twoja ścieżka</p><h1>Pracujemy krok po kroku</h1></div><p>Nie trzeba się spieszyć. Każda lekcja otwiera następną.</p></section>
    <div class="lesson-modules" aria-label="Ścieżka lekcji">
      ${groups.map((group, index) => `<section class="module-card module-card--${(index % 3) + 1}">
        <header><span class="module-number">${index + 1}</span><div><small>Moduł ${index + 1}</small><h2>${group.name}</h2></div></header>
        <ol class="lesson-list">${group.lessons.map((lesson) => {
          const status = progress[lesson.id] || 'locked'
          const mark = status === 'completed' ? icon('check') : status === 'locked' ? icon('lock') : '<span class="current-mark">●</span>'
          const available = status !== 'locked' && lesson.implemented
          const row = `<span class="lesson-status lesson-status--${status}">${mark}</span><span class="lesson-row-copy"><small>${labels[status]}</small><strong><span>${lesson.id}</span>${lesson.title}</strong></span>${available ? icon('arrow') : ''}`
          return `<li class="lesson-step lesson-step--${status}">${available ? `<a href="#/lesson/${lesson.id}" class="lesson-row lesson-row--${status}">${row}</a>` : `<div class="lesson-row lesson-row--${status} ${status === 'locked' ? 'is-locked' : ''}">${row}</div>`}</li>`
        }).join('')}</ol>
      </section>`).join('')}
    </div>`
  return { html: appLayout(content, student) }
}
