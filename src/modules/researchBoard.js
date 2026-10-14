import { appLayout } from '../components/layout.js'
import { workActions, waitingReviewScreen } from '../components/workActions.js'
import { mountResearchImages, researchPreview } from '../components/researchPreview.js'
import { boardItems, getResearchBoard, isResearchComplete } from '../data/researchBoards.js'
import { createWork, getAssignment, getAssignmentsForStudent, getStudentWorks, getWork, updateWork } from '../storage/studentStorage.js'
import { deleteImage, storeImage } from '../storage/imageStorage.js'
import { createAutosave } from '../utils/autosave.js'
import { escapeHtml } from '../utils/html.js'
import { mountImageResizing } from '../utils/researchImageResize.js'

export function researchBoardView({ student, workId, assignmentId, navigate }) {
  const assignment = assignmentId ? getAssignmentsForStudent(student.id).find(item => item.id === assignmentId) : null
  let work = workId ? getWork(workId) : getStudentWorks(student.id).find(item => item.data.kind === 'research-board' && (assignmentId ? item.assignmentId === assignmentId : !item.assignmentId && item.status !== 'completed'))
  if (assignmentId && (!assignment || getAssignment(assignmentId)?.tool !== 'research-board')) work = null
  if (!work && !workId && (!assignmentId || assignment)) work = createWork({ studentId: student.id, title: assignment?.title || getResearchBoard().title, type: 'Tablica badawcza', assignmentId: assignment?.id, completionType: 'teacher-review', data: { kind: 'research-board', boardId: 'rocks', entries: {}, answers: [] } })
  if (!work || work.studentId !== student.id || work.data.kind !== 'research-board') return { html: appLayout('<p>Nie znaleziono pracy.</p>', student, '/works') }
  const board = getResearchBoard(work.data.boardId)
  if (!board) return { html: appLayout('<p>Nie znaleziono tablicy.</p>', student, '/works') }
  const editable = ['draft', 'returned'].includes(work.status)
  const data = structuredClone(work.data)
  data.entries ||= {}; data.answers ||= []
  const trial = board.trial && !data.trialCompleted && editable
  const chromeIcon = '<svg class="icon" viewBox="0 0 48 48" role="img" aria-label="Google Chrome"><circle cx="24" cy="24" r="22" fill="#e9e4dd"/><path d="M24 2a22 22 0 0 1 19 11H24L14 30 5 14A22 22 0 0 1 24 2Z" fill="#d45b55"/><path d="M43 13a22 22 0 0 1-19 33l10-17-10-16Z" fill="#d6b75b"/><path d="M24 46A22 22 0 0 1 5 14l9 16h20Z" fill="#6d986f"/><circle cx="24" cy="24" r="10" fill="#6996bc" stroke="#fffaf5" stroke-width="2"/></svg>'
  const instruction = `<details class="research-instructions"><summary>Jak wykonać zadanie?</summary><ol>${board.instructions.map(step => typeof step === 'string' ? `<li>${escapeHtml(step)}</li>` : `<li>${step.chrome ? chromeIcon : ''}<strong>${escapeHtml(step.title)}</strong>${step.text ? `<p>${escapeHtml(step.text)}</p>` : ''}</li>`).join('')}</ol><p>Ctrl + T – nowa karta<br>Ctrl + C – kopiuj<br>Ctrl + V – wklej<br>Shift – zachowaj proporcje obrazu podczas zmiany rozmiaru</p></details>`
  const photo = (id, title) => `<div class="research-photo-frame"><button type="button" class="research-photo" data-photo="${id}" aria-label="Zdjęcie: ${escapeHtml(title)}" aria-pressed="false"><span data-photo-hint>Wybierz miejsce na zdjęcie</span></button><div class="research-image-box" hidden><img data-research-image="${id}" data-image-id="${escapeHtml(data.entries[id]?.imageId || '')}" alt="${escapeHtml(title)}" hidden />${['nw', 'ne', 'sw', 'se'].map((corner, index) => `<button type="button" class="research-resize-handle" data-resize-corner="${corner}" aria-label="Zmień rozmiar: ${escapeHtml(title)}, róg ${index + 1}" aria-describedby="research-resize-help"></button>`).join('')}</div></div><button type="button" class="button button-secondary research-paste-button" data-paste-photo="${id}" hidden>Wklej obraz</button>`
  const content = `<a class="text-link" href="#/workshop">Wróć do Pracowni</a><section class="research-board"><header class="page-header"><p class="eyebrow">${escapeHtml(board.classLabel || 'Tablica badawcza')}</p><h1>${escapeHtml(work.title)}</h1><p>Znajdź zdjęcia. Wklej je we właściwe miejsca.</p>${assignment ? `<p>${escapeHtml(assignment.instruction)}</p>` : ''}</header>${instruction}<p id="research-resize-help">Przeciągnij za róg, aby zmienić wielkość. Przytrzymaj Shift, aby zachować proporcje. Możesz też użyć klawiszy strzałek na uchwycie.</p>
    ${editable ? `<p>Zdjęcie znalezione w internecie ma autora i źródło. Zapisz stronę, z której pochodzi.</p>${work.status === 'returned' ? '<p class="form-feedback">Możesz jeszcze popracować nad tą pracą.</p>' : ''}
    <section data-trial ${trial ? '' : 'hidden'}><h2>${escapeHtml(board.trial?.title || '')}</h2><ol>${(board.trial?.instructions || [board.trial?.instruction || '']).map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>${photo('trial', `Próba – ${board.trial?.item || 'zdjęcie'}`)}<p data-trial-ready role="status"></p><button type="button" class="button button-primary" data-start hidden>Rozpocznij swoją pracę</button></section>
    <div data-main-board ${trial ? 'hidden' : ''}><div class="research-groups">${board.groups.map(group => `<section><h2>${escapeHtml(group.title)}</h2>${group.items.map(item => `<article class="research-item" data-item="${item.id}"><h3>${escapeHtml(item.title)}</h3>${photo(item.id, item.title)}<div class="research-photo-actions"><button type="button" class="button button-ghost" data-change="${item.id}">Zmień zdjęcie</button><button type="button" class="button button-ghost" data-remove="${item.id}" ${data.entries[item.id]?.imageId ? '' : 'disabled'} aria-label="Usuń zdjęcie: ${escapeHtml(item.title)}">Usuń</button></div><label>Źródło<input type="text" inputmode="url" data-source="${item.id}" aria-label="Źródło: ${escapeHtml(item.title)}" value="${escapeHtml(data.entries[item.id]?.source || '')}" placeholder="Adres strony" aria-describedby="source-help-${item.id}" /></label><p class="research-source-help" id="source-help-${item.id}">Skopiuj adres strony z paska u góry przeglądarki: Ctrl + C → wróć do PinkTower → Ctrl + V.</p></article>`).join('')}</section>`).join('')}</div>
    <section data-reflection hidden><h2>Przyjrzyj się swoim zdjęciom.</h2>${board.reflectionQuestions.map((question, index) => `<label class="research-answer">${escapeHtml(question)}<textarea data-answer="${index}">${escapeHtml(data.answers[index] || '')}</textarea></label>`).join('')}</section>${workActions()}<p data-completeness>Dodaj wszystkie zdjęcia i źródła, aby pokazać pracę nauczycielowi.</p></div><p data-research-status role="status" aria-live="polite"></p><div class="research-photo-menu" data-photo-menu role="menu" aria-label="Opcje zdjęcia" hidden><button type="button" class="button button-secondary" role="menuitem" data-menu-paste>Wklej obraz</button></div>` : work.status === 'waiting-review' ? `${waitingReviewScreen()}${researchPreview(work)}` : `<p role="status">Praca zakończona.</p>${researchPreview(work)}`}
    </section>`
  return { html: appLayout(content, student, '/workshop'), mount(root) {
    let active = null, busy = false, disposed = false, trialUrl = null, imagesUnavailable = false
    const menu = root.querySelector('[data-photo-menu]')
    let menuTarget = null
    const closeMenu = () => { if (menu) menu.hidden = true; menuTarget = null }
    const urls = new Map()
    const save = () => updateWork(work.id, { data: structuredClone(data) })
    const autosave = createAutosave(save)
    const status = message => { if (!disposed) root.querySelector('[data-research-status]')?.replaceChildren(document.createTextNode(message)) }
    function update() {
      if (disposed || !editable) return
      const complete = isResearchComplete(board, data.entries)
      root.querySelector('[data-reflection]').hidden = !complete
      root.querySelector('[data-completeness]').hidden = complete
      root.querySelector('[data-work-action="waiting-review"]').disabled = busy || imagesUnavailable || !complete
      root.querySelector('[data-work-action="draft"]').disabled = busy
      root.querySelectorAll('[data-photo], [data-change], [data-remove], [data-start], [data-resize-corner], [data-paste-photo]').forEach(button => {
        const id = button.dataset.photo || button.dataset.change || button.dataset.remove
        button.disabled = busy || Boolean(button.dataset.remove && !data.entries[id]?.imageId)
      })
      root.querySelectorAll('[data-paste-photo]').forEach(button => {
        const id = button.dataset.pastePhoto
        button.hidden = id !== active || Boolean(id === 'trial' ? trialUrl : data.entries[id]?.imageId)
      })
      root.querySelectorAll('[data-photo]').forEach(button => {
        const selected = button.dataset.photo === active
        button.setAttribute('aria-pressed', String(selected))
        button.querySelector('[data-photo-hint]').textContent = selected ? 'Wklej zdjęcie – Ctrl + V' : 'Wybierz miejsce na zdjęcie'
        button.querySelector('[data-photo-hint]').hidden = Boolean(button.dataset.photo === 'trial' ? trialUrl : data.entries[button.dataset.photo]?.imageId) && !selected
      })
    }
    const images = mountResearchImages(root, work, (id, reason) => {
      if (!editable) { status('Nie można odczytać zdjęcia.'); return }
      if (reason === 'unavailable') { imagesUnavailable = true; update(); status('Nie można teraz odczytać zdjęć. Wróć do tej pracy później.'); return }
      data.entries[id].imageId = null; save(); update(); status('Wklej ponownie brakujące zdjęcie.')
    })
    const resizing = mountImageResizing(root, { getSize: id => data.entries[id]?.imageSize, isDisabled: () => busy || !editable, onChange: (id, size) => { if (id !== 'trial') { (data.entries[id] ||= {}).imageSize = size; autosave.schedule(true) } } })
    if (!editable) return () => { images.dispose(); resizing() }
    // Do not allow submission until persisted images have been read successfully.
    busy = true; update(); images.ready.finally(() => { busy = false; update() })
    const select = id => { closeMenu(); active = id; update(); root.querySelector(`[data-photo="${id}"]`).focus() }
    root.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => select(button.dataset.photo)))
    root.querySelectorAll('.research-image-box img').forEach(img => img.addEventListener('click', () => { if (!busy) select(img.dataset.researchImage) }))
    root.querySelectorAll('[data-change]').forEach(button => button.addEventListener('click', () => select(button.dataset.change)))
    root.querySelectorAll('[data-source]').forEach(input => input.addEventListener('input', () => {
      const entry = data.entries[input.dataset.source] ||= {}; entry.source = input.value; autosave.schedule(true); update()
    }))
    root.querySelectorAll('[data-answer]').forEach(input => input.addEventListener('input', () => { data.answers[Number(input.dataset.answer)] = input.value; autosave.schedule(true) }))
    root.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', async () => {
      const id = button.dataset.remove, old = data.entries[id]?.imageId
      data.entries[id].imageId = null; autosave.flush(); save()
      const img = root.querySelector(`[data-research-image="${id}"]`)
      busy = true; update()
      await img.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], { duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160 }).finished.catch(() => {})
      img.hidden = true; img.closest('.research-image-box').hidden = true; img.removeAttribute('src'); img.dataset.imageId = ''; delete data.entries[id].imageSize; save()
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id) }
      busy = false; update(); status('Zdjęcie usunięte.'); await deleteImage(old).catch(() => {})
    }))
    root.querySelector('[data-start]').addEventListener('click', () => {
      data.trialCompleted = true; save(); root.querySelector('[data-trial]').hidden = true; root.querySelector('[data-main-board]').hidden = false
      active = null; update(); root.querySelector('[data-photo]').blur()
      root.querySelector(`[data-photo="${boardItems(board)[0].id}"]`)?.focus()
    })
    async function insertImage(blob, target) {
      if (disposed) return
      busy = true; update(); status('Zapisuję zdjęcie…')
      try {
        // Decode first: an unreadable clipboard file must never count as a photo.
        const bitmap = await createImageBitmap(blob); bitmap.close()
        if (target === 'trial') {
          if (disposed) return
          if (trialUrl) URL.revokeObjectURL(trialUrl)
          trialUrl = URL.createObjectURL(blob)
          const img = root.querySelector('[data-research-image="trial"]'); img.src = trialUrl; img.hidden = false
          root.querySelector('[data-trial-ready]').textContent = 'Gotowe. Teraz możesz rozpocząć swoją pracę.'
          root.querySelector('[data-start]').hidden = false
          status('')
        } else {
          const imageId = await storeImage(blob, { studentId: work.studentId, workId: work.id })
          const old = data.entries[target]?.imageId
          data.entries[target] = { ...data.entries[target], imageId }; delete data.entries[target].imageSize
          if (!data.sourceReminderShown) { data.sourceReminderShown = true; status(board.criticalThinkingPrompt || 'Przyjrzyj się zdjęciu i stronie, z której pochodzi.') }
          else status('Zdjęcie zapisane.')
          autosave.flush(); save() // Commit lightweight reference immediately, after the Blob transaction.
          if (!disposed) {
            if (urls.has(target)) URL.revokeObjectURL(urls.get(target))
            const url = URL.createObjectURL(blob); urls.set(target, url)
            const img = root.querySelector(`[data-research-image="${target}"]`); img.dataset.imageId = imageId; img.src = url; img.hidden = false
          }
          await deleteImage(old).catch(() => {})
        }
      } catch { status('Nie udało się zapisać zdjęcia. Skopiuj je i spróbuj ponownie.') }
      finally { busy = false; update() }
    }
    async function paste(event) {
      if (!active || busy || disposed || event.target.closest('input,textarea,[contenteditable="true"]')) return
      const blob = [...(event.clipboardData?.items || [])].find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
      if (!blob) { status('Skopiuj samo zdjęcie, a potem wklej je tutaj.'); return }
      event.preventDefault(); closeMenu()
      await insertImage(blob, active)
    }
    async function pasteFromClipboard(target) {
      if (busy || disposed || !target) return
      closeMenu(); busy = true; update(); status('Odczytuję schowek…')
      try {
        if (!navigator.clipboard?.read) throw new Error('Clipboard unavailable')
        const items = await navigator.clipboard.read()
        const item = items.find(item => item.types.some(type => type.startsWith('image/') && type !== 'image/svg+xml'))
        if (!item) { status('W schowku nie ma zdjęcia. Skopiuj obraz i spróbuj ponownie lub użyj Ctrl + V.'); return }
        const type = item.types.find(type => type.startsWith('image/') && type !== 'image/svg+xml')
        await insertImage(await item.getType(type), target)
      } catch { status('Nie można odczytać schowka. Kliknij pole zdjęcia i użyj Ctrl + V. Jeśli przeglądarka pyta o zgodę, możesz zezwolić na odczyt.'); }
      finally { busy = false; update() }
    }
    root.querySelectorAll('[data-paste-photo]').forEach(button => button.addEventListener('click', () => pasteFromClipboard(button.dataset.pastePhoto)))
    menu.querySelector('[data-menu-paste]').addEventListener('click', () => pasteFromClipboard(menuTarget))
    function openMenu(event) {
      const frame = event.target.closest('.research-photo-frame')
      if (!frame || busy) return
      event.preventDefault()
      const target = frame.querySelector('[data-photo]').dataset.photo
      select(target); menuTarget = target; frame.append(menu); menu.hidden = false
      menu.querySelector('[data-menu-paste]').focus()
    }
    root.addEventListener('contextmenu', openMenu)
    function dismiss(event) {
      if (!menu.hidden && !menu.contains(event.target)) closeMenu()
    }
    function menuKeys(event) {
      if (menu.hidden) return
      if (event.key === 'Escape') { event.preventDefault(); const target = menuTarget; closeMenu(); root.querySelector(`[data-photo="${target}"]`)?.focus() }
      else if (event.key === 'Tab') closeMenu()
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', menuKeys)
    document.addEventListener('paste', paste)
    root.querySelectorAll('[data-work-action]').forEach(button => button.addEventListener('click', () => {
      if (busy || (button.dataset.workAction === 'waiting-review' && (imagesUnavailable || !isResearchComplete(board, data.entries)))) return
      autosave.flush(); save(); updateWork(work.id, { status: button.dataset.workAction })
      if (button.dataset.workAction === 'draft') navigate('/home')
      else navigate(`/work/${work.id}`)
    }))
    const flush = () => autosave.flush()
    const visibility = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', visibility)
    return () => { disposed = true; autosave.flush(); images.dispose(); resizing(); urls.forEach(url => URL.revokeObjectURL(url)); if (trialUrl) URL.revokeObjectURL(trialUrl); document.removeEventListener('paste', paste); root.removeEventListener('contextmenu', openMenu); document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', menuKeys); closeMenu(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', visibility) }
  } }
}
