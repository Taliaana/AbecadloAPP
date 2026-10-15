import { icon } from './icons.js'
import { escapeHtml } from '../utils/html.js'
import { getSpeechPlayer } from '../utils/speech.js'

export function speechButton(text, label = text, { audioSrc } = {}) {
  return `<button type="button" class="button button-icon speech-button" data-speak="${escapeHtml(text)}" data-speech-label="${escapeHtml(label)}" ${audioSrc ? `data-audio-src="${escapeHtml(audioSrc)}"` : ''} aria-pressed="false" aria-label="Posłuchaj: ${escapeHtml(label)}">${icon('sound')}</button>`
}
export function bindSpeechButtons(root) {
  const player = getSpeechPlayer()
  const buttons = [...root.querySelectorAll('[data-speak]')]
  const options = button => ({ text: button.dataset.speak, audioSrc: button.dataset.audioSrc, owner: button })
  function update() {
    buttons.forEach(button => {
      const active = player.activeOwner === button
      button.disabled = !player.canSpeak(options(button))
      button.setAttribute('aria-pressed', String(active))
      button.setAttribute('aria-label', `${active ? 'Zatrzymaj odsłuch' : 'Posłuchaj'}: ${button.dataset.speechLabel || button.dataset.speak}`)
      if (button.disabled) button.title = 'Odsłuch jest niedostępny w tej przeglądarce.'
    })
  }
  const click = event => {
    const button = event.currentTarget
    if (player.activeOwner === button) player.stop()
    else if (!player.speak(options(button))) button.title = 'Odsłuch jest teraz niedostępny.'
  }
  buttons.forEach(button => button.addEventListener('click', click))
  const unsubscribe = player.subscribe(update)
  update()
  return () => {
    unsubscribe(); buttons.forEach(button => button.removeEventListener('click', click))
    if (buttons.includes(player.activeOwner)) player.stop()
  }
}
