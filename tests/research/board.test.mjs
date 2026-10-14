import test from 'node:test'
import assert from 'node:assert/strict'
import { rockBoard, boardItems, isResearchComplete } from '../../src/data/researchBoards.js'

test('tablica sprawdza zdjęcia i źródła, bez oceniania refleksji', () => {
  const entries = Object.fromEntries(boardItems(rockBoard).map(item => [item.id, { imageId: `image-${item.id}`, source: 'https://example.org' }]))
  assert.equal(boardItems(rockBoard).length, 6)
  assert.equal(rockBoard.completionType, 'teacher-review')
  assert.equal(isResearchComplete(rockBoard, entries), true)
  entries.granit.source = '  '
  assert.equal(isResearchComplete(rockBoard, entries), false)
  entries.granit.source = 'https://example.org'
  entries.bazalt.imageId = null
  assert.equal(isResearchComplete(rockBoard, entries), false)
})
test('ten sam mechanizm obsługuje inne grupy bez obowiązkowego źródła', () => {
  const board = { requireSource: false, groups: [{ items: [{ id: 'plant' }] }] }
  assert.equal(isResearchComplete(board, { plant: { imageId: 'image' } }), true)
  assert.equal(isResearchComplete(board, {}), false)
})
