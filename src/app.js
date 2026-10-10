import { avatarView } from './views/avatarView.js'
import { creativeWorkView } from './views/creativeWorkView.js'
import { workshopView } from './views/workshopView.js'
import { homeView } from './views/homeView.js'
import { pathView } from './views/pathView.js'
import { profileView } from './views/profileView.js'
import { teacherLoginView } from './views/teacherLoginView.js'
import { welcomeView } from './views/welcomeView.js'
import { worksView } from './views/worksView.js'
import { teacherAssignmentView } from './views/teacher/assignmentView.js'
import { teacherClassView } from './views/teacher/classView.js'
import { teacherReviewView } from './views/teacher/reviewView.js'
import { teacherStudentView } from './views/teacher/studentView.js'
import { teacherWorkDetailView } from './views/teacher/workDetailView.js'
import { teacherWorksView } from './views/teacher/worksView.js'
import { lessonOneView } from './lessons/lessonOne.js'
import { lessonTwoView } from './lessons/lessonTwo.js'
import { lessonThreeView } from './lessons/lessonThree.js'
import { lessonFourView } from './lessons/lessonFour.js'
import { mousePracticeView } from './modules/mousePractice.js'
import { typewritingView } from './modules/typewriting.js'
import { getCurrentRole, getCurrentStudent, getStudentProgress, leaveRole } from './storage/studentStorage.js'

export function startApp(root) {
  let cleanup = null

  function path() {
    return (window.location.hash.slice(1).split('?')[0] || '/welcome').replace(/\/$/, '') || '/welcome'
  }

  function navigate(route) {
    if (window.location.hash === `#${route}`) renderRoute()
    else window.location.hash = route
  }

  function renderView(view) {
    cleanup?.()
    cleanup = null
    root.innerHTML = view.html
    root.firstElementChild?.classList.add('view-enter')
    cleanup = view.mount?.(root) || null
    root.querySelector('[data-action="leave-role"]')?.addEventListener('click', () => { leaveRole(); navigate('/welcome') })
    requestAnimationFrame(() => root.querySelector('#main-content')?.focus({ preventScroll: true }))
  }

  function context(extra = {}) {
    return { student: getCurrentStudent(), navigate, render: renderView, ...extra }
  }

  function renderTeacherRoute(route) {
    const staticRoutes = {
      '/teacher/class': teacherClassView,
      '/teacher/review': teacherReviewView,
      '/teacher/works': teacherWorksView,
      '/teacher/assignments/new': teacherAssignmentView,
    }
    if (staticRoutes[route]) { renderView(staticRoutes[route](context())); return true }
    const studentMatch = route.match(/^\/teacher\/student\/([^/]+)$/)
    if (studentMatch) { renderView(teacherStudentView(context({ studentId: studentMatch[1] }))); return true }
    const workMatch = route.match(/^\/teacher\/work\/([^/]+)$/)
    if (workMatch) { renderView(teacherWorkDetailView(context({ workId: workMatch[1] }))); return true }
    return false
  }

  function renderStudentRoute(route, student) {
    const staticRoutes = {
      '/home': homeView,
      '/path': pathView,
      '/workshop': workshopView,
      '/works': worksView,
      '/avatar': avatarView,
      '/tools/typewriting': typewritingView,
      '/tools/mouse': mousePracticeView,
    }
    if (staticRoutes[route]) { renderView(staticRoutes[route](context())); return true }
    const lessonMatch = route.match(/^\/lesson\/(\d+)$/)
    if (lessonMatch) {
      const id = Number(lessonMatch[1])
      const progress = getStudentProgress()
      if (progress[id] === 'locked' || ![1, 2, 3, 4].includes(id)) { navigate('/path'); return true }
      const lessonViews = { 1: lessonOneView, 2: lessonTwoView, 3: lessonThreeView, 4: lessonFourView }
      renderView(lessonViews[id](context())); return true
    }
    const assignmentMatch = route.match(/^\/assignment\/([^/]+)$/)
    if (assignmentMatch) { renderView(creativeWorkView(context({ assignmentId: assignmentMatch[1] }))); return true }
    const workMatch = route.match(/^\/work\/([^/]+)$/)
    if (workMatch) { renderView(creativeWorkView(context({ workId: workMatch[1] }))); return true }
    return false
  }

  function renderRoute() {
    const route = path()
    const role = getCurrentRole()

    if (route === '/welcome') { renderView(welcomeView(context())); return }
    if (route === '/teacher-login') { renderView(teacherLoginView(context())); return }

    if (!role) { navigate('/welcome'); return }

    if (role === 'teacher') {
      if (!renderTeacherRoute(route)) navigate('/teacher/class')
      return
    }

    const student = getCurrentStudent()
    if (!student) {
      if (route !== '/profiles') window.history.replaceState(null, '', '#/profiles')
      renderView(profileView(context())); return
    }
    if (route === '/profiles') { navigate('/home'); return }
    if (route === '/free-work') { navigate('/workshop'); return }
    if (!renderStudentRoute(route, student)) navigate('/home')
  }

  window.addEventListener('hashchange', renderRoute)
  renderRoute()
}
