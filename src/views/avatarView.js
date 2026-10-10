import { appLayout } from '../components/layout.js'
import { avatar } from '../components/icons.js'
import { clearCurrentStudent, updateCurrentAvatar } from '../storage/studentStorage.js'

const choices = {
  face: [['round', 'Okrągła'], ['soft', 'Smukła'], ['wide', 'Szeroka']],
  hair: [['short', 'Krótka'], ['bob', 'Do uszu'], ['tufts', 'Czupryna']],
  hairColor: [['dark', 'Ciemne'], ['brown', 'Brązowe'], ['gold', 'Jasne'], ['copper', 'Rude']],
  shirtColor: [['green', 'Zielona'], ['blue', 'Niebieska'], ['yellow', 'Żółta'], ['coral', 'Koralowa']],
  backgroundColor: [['mint', 'Miętowe'], ['sky', 'Błękitne'], ['sand', 'Piaskowe'], ['rose', 'Różowe']],
}

const labels = { face: 'Kształt twarzy', hair: 'Fryzura', hairColor: 'Kolor włosów', shirtColor: 'Koszulka', backgroundColor: 'Tło' }

export function avatarView({ student, render, navigate }) {
  let config = { ...student.profile.avatarConfig }

  function current() {
    const previewProfile = { ...student.profile, avatarConfig: config }
    const content = `<section class="page-heading"><p class="eyebrow">Mój profil</p><h1>Ustaw swój avatar</h1><p>Wybierz kilka prostych cech.</p></section>
      <div class="avatar-editor">
        <aside class="avatar-preview"><div aria-live="polite">${avatar(previewProfile, 'xlarge')}</div><strong>${student.profile.name}</strong></aside>
        <div class="avatar-options">${Object.entries(choices).map(([trait, options]) => `<fieldset><legend>${labels[trait]}</legend><div class="option-pills">${options.map(([value, label]) => `<button type="button" class="option-pill ${config[trait] === value ? 'is-selected' : ''}" data-trait="${trait}" data-value="${value}" aria-pressed="${config[trait] === value}">${label}</button>`).join('')}</div></fieldset>`).join('')}
          <div class="form-actions"><button class="button button-secondary" type="button" data-switch-profile>Zmień profil</button><button class="button button-primary" type="button" data-save-avatar>Zapisz avatar</button></div>
        </div>
      </div>`
    return { html: appLayout(content, { ...student, profile: previewProfile }), mount }
  }

  function mount(root) {
    root.querySelectorAll('[data-trait]').forEach((button) => button.addEventListener('click', () => {
      config = { ...config, [button.dataset.trait]: button.dataset.value }
      render(current())
    }))
    root.querySelector('[data-save-avatar]').addEventListener('click', () => { updateCurrentAvatar(config); navigate('/home') })
    root.querySelector('[data-switch-profile]').addEventListener('click', () => { clearCurrentStudent(); navigate('/profiles') })
  }
  return current()
}
