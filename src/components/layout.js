import { avatar, icon } from './icons.js'

const navigation = [
  { route: '/home', label: 'Dom', icon: 'home' },
  { route: '/free-work', label: 'Praca wolna', icon: 'shelf' },
  { route: '/works', label: 'Moje prace', icon: 'works' },
]

export function appLayout(content, student, activeRoute = '') {
  const profile = student.profile
  return `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/home" aria-label="Abecadło, strona główna">
          <span class="brand-mark" aria-hidden="true">A</span><span>Abecadło</span>
        </a>
        <button class="profile-chip" type="button" data-action="switch-profile" aria-label="Zmień profil. Obecnie ${profile.name}">
          ${avatar(profile, 'small')}<span>${profile.name}</span>
        </button>
      </header>
      <nav class="main-nav" aria-label="Główna nawigacja">
        ${navigation.map((item) => `<a href="#${item.route}" class="nav-link ${activeRoute === item.route ? 'is-active' : ''}" ${activeRoute === item.route ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
      </nav>
      <main id="main-content" class="main-content" tabindex="-1">${content}</main>
    </div>`
}

export function lessonLayout(content, title, step, total = 3) {
  return `
    <div class="lesson-shell">
      <header class="lesson-header">
        <a class="icon-button" href="#/home" aria-label="Zamknij lekcję">${icon('back')}</a>
        <div><span class="eyebrow">Lekcja</span><h1>${title}</h1></div>
        <span class="step-count" aria-label="Krok ${step} z ${total}">${step} z ${total}</span>
      </header>
      <div class="lesson-progress" aria-hidden="true"><span style="width:${(step / total) * 100}%"></span></div>
      <main id="main-content" class="lesson-content" tabindex="-1">${content}</main>
    </div>`
}
