import { appLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { robotBoard, robotDrawing } from '../../components/robotBoard.js'
import { robotCommands } from '../../data/robotChallenges.js'
import { getRobotProgress, saveRobotAttempt, saveRobotProgram, updateWork } from '../../storage/studentStorage.js'
import { createAutosave } from '../../utils/autosave.js'
import { escapeHtml } from '../../utils/html.js'
import { simulateRobot, sameCell, routeSignature, expandProgram, validateBoard } from './engine.js'
import { programHtml, sequenceAt } from './programView.js'

export function robotExerciseView(context, { board, work = null, onChange = null, onSave = null, extra = '', onMount = null }) {
  const { student } = context
  if (!validateBoard(board)) return { html: appLayout('<section class="tool-header"><h1>Ustaw start i cel.</h1><p>Wróć do swojej trasy i sprawdź planszę.</p><a class="button button-secondary" href="#/tools/robot">Wróć do Robota</a></section>', student, '/workshop') }
  let robot = { ...board.start, direction: board.startDirection }
  let program = structuredClone(work?.data.program ?? getRobotProgress()[board.id]?.program ?? board.initialProgram ?? [])
  let running = false, timer = null, disposed = false, prediction = null
  let readOnly = work && ['waiting-review', 'completed'].includes(work.status)
  let firstRoute = getRobotProgress()[board.id]?.routes?.[0] || null
  let lastProgram = structuredClone(program)
  const undo = []
  const content = `<section class="robot-session"><section class="tool-header"><a class="text-link" href="#/tools/robot">${icon('back')} Wróć do Robota</a><p class="eyebrow">Robot · ${escapeHtml(board.title)}</p><h1>${escapeHtml(board.title)}</h1><p>${board.mode === 'predict' ? 'Gdzie zatrzyma się robot? Wskaż pole.' : board.mode === 'debug' ? 'Uruchom program. Obserwuj i popraw.' : 'Ułóż polecenia. Doprowadź robota do celu.'}</p></section>
    <section class="robot-workspace"><div class="robot-board-area">${robotBoard(board, { interactive: board.mode === 'predict' })}</div>
    <div class="robot-program-panel"><h2>Twój program</h2><p id="robot-help">Kliknij lub przeciągnij polecenie.</p><div class="robot-palette" role="group" aria-label="Polecenia robota">${board.availableCommands.map(id => `<button type="button" class="button button-secondary" draggable="true" data-command="${id}"><span aria-hidden="true">${robotCommands[id].symbol}</span> ${robotCommands[id].label}</button>`).join('')}</div>
    <ol class="robot-program" data-container="root" aria-label="Ułożony program" aria-describedby="robot-help" tabindex="0"></ol>
    <div class="robot-actions"><button class="button button-primary" type="button" data-run disabled>Uruchom</button><button class="button button-secondary" type="button" data-stop disabled>Zatrzymaj</button><button class="button button-secondary" type="button" data-reset>Reset</button><button class="button button-ghost" type="button" data-undo disabled>Cofnij zmianę</button><button class="button button-ghost" type="button" data-clear disabled>Wyczyść program</button></div>
    <p class="robot-message" role="status" aria-live="polite"></p></div></section>
    <section class="completion-card" data-robot-complete hidden><span class="completion-check">${icon('check')}</span><h2>Gotowe</h2><p data-completion-text>Robot dotarł do celu.</p>${board.mode === 'alternative' ? '<button class="button button-secondary" type="button" data-other-route>Czy znajdziesz inną drogę?</button>' : ''}<a class="button button-primary" href="#/tools/robot">Wróć do Robota</a></section>${extra}</section>`

  return { html: appLayout(content, student, '/workshop'), mount(root) {
    const list = root.querySelector('.robot-program'), message = root.querySelector('.robot-message'), complete = root.querySelector('[data-robot-complete]')
    const stabilizeDropZone = event => {
      if (event.target.closest('[draggable="true"]')) list.getAnimations({ subtree: true }).forEach(animation => animation.cancel())
    }
    root.addEventListener('pointerdown', stabilizeDropZone)
    const autosave = createAutosave(nextProgram => {
      if (onSave) onSave(nextProgram)
      else if (work && !readOnly) work = updateWork(work.id, { data: { program: nextProgram }, status: 'draft' })
      else if (!work) saveRobotProgram(board.id, nextProgram)
    })
    const token = document.createElement('span'); token.className = 'robot-token'; token.setAttribute('role', 'img'); token.innerHTML = robotDrawing
    const boardElement = root.querySelector('.robot-board')
    const facing = token.querySelector('svg')
    let angle = robot.direction * 90
    let previousDirection = robot.direction
    let previousCell = null
    function drawRobot() {
      const cell = root.querySelector(`[data-cell="${robot.x},${robot.y}"]`)
      const first = !previousCell
      const before = first ? null : token.getBoundingClientRect()
      cell.append(token)
      if (!first && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const after = token.getBoundingClientRect()
        token.getAnimations().forEach(animation => animation.cancel())
        if (previousCell !== cell) token.animate([{ transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` }, { transform: 'translate(0, 0)' }], { duration: 280, easing: 'ease-in-out' })
      }
      const turn = (robot.direction - previousDirection + 4) % 4
      angle += turn === 3 ? -90 : turn * 90
      facing.style.transform = `rotate(${angle}deg)`
      previousDirection = robot.direction; previousCell = cell
      token.setAttribute('aria-label', `Robot: kolumna ${robot.x + 1}, wiersz ${robot.y + 1}, kierunek ${['góra', 'prawo', 'dół', 'lewo'][robot.direction]}`)
    }
    function controls() {
      let valid = false
      try { valid = expandProgram(program, board.availableCommands).length > 0 } catch { /* empty repeat awaits its contents */ }
      root.querySelector('[data-run]').disabled = running || !valid || (board.mode === 'predict' && !prediction)
      root.querySelector('[data-stop]').disabled = !running
      root.querySelector('[data-clear]').disabled = running || readOnly || !program.length
      root.querySelector('[data-undo]').disabled = running || readOnly || !undo.length
      root.querySelectorAll('[data-command]').forEach(button => { button.disabled = running || readOnly || program.length >= 30 })
      list.querySelectorAll('button, select').forEach(button => { button.disabled = running || readOnly })
      list.querySelectorAll('[data-move]').forEach(button => {
        const { sequence, index } = sequenceAt(program, button.closest('[data-path]').dataset.path)
        button.disabled ||= index + Number(button.dataset.move) < 0 || index + Number(button.dataset.move) >= sequence.length
      })
      root.querySelectorAll('.robot-board button').forEach(button => { button.disabled = running })
    }
    function drawProgram(focusPath) {
      list.innerHTML = programHtml(program); controls()
      if (focusPath !== undefined) (list.querySelector(`[data-path="${focusPath}"] [data-remove]`) || root.querySelector('[data-command]')).focus({ preventScroll: true })
    }
    function clearHighlight() {
      list.querySelectorAll('[data-path]').forEach(block => { block.classList.remove('is-executing'); block.removeAttribute('aria-current') })
    }
    function changed(record = true, focusPath) {
      const previous = lastProgram
      if (record) { undo.push(lastProgram); if (undo.length > 20) undo.shift() }
      lastProgram = structuredClone(program)
      onChange?.(structuredClone(program), false)
      complete.hidden = true; prediction = null; root.querySelectorAll('[data-cell]').forEach(cell => { cell.classList.remove('is-predicted'); cell.removeAttribute('aria-pressed') })
      message.textContent = ''; drawProgram(focusPath); autosave.schedule(structuredClone(program))
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) list.querySelectorAll('[data-path]').forEach(block => {
        const old = sequenceAt(previous, block.dataset.path)
        if (!old.sequence?.[old.index]) block.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' })
      })
      boardElement.classList.remove('is-goal-reached')
    }
    function add(id) { if (running || readOnly || !board.availableCommands.includes(id) || program.length >= 30) return; program.push(id === 'repeat' ? { type: 'repeat', times: 2, body: [] } : id); changed() }
    function reset() { clearTimeout(timer); running = false; robot = { ...board.start, direction: board.startDirection }; complete.hidden = true; boardElement.classList.remove('is-goal-reached'); message.textContent = ''; drawRobot(); clearHighlight(); controls() }
    root.querySelectorAll('[data-command]').forEach(button => {
      button.addEventListener('click', () => add(button.dataset.command))
      button.addEventListener('dragstart', event => { if (running || readOnly) { event.preventDefault(); return }; event.dataTransfer.setData('text/plain', `command:${button.dataset.command}`) })
    })
    list.addEventListener('dragstart', event => { const block = event.target.closest('[data-path]'); if (!block || running || readOnly) { event.preventDefault(); return }; event.dataTransfer.setData('text/plain', `path:${block.dataset.path}`) })
    list.addEventListener('dragover', event => { if (!running && !readOnly) event.preventDefault() })
    list.addEventListener('drop', event => {
      event.preventDefault(); if (running || readOnly) return
      const [kind, value] = event.dataTransfer.getData('text/plain').split(':')
      const container = event.target.closest('[data-container]') || list
      const destination = container.dataset.container === 'root' ? program : program[Number(container.dataset.container)]?.body
      if (!destination) return
      const target = event.target.closest('[data-path]')
      let to = target?.parentElement === container ? Number(target.dataset.index) : destination.length
      let block, source
      if (kind === 'command' && board.availableCommands.includes(value)) block = value === 'repeat' ? { type: 'repeat', times: 2, body: [] } : value
      else if (kind === 'path' && /^\d+(\.\d+)?$/.test(value)) { source = sequenceAt(program, value); block = source.sequence?.[source.index] }
      if (!block || (destination !== program && typeof block !== 'string') || (source?.sequence !== destination && destination.length >= (destination === program ? 30 : 12))) return
      if (source?.sequence === destination && source.index < to) to -= 1
      if (source) source.sequence.splice(source.index, 1)
      destination.splice(Math.min(to, destination.length), 0, block); changed()
    })
    list.addEventListener('click', event => {
      if (running || readOnly) return
      const button = event.target.closest('button'); if (!button) return
      const path = button.closest('[data-path]').dataset.path
      const { sequence, index } = sequenceAt(program, path)
      if (button.hasAttribute('data-add-child')) { if (program[index].body.length < 12) { program[index].body.push(button.dataset.addChild); changed(true, `${index}.${program[index].body.length - 1}`) }; return }
      if (button.hasAttribute('data-remove')) {
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const block = button.closest('[data-path]'), bounds = block.getBoundingClientRect()
          const ghost = document.createElement('div'); ghost.className = 'robot-block-ghost'; ghost.setAttribute('aria-hidden', 'true'); ghost.textContent = block.querySelector('span').textContent
          Object.assign(ghost.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` })
          document.body.append(ghost)
          ghost.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.95)' }], { duration: 180 }).finished.finally(() => ghost.remove())
        }
        sequence.splice(index, 1); changed(true, sequence.length ? path.replace(/\d+$/, Math.min(index, sequence.length - 1)) : undefined)
      }
      else if (button.hasAttribute('data-move')) { const to = index + Number(button.dataset.move); if (to < 0 || to >= sequence.length) return; [sequence[index], sequence[to]] = [sequence[to], sequence[index]]; changed(true, path.replace(/\d+$/, to)) }
    })
    list.addEventListener('change', event => { if (running || readOnly || !event.target.matches('[data-repeat-times]')) return; const index = Number(event.target.closest('[data-path]').dataset.path); program[index].times = Number(event.target.value); changed(); list.querySelector(`[data-path="${index}"] [data-repeat-times]`).focus({ preventScroll: true }) })
    root.querySelector('[data-reset]').addEventListener('click', reset)
    root.querySelector('[data-undo]').addEventListener('click', () => { if (running || readOnly || !undo.length) return; program = undo.pop(); changed(false) })
    root.querySelector('[data-stop]').addEventListener('click', () => { clearTimeout(timer); running = false; clearHighlight(); controls(); message.textContent = 'Robot zatrzymał się tutaj. Możesz sprawdzić program.' })
    root.querySelector('[data-clear]').addEventListener('click', () => { if (running || readOnly) return; program = []; changed() })
    root.querySelector('[data-other-route]')?.addEventListener('click', () => { reset(); program = []; changed(); root.querySelector('[data-command]').focus() })
    if (board.mode === 'predict') root.querySelector('.robot-board').addEventListener('click', event => {
      if (running) return
      const cell = event.target.closest('[data-cell]'); if (!cell) return
      const [x, y] = cell.dataset.cell.split(',').map(Number); prediction = { x, y }
      complete.hidden = true; boardElement.classList.remove('is-goal-reached')
      root.querySelectorAll('[data-cell]').forEach(item => { item.classList.toggle('is-predicted', item === cell); item.setAttribute('aria-pressed', item === cell) }); message.textContent = 'Teraz uruchom program.'; controls()
    })
    root.querySelector('[data-run]').addEventListener('click', () => {
      if (running || !program.length || (board.mode === 'predict' && !prediction)) return
      autosave.flush(); reset(); const result = simulateRobot(board, program)
      if (!result.executed.length) { message.textContent = 'Dodaj polecenia do programu i do bloczka Powtórz.'; return }
      running = true; controls(); let index = 0
      function finish() {
        running = false; clearHighlight()
        const route = routeSignature(result)
        if (!readOnly && !work?.data.kind?.includes('project')) saveRobotAttempt(board.id, { success: result.success, route, program })
        if (result.success && work?.completionType === 'automatic' && !readOnly) work = updateWork(work.id, { status: 'completed', data: { program, solved: true } })
        readOnly = work && ['waiting-review', 'completed'].includes(work.status)
        onChange?.(structuredClone(program), result.success)
        onSave?.(structuredClone(program))
        controls()
        const predictionMessage = board.mode === 'predict' ? (sameCell(prediction, result.finalState) ? 'Tak właśnie wykonał program.' : 'Robot dotarł gdzie indziej. Sprawdź, który krok to zmienił.') : ''
        if (result.success) {
          complete.hidden = false
          boardElement.classList.add('is-goal-reached')
          const another = firstRoute && firstRoute !== route
          root.querySelector('[data-completion-text]').textContent = predictionMessage || (board.mode === 'alternative' && another ? 'To inne rozwiązanie.' : 'Robot dotarł do celu.')
          firstRoute ||= route; message.textContent = predictionMessage || 'Gotowe. Robot dotarł do celu.'
          complete.querySelector('button, a').focus({ preventScroll: true })
          complete.scrollIntoView({ block: 'start', behavior: 'auto' })
        } else message.textContent = predictionMessage || ({ obstacle: 'Robot zatrzymał się przed przeszkodą. Sprawdź swój program.', edge: 'Robot dotarł do brzegu planszy. Sprawdź program.' }[result.reason] || 'Robot nie dotarł do celu. Sprawdź swój program.')
      }
      function step() {
        if (disposed || !running) return
        const instruction = result.executed[index]
        list.querySelectorAll('[data-path]').forEach(block => {
          const active = block.dataset.path === instruction.path
          block.classList.toggle('is-executing', active)
          if (active) block.setAttribute('aria-current', 'step'); else block.removeAttribute('aria-current')
          if (active) {
            const itemBounds = block.getBoundingClientRect(), listBounds = list.getBoundingClientRect()
            if (itemBounds.bottom > listBounds.bottom) list.scrollTop += itemBounds.bottom - listBounds.bottom + 8
            else if (itemBounds.top < listBounds.top) list.scrollTop -= listBounds.top - itemBounds.top + 8
          }
        })
        robot = instruction.state; drawRobot(); index += 1
        if (index === result.executed.length) { timer = setTimeout(finish, 550); return }
        timer = setTimeout(step, 550)
      }
      timer = setTimeout(step, 550)
    })
    drawRobot(); drawProgram()
    const extraCleanup = onMount?.(root, { program: () => structuredClone(program), flush: () => autosave.flush(), running: () => running })
    const flush = () => autosave.flush()
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility)
    return () => { disposed = true; clearTimeout(timer); root.removeEventListener('pointerdown', stabilizeDropZone); autosave.flush(); extraCleanup?.(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility) }
  } }
}
