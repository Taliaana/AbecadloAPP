import { sameCell, validateBoard } from '../modules/robot/engine.js'

export const robotDrawing = `<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 5 23 15h14Z" fill="currentColor"/><rect x="12" y="19" width="36" height="30" rx="10" fill="var(--brand-pink-soft)" stroke="currentColor" stroke-width="2"/><circle cx="23" cy="30" r="3" fill="currentColor"/><circle cx="37" cy="30" r="3" fill="currentColor"/><path d="M23 40h14" stroke="currentColor" stroke-width="2"/></svg>`
const flower = `<svg viewBox="0 0 50 50" aria-hidden="true"><g fill="var(--brand-pink-soft)" stroke="currentColor" stroke-width="2"><circle cx="25" cy="14" r="8"/><circle cx="15" cy="24" r="8"/><circle cx="35" cy="24" r="8"/><circle cx="25" cy="33" r="8"/><circle cx="25" cy="24" r="6" fill="var(--paper)"/></g></svg>`
export function robotBoard(board, { interactive = false, preview = false } = {}) {
  const size = Number.isInteger(board?.gridSize) && board.gridSize >= 2 && board.gridSize <= 10 ? board.gridSize : 5
  const cells = Array.from({ length: size ** 2 }, (_, i) => {
    const p = { x: i % size, y: Math.floor(i / size) }
    const obstacle = board.obstacles?.some(cell => sameCell(cell, p))
    const goal = sameCell(p, board.goal)
    const start = sameCell(p, board.start)
    const tag = interactive ? 'button' : 'div'
    return `<${tag} ${interactive ? 'type="button"' : ''} class="robot-cell ${obstacle ? 'has-obstacle' : ''}" data-cell="${p.x},${p.y}" ${interactive ? `aria-label="Kolumna ${p.x + 1}, wiersz ${p.y + 1}${start ? ', start' : goal ? ', cel' : obstacle ? ', przeszkoda' : ''}"` : ''}>
      ${obstacle ? '<span class="robot-stone" aria-hidden="true"></span>' : ''}${goal ? `<span class="robot-goal" role="img" aria-label="Cel">${flower}</span>` : ''}
      ${preview && start ? `<span class="robot-token" style="transform:rotate(${board.startDirection * 90}deg)">${robotDrawing}</span>` : ''}</${tag}>`
  }).join('')
  return `<div class="robot-board ${preview ? 'robot-board--preview' : ''}" style="--robot-grid-size:${size}" role="group" aria-label="Plansza robota: ${size} na ${size}">${cells}</div>`
}
export function robotWorkPreview(work) {
  return validateBoard(work.data?.board) ? robotBoard(work.data.board, { preview: true }) : '<p>Ustaw start i cel swojej trasy.</p>'
}
