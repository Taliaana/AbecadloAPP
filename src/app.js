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
import { teacherStudentFormView } from './views/teacher/studentFormView.js'
import { teacherWorkDetailView } from './views/teacher/workDetailView.js'
import { teacherWorksView } from './views/teacher/worksView.js'
import { lessonOneView } from './lessons/lessonOne.js'
import { lessonTwoView } from './lessons/lessonTwo.js'
import { lessonThreeView } from './lessons/lessonThree.js'
import { lessonFourView } from './lessons/lessonFour.js'
import { mousePracticeView } from './modules/mousePractice.js'
import { typewritingView } from './modules/typewriting.js'
import { robotView, robotWorkView } from './modules/robot.js'
import { researchBoardView } from './modules/researchBoard.js'
import { getCurrentRole, getCurrentStudent, getStudentProgress, leaveRole, getAssignment, getWork } from './storage/studentStorage.js'
import { getLesson } from './data/lessons.js'

export function startApp(root) {
  let cleanup = null
  let expectedHashChange = null

  function path() {
    return (window.location.hash.slice(1).split('?')[0] || '/welcome').replace(/\/$/, '') || '/welcome'
  }

  function navigate(route) {
    if (window.location.hash === `#${route}`) renderRoute()
    else {
      expectedHashChange = `#${route}`
      window.location.hash = route
      renderRoute()
    }
  }

  function renderView(view) {
    cleanup?.()
    cleanup = null
    root.innerHTML = view.html
    root.firstElementChild?.classList.add('view-enter')
    cleanup = view.mount?.(root) || null
    root.firstElementChild?.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#/"]')
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigate(link.getAttribute('href').slice(1))
    })
    root.querySelector('[data-action="leave-role"]')?.addEventListener('click', () => { leaveRole(); navigate('/welcome') })
    requestAnimationFrame(() => root.querySelector(view.focusTarget || '#main-content')?.focus({ preventScroll: true }))
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
      '/teacher/students/new': teacherStudentFormView,
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
      '/tools/robot': robotView,
      '/tools/research': researchBoardView,
    }
    if (staticRoutes[route]) { renderView(staticRoutes[route](context())); return true }
    const lessonMatch = route.match(/^\/lesson\/(\d+)$/)
    if (lessonMatch) {
      const id = Number(lessonMatch[1])
      const progress = getStudentProgress()
      const lesson = getLesson(id)
      const lessonViews = { 1: lessonOneView, 2: lessonTwoView, 3: lessonThreeView, 4: lessonFourView }
      if (progress[id] === 'locked' || !lesson?.implemented || !lessonViews[id]) { navigate('/path'); return true }
      renderView(lessonViews[id](context())); return true
    }
    const assignmentMatch = route.match(/^\/assignment\/([^/]+)$/)
    if (assignmentMatch) { const tool = getAssignment(assignmentMatch[1])?.tool; const view = tool === 'research-board' ? researchBoardView : tool === 'robot' ? robotWorkView : creativeWorkView; renderView(view(context({ assignmentId: assignmentMatch[1] }))); return true }
    const workMatch = route.match(/^\/work\/([^/]+)$/)
    if (workMatch) { const kind = getWork(workMatch[1])?.data.kind; const view = kind === 'research-board' ? researchBoardView : kind?.startsWith('robot-') ? robotWorkView : creativeWorkView; renderView(view(context({ workId: workMatch[1] }))); return true }
    return false
  }

  function renderRoute() {
    // Flush the departing view before the next view reads storage.
    const dispose = cleanup
    cleanup = null
    dispose?.()
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

  window.addEventListener('hashchange', () => {
    if (expectedHashChange === window.location.hash) { expectedHashChange = null; return }
    expectedHashChange = null
    renderRoute()
  })
  renderRoute()
}
