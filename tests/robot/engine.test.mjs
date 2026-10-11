import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulateRobot, expandProgram, routeSignature, validateBoard } from '../../src/modules/robot/engine.js'
import { getRobotChallenge, robotChallenges } from '../../src/data/robotChallenges.js'
const board = getRobotChallenge('original')
const run = program => simulateRobot(board, program)

test('all commands run after visiting goal; success depends on final position', () => {
  const task = getRobotChallenge('two-steps')
  const result = simulateRobot(task, ['forward', 'forward', 'forward'])
  assert.equal(result.executed.length, 3); assert.equal(result.success, false)
  assert.deepEqual(result.finalState, { x: 1, y: 1, direction: 0 })
  const turned = simulateRobot({ ...task, availableCommands: ['forward', 'right'] }, ['forward', 'forward', 'right'])
  assert.equal(turned.success, true); assert.equal(turned.finalState.direction, 1)
})
test('repeat executes every iteration even when crossing goal', () => {
  const result = simulateRobot(getRobotChallenge('repeat-steps'), [{ type: 'repeat', times: 4, body: ['forward'] }])
  assert.equal(result.executed.length, 4); assert.equal(result.success, false); assert.equal(result.finalState.y, 0)
})

test('forward changes position, preserves direction', () => assert.deepEqual(run(['forward']).finalState, { x: 1, y: 3, direction: 0 }))
test('left and right wrap directions', () => { assert.equal(run(['left']).finalState.direction, 3); assert.equal(run(['right']).finalState.direction, 1); assert.equal(run(['left', 'left', 'left', 'left']).finalState.direction, 0) })
test('sequence reaches goal and returns all executed states', () => { const result = run(['forward', 'forward', 'forward', 'right', 'forward', 'forward']); assert.equal(result.success, true); assert.equal(result.executed.length, 6); assert.equal(result.states.length, 7); assert.deepEqual(result.finalState, { x: 3, y: 1, direction: 1 }) })
test('short sequence does not complete challenge', () => { assert.equal(run(['forward']).success, false); assert.equal(run(['forward']).reason, 'unfinished') })
test('obstacle stops robot before collision and ignores following commands', () => { const result = simulateRobot(getRobotChallenge('around-stone'), ['forward', 'right', 'forward']); assert.equal(result.reason, 'obstacle'); assert.equal(result.executed.length, 1); assert.deepEqual(result.finalState, { x: 1, y: 4, direction: 0 }) })
test('board edge stops execution', () => { const result = run(['left', 'forward', 'forward', 'right']); assert.equal(result.reason, 'edge'); assert.equal(result.finalState.x, 0); assert.equal(result.executed.length, 3) })
test('repeat executes body in order and exposes child paths', () => { const loop = { type: 'repeat', times: 3, body: ['forward'] }; const result = simulateRobot(getRobotChallenge('repeat-steps'), [loop]); assert.equal(result.success, true); assert.deepEqual(result.executed.map(step => step.path), ['0.0', '0.0', '0.0']); const instructions = expandProgram([{ type: 'repeat', times: 2, body: ['forward', 'right'] }]); assert.deepEqual(instructions.map(step => step.command), ['forward', 'right', 'forward', 'right']) })
test('nested loops, invalid counts, missing bodies and huge programs are rejected', () => { for (const program of [[{ type: 'repeat', times: 5, body: ['forward'] }], [{ type: 'repeat', times: 2, body: [] }], [{ type: 'repeat', times: 2, body: [{ type: 'repeat', times: 2, body: ['forward'] }] }], Array(31).fill('forward'), ['unknown']]) assert.throws(() => expandProgram(program)) })
test('different physical routes are both valid', () => { const task = getRobotChallenge('another-way'); const a = simulateRobot(task, ['forward', 'forward', 'right', 'forward', 'forward']); const b = simulateRobot(task, ['right', 'forward', 'forward', 'left', 'forward', 'forward']); assert.equal(a.success && b.success, true); assert.notEqual(routeSignature(a), routeSignature(b)) })
test('extra turns are not counted as another route', () => { const a = run(['forward']); const b = run(['left', 'right', 'forward']); assert.equal(routeSignature(a), routeSignature(b)) })
test('invalid start, obstacle on goal and missing goal are rejected', () => { assert.equal(validateBoard({ ...board, start: null }), false); assert.equal(validateBoard({ ...board, obstacles: [board.goal] }), false); assert.equal(validateBoard({ ...board, startDirection: 8 }), false) })
test('all supplied boards are valid and debug programs are unsuccessful', () => { for (const task of robotChallenges) { assert.equal(validateBoard(task), true, task.id); if (task.mode === 'debug') assert.equal(simulateRobot(task, task.initialProgram).success, false, task.id) } })
