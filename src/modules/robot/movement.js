import { robotDrawing } from '../../components/robotBoard.js'

// One observable instruction at a time, including the final instruction.
export const ROBOT_STEP_MS = 650
const MOVE_MS = Math.round(ROBOT_STEP_MS * .43)

export function mountRobotMovement(board, initialState) {
  const token = document.createElement('span')
  token.className = 'robot-token robot-token--moving'
  token.setAttribute('role', 'img')
  token.innerHTML = robotDrawing
  board.append(token)
  const facing = token.querySelector('svg')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  let state = initialState, angle = initialState.direction * 90, previousDirection = initialState.direction
  let positioned = false

  function settle() {
    // Inline styles always contain the logical destination, also during a tween.
    token.getAnimations().forEach(animation => animation.cancel())
    facing.getAnimations().forEach(animation => animation.cancel())
  }
  function draw(next, { animate = true } = {}) {
    const cell = board.querySelector(`[data-cell="${next.x},${next.y}"]`)
    if (!cell) return
    const from = getComputedStyle(token).transform
    const fromAngle = facing.style.transform || `rotate(${angle}deg)`
    settle()
    const turn = (next.direction - previousDirection + 4) % 4
    angle += turn === 3 ? -90 : turn * 90
    const width = cell.offsetWidth * .8, height = cell.offsetHeight * .8
    const to = `translate(${cell.offsetLeft + (cell.offsetWidth - width) / 2}px, ${cell.offsetTop + (cell.offsetHeight - height) / 2}px)`
    Object.assign(token.style, { width: `${width}px`, height: `${height}px`, transform: to })
    facing.style.transform = `rotate(${angle}deg)`
    if (positioned && animate && !reduced.matches) {
      if (next.x !== state.x || next.y !== state.y) token.animate([{ transform: from }, { transform: to }], { duration: MOVE_MS, easing: 'ease-in-out' })
      if (next.direction !== previousDirection) facing.animate([{ transform: fromAngle }, { transform: `rotate(${angle}deg)` }], { duration: MOVE_MS, easing: 'ease-in-out' })
    }
    state = { ...next }; previousDirection = next.direction; positioned = true
    board.dataset.robotPosition = `${state.x},${state.y}`
    token.setAttribute('aria-label', `Robot: kolumna ${state.x + 1}, wiersz ${state.y + 1}, kierunek ${['góra', 'prawo', 'dół', 'lewo'][state.direction]}`)
  }
  const resize = new ResizeObserver(() => draw(state, { animate: false }))
  resize.observe(board)
  const motionChanged = () => { if (reduced.matches) settle() }
  reduced.addEventListener('change', motionChanged)
  draw(state, { animate: false })
  return { draw, settle, dispose() { resize.disconnect(); reduced.removeEventListener('change', motionChanged); settle(); token.remove() } }
}
