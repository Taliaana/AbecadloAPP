import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { lessons, moduleNames } from '../data/lessons.js'
import { getStudentProgress } from '../storage/studentStorage.js'

const labels = { completed: 'Ukończona', available: 'Dostępna', 'in-progress': 'Rozpoczęta', locked: 'Jeszcze niedostępna', review: 'Do powtórki' }

export function pathView({ student }) {
  const progress = getStudentProgress()
  const groups = moduleNames.map((name, index) => ({ name, lessons: lessons.filter((lesson) => lesson.moduleId === index + 1) }))
  const content = `<section class="page-heading"><p class="eyebrow">Twoja ścieżka</p><h1>Lekcje krok po kroku</h1><p>Ukończ lekcję, aby otworzyć następną.</p></section>
    <div class="lesson-modules">
      ${groups.map((group, index) => `<section class="module-card">
        <header><span>Moduł ${index + 1}</span><h2>${group.name}</h2></header>
        <ol class="lesson-list">${group.lessons.map((lesson) => {
          const status = progress[lesson.id] || 'locked'
          const mark = status === 'completed' ? icon('check') : status === 'locked' ? icon('lock') : '<span class="current-mark">●</span>'
          const available = status !== 'locked' && lesson.implemented
          const row = `<span class="lesson-status lesson-status--${status}">${mark}</span><span class="lesson-row-copy"><strong>${lesson.id}. ${lesson.title}</strong><small>${labels[status]}</small></span>${available ? icon('arrow') : ''}`
          return `<li>${available ? `<a href="#/lesson/${lesson.id}" class="lesson-row">${row}</a>` : `<div class="lesson-row ${status === 'locked' ? 'is-locked' : ''}">${row}</div>`}</li>`
        }).join('')}</ol>
      </section>`).join('')}
    </div>`
  return { html: appLayout(content, student) }
}
