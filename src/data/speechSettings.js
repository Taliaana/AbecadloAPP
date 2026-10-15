export const speechPresets = [
  { id: 'calm', label: 'Spokojny — polecany', rate: .9 },
  { id: 'slower', label: 'Wolniej', rate: .85 },
  { id: 'regular', label: 'Zwykłe tempo', rate: 1 },
]
export function normalizeSpeechSettings(settings = {}) {
  return {
    preset: speechPresets.some(preset => preset.id === settings?.preset) ? settings.preset : 'calm',
    voiceURI: typeof settings?.voiceURI === 'string' ? settings.voiceURI : '',
    voiceName: typeof settings?.voiceName === 'string' ? settings.voiceName : '',
    voiceLang: typeof settings?.voiceLang === 'string' ? settings.voiceLang : '',
  }
}
export function speechVoiceId(voice) { return voice.voiceURI || `${voice.name}|${voice.lang}` }
