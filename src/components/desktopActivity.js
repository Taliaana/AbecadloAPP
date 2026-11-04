import {mountDesktopSandbox} from './desktopSandbox.js'
import {desktopTutorialHtml,mountMouseTutorial,mouseInstruction} from './mouseTutorial.js'
import {bindSpeechButtons} from './speechButton.js'
import {escapeHtml as esc} from '../utils/html.js'

export function desktopActivityHtml(session,{task=null,completionHtml=''}={}) {
  return `<section class="desktop-activity ${task?'desktop-activity--lesson':''}">${task?`<header class="desktop-task-heading" data-desktop-task-heading><p class="eyebrow" data-desktop-task-count>Zadanie ${task.number} z ${task.total} · Mój pulpit</p>${mouseInstruction(task.title,task.hint)}<p class="gentle-hint" data-desktop-task-hint>${esc(task.hint)}</p></header>`:''}${desktopTutorialHtml()}<div class="desktop-toolbar"><button type="button" class="button button-secondary" data-desktop-fullscreen aria-pressed="false">Pełny ekran</button><button type="button" class="button button-ghost" data-simulator-minimize ${session.minimized?'hidden':''}>Schowaj pulpit</button><button type="button" class="button button-ghost" data-desktop-exit>Zapisz i wyjdź</button></div><p class="form-feedback" role="status" data-desktop-status ${task?'hidden':''}>To ćwiczebny pulpit. Nie zmieniasz plików na komputerze. Pełny ekran jest opcjonalny.</p><button type="button" class="button button-icon desktop-fullscreen-close" data-desktop-close-fullscreen aria-label="Wróć z pełnego ekranu">×</button><div data-simulator ${session.minimized?'hidden':''}><div data-desktop-host></div></div><div class="empty-state desktop-minimized" data-simulator-rest ${session.minimized?'':'hidden'}><p>Pulpit jest schowany.</p><button type="button" class="button button-primary" data-restore-simulator>Przywróć pulpit</button></div>${task?`<footer class="desktop-lesson-next" data-desktop-task-footer><p role="status" aria-live="polite" data-desktop-task-status></p><button type="button" class="button button-primary" data-finish-desktop-task disabled>Dalej</button></footer><div class="desktop-task-completion" data-desktop-task-completion hidden>${completionHtml}</div>`:''}</section>`
}
export function mountDesktopActivity(root,{session,onChange,onSaveExit,task=null,completionHtml=''}) {
  const section=root.querySelector('.desktop-activity'),host=root.querySelector('[data-desktop-host]'),status=root.querySelector('[data-desktop-status]')
  let alive=true,enteringFullscreen=false,cancelFullscreen=false
  let tutorial
  const heading=section.querySelector('[data-desktop-task-heading]')
  let stopTaskSpeech=()=>{},speechText=''
  const sandbox=mountDesktopSandbox(host,{board:session.board,onChange:()=>{onChange(session);tutorial?.refresh()},onAction:action=>tutorial?.action(action)})
  tutorial=mountMouseTutorial(section,{host,board:session.board,restore:id=>sandbox.restore(id)})
  function minimize(value) {
    session.minimized=value
    root.querySelector('[data-simulator]').hidden=value
    root.querySelector('[data-simulator-rest]').hidden=!value
    root.querySelector('[data-simulator-minimize]').hidden=value
    root.querySelector('[data-desktop-fullscreen]').disabled=value
    ;(value?root.querySelector('[data-restore-simulator]'):root.querySelector('[data-desktop-fullscreen]')).focus({preventScroll:true})
    onChange(session)
  }
  const fullscreen=root.querySelector('[data-desktop-fullscreen]')
  fullscreen.disabled=session.minimized
  const onFullscreen=()=>{
    const active=document.fullscreenElement===section
    if(active&&cancelFullscreen){document.exitFullscreen().catch(()=>{});return}
    const complete=section.classList.contains('is-complete')
    fullscreen.setAttribute('aria-pressed',String(active));tutorial.fullscreen(active&&!complete)
    ;(active?section.querySelector('[data-desktop-close-fullscreen]'):complete?section.querySelector('[data-desktop-task-completion] button, [data-desktop-task-completion] a'):fullscreen)?.focus({preventScroll:true})
  }
  const onKey=event=>{
    if(event.key!=='Escape'||!enteringFullscreen&&document.fullscreenElement!==section)return
    cancelFullscreen=true
    if(document.fullscreenElement===section)document.exitFullscreen().catch(()=>{})
  }
  const onClick=async event=>{
    const button=event.target.closest('button');if(!button)return
    if(button.hasAttribute('data-desktop-close-fullscreen')) {
      cancelFullscreen=true
      if(document.fullscreenElement===section)await document.exitFullscreen().catch(()=>{})
    } else if(button.hasAttribute('data-desktop-fullscreen')) {
      if(enteringFullscreen)return
      enteringFullscreen=true;cancelFullscreen=false;fullscreen.disabled=true
      try {
        await section.requestFullscreen()
        if((cancelFullscreen||!alive)&&document.fullscreenElement===section)await document.exitFullscreen().catch(()=>{})
      } catch {if(alive&&!cancelFullscreen){status.hidden=false;status.dataset.error='true';status.textContent='Pełny ekran nie jest dostępny. Możesz pracować w tym oknie.'}}
      finally {enteringFullscreen=false;if(alive){fullscreen.disabled=session.minimized;if(cancelFullscreen)fullscreen.focus({preventScroll:true})}}
    } else if(button.hasAttribute('data-simulator-minimize')) {
      if(document.fullscreenElement===section)await document.exitFullscreen().catch(()=>{})
      minimize(true)
    } else if(button.hasAttribute('data-restore-simulator')) minimize(false)
    else if(button.hasAttribute('data-desktop-exit')) {
      button.disabled=true;button.setAttribute('aria-busy','true')
      try {await onSaveExit()}
      catch {if(alive){status.hidden=false;status.dataset.error='true';status.textContent='Nie udało się zapisać. Pulpit pozostał otwarty. Spróbuj ponownie.'}}
      finally {if(alive){button.disabled=false;button.removeAttribute('aria-busy')}}
    }
  }
  section.addEventListener('click',onClick);document.addEventListener('keydown',onKey);document.addEventListener('fullscreenchange',onFullscreen)
  function updateTask(next,{completionHtml='',focus=false,busy=false}={}) {
    if(!heading)return
    const complete=Boolean(completionHtml)
    if(busy||complete||focus){status.hidden=true;delete status.dataset.error}
    section.classList.toggle('is-complete',complete)
    heading.hidden=complete
    section.querySelector('[data-simulator]').hidden=complete||session.minimized
    section.querySelector('[data-simulator-rest]').hidden=complete||!session.minimized
    section.querySelector('[data-desktop-task-footer]').hidden=complete
    section.querySelector('.desktop-toolbar').hidden=complete
    section.querySelector('[data-desktop-task-count]').textContent=`Zadanie ${next.number} z ${next.total} · Mój pulpit`
    heading.querySelector('h2').textContent=next.title
    heading.querySelector('[data-desktop-task-hint]').textContent=next.hint
    const speech=heading.querySelector('[data-speak]')
    speech.dataset.speak=`${next.title} ${next.hint}`
    if(speechText!==speech.dataset.speak||complete) {
      stopTaskSpeech();speechText=speech.dataset.speak
      stopTaskSpeech=complete?()=>{}:bindSpeechButtons(heading)
    }
    const finish=section.querySelector('[data-finish-desktop-task]')
    finish.disabled=!next.done||busy
    finish.setAttribute('aria-busy',String(busy))
    section.querySelector('[data-desktop-task-status]').textContent=busy?'Zapisywanie…':next.done?'Gotowe. Możesz przejść dalej.':'Wykonaj polecenie na pulpicie.'
    const completion=section.querySelector('[data-desktop-task-completion]')
    completion.hidden=!complete
    // Only the completion region changes. The fullscreen element, board and
    // delegated sandbox listeners survive every desktop step.
    if(completion.innerHTML!==completionHtml)completion.innerHTML=completionHtml
    if(complete)tutorial.fullscreen(false)
    if(focus) {
      const target=complete?completion.querySelector('button,a'):heading.querySelector('h2')
      if(!complete)target.tabIndex=-1
      target?.focus({preventScroll:true})
      if(document.fullscreenElement!==section)section.scrollIntoView({block:'start',behavior:'instant'})
    }
  }
  if(task)updateTask(task,{completionHtml})
  const dispose=()=>{alive=false;stopTaskSpeech();tutorial.dispose();sandbox.dispose();section.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);document.removeEventListener('fullscreenchange',onFullscreen);if(document.fullscreenElement===section)document.exitFullscreen().catch(()=>{})}
  dispose.updateTask=updateTask
  return dispose
}
