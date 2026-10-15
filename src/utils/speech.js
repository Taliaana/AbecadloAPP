import { normalizeSpeechSettings, speechPresets } from '../data/speechSettings.js'
import { getSpeechSettings } from '../storage/studentStorage.js'

const polishLocale = voice => String(voice.lang || '').replaceAll('_', '-').toLowerCase()
const isPolish = voice => /^pl(?:-|$)/.test(polishLocale(voice))

// Names describe voice capabilities, not guaranteed sound quality. Never use list indices.
export function selectPolishVoice(voices = [], preferred = {}) {
  const chosen = voices.find(voice => isPolish(voice) && (preferred.voiceURI ? voice.voiceURI === preferred.voiceURI : preferred.voiceName && voice.name === preferred.voiceName && polishLocale(voice) === polishLocale({ lang: preferred.voiceLang })))
  if (chosen) return chosen
  const score = voice => {
    const name = String(voice.name || '').toLowerCase()
    return (polishLocale(voice) === 'pl-pl' ? 10_000 : 1000)
      + (/natural|neural|premium|enhanced/.test(name) ? 200 : 0)
      - (/espeak|mbrola|diphone|compact|robotic/.test(name) ? 200 : 0)
      + (voice.localService ? 10 : 0) + (voice.default ? 5 : 0)
  }
  return [...voices].filter(isPolish)
    .sort((a, b) => score(b) - score(a) || String(a.name || a.voiceURI || '').localeCompare(String(b.name || b.voiceURI || '')))[0] || null
}

export function createSpeechPlayer({ synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance, Audio = globalThis.Audio, getSettings = () => normalizeSpeechSettings() } = {}) {
  const supportsSpeech = Boolean(synthesis && typeof synthesis.speak === 'function' && typeof Utterance === 'function')
  const subscribers = new Set()
  const voiceSubscribers = new Set()
  let voices = [], current = null
  const refreshVoices = () => {
    const before = JSON.stringify(voices.map(voice => [voice.voiceURI, voice.name, voice.lang, voice.localService, voice.default]))
    try { voices = Array.from(synthesis?.getVoices?.() || []) } catch { voices = [] }
    const after = JSON.stringify(voices.map(voice => [voice.voiceURI, voice.name, voice.lang, voice.localService, voice.default]))
    if (before !== after) voiceSubscribers.forEach(listener => listener())
  }
  refreshVoices()
  const previousVoiceHandler = synthesis?.onvoiceschanged
  const voiceHandler = event => { refreshVoices(); previousVoiceHandler?.call(synthesis, event) }
  if (synthesis?.addEventListener) synthesis.addEventListener('voiceschanged', refreshVoices)
  else if (synthesis) synthesis.onvoiceschanged = voiceHandler
  const notify = () => subscribers.forEach(listener => listener())
  const canSpeak = ({ text = '', audioSrc } = {}) => Boolean((audioSrc && typeof Audio === 'function') || (text.trim() && supportsSpeech))

  function stop() {
    const previous = current
    current = null // Ignore late end/error events from cancelled speech or audio.
    if (previous?.audio) {
      previous.audio.onended = previous.audio.onerror = null
      try { previous.audio.pause(); previous.audio.currentTime = 0 } catch { /* Optional browser media. */ }
    }
    try { synthesis?.cancel?.() } catch { /* A broken platform must not break the lesson. */ }
    if (previous) notify()
  }
  function speak({ text = '', audioSrc, owner = null, settings } = {}) {
    stop()
    if (!canSpeak({ text, audioSrc })) return false
    const session = { owner, audio: null, utterance: null }
    current = session
    const end = () => { if (current === session) { current = null; notify() } }
    const audioFailed = () => {
      if (current !== session) return
      stop()
      if (text.trim() && supportsSpeech) speak({ text, owner, settings })
    }
    try {
      if (audioSrc && typeof Audio === 'function') {
        const audio = new Audio(audioSrc)
        session.audio = audio
        audio.volume = 1
        audio.onended = end; audio.onerror = audioFailed
        notify()
        audio.play()?.catch(audioFailed)
      } else {
        refreshVoices()
        const message = new Utterance(text)
        session.utterance = message
        const chosenSettings = normalizeSpeechSettings(settings ?? getSettings())
        message.lang = 'pl-PL'; message.rate = speechPresets.find(preset => preset.id === chosenSettings.preset).rate; message.pitch = 1; message.volume = 1
        const voice = selectPolishVoice(voices, chosenSettings)
        // With no Polish voice, leave voice unset and let the browser resolve pl-PL.
        if (voice) message.voice = voice
        message.onend = message.onerror = end
        notify()
        synthesis.speak(message)
      }
      return true
    } catch {
      if (session.audio) audioFailed()
      else end()
      return false
    }
  }
  return {
    speak, stop, canSpeak,
    get activeOwner() { return current?.owner ?? null },
    get active() { return current !== null },
    subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener) },
    getPolishVoices() { return voices.filter(isPolish).sort((a, b) => a.name.localeCompare(b.name)) },
    subscribeVoices(listener) { voiceSubscribers.add(listener); return () => voiceSubscribers.delete(listener) },
    dispose() {
      stop(); subscribers.clear(); voiceSubscribers.clear()
      if (synthesis?.removeEventListener) synthesis.removeEventListener('voiceschanged', refreshVoices)
      else if (synthesis?.onvoiceschanged === voiceHandler) synthesis.onvoiceschanged = previousVoiceHandler
    },
  }
}

let player
export function getSpeechPlayer() { return player ||= createSpeechPlayer({ getSettings: getSpeechSettings }) }
export function speak(options) { return getSpeechPlayer().speak(options) }
export function stopSpeaking() { getSpeechPlayer().stop() }
