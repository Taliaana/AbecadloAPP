import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completionScreen, createStepFlow } from '../components/lessonFlow.js'
import { equipmentImage, equipmentStation } from '../components/equipmentStation.js'
import { bindSpeechButtons, speechButton } from '../components/speechButton.js'
import { acceptsEquipment, equipment, matchesEquipmentName } from '../data/computerEquipment.js'
import { getLesson } from '../data/lessons.js'
import { completeLesson, startLesson } from '../storage/studentStorage.js'

export function lessonOneView({ render }) {
  startLesson(1)
  const flow = createStepFlow(5)
  const title = getLesson(1).title
  const placed = new Set()
  let index = 0, selected = null, copied = false, matched = false
  let observeUntil = null, arrangeStarted = null, modelUntil = null
  const instruction = (text, symbol) => `<div class="equipment-instruction">${icon(symbol)}<h2>${text}</h2>${speechButton(text)}</div>`
  const deviceName = item => `<div class="equipment-name"><h3>${item.name.toLocaleUpperCase('pl-PL')}</h3>${speechButton(`${item.name}.`, item.name)}</div>`
  const next = `<button type="button" class="button button-primary" data-device-next>Dalej ${icon('arrow')}</button>`

  function learn() {
    const item = equipment[index]
    return `${instruction('Przyjrzyj się urządzeniu.', 'eye')}<p class="eyebrow">Poznaję · ${index + 1} z ${equipment.length}</p>${equipmentImage(item, 'equipment-portrait')}${deviceName(item)}${next}`
  }
  function copy() {
    const item = equipment[index]
    return `${instruction('Przepisz nazwę.', 'keyboard')}<p class="eyebrow">Przepisuję · ${index + 1} z ${equipment.length}</p>${equipmentImage(item, 'equipment-portrait equipment-portrait--small')}${deviceName(item)}<form data-copy-form class="equipment-copy"><label for="equipment-copy">Napisz tak jak we wzorze</label><input id="equipment-copy" data-copy-input autocomplete="off" spellcheck="false" autocapitalize="off" aria-describedby="equipment-copy-feedback" ${copied ? 'disabled' : ''} /><p id="equipment-copy-feedback" role="status" aria-live="polite">${copied ? 'Gotowe.' : ''}</p><button type="submit" class="button button-primary" ${copied ? 'hidden' : ''}>Sprawdź</button></form><div data-copy-next ${copied ? '' : 'hidden'}>${next}</div>`
  }
  function observe() {
    observeUntil ??= Date.now() + 18_000
    return `${instruction('Przyjrzyj się uważnie. Za chwilę spróbujesz ułożyć sprzęt tak samo.', 'eye')}${equipmentStation(new Set(), true)}<button type="button" class="button button-primary" data-observed>Jestem gotowy</button>`
  }
  function arrange() {
    arrangeStarted ??= Date.now()
    const preview = modelUntil && Date.now() < modelUntil
    return `${instruction('Ułóż sprzęt tak jak we wzorze.', 'drag')}<p>Przeciągnij przedmiot. Możesz też wybrać obraz, a potem miejsce.</p><div ${preview ? 'inert' : ''}><div class="equipment-arrange">${equipmentStation(placed)}<div class="equipment-tray" aria-label="Sprzęt do ustawienia">${equipment.filter(item => !placed.has(item.id)).map(item => `<button type="button" class="equipment-piece ${selected === item.id ? 'is-selected' : ''}" draggable="true" data-part="${item.id}" aria-pressed="${selected === item.id}">${equipmentImage(item)}<span>${item.name}</span></button>`).join('')}</div></div><p class="gentle-hint" data-placement-status role="status" aria-live="polite">Wybierz przedmiot i jego miejsce.</p><button type="button" class="button button-secondary" data-show-model ${Date.now() - arrangeStarted >= 60_000 ? '' : 'hidden'}>${icon('eye')} Pokaż wzór</button></div>${preview ? `<section class="equipment-model-overlay" role="dialog" aria-modal="true" aria-label="Wzór stanowiska"><h2>Przyjrzyj się wzorowi.</h2>${speechButton('Przyjrzyj się wzorowi.')}${equipmentStation(new Set(), true)}<button type="button" class="button button-secondary" data-hide-model>Wróć do układania</button></section>` : ''}`
  }
  function match() {
    const item = equipment[index]
    return `${instruction('Połącz obraz z nazwą. Możesz posłuchać.', 'eye')}<p class="eyebrow">Obraz i nazwa · ${index + 1} z ${equipment.length}</p>${equipmentImage(item, 'equipment-portrait equipment-portrait--small')}${matched ? `${deviceName(item)}<p class="equipment-description">${item.description} ${speechButton(item.speechText, `Opis: ${item.name}`)}</p><p role="status">Gotowe.</p>${next}` : `<div class="equipment-name-choices">${[...equipment.slice(2), ...equipment.slice(0, 2)].map(choice => `<div><button type="button" class="button button-secondary" data-match="${choice.id}">${choice.name.toLocaleUpperCase('pl-PL')}</button>${speechButton(`${choice.name}.`, choice.name)}</div>`).join('')}</div><p class="gentle-hint" data-match-status role="status"></p>`}`
  }
  function current() {
    const content = flow.phase === 'complete' ? completionScreen({ final: flow.isFinalStep, lessonTitle: `Lekcja „${title}”`, nextLessonId: 2, nextUnlocked: flow.isFinalStep, finalMessage: 'Sprzęt komputerowy już poznany. Możesz przejść do kolejnej lekcji.' }) : [learn, copy, observe, arrange, match][flow.currentStep - 1]()
    return { html: lessonLayout(`<div class="equipment-lesson">${content}</div>`, title, flow.currentStep, 5), focusTarget: modelUntil && Date.now() < modelUntil ? '[data-hide-model]' : '#main-content', mount }
  }
  const rerender = () => render(current())
  function finishStep() { if (flow.isFinalStep) completeLesson(1); flow.completeStep(); index = 0; copied = false; matched = false; rerender() }
  function nextDevice() {
    if ((flow.currentStep === 2 && !copied) || (flow.currentStep === 5 && !matched)) return
    if (index === equipment.length - 1) finishStep()
    else { index++; copied = false; matched = false; rerender() }
  }
  function mount(root) {
    const stopSpeech = bindSpeechButtons(root)
    const timers = []
    root.querySelectorAll('.equipment-image').forEach(img => img.addEventListener('error', () => {
      img.hidden = true
      const note = document.createElement('p'); note.className = 'equipment-asset-missing'; note.textContent = `Zdjęcie: ${img.alt} — materiał oczekuje na dodanie.`; img.after(note)
    }, { once: true }))
    if (flow.phase === 'complete') root.querySelector('[data-step-continue]')?.addEventListener('click', () => { flow.continue(); rerender() })
    else {
      root.querySelector('[data-device-next]')?.addEventListener('click', nextDevice)
      root.querySelector('[data-copy-form]')?.addEventListener('submit', event => {
        event.preventDefault()
        const input = root.querySelector('[data-copy-input]')
        copied = matchesEquipmentName(input.value, equipment[index].name)
        root.querySelector('#equipment-copy-feedback').textContent = copied ? 'Gotowe.' : 'Spójrz jeszcze raz na wzór.'
        input.setAttribute('aria-invalid', String(!copied))
        if (copied) { input.disabled = true; event.currentTarget.querySelector('[type="submit"]').hidden = true; root.querySelector('[data-copy-next]').hidden = false; root.querySelector('[data-device-next]').focus() }
        else input.focus()
      })
      if (flow.currentStep === 3) {
        root.querySelector('[data-observed]').addEventListener('click', finishStep)
        timers.push(setTimeout(finishStep, Math.max(0, observeUntil - Date.now())))
      }
      if (flow.currentStep === 4) {
        const place = id => {
          placed.add(id); selected = null
          if (placed.size === equipment.length) { finishStep(); return }
          // Keep the scene and its handlers mounted while the child manipulates it.
          root.querySelector(`[data-part="${id}"]`)?.remove()
          const template = document.createElement('template')
          template.innerHTML = equipmentStation(placed)
          root.querySelector('[data-station]').replaceChildren(...template.content.firstElementChild.childNodes)
          root.querySelector('[data-placement-status]').textContent = 'Przedmiot jest na miejscu. Ułóż kolejny.'
          root.querySelector('[data-part]')?.focus({ preventScroll: true })
        }
        const invalid = () => { root.querySelector('[data-placement-status]').textContent = 'Przyjrzyj się miejscu i spróbuj ponownie.' }
        root.querySelectorAll('[data-part]').forEach(button => {
          button.addEventListener('dragstart', event => { selected = button.dataset.part; event.dataTransfer.setData('text/plain', selected); event.dataTransfer.effectAllowed = 'move' })
          button.addEventListener('click', () => {
            selected = button.dataset.part
            root.querySelectorAll('[data-part]').forEach(part => { part.classList.toggle('is-selected', part.dataset.part === selected); part.setAttribute('aria-pressed', String(part.dataset.part === selected)) })
          })
        })
        const station = root.querySelector('[data-station]')
        station.addEventListener('click', event => {
          const zone = event.target.closest('[data-zone]')
          if (!zone || !selected) return
          if (selected === zone.dataset.zone) place(selected); else invalid()
        })
        station.addEventListener('dragover', event => event.preventDefault())
        station.addEventListener('drop', event => {
          event.preventDefault()
          const id = event.dataTransfer.getData('text/plain'), rect = station.getBoundingClientRect()
          if (!placed.has(id) && acceptsEquipment(id, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height)) place(id)
          else invalid()
        })
        const show = root.querySelector('[data-show-model]')
        timers.push(setTimeout(() => { show.hidden = false }, Math.max(0, arrangeStarted + 60_000 - Date.now())))
        show.addEventListener('click', () => { modelUntil = Date.now() + 5000; rerender() })
        if (modelUntil && Date.now() < modelUntil) {
          const close = () => { modelUntil = null; rerender() }
          timers.push(setTimeout(close, modelUntil - Date.now()))
          root.querySelector('[data-hide-model]').addEventListener('click', close)
          root.querySelector('[role="dialog"]').addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); close(); return }
            if (event.key !== 'Tab') return
            const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')]
            const first = buttons[0], last = buttons.at(-1)
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
          })
          root.querySelector('[data-hide-model]').focus()
        }
      }
      root.querySelectorAll('[data-match]').forEach(button => button.addEventListener('click', () => {
        if (button.dataset.match !== equipment[index].id) { root.querySelector('[data-match-status]').textContent = 'Przyjrzyj się obrazowi. Posłuchaj nazw.'; return }
        matched = true; rerender()
      }))
    }
    return () => { timers.forEach(clearTimeout); stopSpeech() }
  }
  return current()
}
