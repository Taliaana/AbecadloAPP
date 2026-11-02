import { test } from 'node:test'
import assert from 'node:assert/strict'
import { robotChallenges } from '../../src/data/robotChallenges.js'
import { robotStages, robotExtensionIds, robotLearningState, canOpenRobotChallenge, nextRobotChallenge } from '../../src/data/robotLearning.js'

test('all fourteen existing IDs have one place; no history migration is necessary', () => {
  const ids = [...robotStages.flatMap(stage => stage.challenges), ...robotExtensionIds]
  assert.equal(new Set(ids).size, 14)
  assert.deepEqual([...ids].sort(), robotChallenges.map(task => task.id).sort())
  assert.equal(robotStages.length, 6)
})
test('fresh pupil starts with the first task; custom boards and later stages stay closed', () => {
  const state = robotLearningState()
  assert.equal(state.next.id, 'two-steps')
  assert.equal(state.stages.filter(stage => stage.unlocked).length, 1)
  assert.equal(state.customBoard, false)
  assert.equal(canOpenRobotChallenge('first-turn'), false)
})
test('only actual completion opens the following stage; a saved program does not complete it', () => {
  const progress = { 'two-steps': { program: ['forward', 'forward'], completed: false } }
  assert.equal(canOpenRobotChallenge('first-turn', progress), false)
  progress['two-steps'].completed = true
  assert.equal(canOpenRobotChallenge('first-turn', progress), true)
  assert.equal(canOpenRobotChallenge('around-stone', progress), false)
  assert.equal(nextRobotChallenge('two-steps'), 'first-turn')
})
test('old completions, partial programs, extra fields and repetition remain available without mutating saves', () => {
  const progress = { 'wrong-turn': { completed: true, runs: 4, routes: ['old'] }, original: { program: ['right'] }, 'repeat-turns': { runs: 1 }, unknown: { note: 'keep' } }
  const before = structuredClone(progress)
  for (const id of ['wrong-turn', 'original', 'repeat-turns']) assert.equal(canOpenRobotChallenge(id, progress), true)
  assert.equal(canOpenRobotChallenge('extra-step', progress), false)
  assert.deepEqual(progress, before)
})
test('a stage needs all its tasks; a later historical completion cannot skip unfinished stages', () => {
  const progress = { 'two-steps': { completed: true }, 'first-turn': { completed: true }, 'wrong-turn': { completed: true } }
  assert.equal(canOpenRobotChallenge('original', progress), true)
  assert.equal(canOpenRobotChallenge('around-stone', progress), false)
  progress.original = { completed: true }
  assert.equal(canOpenRobotChallenge('around-stone', progress), true)
  assert.equal(canOpenRobotChallenge('predict-turn', progress), false)
})
test('all six stages open creation and repetition; completed tasks can still be repeated', () => {
  const progress = Object.fromEntries(robotStages.flatMap(stage => stage.challenges).map(id => [id, { completed: true }]))
  const state = robotLearningState(JSON.parse(JSON.stringify(progress)))
  assert.equal(state.completedCount, 6)
  assert.equal(state.customBoard, true)
  assert.ok(state.extensions.every(task => task.unlocked))
  assert.equal(canOpenRobotChallenge('two-steps', progress), true)
})
test('teacher exceptions grant only the selected stage, task or creation, without claiming completion', () => {
  const state = robotLearningState({}, { stages: ['debug'], challenges: ['predict-turn'], customBoard: true })
  assert.equal(state.customBoard, true)
  assert.equal(state.completedCount, 0)
  assert.equal(canOpenRobotChallenge('wrong-turn', {}, { stages: ['debug'] }), true)
  assert.equal(canOpenRobotChallenge('predict-edge', {}, { challenges: ['predict-turn'] }), false)
})
