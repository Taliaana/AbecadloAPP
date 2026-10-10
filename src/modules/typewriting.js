import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { typingLessons } from '../data/typingLessons.js'
import { getUnlockedTools, saveTypingResult } from '../storage/studentStorage.js'

export function typewritingView({ student, render, navigate }) {
  if (!getUnlockedTools().includes('typewriting')) return lockedTool(student, navigate)
  const exercise = typingLessons[0]
  let position = 0
  let correct = 0
  let attempts = 0
  let finished = false
  const startedAt = Date.now()

  function screen() {
    const currentKey = exercise.sequence[position]
    const content = `<section class="tool-header"><a class="text-link" href="#/workshop">${icon('back')} Wróć do Pracowni</a><p class="eyebrow">Typewriting · etap 1</p><h1>F i J</h1><p>Połóż palce wskazujące na klawiszach F i J.</p></section>
      ${finished ? `<section class="completion-card completion-card--tool"><span class="completion-check">${icon('check')}</span><p class="eyebrow">Ćwiczenie ukończone</p><h2>Dokładność: ${correct}/${attempts}</h2><p>Ćwicz spokojnie. Szybkość przyjdzie później.</p><button class="button button--primary" type="button" data-again>Jeszcze raz</button></section>` : `<section class="typing-card">
        <p class="typing-instruction">Naciśnij</p><div class="target-letter" aria-live="polite">${currentKey.toUpperCase()}</div>
        <div class="typing-sequence" aria-label="Postęp ćwiczenia">${[...exercise.sequence].map((letter, index) => `<span class="${index < position ? 'is-done' : index === position ? 'is-current' : ''}">${index < position ? icon('check') : letter.toUpperCase()}</span>`).join('')}</div>
        <div class="hand-guide" aria-hidden="true"><span class="hand hand--left"><i></i><i></i><i></i><i class="active-finger"></i></span><span class="hand hand--right"><i class="active-finger"></i><i></i><i></i><i></i></span></div>
        <div class="mini-keyboard" role="group" aria-label="Uproszczona klawiatura">${['A','S','D','F','J','K','L'].map((key) => `<button type="button" class="typing-key ${key.toLowerCase() === currentKey ? 'is-active' : ''}" data-type-key="${key.toLowerCase()}">${key}${['F','J'].includes(key) ? '<i></i>' : ''}</button>`).join('')}</div>
        <p class="accuracy" aria-live="polite">Dokładność: ${correct}/${attempts || 0}</p>
      </section>`}
      <section class="next-stages"><p class="eyebrow">Kolejne etapy</p>${typingLessons.slice(1).map((item) => `<span>${icon('lock')} ${item.title}</span>`).join('')}</section>`
    return { html: appLayout(content, student, '/workshop'), mount }
  }

  function press(key) {
    if (finished || !['f', 'j'].includes(key)) return
    attempts += 1
    if (key === exercise.sequence[position]) { correct += 1; position += 1 }
    if (position === exercise.sequence.length) {
      finished = true
      const minutes = Math.max((Date.now() - startedAt) / 60000, 0.1)
      saveTypingResult(exercise.id, { correct, attempts, wpm: Math.round((position / 5) / minutes) })
    }
    render(screen())
  }

  function mount(root) {
    if (finished) root.querySelector('[data-again]').addEventListener('click', () => navigate('/tools/typewriting?again=1'))
    else {
      root.querySelectorAll('[data-type-key]').forEach((button) => button.addEventListener('click', () => press(button.dataset.typeKey)))
      const onKey = (event) => {
        if (['f', 'j'].includes(event.key.toLowerCase())) { event.preventDefault(); window.removeEventListener('keydown', onKey); press(event.key.toLowerCase()) }
      }
      window.addEventListener('keydown', onKey, { once: false })
      return () => window.removeEventListener('keydown', onKey)
    }
  }
  return screen()
}

function lockedTool(student) {
  return { html: appLayout('<section class="empty-state"><h1>To narzędzie jeszcze czeka</h1><p>Ukończ lekcję „Poznaję klawiaturę”.</p><a class="button button--primary" href="#/home">Wróć do domu</a></section>', student, '/workshop') }
}
