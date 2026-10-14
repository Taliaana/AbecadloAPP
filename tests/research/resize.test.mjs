import test from 'node:test'
import assert from 'node:assert/strict'
import { resizedImage } from '../../src/utils/researchImageResize.js'

const dimensions = { width: 240, height: 180, frameWidth: 300, frameHeight: 225, ratio: 4 / 3 }
test('free resize changes each axis and clamps minimum and maximum', () => {
  const result = resizedImage({ ...dimensions, dx: -40, dy: 10 })
  assert.equal(result.width * 300, 200)
  assert.equal(result.height * 225, 190)
  const min = resizedImage({ ...dimensions, dx: -10000, dy: -10000 })
  assert.equal(min.width * 300, 64); assert.equal(min.height * 225, 64)
  const max = resizedImage({ ...dimensions, dx: 10000, dy: 10000 })
  assert.equal(max.width, .9); assert.equal(max.height, .9)
})
test('Shift restores original proportions even after free resizing and at limits', () => {
  for (const [dx, dy] of [[-40, 0], [0, -20], [10000, 10000], [-10000, -10000]]) {
    const result = resizedImage({ ...dimensions, width: 190, height: 160, dx, dy, proportional: true })
    assert.ok(Math.abs(result.width * 300 / (result.height * 225) - 4 / 3) < .0001)
    assert.ok(result.width <= .9 && result.height <= .9)
  }
})
