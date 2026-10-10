import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completionScreen, createStepFlow } from '../components/lessonFlow.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonThreeView({ render }) {
  startLesson(3)
  const flow = createStepFlow(4)
  const found = new Set()
  let usedSpace = false
  let usedBackspace = false

  function activity() {
    if (flow.currentStep === 1) return `<section class="lesson-task lesson-task--center keyboard-task"><p class="eyebrow">Pisanie</p><h2>Napisz swoje imię.</h2><label class="large-input"><span class="sr-only">Twoje imię</span><input data-name autocomplete="off" placeholder="Tutaj napisz…" /></label><button class="button button-primary" type="button" data-finish-step disabled>Dalej</button></section>`
    if (flow.currentStep === 2) return `<section class="lesson-task lesson-task--center keyboard-task"><p class="eyebrow">Spacja i Backspace</p><h2>Napisz „mały kotx”.</h2><p>Oddziel wyrazy spacją, a potem usuń dodatkowe x klawiszem Backspace.</p><label class="large-input"><span class="sr-only">Wpisz mały kotx, potem usuń x</span><input data-phrase autocomplete="off" placeholder="mały kotx" /></label><button class="button button-primary" type="button" data-finish-step disabled>Dalej</button></section>`
    if (flow.currentStep === 3) return `<section class="lesson-task lesson-task--center keyboard-task"><p class="eyebrow">Enter</p><h2>Napisz „gotowe” i naciśnij Enter.</h2><label class="large-input"><span class="sr-only">Wpisz gotowe i naciśnij Enter</span><input data-enter autocomplete="off" placeholder="gotowe" /></label><p class="gentle-hint">Enter zatwierdza.</p></section>`
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Znajdź klawisze</p><h2>Wybierz: Spacja, Backspace i Enter.</h2><div class="key-finder">${['Shift','Spacja','A','Backspace','Enter','Tab'].map((key) => `<button type="button" class="key-button ${found.has(key) ? 'is-found' : ''}" data-key="${key}" ${found.has(key) ? 'disabled' : ''}>${found.has(key) ? `${icon('check')} ` : ''}${key}</button>`).join('')}</div><p class="gentle-hint" role="status">Znaleziono ${found.size} z 3.</p></section>`
  }
  function current() {
    const content = flow.phase === 'complete' ? completionScreen({ final: flow.isFinalStep, lessonTitle: 'Poznaję klawiaturę', nextLessonId: 4, nextUnlocked: flow.isFinalStep }) : activity()
    return { html: lessonLayout(content, 'Poznaję klawiaturę', flow.currentStep, 4), mount }
  }
  const rerender = () => render(current())
  function finishStep() { if (flow.isFinalStep) completeLesson(3); flow.completeStep(); rerender() }
  function mount(root) {
    if (flow.phase === 'complete') { root.querySelector('[data-step-continue]')?.addEventListener('click', () => { flow.continue(); rerender() }); return }
    if (flow.currentStep === 1) {
      const input = root.querySelector('[data-name]'); const button = root.querySelector('[data-finish-step]'); input.focus()
      input.addEventListener('input', () => { button.disabled = input.value.trim().length < 2 }); button.addEventListener('click', finishStep)
    }
    if (flow.currentStep === 2) {
      const input = root.querySelector('[data-phrase]'); const button = root.querySelector('[data-finish-step]'); input.focus()
      input.addEventListener('keydown', (event) => { if (event.key === ' ') usedSpace = true; if (event.key === 'Backspace') usedBackspace = true })
      input.addEventListener('input', () => { button.disabled = input.value.trim().toLocaleLowerCase('pl') !== 'mały kot' || !usedSpace || !usedBackspace })
      button.addEventListener('click', finishStep)
    }
    if (flow.currentStep === 3) {
      const input = root.querySelector('[data-enter]'); input.focus(); input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && input.value.trim().toLowerCase() === 'gotowe') finishStep() })
    }
    if (flow.currentStep === 4) root.querySelectorAll('[data-key]').forEach((button) => button.addEventListener('click', () => {
      if (!['Spacja', 'Backspace', 'Enter'].includes(button.dataset.key)) return
      found.add(button.dataset.key); if (found.size === 3) finishStep(); else rerender()
    }))
  }
  return current()
}
