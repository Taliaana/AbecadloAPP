import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonTwoView({ render, navigate }) {
  startLesson(2)
  let step = 1
  let selected = false
  let placed = new Set()
  let keyboardClicks = 0

  function content() {
    if (step === 1) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Kliknięcie</p><h2>Kliknij niebieskie koło.</h2><div class="click-field"><button class="click-target" type="button" aria-label="Niebieskie koło"></button></div></section>`
    if (step === 2) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Dwuklik</p><h2>Kliknij dwa razy w teczkę.</h2><button class="folder-target" type="button" aria-label="Teczka. Wykonaj dwuklik"><span></span></button><p class="gentle-hint">Dwa szybkie kliknięcia.</p></section>`
    if (step === 3) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Przeciąganie</p><h2>Przenieś kartkę do koszyka.</h2><div class="drag-field"><button type="button" draggable="true" class="paper-item ${selected ? 'is-selected' : ''}" data-paper aria-pressed="${selected}"><span></span>Kartka</button><button type="button" class="basket-zone" data-basket aria-label="Koszyk">${icon('works')}<span>Koszyk</span></button></div><p class="gentle-hint">Możesz przeciągnąć lub wybrać kartkę i koszyk.</p></section>`
    if (step === 4) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Małe puzzle</p><h2>Ułóż cztery części obrazka.</h2><div class="puzzle-wrap"><div class="puzzle-pieces">${[1,2,3,4].filter((id) => !placed.has(id)).map((id) => `<button type="button" draggable="true" class="puzzle-piece piece-${id}" data-piece="${id}" aria-label="Element ${id}">${id}</button>`).join('')}</div><div class="puzzle-board">${[1,2,3,4].map((id) => `<button type="button" class="puzzle-slot slot-${id} ${placed.has(id) ? 'is-filled' : ''}" data-slot="${id}" aria-label="Miejsce ${id}">${placed.has(id) ? '' : id}</button>`).join('')}</div></div></section>`
    return `<section class="completion-card"><span class="completion-check">${icon('check')}</span><p class="eyebrow">Gotowe</p><h2>Obsługuję mysz ukończona.</h2><p>Na półce czeka już narzędzie „Ćwicz mysz”.</p><button class="button button--primary" type="button" data-finish>Wróć do domu</button></section>`
  }

  function current() { return { html: lessonLayout(content(), 'Obsługuję mysz', Math.min(step, 4), 4), mount } }
  function next() { step += 1; if (step === 5) completeLesson(2); render(current()) }
  function place(id, slot) { if (String(id) !== String(slot)) return; placed.add(Number(id)); selected = false; if (placed.size === 4) setTimeout(next, 250); else render(current()) }

  function mount(root) {
    if (step === 1) root.querySelector('.click-target').addEventListener('click', next)
    if (step === 2) {
      const folder = root.querySelector('.folder-target')
      folder.addEventListener('dblclick', next)
      folder.addEventListener('click', (event) => {
        if (event.detail !== 0) return
        keyboardClicks += 1
        if (keyboardClicks === 2) next()
      })
    }
    if (step === 3) {
      const paper = root.querySelector('[data-paper]'); const basket = root.querySelector('[data-basket]')
      paper.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', 'paper'))
      paper.addEventListener('click', () => { selected = true; render(current()) })
      basket.addEventListener('dragover', (event) => event.preventDefault())
      basket.addEventListener('drop', (event) => { event.preventDefault(); if (event.dataTransfer.getData('text/plain') === 'paper') next() })
      basket.addEventListener('click', () => { if (selected) next() })
    }
    if (step === 4) {
      root.querySelectorAll('[data-piece]').forEach((piece) => {
        piece.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', piece.dataset.piece))
        piece.addEventListener('click', () => { selected = Number(piece.dataset.piece); render(current()) })
      })
      root.querySelectorAll('[data-slot]').forEach((slot) => {
        slot.addEventListener('dragover', (event) => event.preventDefault())
        slot.addEventListener('drop', (event) => { event.preventDefault(); place(event.dataTransfer.getData('text/plain'), slot.dataset.slot) })
        slot.addEventListener('click', () => { if (selected) place(selected, slot.dataset.slot) })
      })
    }
    if (step === 5) root.querySelector('[data-finish]').addEventListener('click', () => navigate('/home'))
  }
  return current()
}
