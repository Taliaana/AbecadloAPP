import { appLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { waitingReviewScreen, workActions } from '../components/workActions.js'
import { createAutosave } from '../utils/autosave.js'
import { getAssignment, getOrCreateAssignmentWork, getWork, updateWork } from '../storage/studentStorage.js'
import { escapeHtml } from '../utils/html.js'

const stages = ['jajo', 'gąsienica', 'poczwarka', 'motyl']

export function creativeWorkView({ student, workId = null, assignmentId = null, render, navigate }) {
  let work = workId ? getWork(workId) : getOrCreateAssignmentWork(assignmentId)
  const assignment = getAssignment(work?.assignmentId || assignmentId)
  if (!work || work.studentId !== student.profile.id) {
    return { html: appLayout('<section class="empty-state"><h1>Nie znaleziono pracy</h1><a class="button button-primary" href="#/home">Wróć do domu</a></section>', student, '/home') }
  }
  let data = { note: '', selectedStages: [], ...work.data }
  let showWaiting = work.status === 'waiting-review'

  function current() {
    if (showWaiting) return { html: appLayout(waitingReviewScreen(), student, '/home') }
    if (work.status === 'completed') return { html: appLayout(`<section class="completion-card"><span class="completion-check">${icon('check')}</span><p class="eyebrow">Praca zakończona</p><h2>${escapeHtml(work.title)}</h2><p>Praca jest już w Twoim portfolio.</p><a class="button button-primary" href="#/works">Zobacz moje prace</a></section>`, student, '/works') }
    const returned = work.status === 'returned'
    const content = `<section class="tool-header"><a class="text-link" href="#/home">${icon('back')} Wróć do domu</a><p class="eyebrow">${returned ? 'Wróć do swojej pracy' : 'Dodatkowe zadanie'}</p><h1>${escapeHtml(work.title)}</h1><p>${escapeHtml(assignment?.instruction || 'Zapisz swój pomysł.')}</p></section>
      ${returned ? '<div class="returned-note" role="status">Możesz jeszcze popracować nad tą pracą.</div>' : ''}
      <section class="mock-studio" aria-labelledby="mock-title"><div><p class="eyebrow">Szkic pomysłu</p><h2 id="mock-title">Wybierz etapy</h2><div class="stage-picker">${stages.map((stage, index) => `<button type="button" class="stage-tile ${data.selectedStages.includes(stage) ? 'is-selected' : ''}" data-stage="${stage}" aria-pressed="${data.selectedStages.includes(stage)}"><span>${index + 1}</span>${stage}</button>`).join('')}</div></div>
        <label class="work-note">Krótka notatka<textarea data-work-note placeholder="Co chcesz pokazać?">${escapeHtml(data.note || '')}</textarea></label><p class="autosave-status" data-autosave-status role="status" aria-live="polite">Zmiany zapisują się automatycznie.</p>
      </section>${workActions()}`
    return { html: appLayout(content, student, '/home'), mount }
  }

  function mount(root) {
    let status = root.querySelector('[data-autosave-status]')
    const autosave = createAutosave((nextData) => {
      work = updateWork(work.id, { status: 'draft', data: nextData })
      if (status?.isConnected) status.textContent = 'Zapisano automatycznie.'
    })
    const schedule = () => {
      if (status?.isConnected) status.textContent = 'Zapisywanie…'
      autosave.schedule({ ...data, selectedStages: [...data.selectedStages] })
    }
    root.querySelector('[data-work-note]')?.addEventListener('input', (event) => { data.note = event.target.value; schedule() })
    root.querySelectorAll('[data-stage]').forEach((button) => button.addEventListener('click', () => {
      const stage = button.dataset.stage
      data.selectedStages = data.selectedStages.includes(stage) ? data.selectedStages.filter((item) => item !== stage) : [...data.selectedStages, stage]
      schedule(); render(current())
    }))
    root.querySelector('[data-work-action="draft"]')?.addEventListener('click', () => { autosave.flush(); updateWork(work.id, { status: 'draft', data }); navigate('/home') })
    root.querySelector('[data-work-action="waiting-review"]')?.addEventListener('click', () => {
      autosave.flush(); work = updateWork(work.id, { status: 'waiting-review', data }); showWaiting = true; render(current())
    })
    return () => autosave.flush()
  }
  return current()
}
