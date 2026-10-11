const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]]
export const sameCell = (a, b) => Boolean(a && b && a.x === b.x && a.y === b.y)

export function validateBoard(board) {
  if (!board || !Number.isInteger(board.gridSize) || board.gridSize < 2 || board.gridSize > 10) return false
  const inside = p => p && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < board.gridSize && p.y < board.gridSize
  return Boolean(inside(board.start) && inside(board.goal) && !sameCell(board.start, board.goal)
    && Number.isInteger(board.startDirection) && board.startDirection >= 0 && board.startDirection < 4
    && Array.isArray(board.obstacles) && board.obstacles.length <= board.gridSize ** 2
    && board.obstacles.every(p => inside(p) && !sameCell(p, board.start) && !sameCell(p, board.goal)))
}

export function expandProgram(program, allowed = ['forward', 'left', 'right', 'repeat']) {
  if (!Array.isArray(program) || program.length > 30) throw new Error('program')
  const instructions = []
  function append(sequence, parent = null) {
    sequence.forEach((block, index) => {
      const path = parent === null ? `${index}` : `${parent}.${index}`
      if (typeof block === 'string' && ['forward', 'left', 'right'].includes(block) && allowed.includes(block)) instructions.push({ command: block, path, parent })
      else if (parent === null && block?.type === 'repeat' && allowed.includes('repeat') && [2, 3, 4].includes(block.times) && Array.isArray(block.body) && block.body.length > 0 && block.body.length <= 12) {
        for (let iteration = 0; iteration < block.times; iteration++) append(block.body, path)
      } else throw new Error('program')
      if (instructions.length > 240) throw new Error('program')
    })
  }
  append(program)
  return instructions
}

export function simulateRobot(board, program) {
  const states = []
  const executed = []
  if (!validateBoard(board)) return { states, executed, success: false, reason: 'board', finalState: null }
  let robot = { ...board.start, direction: board.startDirection }
  states.push({ ...robot })
  let instructions
  try { instructions = expandProgram(program, board.availableCommands) } catch { return { states, executed, success: false, reason: 'program', finalState: robot } }
  let reason = 'unfinished'
  for (const instruction of instructions) {
    let collision = null
    if (instruction.command === 'left') robot.direction = (robot.direction + 3) % 4
    else if (instruction.command === 'right') robot.direction = (robot.direction + 1) % 4
    else {
      const [dx, dy] = vectors[robot.direction]
      const next = { x: robot.x + dx, y: robot.y + dy }
      if (next.x < 0 || next.y < 0 || next.x >= board.gridSize || next.y >= board.gridSize) collision = 'edge'
      else if (board.obstacles.some(p => sameCell(p, next))) collision = 'obstacle'
      else robot = { ...next, direction: robot.direction }
    }
    executed.push({ ...instruction, state: { ...robot }, collision })
    states.push({ ...robot })
    if (collision) { reason = collision; break }
  }
  if (reason === 'unfinished' && instructions.length && sameCell(robot, board.goal)) reason = 'goal'
  return { states, executed, finalState: { ...robot }, success: reason === 'goal', reason,
    collision: ['edge', 'obstacle'].includes(reason) ? reason : null }
}

export function routeSignature(result) {
  // Turns alone do not count as another route. Compare visited cells.
  return result.states.filter((p, i, all) => i === 0 || !sameCell(p, all[i - 1])).map(p => `${p.x},${p.y}`).join('|')
}
