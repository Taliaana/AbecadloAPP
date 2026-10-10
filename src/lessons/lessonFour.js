import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completionScreen, createStepFlow } from '../components/lessonFlow.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonFourView({ render }) {
  startLesson(4)
  const flow = createStepFlow(3)
  const found = new Set()
  let position = 0
  const sequence = 'fjjf'
  function keyboard(keys, active = '') {
    return `<div class="lesson-keyboard" role="group" aria-label="Rząd klawiatury">${keys.map((key) => `<button type="button" class="typing-key ${active === key.toLowerCase() ? 'is-active' : ''} ${found.has(key) ? 'is-found' : ''}" data-letter="${key.toLowerCase()}">${found.has(key) ? icon('check') : key}${['F','J'].includes(key) ? '<i></i>' : ''}</button>`).join('')}</div>`
  }
  function activity() {
    if (flow.currentStep === 1) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Klawisze prowadzące</p><h2>Znajdź F i J.</h2><p>Na tych klawiszach poczujesz małe wypustki.</p>${keyboard(['A','S','D','F','G','H','J','K','L'])}<p class="gentle-hint" role="status">Znaleziono ${found.size} z 2.</p></section>`
    if (flow.currentStep === 2) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Spokojny rytm</p><h2>Naciśnij ${sequence[position].toUpperCase()}.</h2><div class="typing-sequence lesson-sequence">${[...sequence].map((letter, index) => `<span class="${index < position ? 'is-done' : index === position ? 'is-current' : ''}">${index < position ? icon('check') : letter.toUpperCase()}</span>`).join('')}</div>${keyboard(['A','S','D','F','J','K','L'], sequence[position])}<p class="gentle-hint">Patrz na ekran. Nie musisz się spieszyć.</p></section>`
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Układam dłonie</p><h2>Gdzie położyć palce wskazujące?</h2><div class="hand-choice-grid"><button type="button" class="hand-choice" data-answer="wrong"><strong>Na A i L</strong><span>Skrajne klawisze</span></button><button type="button" class="hand-choice" data-answer="correct"><strong>Na F i J</strong><span>Klawisze z wypustkami</span></button></div></section>`
  }
  function current() {
    const content = flow.phase === 'complete' ? completionScreen({ final: flow.isFinalStep, lessonTitle: 'Typewriting – układam dłonie', finalMessage: 'Możesz ćwiczyć F i J w Pracowni.' }) : activity()
    return { html: lessonLayout(content, 'Typewriting – układam dłonie', flow.currentStep, 3), mount }
  }
  const rerender = () => render(current())
  function finishStep() { if (flow.isFinalStep) completeLesson(4); flow.completeStep(); rerender() }
  function press(key) { if (key !== sequence[position]) return; position += 1; if (position === sequence.length) finishStep(); else rerender() }
  function mount(root) {
    if (flow.phase === 'complete') { root.querySelector('[data-step-continue]')?.addEventListener('click', () => { flow.continue(); rerender() }); return }
    if (flow.currentStep === 1) root.querySelectorAll('[data-letter]').forEach((button) => button.addEventListener('click', () => {
      if (!['f','j'].includes(button.dataset.letter)) return
      found.add(button.dataset.letter.toUpperCase()); if (found.size === 2) finishStep(); else rerender()
    }))
    if (flow.currentStep === 2) {
      root.querySelectorAll('[data-letter]').forEach((button) => button.addEventListener('click', () => press(button.dataset.letter)))
      const onKey = (event) => { const key = event.key.toLowerCase(); if (['f','j'].includes(key)) { event.preventDefault(); press(key) } }
      window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
    }
    if (flow.currentStep === 3) root.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => { if (button.dataset.answer === 'correct') finishStep() }))
  }
  return current()
}
