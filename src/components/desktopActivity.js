import {mountDesktopSandbox} from './desktopSandbox.js'
import {desktopTutorialHtml,mountMouseTutorial} from './mouseTutorial.js'

export function desktopActivityHtml(session) {
  return `<section class="desktop-activity">${desktopTutorialHtml()}<div class="desktop-toolbar"><button type="button" class="button button-secondary" data-desktop-fullscreen aria-pressed="false">Pełny ekran</button><button type="button" class="button button-ghost" data-simulator-minimize ${session.minimized?'hidden':''}>Schowaj pulpit</button><button type="button" class="button button-secondary" data-desktop-exit>Zapisz i wyjdź</button></div><p class="form-feedback" role="status" data-desktop-status>To ćwiczebny pulpit. Nie zmieniasz plików na komputerze. Pełny ekran jest opcjonalny.</p><button type="button" class="button button-icon desktop-fullscreen-close" data-desktop-close-fullscreen aria-label="Wróć z pełnego ekranu">×</button><div data-simulator ${session.minimized?'hidden':''}><div data-desktop-host></div></div><div class="empty-state desktop-minimized" data-simulator-rest ${session.minimized?'':'hidden'}><p>Pulpit jest schowany.</p><button type="button" class="button button-primary" data-restore-simulator>Przywróć pulpit</button></div></section>`
}
export function mountDesktopActivity(root,{session,onChange,onSaveExit}) {
  const section=root.querySelector('.desktop-activity'),host=root.querySelector('[data-desktop-host]'),status=root.querySelector('[data-desktop-status]')
  let alive=true,enteringFullscreen=false,cancelFullscreen=false
  let tutorial
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
    fullscreen.setAttribute('aria-pressed',String(active));tutorial.fullscreen(active)
    ;(active?section.querySelector('[data-desktop-close-fullscreen]'):fullscreen).focus({preventScroll:true})
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
      } catch {if(alive&&!cancelFullscreen)status.textContent='Pełny ekran nie jest dostępny. Możesz pracować w tym oknie.'}
      finally {enteringFullscreen=false;if(alive){fullscreen.disabled=session.minimized;if(cancelFullscreen)fullscreen.focus({preventScroll:true})}}
    } else if(button.hasAttribute('data-simulator-minimize')) {
      if(document.fullscreenElement===section)await document.exitFullscreen().catch(()=>{})
      minimize(true)
    } else if(button.hasAttribute('data-restore-simulator')) minimize(false)
    else if(button.hasAttribute('data-desktop-exit')) {
      button.disabled=true;button.setAttribute('aria-busy','true')
      try {await onSaveExit()}
      catch {if(alive)status.textContent='Nie udało się zapisać. Pulpit pozostał otwarty. Spróbuj ponownie.'}
      finally {if(alive){button.disabled=false;button.removeAttribute('aria-busy')}}
    }
  }
  section.addEventListener('click',onClick);document.addEventListener('keydown',onKey);document.addEventListener('fullscreenchange',onFullscreen)
  return ()=>{alive=false;tutorial.dispose();sandbox.dispose();section.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey);document.removeEventListener('fullscreenchange',onFullscreen);if(document.fullscreenElement===section)document.exitFullscreen().catch(()=>{})}
}
