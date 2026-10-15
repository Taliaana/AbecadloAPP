import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSpeechSettings } from '../../src/data/speechSettings.js'

globalThis.localStorage = { data: {}, getItem(key) { return this.data[key] ?? null }, setItem(key, value) { this.data[key] = value } }
const storage = await import('../../src/storage/studentStorage.js')

test('optional speech settings preserve all student data and survive initialization', () => {
  storage.initializeStorage()
  const before = storage.getStateSnapshot()
  assert.equal(storage.getSpeechSettings().preset, 'calm')
  assert.deepEqual(storage.getStateSnapshot(), before)
  const chosen = { preset: 'slower', voiceURI: 'system:polish', voiceName: 'Polski', voiceLang: 'pl-PL' }
  storage.saveSpeechSettings(chosen)
  storage.initializeStorage()
  const after = storage.getStateSnapshot()
  assert.deepEqual(storage.getSpeechSettings(), chosen)
  assert.deepEqual(after.students, before.students)
  assert.deepEqual(after.assignments, before.assignments)
  assert.equal(after.schemaVersion, before.schemaVersion)
  assert.equal(after.teacher.id, before.teacher.id)
  assert.deepEqual(normalizeSpeechSettings({ preset: 'bad', voiceURI: 5 }), { preset: 'calm', voiceURI: '', voiceName: '', voiceLang: '' })
})
