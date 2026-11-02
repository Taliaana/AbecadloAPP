import { appLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { robotBoard, setRobotGoalVisible } from '../../components/robotBoard.js'
import { robotCommands } from '../../data/robotChallenges.js'
import { getRobotProgress, getRobotAccess, saveRobotAttempt, saveRobotProgram, updateWork } from '../../storage/studentStorage.js'
import { robotTaskPosition, nextRobotChallenge, canOpenRobotChallenge } from '../../data/robotLearning.js'
import { createAutosave } from '../../utils/autosave.js'
import { escapeHtml } from '../../utils/html.js'
import { simulateRobot, sameCell, routeSignature, expandProgram, validateBoard } from './engine.js'
import { programHtml, sequenceAt } from './programView.js'
import { mountRobotMovement, ROBOT_STEP_MS } from './movement.js'
import { robotCompletionHtml } from './completion.js'

export function robotExerciseView(context, { board, work = null, onChange = null, onSave = null, extra = '', onMount = null }) {
  const { student } = context
  if (!validateBoard(board)) return { html: appLayout('<section class="tool-header"><h1>Ustaw start i cel.</h1><p>Wróć do swojej trasy i sprawdź planszę.</p><a class="button button-secondary" data-return-robot href="#/tools/robot">Wróć do Robota</a></section>', student, '/workshop') }
  let robot = { ...board.start, direction: board.startDirection }
  let program = structuredClone(work?.data.program ?? getRobotProgress()[board.id]?.program ?? board.initialProgram ?? [])
  let running = false, timer = null, disposed = false, prediction = null, runVersion = 0
  let readOnly = work && ['waiting-review', 'completed'].includes(work.status)
  let firstRoute = getRobotProgress()[board.id]?.routes?.[0] || null
  let lastProgram = structuredClone(program)
  const undo = []
  const position = !work && robotTaskPosition(board.id)
  const nextTask = !work && nextRobotChallenge(board.id)
  const predicting = board.mode === 'predict'
  const completedCount = () => position ? position.stage.challenges.filter(id => getRobotProgress()[id]?.completed).length : 0
  const content = `<section class="robot-session ${predicting ? 'robot-session--prediction' : ''}"><section class="tool-header"><a class="text-link" href="#/tools/robot">${icon('back')} Wróć do Robota</a><div class="robot-task-meta"><p class="eyebrow">${position ? `Etap ${position.stageNumber} · Zadanie ${position.taskNumber}/${position.total}` : 'Robot'}</p>${position ? `<div class="robot-task-progress"><progress aria-label="Ukończone zadania etapu" max="${position.total}" value="${completedCount()}"></progress><span data-stage-progress>${completedCount()} z ${position.total} ukończonych</span></div>` : ''}</div><h1>${escapeHtml(board.title)}</h1><p>${predicting ? 'Spójrz na program. Wskaż, gdzie zatrzyma się robot.' : board.mode === 'debug' ? 'Uruchom program. Obserwuj i popraw.' : 'Doprowadź robota do kwiatu.'}</p></section>
    <section class="robot-workspace"><div class="robot-board-area">${robotBoard(board, { interactive: predicting, showGoal: !predicting })}</div>
    <div class="robot-program-panel"><h2>${predicting ? 'Przyjrzyj się poleceniom' : 'Mój program'}</h2><p id="robot-help">${predicting ? 'Czytaj po kolei. Potem wybierz pole na planszy.' : 'Obrót zmienia kierunek, bez ruchu na inne pole.'}</p><div class="robot-palette" role="group" aria-label="Polecenia robota" ${predicting ? 'hidden' : ''}>${board.availableCommands.map(id => `<button type="button" class="button button-secondary" draggable="true" data-command="${id}"><span aria-hidden="true">${robotCommands[id].symbol}</span> ${id === 'left' ? 'W lewo' : id === 'right' ? 'W prawo' : robotCommands[id].label}</button>`).join('')}</div>
    <ol class="robot-program" data-container="root" aria-label="Ułożony program" aria-describedby="robot-help" tabindex="0"></ol>
    <button class="button button-ghost" type="button" data-restore-prediction hidden>Przywróć program zadania</button>
    <div class="robot-actions"><div class="robot-run-actions"><button class="button button-primary" type="button" data-run disabled>${icon('play')} ${predicting ? 'Sprawdź przewidywanie' : 'Uruchom program'}</button><button class="button button-secondary" type="button" data-stop disabled>Zatrzymaj</button><button class="button button-secondary" type="button" data-reset>Spróbuj ponownie</button></div><div class="robot-edit-actions" ${predicting ? 'hidden' : ''}><button class="button button-ghost" type="button" data-undo disabled>Cofnij zmianę</button><button class="button button-ghost" type="button" data-remove-last disabled>Usuń ostatnie</button><button class="button button-ghost" type="button" data-clear disabled>Wyczyść program</button></div></div>
    <p class="robot-message" role="status" aria-live="polite"></p></div></section>
    ${robotCompletionHtml({ nextTask, alternative: board.mode === 'alternative', prediction: predicting })}${extra}</section>`

  return { html: appLayout(content, student, '/workshop'), mount(root) {
    const list = root.querySelector('.robot-program'), message = root.querySelector('.robot-message'), complete = root.querySelector('[data-robot-complete]')
    const stabilizeDropZone = event => {
      if (event.target.closest('[draggable="true"]')) list.getAnimations({ subtree: true }).forEach(animation => animation.cancel())
    }
    root.addEventListener('pointerdown', stabilizeDropZone)
    const autosave = createAutosave(async nextProgram => {
      if (onSave) await onSave(nextProgram)
      else if (work && !readOnly) work = await updateWork(work.id, { data: { program: nextProgram }, status: 'draft' })
      else if (!work) await saveRobotProgram(board.id, nextProgram)
    })
    const boardElement = root.querySelector('.robot-board')
    const movement = mountRobotMovement(boardElement, robot)
    function dismissCompletion() { if (complete.open) complete.close(); complete.hidden = true }
    const completionClosed = () => {
      if (!complete.open) complete.hidden = true
      if (!disposed) {
        const run = root.querySelector('[data-run]')
        const target = run.disabled ? boardElement.querySelector('button:not(:disabled)') || root.querySelector('[data-reset]') : run
        target.focus({ preventScroll: true })
      }
    }
    complete.addEventListener('close', completionClosed)
    root.querySelector('[data-dismiss-completion]').addEventListener('click', dismissCompletion)
    root.querySelector('[data-view-route]')?.addEventListener('click', dismissCompletion)
    function controls() {
      let valid = false
      try { valid = expandProgram(program, board.availableCommands).length > 0 } catch { /* empty repeat awaits its contents */ }
      root.querySelector('[data-run]').disabled = running || !valid || (board.mode === 'predict' && !prediction)
      root.querySelector('[data-stop]').disabled = !running
      root.querySelector('[data-remove-last]').disabled = running || readOnly || predicting || !program.length
      root.querySelector('[data-clear]').disabled = running || readOnly || predicting || !program.length
      root.querySelector('[data-undo]').disabled = running || readOnly || predicting || !undo.length
      const restore = root.querySelector('[data-restore-prediction]')
      restore.hidden = !predicting || readOnly || !board.initialProgram || JSON.stringify(program) === JSON.stringify(board.initialProgram)
      restore.disabled = running
      root.querySelectorAll('[data-command]').forEach(button => { button.disabled = running || readOnly || predicting || program.length >= 30 })
      list.querySelectorAll('button, select').forEach(button => { button.disabled = running || readOnly || predicting })
      list.querySelectorAll('[data-move]').forEach(button => {
        const { sequence, index } = sequenceAt(program, button.closest('[data-path]').dataset.path)
        button.disabled ||= index + Number(button.dataset.move) < 0 || index + Number(button.dataset.move) >= sequence.length
      })
      root.querySelectorAll('.robot-board button').forEach(button => { button.disabled = running })
    }
    function drawProgram(focusPath) {
      list.innerHTML = programHtml(program, null, !predicting); controls()
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
      dismissCompletion(); prediction = null; root.querySelectorAll('[data-cell]').forEach(cell => { cell.classList.remove('is-predicted'); cell.removeAttribute('aria-pressed') })
      message.textContent = ''; drawProgram(focusPath); autosave.schedule(structuredClone(program))
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) list.querySelectorAll('[data-path]').forEach(block => {
        const old = sequenceAt(previous, block.dataset.path)
        if (!old.sequence?.[old.index]) block.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' })
      })
      boardElement.classList.remove('is-goal-reached')
    }
    function add(id) { if (running || readOnly || predicting || !board.availableCommands.includes(id) || program.length >= 30) return; program.push(id === 'repeat' ? { type: 'repeat', times: 2, body: [] } : id); changed() }
    function reset({ preservePrediction = false } = {}) {
      runVersion += 1; clearTimeout(timer); running = false
      robot = { ...board.start, direction: board.startDirection }; dismissCompletion()
      boardElement.classList.remove('is-goal-reached'); message.textContent = ''
      if (predicting) {
        setRobotGoalVisible(boardElement, board, false)
        if (!preservePrediction) {
          prediction = null
          boardElement.querySelectorAll('[data-cell]').forEach(cell => { cell.classList.remove('is-predicted'); cell.setAttribute('aria-pressed', 'false') })
        }
      }
      movement.draw(robot, { animate: false }); clearHighlight(); controls()
    }
    root.querySelectorAll('[data-command]').forEach(button => {
      button.addEventListener('click', () => add(button.dataset.command))
      button.addEventListener('dragstart', event => { if (running || readOnly || predicting) { event.preventDefault(); return }; event.dataTransfer.setData('text/plain', `command:${button.dataset.command}`) })
    })
    list.addEventListener('dragstart', event => { const block = event.target.closest('[data-path]'); if (!block || running || readOnly || predicting) { event.preventDefault(); return }; event.dataTransfer.setData('text/plain', `path:${block.dataset.path}`) })
    list.addEventListener('dragover', event => { if (!running && !readOnly && !predicting) event.preventDefault() })
    list.addEventListener('drop', event => {
      event.preventDefault(); if (running || readOnly || predicting) return
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
      if (running || readOnly || predicting) return
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
    list.addEventListener('change', event => { if (running || readOnly || predicting || !event.target.matches('[data-repeat-times]')) return; const index = Number(event.target.closest('[data-path]').dataset.path); program[index].times = Number(event.target.value); changed(); list.querySelector(`[data-path="${index}"] [data-repeat-times]`).focus({ preventScroll: true }) })
    root.querySelector('[data-reset]').addEventListener('click', reset)
    root.querySelector('[data-repeat-program]').addEventListener('click', () => reset())
    root.querySelector('[data-restore-prediction]').addEventListener('click', () => {
      if (running || readOnly || !predicting || !board.initialProgram) return
      // Old versions allowed editing prediction programs. Keep them until the
      // pupil explicitly chooses to restore the supplied sequence.
      program = structuredClone(board.initialProgram); reset(); changed()
    })
    root.querySelector('[data-undo]').addEventListener('click', () => { if (running || readOnly || predicting || !undo.length) return; program = undo.pop(); changed(false) })
    root.querySelector('[data-stop]').addEventListener('click', () => { runVersion += 1; clearTimeout(timer); running = false; movement.settle(); clearHighlight(); controls(); message.textContent = 'Robot zatrzymał się tutaj. Możesz sprawdzić program.' })
    root.querySelector('[data-remove-last]').addEventListener('click', () => { if (running || readOnly || predicting || !program.length) return; program.pop(); changed() })
    root.querySelector('[data-clear]').addEventListener('click', () => { if (running || readOnly || predicting) return; program = []; changed() })
    root.querySelector('[data-other-route]')?.addEventListener('click', () => { reset(); program = []; changed(); root.querySelector('[data-command]').focus() })
    if (board.mode === 'predict') root.querySelector('.robot-board').addEventListener('click', event => {
      if (running) return
      const cell = event.target.closest('[data-cell]'); if (!cell) return
      const [x, y] = cell.dataset.cell.split(',').map(Number); prediction = { x, y }
      dismissCompletion(); setRobotGoalVisible(boardElement, board, false); boardElement.classList.remove('is-goal-reached')
      root.querySelectorAll('[data-cell]').forEach(item => { item.classList.toggle('is-predicted', item === cell); item.setAttribute('aria-pressed', item === cell) }); message.textContent = 'Teraz wybierz „Sprawdź przewidywanie”.'; controls()
    })
    root.querySelector('[data-run]').addEventListener('click', () => {
      if (running || !program.length || (board.mode === 'predict' && !prediction)) return
      autosave.flush(); reset({ preservePrediction: true }); const runProgram = structuredClone(program), version = runVersion
      const current = () => !disposed && version === runVersion
      const result = simulateRobot(board, runProgram)
      if (!result.executed.length) { message.textContent = 'Dodaj polecenia do programu i do bloczka Powtórz.'; return }
      running = true; controls(); let index = 0
      async function finish() {
        clearHighlight()
        const route = routeSignature(result)
        try {
          if (!readOnly && !work?.data.kind?.includes('project')) await saveRobotAttempt(board.id, { success: result.success, route, program: runProgram, workId: work?.id })
          if (!current()) return
          if (result.success && work?.completionType === 'automatic' && !readOnly) work = await updateWork(work.id, { status: 'completed', data: { program: runProgram, solved: true } })
          if (!current()) return
          onChange?.(runProgram, result.success)
          await onSave?.(runProgram)
          if (!current()) return
        } catch (error) {
          if (current()) { running = false; controls(); message.textContent = error.message || 'Nie udało się zapisać pracy. Spróbuj ponownie.' }
          return
        }
        running = false
        readOnly = work && ['waiting-review', 'completed'].includes(work.status)
        controls()
        const predictionMessage = board.mode === 'predict' ? (sameCell(prediction, result.finalState) ? 'Tak właśnie wykonał program.' : 'Robot dotarł gdzie indziej. Sprawdź, który krok to zmienił.') : ''
        if (predicting) setRobotGoalVisible(boardElement, board, true)
        if (position) {
          root.querySelector('.robot-task-progress progress').value = completedCount()
          root.querySelector('[data-stage-progress]').textContent = `${completedCount()} z ${position.total} ukończonych`
        }
        if (result.success) {
          const next = complete.querySelector('[data-next-robot-task]')
          if (next) next.hidden = !canOpenRobotChallenge(nextTask, getRobotProgress(), getRobotAccess())
          const back = complete.querySelector('[data-return-robot]')
          back.classList.toggle('button-primary', !next || next.hidden)
          back.classList.toggle('button-secondary', Boolean(next && !next.hidden))
          boardElement.classList.add('is-goal-reached')
          const another = firstRoute && firstRoute !== route
          root.querySelector('[data-completion-text]').textContent = predictionMessage || (board.mode === 'alternative' && another ? 'To inne rozwiązanie.' : 'Robot dotarł do celu.')
          const stageCompleted = position && completedCount() === position.total
          root.querySelector('[data-completion-note]').textContent = !work && !nextTask && position ? 'To ostatnie zadanie ścieżki. Możesz wracać do poznanych tras.' : stageCompleted ? 'Zadania tego etapu są ukończone.' : ''
          if (predicting) root.querySelector('[data-prediction-position]').textContent = `Robot zatrzymał się tutaj: kolumna ${robot.x + 1}, wiersz ${robot.y + 1}. Wybierz „Obejrzyj trasę”, aby przyjrzeć się planszy.`
          firstRoute ||= route; message.textContent = predictionMessage || 'Gotowe. Robot dotarł do celu.'
          complete.hidden = false; complete.showModal()
          complete.querySelector('.button-primary:not([hidden])').focus({ preventScroll: true })
        } else message.textContent = predictionMessage || ({ obstacle: 'Robot zatrzymał się przed przeszkodą. Sprawdź swój program.', edge: 'Robot dotarł do brzegu planszy. Sprawdź program.' }[result.reason] || 'Robot nie dotarł do celu. Sprawdź swój program.')
      }
      function step() {
        if (!current() || !running) return
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
        robot = instruction.state; movement.draw(robot); index += 1
        if (index === result.executed.length) { timer = setTimeout(finish, ROBOT_STEP_MS); return }
        timer = setTimeout(step, ROBOT_STEP_MS)
      }
      timer = setTimeout(step, ROBOT_STEP_MS)
    })
    drawProgram()
    const extraCleanup = onMount?.(root, { program: () => structuredClone(program), flush: () => autosave.flush(), running: () => running })
    const flush = () => autosave.flush()
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility)
    return () => { disposed = true; runVersion += 1; clearTimeout(timer); complete.removeEventListener('close', completionClosed); dismissCompletion(); movement.dispose(); root.removeEventListener('pointerdown', stabilizeDropZone); autosave.flush(); extraCleanup?.(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility) }
  } }
}
