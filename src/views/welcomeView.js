import { icon } from '../components/icons.js'
import { brandLogo } from '../components/brand.js'
import { clearCurrentStudent, selectRole } from '../storage/studentStorage.js'

export function welcomeView({ navigate }) {
  return {
    html: `<main id="main-content" class="role-screen" tabindex="-1">
      <div class="profile-intro role-intro">${brandLogo('brand-logo--welcome')}<h1>Witaj</h1><p>Wybierz, jak chcesz wejść.</p></div>
      <div class="role-grid">
        <button class="role-card" type="button" data-role="student"><span class="role-icon">${icon('leaf')}</span><strong>Uczeń</strong><small>Moje lekcje i Pracownia</small></button>
        <button class="role-card" type="button" data-role="teacher"><span class="role-icon role-icon--blue">${icon('teacher')}</span><strong>Nauczyciel</strong><small>Klasa, sprawdzanie i prace</small></button>
      </div>
    </main>`,
    mount(root) {
      root.querySelector('[data-role="student"]').addEventListener('click', () => { selectRole('student'); clearCurrentStudent(); navigate('/profiles') })
      root.querySelector('[data-role="teacher"]').addEventListener('click', () => navigate('/teacher-login'))
    },
  }
}
