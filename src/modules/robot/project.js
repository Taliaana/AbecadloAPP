import { appLayout } from '../../components/layout.js'
import { workActions, waitingReviewScreen } from '../../components/workActions.js'
import { robotWorkPreview } from '../../components/robotBoard.js'
import { getWork, updateWork } from '../../storage/studentStorage.js'
import { createAutosave } from '../../utils/autosave.js'
import { escapeHtml } from '../../utils/html.js'
import { boardEditorHtml, mountBoardEditor } from './boardEditor.js'
import { robotExerciseView } from './exercise.js'

export function robotProjectView(context, initialWork) {
  let work = initialWork
  let data = structuredClone(work.data)
  let title = work.title
  let mountedRoot = null
  const persist = () => { work = updateWork(work.id, { title: title.trim() || 'Moja trasa', data, status: 'draft' }) }
  function screen() {
    data.board.title = title.trim() || 'Moja trasa'
    if (work.status === 'waiting-review') return { html: appLayout(waitingReviewScreen(), context.student, '/works') }
    if (work.status === 'completed') return { html: appLayout(`<section class="tool-header"><h1>${escapeHtml(work.title)}</h1><p>Twoja trasa jest w portfolio.</p></section>${robotWorkPreview(work)}<a class="button button-primary" href="#/tools/robot">Wróć do Robota</a>`, context.student, '/works') }
    const returned = work.status === 'returned' ? '<p class="returned-note" role="status">Możesz jeszcze popracować nad tą pracą.</p>' : ''
    if (data.editorMode !== false) return {
      html: appLayout(`<section class="tool-header"><a class="text-link" href="#/tools/robot">Wróć do Robota</a><p class="eyebrow">Moja trasa</p><h1>Stwórz własną trasę.</h1></section>${returned}${boardEditorHtml(data.board, title)}<p class="autosave-status" role="status">Zmiany zapisują się automatycznie.</p>`, context.student, '/workshop'),
      mount(root) {
        const autosave = createAutosave(persist)
        mountBoardEditor(root, data.board, {
          change(nextTitle) { if (nextTitle !== undefined) title = nextTitle; data.solved = false; autosave.schedule(true) },
          program() { autosave.flush(); data.editorMode = false; persist(); context.render(screen()) },
        })
        const flush = () => autosave.flush()
        const visibility = () => { if (document.visibilityState === 'hidden') flush() }
        window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility)
        return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility) }
      },
    }
    return robotExerciseView(context, {
      board: data.board, work,
      onChange(program, solved = false) {
        data.program = program; data.solved = solved
        const status = mountedRoot?.querySelector('[data-project-status]')
        if (status) status.textContent = solved ? 'Twoja trasa prowadzi do celu.' : 'Sprawdź trasę, uruchamiając program.'
      },
      onSave() { persist() },
      extra: `${returned}<section class="robot-project-actions"><button type="button" class="button button-ghost" data-edit-board>Zmień planszę</button><p data-project-status role="status">${data.solved ? 'Twoja trasa prowadzi do celu.' : 'Sprawdź trasę, uruchamiając program.'}</p>${workActions()}</section>`,
      onMount(root, exercise) {
        mountedRoot = root
        root.querySelector('[data-edit-board]').addEventListener('click', () => {
          if (exercise.running()) return
          exercise.flush(); data.program = exercise.program(); data.editorMode = true; persist(); context.render(screen())
        })
        root.querySelector('[data-work-action="draft"]').addEventListener('click', () => {
          exercise.flush(); data.program = exercise.program(); persist(); context.navigate('/home')
        })
        root.querySelector('[data-work-action="waiting-review"]').addEventListener('click', () => {
          if (exercise.running()) { root.querySelector('[data-project-status]').textContent = 'Poczekaj, aż robot zakończy program.'; return }
          exercise.flush(); data.program = exercise.program(); persist()
          work = updateWork(work.id, { status: 'waiting-review', data }); context.render(screen())
        })
      },
    })
  }
  // Always read the latest status after teacher review.
  work = getWork(work.id) || work
  return screen()
}
