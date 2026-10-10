import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

const parts = [
  { id: 'monitor', name: 'Monitor', icon: 'monitor' },
  { id: 'tower', name: 'Jednostka centralna', icon: 'tower' },
  { id: 'keyboard', name: 'Klawiatura', icon: 'keyboard' },
  { id: 'mouse', name: 'Mysz', icon: 'mouse' },
  { id: 'headphones', name: 'Słuchawki', icon: 'headphones' },
]

export function lessonOneView({ render, navigate }) {
  startLesson(1)
  let stage = 1
  let placed = new Set()
  let selected = null
  let question = 0
  const questions = [
    ['Chcę wpisać swoje imię.', 'keyboard'], ['Chcę wskazać coś na ekranie.', 'mouse'], ['Chcę usłyszeć dźwięk.', 'headphones'],
  ]

  function stepOne() {
    return `<section class="lesson-task"><p class="eyebrow">Ustaw komputer</p><h2>Zbuduj stanowisko komputerowe.</h2><p>Przeciągnij każdy przedmiot na jego miejsce. Możesz też wybrać przedmiot, a potem miejsce.</p>
      <div class="computer-activity">
        <div class="parts-tray" aria-label="Części komputera">${parts.filter((part) => !placed.has(part.id)).map((part) => `<button class="computer-part ${selected === part.id ? 'is-selected' : ''}" type="button" draggable="true" data-part="${part.id}" aria-pressed="${selected === part.id}">${icon(part.icon)}<span>${part.name}</span></button>`).join('') || '<p class="tray-complete">Wszystko jest na miejscu.</p>'}</div>
        <div class="desk-scene" aria-label="Biurko z miejscami na części komputera">
          <div class="desk-wall"></div><div class="desk-top"></div><div class="desk-leg desk-leg--left"></div><div class="desk-leg desk-leg--right"></div>
          ${parts.map((part) => `<button type="button" class="drop-zone drop-zone--${part.id} ${placed.has(part.id) ? 'is-filled' : ''}" data-zone="${part.id}" aria-label="Miejsce: ${part.name}">${placed.has(part.id) ? `${icon(part.icon)}<span class="sr-only">${part.name} ustawiono</span>` : `<span>${part.name}</span>`}</button>`).join('')}
        </div>
      </div>
      <p class="gentle-hint" role="status">${placed.size ? `${placed.size} z 5 elementów jest na miejscu.` : 'Zacznij od monitora.'}</p>
    </section>`
  }

  function stepTwo() {
    const [prompt] = questions[question]
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Czego potrzebujesz?</p><h2>${prompt}</h2><div class="choice-grid">${parts.filter((part) => ['keyboard', 'mouse', 'headphones'].includes(part.id)).map((part) => `<button type="button" class="object-choice" data-answer="${part.id}">${icon(part.icon)}<span>${part.name}</span></button>`).join('')}</div><p class="gentle-hint" role="status">Pytanie ${question + 1} z 3</p></section>`
  }

  function stepThree() {
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Dobre stanowisko</p><h2>Jak usiąść przy komputerze?</h2><div class="posture-grid">
      <button type="button" class="posture-card" data-posture="wrong"><span class="posture-person posture-person--close" aria-hidden="true"><i></i><b></b></span><strong>Bardzo blisko ekranu</strong></button>
      <button type="button" class="posture-card" data-posture="correct"><span class="posture-person posture-person--good" aria-hidden="true"><i></i><b></b></span><strong>Prosto, ze stopami na podłodze</strong></button>
      <button type="button" class="posture-card" data-posture="wrong"><span class="posture-person posture-person--twist" aria-hidden="true"><i></i><b></b></span><strong>Bokiem do biurka</strong></button>
    </div><p class="gentle-hint" role="status">Wybierz wygodne i bezpieczne ustawienie.</p></section>`
  }

  function completeScreen() {
    return `<section class="completion-card"><span class="completion-check">${icon('check')}</span><p class="eyebrow">Gotowe</p><h2>Budowa komputera ukończona.</h2><p>Świetnie. Następna lekcja jest już dostępna.</p><button class="button button--primary" type="button" data-finish>Wróć do domu</button></section>`
  }

  function current() {
    const content = stage === 1 ? stepOne() : stage === 2 ? stepTwo() : stage === 3 ? stepThree() : completeScreen()
    return { html: lessonLayout(content, 'Budowa komputera', Math.min(stage, 3)), mount }
  }

  function rerender() { render(current()) }

  function tryPlace(partId, zoneId) {
    if (partId === zoneId) {
      placed.add(partId); selected = null
      if (placed.size === parts.length) setTimeout(() => { stage = 2; rerender() }, 250)
      else rerender()
    } else {
      selected = null; rerender()
    }
  }

  function mount(root) {
    if (stage === 1) {
      root.querySelectorAll('[data-part]').forEach((part) => {
        part.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', part.dataset.part))
        part.addEventListener('click', () => { selected = part.dataset.part; rerender() })
      })
      root.querySelectorAll('[data-zone]').forEach((zone) => {
        zone.addEventListener('dragover', (event) => event.preventDefault())
        zone.addEventListener('drop', (event) => { event.preventDefault(); tryPlace(event.dataTransfer.getData('text/plain'), zone.dataset.zone) })
        zone.addEventListener('click', () => { if (selected) tryPlace(selected, zone.dataset.zone) })
      })
    } else if (stage === 2) {
      root.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
        if (button.dataset.answer !== questions[question][1]) return
        question += 1
        if (question === questions.length) stage = 3
        rerender()
      }))
    } else if (stage === 3) {
      root.querySelectorAll('[data-posture]').forEach((button) => button.addEventListener('click', () => {
        if (button.dataset.posture !== 'correct') return
        completeLesson(1); stage = 4; rerender()
      }))
    } else {
      root.querySelector('[data-finish]').addEventListener('click', () => navigate('/home'))
    }
  }

  return current()
}
