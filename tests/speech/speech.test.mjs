import test from 'node:test'
import assert from 'node:assert/strict'
import { createSpeechPlayer, selectPolishVoice } from '../../src/utils/speech.js'

function setup(initialVoices = []) {
  let voices = initialVoices
  const spoken = [], actions = [], listeners = new Map()
  const synthesis = {
    getVoices: () => voices,
    speak(message) { actions.push('speak'); spoken.push(message) },
    cancel() { actions.push('cancel') },
    addEventListener(type, fn) { listeners.set(type, fn) },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type) },
  }
  const player = createSpeechPlayer({ synthesis, Utterance: function(text) { this.text = text }, Audio: undefined })
  return { player, spoken, actions, listeners, setVoices(next) { voices = next; listeners.get('voiceschanged')?.() } }
}

test('Polish locale and natural/system quality take precedence over array order', () => {
  const natural = { lang: 'pl-PL', name: 'Polski Natural', localService: true }
  const voices = [{ lang: 'en-US', name: 'English Premium' }, { lang: 'pl_PL', name: 'eSpeak Polish' }, { lang: 'pl', name: 'Polski Premium' }, { lang: 'pl-PL', name: 'Polski systemowy', default: true }, natural]
  assert.equal(selectPolishVoice(voices), natural)
  assert.equal(selectPolishVoice([...voices].reverse()), natural)
  assert.equal(selectPolishVoice([{ lang: 'pl', name: 'Polski' }]).lang, 'pl')
  assert.equal(selectPolishVoice([{ lang: 'en-US', name: 'English' }]), null)
})

test('one complete utterance uses calm settings; voiceschanged supplies a late voice without autoplay', () => {
  const env = setup()
  assert.equal(env.spoken.length, 0)
  const voice = { lang: 'pl-PL', name: 'Polski Enhanced' }
  env.setVoices([voice])
  assert.equal(env.spoken.length, 0)
  env.player.speak({ text: 'Przyjrzyj się obrazowi. Potem przepisz nazwę.' })
  assert.equal(env.spoken.length, 1)
  const message = env.spoken[0]
  assert.equal(message.text, 'Przyjrzyj się obrazowi. Potem przepisz nazwę.')
  assert.equal(message.voice, voice)
  assert.equal(message.lang, 'pl-PL'); assert.equal(message.rate, .9); assert.equal(message.pitch, 1); assert.equal(message.volume, 1)
  env.player.dispose()
  assert.equal(env.listeners.size, 0)
})

test('without a Polish voice the engine receives pl-PL without an explicit foreign voice', () => {
  const env = setup([{ name: 'English', lang: 'en-US', default: true }])
  assert.equal(env.player.speak({ text: 'Monitor.' }), true)
  assert.equal(env.spoken[0].lang, 'pl-PL')
  assert.equal(env.spoken[0].voice, undefined)
})

test('stop, cancellation and late completion events keep one current speaker', () => {
  const env = setup()
  const firstOwner = {}, secondOwner = {}, states = []
  env.player.subscribe(() => states.push(env.player.activeOwner))
  env.player.speak({ text: 'Monitor.', owner: firstOwner })
  const first = env.spoken[0]
  assert.equal(env.player.activeOwner, firstOwner)
  env.player.speak({ text: 'Klawiatura.', owner: secondOwner })
  assert.deepEqual(env.actions, ['cancel', 'speak', 'cancel', 'speak'])
  first.onend(); first.onerror()
  assert.equal(env.player.activeOwner, secondOwner)
  env.spoken[1].onend()
  assert.equal(env.player.active, false)
  env.player.speak({ text: 'Mysz.', owner: firstOwner }); env.player.stop()
  assert.equal(env.player.activeOwner, null)
  assert.equal(states.at(-1), null)
})

test('missing or failing SpeechSynthesis never throws', () => {
  const missing = createSpeechPlayer({ synthesis: null, Utterance: null, Audio: null })
  assert.equal(missing.canSpeak({ text: 'Monitor.' }), false)
  assert.equal(missing.speak({ text: 'Monitor.' }), false)
  assert.doesNotThrow(() => { missing.stop(); missing.dispose() })
  const broken = createSpeechPlayer({ synthesis: { getVoices() { throw Error() }, cancel() { throw Error() }, speak() { throw Error() } }, Utterance: function() {}, Audio: null })
  assert.equal(broken.speak({ text: 'Monitor.' }), false)
  assert.equal(broken.active, false)
})

test('recordings take precedence over TTS and stop/end releases the active state', () => {
  const recordings = [], spoken = []
  class Audio {
    constructor(src) { this.src = src; recordings.push(this) }
    play() { this.played = true; return Promise.resolve() }
    pause() { this.paused = true }
  }
  const player = createSpeechPlayer({ synthesis: { speak: message => spoken.push(message), cancel() {}, getVoices: () => [] }, Utterance: function(text) { this.text = text }, Audio })
  player.speak({ text: 'Monitor.', audioSrc: '/audio/monitor.mp3' })
  assert.equal(recordings[0].src, '/audio/monitor.mp3'); assert.equal(recordings[0].played, true)
  assert.equal(spoken.length, 0)
  player.stop()
  assert.equal(recordings[0].paused, true); assert.equal(player.active, false)
  player.speak({ audioSrc: '/audio/instruction.mp3' }); recordings[1].onended()
  assert.equal(player.active, false)
})

test('saved voice and reading preset apply globally; a preview does not change saved settings', () => {
  const chosen = { lang: 'pl-PL', voiceURI: 'system:chosen', name: 'Polski systemowy' }
  const automatic = { lang: 'pl-PL', voiceURI: 'system:natural', name: 'Polski Natural' }
  const messages = []
  const saved = { voiceURI: chosen.voiceURI, voiceName: chosen.name, voiceLang: chosen.lang, preset: 'slower' }
  const player = createSpeechPlayer({ synthesis: { getVoices: () => [automatic, chosen], cancel() {}, speak: m => messages.push(m) }, Utterance: function(text) { this.text = text }, Audio: null, getSettings: () => saved })
  player.speak({ text: 'Monitor.' })
  assert.equal(messages[0].voice, chosen); assert.equal(messages[0].rate, .85)
  player.speak({ text: 'Próba.', settings: { preset: 'regular' } })
  assert.equal(messages[1].voice, automatic); assert.equal(messages[1].rate, 1)
  player.speak({ text: 'Klawiatura.' })
  assert.equal(messages[2].voice, chosen); assert.equal(messages[2].rate, .85)
  assert.equal(selectPolishVoice([automatic], saved), automatic)
})
