import { teacherLayout } from '../../components/layout.js'
import { icon } from '../../components/icons.js'
import { normalizeSpeechSettings, speechPresets, speechVoiceId } from '../../data/speechSettings.js'
import { getSpeechSettings, saveSpeechSettings } from '../../storage/studentStorage.js'
import { getSpeechPlayer } from '../../utils/speech.js'

export function teacherVoiceView() {
  const draft = getSpeechSettings()
  const example = 'Dzień dobry. Przyjrzyj się obrazowi, a potem przepisz nazwę.'
  return {
    html: teacherLayout(`<a class="text-link" href="#/teacher/class">${icon('back')} Wróć do klasy</a><section class="form-card"><p class="eyebrow">Odsłuch w PinkTower</p><h1>Głos i odsłuch</h1><p>Wybierz głos i tempo. Najpierw posłuchaj, potem zapisz. Ustawienia obowiązują w całym PinkTower w tej przeglądarce.</p><form data-voice-settings><label>Głos<select name="voice" aria-label="Głos" aria-describedby="voice-availability"><option value="">Automatyczny — polecany</option></select></label><p id="voice-availability" class="form-feedback" role="status"></p><label>Wariant czytania<select name="preset">${speechPresets.map(preset => `<option value="${preset.id}" ${preset.id === draft.preset ? 'selected' : ''}>${preset.label}</option>`).join('')}</select></label><p>Wariant zmienia tempo. Barwa zależy od wybranego głosu.</p><div class="form-actions"><button type="button" class="button button-secondary speech-button" data-voice-preview aria-pressed="false">${icon('sound')} <span>Odsłuchaj</span></button><button type="submit" class="button button-primary">Zapisz ustawienia</button></div><p class="form-feedback" data-voice-feedback role="status" aria-live="polite"></p></form></section>`, '/teacher/class'),
    mount(root) {
      const player = getSpeechPlayer()
      const form = root.querySelector('[data-voice-settings]'), select = form.elements.voice
      const preview = root.querySelector('[data-voice-preview]'), feedback = root.querySelector('[data-voice-feedback]')
      let voices = []
      const storedId = () => draft.voiceURI || (draft.voiceName ? speechVoiceId({ name: draft.voiceName, lang: draft.voiceLang }) : '')
      function updateVoices() {
        voices = player.getPolishVoices()
        const options = [new Option('Automatyczny — polecany', '')]
        voices.forEach(voice => options.push(new Option(`${voice.name} (${voice.lang})`, speechVoiceId(voice))))
        const missing = Boolean(storedId() && !voices.some(voice => speechVoiceId(voice) === storedId()))
        if (missing) { const option = new Option(`${draft.voiceName || 'Wybrany głos'} — teraz niedostępny`, storedId()); option.disabled = true; options.push(option) }
        select.replaceChildren(...options); select.value = storedId()
        root.querySelector('#voice-availability').textContent = !player.canSpeak({ text: example }) ? 'Ta przeglądarka nie obsługuje odsłuchu. Lekcje nadal działają.' : missing ? 'Wybrany głos jest teraz niedostępny. Odsłuch użyje wyboru automatycznego.' : voices.length ? 'Dostępne są polskie głosy tej przeglądarki. Możesz porównać ich brzmienie.' : 'Lista polskich głosów może pojawić się po chwili. Na razie możesz użyć wyboru automatycznego.'
      }
      function updatePlayback() {
        const active = player.activeOwner === preview
        preview.disabled = !player.canSpeak({ text: example })
        preview.setAttribute('aria-pressed', String(active))
        preview.querySelector('span').textContent = active ? 'Zatrzymaj odsłuch' : 'Odsłuchaj'
      }
      function stopPreview() { if (player.activeOwner === preview) player.stop() }
      const unsubscribeVoices = player.subscribeVoices(updateVoices)
      const unsubscribe = player.subscribe(updatePlayback)
      updateVoices(); updatePlayback()
      form.addEventListener('change', event => {
        stopPreview(); feedback.textContent = ''
        if (event.target === select) {
          const voice = voices.find(voice => speechVoiceId(voice) === select.value)
          Object.assign(draft, { voiceURI: voice?.voiceURI || '', voiceName: voice?.name || '', voiceLang: voice?.lang || '' })
          updateVoices()
        } else draft.preset = form.elements.preset.value
      })
      preview.addEventListener('click', () => {
        if (player.activeOwner === preview) { player.stop(); return }
        if (!player.speak({ text: example, owner: preview, settings: draft })) feedback.textContent = 'Odsłuch jest teraz niedostępny. Spróbuj ponownie później.'
      })
      form.addEventListener('submit', event => {
        event.preventDefault(); stopPreview()
        try { Object.assign(draft, saveSpeechSettings(normalizeSpeechSettings(draft))); feedback.textContent = 'Zapisano ustawienia głosu.' }
        catch { feedback.textContent = 'Nie udało się zapisać ustawień. Spróbuj ponownie.' }
      })
      return () => { unsubscribeVoices(); unsubscribe(); stopPreview() }
    },
  }
}
