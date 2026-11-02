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
import { teacherVoiceView } from './views/teacher/voiceView.js'
import { teacherMigrationView } from './views/teacher/migrationView.js'
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
import { getCurrentRole, getCurrentStudent, getStudentProgress, leaveRole, getAssignment, getWork, revalidate, retryPending, getStateSnapshot, mustWaitForSave, hasUnsavedChanges, flushData } from './storage/studentStorage.js'
import { flushAutosaves } from './utils/autosave.js'
import { getLesson } from './data/lessons.js'

export function startApp(root) {
  let cleanup = null
  let expectedHashChange = null
  let routeVersion = 0
  const status = document.createElement('aside')
  status.className = 'data-status no-print'; status.setAttribute('aria-live', 'polite'); status.hidden = true
  document.body.append(status)
  function errorMessage(error) {
    status.hidden = false; status.replaceChildren(document.createTextNode(error.message || 'Nie udało się połączyć. Spróbuj ponownie.'))
    const retry = document.createElement('button'); retry.className = 'button button-secondary'; retry.textContent = 'Spróbuj ponownie'
    retry.onclick = () => retryPending().then(renderRoute).catch(errorMessage); status.append(retry)
  }
  window.addEventListener('unhandledrejection', event => { event.preventDefault(); errorMessage(event.reason) })
  window.addEventListener('pinktower:data-status', event => { if (event.detail.failed) errorMessage(new Error(event.detail.message)); else { status.hidden = false; status.textContent = event.detail.message } })

  function path() {
    return (window.location.hash.slice(1).split('?')[0] || '/welcome').replace(/\/$/, '') || '/welcome'
  }

  function navigate(route) {
    if (window.location.hash === `#${route}`) renderRoute(false)
    else {
      expectedHashChange = `#${route}`
      window.location.hash = route
      renderRoute(false)
    }
    refreshProjection()
  }

  async function refreshProjection() {
    const before = JSON.stringify(getStateSnapshot()), hash = location.hash, version = routeVersion
    try {
      await revalidate()
      // Refresh collections when another device changed them. Never replace an
      // active exercise/editor or steal focus merely because a GET completed.
      if (hash === location.hash && version === routeVersion && before !== JSON.stringify(getStateSnapshot()) && ['/home','/path','/works','/workshop','/teacher/class','/teacher/review','/teacher/works'].includes(path())) renderRoute(false)
    } catch (error) { errorMessage(error) }
  }

  function renderView(view) {
    if (view?.then) { const hash = location.hash, version = routeVersion; view.then(result => { if (hash === location.hash && version === routeVersion) renderView(result) }).catch(errorMessage); return }
    cleanup?.()
    cleanup = null
    root.innerHTML = view.html
    root.firstElementChild?.classList.add('view-enter')
    cleanup = view.mount?.(root) || null
    root.firstElementChild?.addEventListener('submit', event => {
      const button = event.submitter
      if (!button) return
      queueMicrotask(() => {
        button.disabled = true; button.setAttribute('aria-busy', 'true')
        flushData().catch(() => {}).finally(() => { button.disabled = false; button.removeAttribute('aria-busy') })
      })
    }, { capture: true })
    root.firstElementChild?.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#/"]')
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      navigate(link.getAttribute('href').slice(1))
    })
    root.querySelector('[data-action="leave-role"]')?.addEventListener('click', async () => { await leaveRole(); navigate('/welcome') })
    requestAnimationFrame(() => root.querySelector(view.focusTarget || '#main-content')?.focus({ preventScroll: true }))
  }

  function context(extra = {}) {
    const hash = location.hash, version = routeVersion
    const current = () => hash === location.hash && version === routeVersion
    return { student: getCurrentStudent(), navigate: route => { if (current()) navigate(route) }, render: view => { if (current()) renderView(view) }, ...extra }
  }

  function renderTeacherRoute(route) {
    const staticRoutes = {
      '/teacher/class': teacherClassView,
      '/teacher/voice': teacherVoiceView,
      '/teacher/migration': teacherMigrationView,
      '/profiles': profileView,
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

  async function renderRoute(refresh = true) {
    const version = ++routeVersion
    // Flush the departing view before the next view reads storage.
    const dispose = cleanup
    cleanup = null
    dispose?.()
    // Internal navigation uses the last acknowledged server projection immediately.
    // Waiting for a redundant GET here leaves the old screen visible without its
    // listeners and loses keyboard input after a link click. Reloads, external hash
    // changes and explicit refresh still validate the session against the server.
    try {
      if (refresh) await revalidate()
      else if (hasUnsavedChanges()) await flushData()
    } catch (error) { errorMessage(error); return }
    if (version !== routeVersion) return
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
      navigate('/teacher-login?prepare=student'); return
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
  window.addEventListener('focus', refreshProjection)
  window.addEventListener('beforeunload', event => { flushAutosaves(); if (mustWaitForSave()) { event.preventDefault(); event.returnValue = '' } })
  renderRoute()
}
