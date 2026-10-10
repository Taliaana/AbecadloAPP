import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonFourView({ render, navigate }) {
  startLesson(4)
  let step = 1
  let found = new Set()
  let position = 0
  const sequence = 'fjjf'

  function keyboard(keys, active = '') {
    return `<div class="lesson-keyboard" role="group" aria-label="Rząd klawiatury">${keys.map((key) => `<button type="button" class="typing-key ${active === key.toLowerCase() ? 'is-active' : ''} ${found.has(key) ? 'is-found' : ''}" data-letter="${key.toLowerCase()}">${found.has(key) ? icon('check') : key}${['F', 'J'].includes(key) ? '<i></i>' : ''}</button>`).join('')}</div>`
  }

  function content() {
    if (step === 1) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Klawisze prowadzące</p><h2>Znajdź F i J.</h2><p>Na tych klawiszach poczujesz małe wypustki.</p>${keyboard(['A','S','D','F','G','H','J','K','L'])}<p class="gentle-hint" role="status">Znaleziono ${found.size} z 2.</p></section>`
    if (step === 2) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Spokojny rytm</p><h2>Naciśnij ${sequence[position].toUpperCase()}.</h2><div class="typing-sequence lesson-sequence">${[...sequence].map((letter, index) => `<span class="${index < position ? 'is-done' : index === position ? 'is-current' : ''}">${index < position ? icon('check') : letter.toUpperCase()}</span>`).join('')}</div>${keyboard(['A','S','D','F','J','K','L'], sequence[position])}<p class="gentle-hint">Patrz na ekran. Nie musisz się spieszyć.</p></section>`
    if (step === 3) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Układam dłonie</p><h2>Gdzie położyć palce wskazujące?</h2><div class="hand-choice-grid"><button type="button" class="hand-choice" data-answer="wrong"><strong>Na A i L</strong><span>Skrajne klawisze</span></button><button type="button" class="hand-choice" data-answer="correct"><strong>Na F i J</strong><span>Klawisze z wypustkami</span></button></div></section>`
    return `<section class="completion-card"><span class="completion-check">${icon('check')}</span><p class="eyebrow">Gotowe</p><h2>Układam dłonie ukończona.</h2><p>Możesz ćwiczyć F i J w Pracy wolnej.</p><button class="button button--primary" type="button" data-finish>Otwórz Typewriting</button></section>`
  }

  function current() { return { html: lessonLayout(content(), 'Typewriting – układam dłonie', Math.min(step, 3), 3), mount } }
  function next() { step += 1; if (step === 4) completeLesson(4); render(current()) }
  function press(key) {
    if (key !== sequence[position]) return
    position += 1
    if (position === sequence.length) next()
    else render(current())
  }
  function mount(root) {
    if (step === 1) root.querySelectorAll('[data-letter]').forEach((button) => button.addEventListener('click', () => {
      if (!['f', 'j'].includes(button.dataset.letter)) return
      found.add(button.dataset.letter.toUpperCase())
      if (found.size === 2) setTimeout(next, 250)
      else render(current())
    }))
    if (step === 2) {
      root.querySelectorAll('[data-letter]').forEach((button) => button.addEventListener('click', () => press(button.dataset.letter)))
      const onKey = (event) => {
        const key = event.key.toLowerCase()
        if (!['f', 'j'].includes(key)) return
        event.preventDefault(); press(key)
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
    if (step === 3) root.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
      if (button.dataset.answer === 'correct') next()
    }))
    if (step === 4) root.querySelector('[data-finish]').addEventListener('click', () => navigate('/tools/typewriting'))
  }
  return current()
}
