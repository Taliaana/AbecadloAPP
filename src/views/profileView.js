import { avatar } from '../components/icons.js'
import { getProfiles, setCurrentStudent } from '../storage/studentStorage.js'
import { escapeHtml } from '../utils/html.js'

export function profileView({ navigate }) {
  const profiles = getProfiles()
  return {
    html: `<main id="main-content" class="profile-screen" tabindex="-1">
      <div class="profile-room" aria-hidden="true"><span class="room-sun"></span><span class="room-leaf room-leaf--one"></span><span class="room-leaf room-leaf--two"></span></div>
      <header class="profile-intro">
        <a class="brand profile-brand" href="#/welcome"><span class="brand-mark" aria-hidden="true">A</span><span>Abecadło</span></a>
        <p class="eyebrow">Nasza pracownia</p>
        <h1>Znajdź swoje miejsce</h1>
        <p>Wybierz poduszkę ze swoim imieniem.</p>
      </header>
      <div class="profile-grid" aria-label="Profile uczniów">
        ${profiles.map((profile, index) => `<button class="profile-card profile-card--${(index % 3) + 1}" type="button" data-profile="${escapeHtml(profile.id)}"><span class="profile-avatar">${avatar(profile, 'large')}</span><span class="profile-name">${escapeHtml(profile.name)}</span><small>Moje miejsce</small></button>`).join('')}
      </div>
      <div class="profile-floor" aria-hidden="true"></div>
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
