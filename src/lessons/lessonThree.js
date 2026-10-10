import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonThreeView({ render, navigate, student }) {
  startLesson(3)
  let step = 1
  let found = new Set()
  let usedSpace = false
  let usedBackspace = false

  function content() {
    if (step === 1) return `<section class="lesson-task lesson-task--center keyboard-task"><p class="eyebrow">Pisanie</p><h2>Napisz swoje imię.</h2><label class="large-input"><span class="sr-only">Twoje imię</span><input data-name autocomplete="off" placeholder="Tutaj napisz…" /></label><button class="button button--primary" type="button" data-next disabled>Dalej</button></section>`
    if (step === 2) return `<section class="lesson-task lesson-task--center keyboard-task"><p class="eyebrow">Spacja i Backspace</p><h2>Napisz „mały kotx”.</h2><p>Oddziel wyrazy spacją, a potem usuń dodatkowe x klawiszem Backspace.</p><label class="large-input"><span class="sr-only">Wpisz mały kotx, potem usuń x</span><input data-phrase autocomplete="off" placeholder="mały kotx" /></label><button class="button button--primary" type="button" data-next disabled>Dalej</button></section>`
    if (step === 3) return `<section class="lesson-task lesson-task--center keyboard-task"><p class="eyebrow">Enter</p><h2>Napisz „gotowe” i naciśnij Enter.</h2><label class="large-input"><span class="sr-only">Wpisz gotowe i naciśnij Enter</span><input data-enter autocomplete="off" placeholder="gotowe" /></label><p class="gentle-hint">Enter zatwierdza.</p></section>`
    if (step === 4) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Znajdź klawisze</p><h2>Wybierz: Spacja, Backspace i Enter.</h2><div class="key-finder">${['Shift','Spacja','A','Backspace','Enter','Tab'].map((key) => `<button type="button" class="key-button ${found.has(key) ? 'is-found' : ''}" data-key="${key}" ${found.has(key) ? 'disabled' : ''}>${found.has(key) ? `${icon('check')} ` : ''}${key}</button>`).join('')}</div><p class="gentle-hint" role="status">Znaleziono ${found.size} z 3.</p></section>`
    return `<section class="completion-card"><span class="completion-check">${icon('check')}</span><p class="eyebrow">Gotowe</p><h2>Poznaję klawiaturę ukończona.</h2><p>Typewriting jest już dostępny w Pracy wolnej.</p><button class="button button--primary" type="button" data-finish>Przejdź do Pracy wolnej</button></section>`
  }

  function current() { return { html: lessonLayout(content(), 'Poznaję klawiaturę', Math.min(step, 4), 4), mount } }
  function next() { step += 1; if (step === 5) completeLesson(3); render(current()) }
  function mount(root) {
    if (step === 1) {
      const input = root.querySelector('[data-name]'); const button = root.querySelector('[data-next]')
      input.value = ''; input.focus(); input.addEventListener('input', () => { button.disabled = input.value.trim().length < 2 }); button.addEventListener('click', next)
    }
    if (step === 2) {
      const input = root.querySelector('[data-phrase]'); const button = root.querySelector('[data-next]')
      input.focus()
      input.addEventListener('keydown', (event) => {
        if (event.key === ' ') usedSpace = true
        if (event.key === 'Backspace') usedBackspace = true
      })
      input.addEventListener('input', () => { button.disabled = input.value.trim().toLocaleLowerCase('pl') !== 'mały kot' || !usedSpace || !usedBackspace })
      button.addEventListener('click', next)
    }
    if (step === 3) {
      const input = root.querySelector('[data-enter]'); input.focus(); input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && input.value.trim().toLowerCase() === 'gotowe') next() })
    }
    if (step === 4) root.querySelectorAll('[data-key]').forEach((button) => button.addEventListener('click', () => {
      if (!['Spacja', 'Backspace', 'Enter'].includes(button.dataset.key)) return
      found.add(button.dataset.key); if (found.size === 3) setTimeout(next, 250); else render(current())
    }))
    if (step === 5) root.querySelector('[data-finish]').addEventListener('click', () => navigate('/free-work'))
  }
  return current()
}
