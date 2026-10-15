import test from 'node:test'
import assert from 'node:assert/strict'
import { equipment, acceptsEquipment, matchesEquipmentName } from '../../src/data/computerEquipment.js'
test('central device definitions include local images, descriptions and speech', () => {
  assert.equal(equipment.length, 6)
  for (const item of equipment) { assert.ok(item.image.startsWith('/lessons/equipment/')); assert.ok(item.speechText.includes(item.description)) }
})
test('names ignore casing, surrounding spaces and equivalent Unicode', () => {
  assert.ok(matchesEquipmentName('  GŁOŚNIKI ', 'Głośniki'))
  assert.ok(matchesEquipmentName('Głośniki'.normalize('NFD'), 'Głośniki'))
  assert.equal(matchesEquipmentName('monitr', 'Monitor'), false)
})
test('spatial regions are generous and reject incorrect relations', () => {
  assert.ok(acceptsEquipment('monitor', .31, .12)); assert.ok(acceptsEquipment('monitor', .68, .49))
  assert.equal(acceptsEquipment('monitor', .1, .85), false)
  assert.ok(acceptsEquipment('keyboard', .5, .7)); assert.ok(acceptsEquipment('mouse', .8, .7))
  assert.ok(acceptsEquipment('speakers', .23, .3)); assert.ok(acceptsEquipment('speakers', .72, .3))
  assert.equal(acceptsEquipment('unknown', .5, .5), false)
})
