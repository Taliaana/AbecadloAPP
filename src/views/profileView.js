import { avatar } from '../components/icons.js'
import { getProfiles, setCurrentStudent } from '../storage/studentStorage.js'

export function profileView({ navigate }) {
  const profiles = getProfiles()
  return {
    html: `<main id="main-content" class="profile-screen" tabindex="-1">
      <div class="profile-intro">
        <span class="brand-mark brand-mark--large" aria-hidden="true">A</span>
        <p class="eyebrow">Abecadło</p>
        <h1>Kto dziś pracuje?</h1>
        <p>Wybierz swój profil.</p>
      </div>
      <div class="profile-grid" aria-label="Profile uczniów">
        ${profiles.map((profile) => `<button class="profile-card" type="button" data-profile="${profile.id}">${avatar(profile, 'large')}<span>${profile.name}</span></button>`).join('')}
      </div>
      <a class="text-link profile-role-link" href="#/welcome">Zmień rolę</a>
    </main>`,
    mount(root) {
      root.querySelectorAll('[data-profile]').forEach((button) => button.addEventListener('click', () => {
        setCurrentStudent(button.dataset.profile)
        navigate('/home')
      }))
    },
  }
}
