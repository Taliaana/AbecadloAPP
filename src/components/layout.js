import { avatar, icon } from './icons.js'
import { escapeHtml } from '../utils/html.js'

const navigation = [
  { route: '/home', label: 'Dom', icon: 'home' },
  { route: '/workshop', label: 'Pracownia', icon: 'shelf' },
  { route: '/works', label: 'Moje prace', icon: 'works' },
]

const teacherNavigation = [
  { route: '/teacher/class', label: 'Klasa', icon: 'class' },
  { route: '/teacher/review', label: 'Do obejrzenia', icon: 'review' },
  { route: '/teacher/works', label: 'Prace', icon: 'works' },
]

export function appLayout(content, student, activeRoute = '') {
  const profile = student.profile
  const profileName = escapeHtml(profile.name)
  return `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/home" aria-label="Abecadło, strona główna">
          <span class="brand-mark" aria-hidden="true">A</span><span>Abecadło</span>
        </a>
        <nav class="main-nav" aria-label="Główna nawigacja">
          ${navigation.map((item) => `<a href="#${item.route}" class="nav-link ${activeRoute === item.route ? 'is-active' : ''}" ${activeRoute === item.route ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
        </nav>
        <a class="profile-chip" href="#/avatar" aria-label="Edytuj avatar. Obecnie profil ${profileName}">
          ${avatar(profile, 'small')}<span>${profileName}</span>
        </a>
      </header>
      <main id="main-content" class="main-content" tabindex="-1">${content}</main>
    </div>`
}

export function teacherLayout(content, activeRoute = '') {
  return `
    <div class="app-shell teacher-shell">
      <header class="topbar">
        <a class="brand" href="#/teacher/class" aria-label="Abecadło, panel nauczyciela"><span class="brand-mark" aria-hidden="true">A</span><span>Abecadło</span></a>
        <nav class="main-nav teacher-nav" aria-label="Panel nauczyciela">
          ${teacherNavigation.map((item) => `<a href="#${item.route}" class="nav-link ${activeRoute === item.route ? 'is-active' : ''}" ${activeRoute === item.route ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span></a>`).join('')}
        </nav>
        <div class="teacher-identity"><span class="teacher-badge">${icon('teacher')}</span><span><small>Panel nauczyciela</small><strong>Nauczyciel</strong></span><button class="button button-ghost button-compact no-print" type="button" data-action="leave-role">Zmień rolę</button></div>
      </header>
      <main id="main-content" class="main-content teacher-content" tabindex="-1">${content}</main>
    </div>`
}

export function lessonLayout(content, title, step, total = 3) {
  return `
    <div class="lesson-shell">
      <header class="lesson-header">
        <a class="button button-icon" href="#/home" aria-label="Zamknij lekcję">${icon('back')}</a>
        <div><span class="eyebrow">Lekcja</span><h1>${title}</h1></div>
        <span class="step-count" aria-label="Krok ${step} z ${total}">${step} z ${total}</span>
      </header>
      <div class="lesson-progress" aria-hidden="true"><span style="width:${(step / total) * 100}%"></span></div>
      <main id="main-content" class="lesson-content" tabindex="-1"><div class="lesson-stage">${content}</div></main>
    </div>`
}
