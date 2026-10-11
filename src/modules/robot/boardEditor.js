import { sameCell, validateBoard } from './engine.js'
import { robotBoard } from '../../components/robotBoard.js'
import { escapeHtml } from '../../utils/html.js'

export function boardEditorHtml(board, title) {
  return `<section class="robot-editor"><label class="robot-title">Nazwa trasy<input data-route-title maxlength="80" value="${escapeHtml(title)}" /></label>
    <div class="robot-editor-tools" role="group" aria-label="Narzędzia planszy">${[['start', 'Robot'], ['goal', 'Cel'], ['obstacle', 'Przeszkoda'], ['erase', 'Usuń']].map(([id, label]) => `<button type="button" class="button button-secondary" data-board-tool="${id}" aria-pressed="${id === 'start'}">${label}</button>`).join('')}</div>
    <label>Kierunek robota<select data-direction>${['Góra', 'Prawo', 'Dół', 'Lewo'].map((name, i) => `<option value="${i}" ${i === board.startDirection ? 'selected' : ''}>${name}</option>`).join('')}</select></label>
    <p>Wybierz narzędzie. Kliknij pole.</p><div data-editor-board>${robotBoard(board, { interactive: true, preview: true })}</div>
    <p role="status" data-editor-message></p><button type="button" class="button button-primary" data-program-board>Ułóż program</button></section>`
}

export function mountBoardEditor(root, board, { change, program }) {
  let tool = 'start'
  const boardRoot = root.querySelector('[data-editor-board]')
  const message = root.querySelector('[data-editor-message]')
  root.querySelectorAll('[data-board-tool]').forEach(button => button.addEventListener('click', () => {
    tool = button.dataset.boardTool
    root.querySelectorAll('[data-board-tool]').forEach(item => item.setAttribute('aria-pressed', item === button))
  }))
  root.querySelector('[data-route-title]').addEventListener('input', event => change(event.target.value))
  root.querySelector('[data-direction]').addEventListener('change', event => { board.startDirection = Number(event.target.value); change(); boardRoot.innerHTML = robotBoard(board, { interactive: true, preview: true }) })
  boardRoot.addEventListener('click', event => {
    const button = event.target.closest('[data-cell]'); if (!button) return
    const [x, y] = button.dataset.cell.split(',').map(Number), cell = { x, y }
    if (tool === 'start' || tool === 'goal') {
      if (sameCell(cell, board[tool === 'start' ? 'goal' : 'start'])) { message.textContent = 'Wybierz osobne pola dla robota i celu.'; return }
      board[tool] = cell; board.obstacles = board.obstacles.filter(p => !sameCell(p, cell))
    } else if (tool === 'obstacle') {
      if (sameCell(cell, board.start) || sameCell(cell, board.goal)) { message.textContent = 'Zostaw wolne pole robota i celu.'; return }
      if (!board.obstacles.some(p => sameCell(p, cell))) board.obstacles.push(cell)
    } else {
      board.obstacles = board.obstacles.filter(p => !sameCell(p, cell))
      if (sameCell(cell, board.start)) board.start = null
      if (sameCell(cell, board.goal)) board.goal = null
    }
    message.textContent = ''; change(); boardRoot.innerHTML = robotBoard(board, { interactive: true, preview: true })
    boardRoot.querySelector(`[data-cell="${x},${y}"]`).focus({ preventScroll: true })
  })
  root.querySelector('[data-program-board]').addEventListener('click', () => {
    if (!validateBoard(board)) { message.textContent = 'Ustaw jednego robota i jeden cel. Zostaw ich pola wolne.'; return }
    program()
  })
}
