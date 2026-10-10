import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completionScreen, createStepFlow } from '../components/lessonFlow.js'
import { bindDoubleClick, bindDragDrop } from '../components/activityBindings.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonTwoView({ render }) {
  startLesson(2)
  const flow = createStepFlow(4)
  let selected = false
  const placed = new Set()

  function activity() {
    if (flow.currentStep === 1) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Kliknięcie</p><h2>Kliknij niebieskie koło.</h2><div class="click-field"><button class="click-target" type="button" aria-label="Niebieskie koło"></button></div></section>`
    if (flow.currentStep === 2) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Dwuklik</p><h2>Kliknij dwa razy w teczkę.</h2><button class="folder-target" type="button" aria-label="Teczka. Wykonaj dwuklik"><span></span></button><p class="gentle-hint">Dwa szybkie kliknięcia.</p></section>`
    if (flow.currentStep === 3) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Przeciąganie</p><h2>Przenieś kartkę do koszyka.</h2><div class="drag-field"><button type="button" draggable="true" class="paper-item ${selected ? 'is-selected' : ''}" data-paper aria-pressed="${Boolean(selected)}"><span></span>Kartka</button><button type="button" class="basket-zone" data-basket aria-label="Koszyk">${icon('works')}<span>Koszyk</span></button></div><p class="gentle-hint">Możesz przeciągnąć lub wybrać kartkę i koszyk.</p></section>`
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Małe puzzle</p><h2>Ułóż cztery części obrazka.</h2><div class="puzzle-wrap"><div class="puzzle-pieces">${[1,2,3,4].filter((id) => !placed.has(id)).map((id) => `<button type="button" draggable="true" class="puzzle-piece piece-${id}" data-piece="${id}" aria-label="Element ${id}">${id}</button>`).join('')}</div><div class="puzzle-board">${[1,2,3,4].map((id) => `<button type="button" class="puzzle-slot slot-${id} ${placed.has(id) ? 'is-filled' : ''}" data-slot="${id}" aria-label="Miejsce ${id}">${placed.has(id) ? '' : id}</button>`).join('')}</div></div></section>`
  }
  function current() {
    const content = flow.phase === 'complete' ? completionScreen({ final: flow.isFinalStep, lessonTitle: 'Obsługuję mysz', nextLessonId: 3, nextUnlocked: flow.isFinalStep }) : activity()
    return { html: lessonLayout(content, 'Obsługuję mysz', flow.currentStep, 4), mount }
  }
  const rerender = () => render(current())
  function finishStep() { if (flow.isFinalStep) completeLesson(2); flow.completeStep(); rerender() }
  function place(id, slot) {
    if (String(id) !== String(slot)) return
    placed.add(Number(id)); selected = false
    if (placed.size === 4) finishStep(); else rerender()
  }
  function mount(root) {
    if (flow.phase === 'complete') { root.querySelector('[data-step-continue]')?.addEventListener('click', () => { flow.continue(); rerender() }); return }
    if (flow.currentStep === 1) root.querySelector('.click-target').addEventListener('click', finishStep)
    if (flow.currentStep === 2) {
      bindDoubleClick(root.querySelector('.folder-target'), finishStep)
    }
    if (flow.currentStep === 3) {
      const paper = root.querySelector('[data-paper]'); const basket = root.querySelector('[data-basket]')
      paper.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', 'paper'))
      paper.addEventListener('click', () => { selected = true; rerender() })
      basket.addEventListener('dragover', (event) => event.preventDefault())
      basket.addEventListener('drop', (event) => { event.preventDefault(); if (event.dataTransfer.getData('text/plain') === 'paper') finishStep() })
      basket.addEventListener('click', () => { if (selected) finishStep() })
    }
    if (flow.currentStep === 4) {
      bindDragDrop(root, { sourceSelector: '[data-piece]', zoneSelector: '[data-slot]', sourceAttribute: 'piece', zoneAttribute: 'slot', onSelect: (id) => { selected = Number(id); rerender() }, getSelected: () => selected, onDrop: place })
    }
  }
  return current()
}
