import { profileView } from './views/profileView.js'
import { homeView } from './views/homeView.js'
import { pathView } from './views/pathView.js'
import { freeWorkView } from './views/freeWorkView.js'
import { worksView } from './views/worksView.js'
import { lessonOneView } from './lessons/lessonOne.js'
import { lessonTwoView } from './lessons/lessonTwo.js'
import { lessonThreeView } from './lessons/lessonThree.js'
import { lessonFourView } from './lessons/lessonFour.js'
import { typewritingView } from './modules/typewriting.js'
import { mousePracticeView } from './modules/mousePractice.js'
import { clearCurrentStudent, getCurrentStudent, getStudentProgress } from './storage/studentStorage.js'

export function startApp(root) {
  let cleanup = null
  function path() { return (window.location.hash.slice(1).split('?')[0] || '/home').replace(/\/$/, '') || '/home' }
  function navigate(route) {
    if (window.location.hash === `#${route}`) renderRoute()
    else window.location.hash = route
  }
  function renderView(view) {
    cleanup?.()
    cleanup = null
    root.innerHTML = view.html
    cleanup = view.mount?.(root) || null
    root.querySelector('[data-action="switch-profile"]')?.addEventListener('click', () => { clearCurrentStudent(); navigate('/profiles') })
    requestAnimationFrame(() => root.querySelector('#main-content')?.focus({ preventScroll: true }))
  }
  function context() {
    return { student: getCurrentStudent(), navigate, render: renderView }
  }
  function renderRoute() {
    const route = path()
    const student = getCurrentStudent()
    if (!student) {
      if (route !== '/profiles') window.history.replaceState(null, '', '#/profiles')
      renderView(profileView(context())); return
    }
    if (route === '/profiles') { navigate('/home'); return }
    const staticRoutes = { '/home': homeView, '/path': pathView, '/free-work': freeWorkView, '/works': worksView, '/tools/typewriting': typewritingView, '/tools/mouse': mousePracticeView }
    if (staticRoutes[route]) { renderView(staticRoutes[route](context())); return }
    const match = route.match(/^\/lesson\/(\d+)$/)
    if (match) {
      const id = Number(match[1]); const progress = getStudentProgress()
      if (progress[id] === 'locked' || ![1, 2, 3, 4].includes(id)) { navigate('/path'); return }
      const lessons = { 1: lessonOneView, 2: lessonTwoView, 3: lessonThreeView, 4: lessonFourView }
      renderView(lessons[id](context())); return
    }
    navigate('/home')
  }
  window.addEventListener('hashchange', renderRoute)
  renderRoute()
}
