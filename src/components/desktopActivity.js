import {mountDesktopSandbox} from './desktopSandbox.js'
import {mouseTutorial} from './mouseTutorial.js'

export function desktopActivityHtml(session) {
  return `<section class="desktop-activity">${mouseTutorial()}<div class="desktop-toolbar"><button type="button" class="button button-secondary" data-desktop-fullscreen aria-pressed="false">Pełny ekran</button><button type="button" class="button button-ghost" data-simulator-minimize ${session.minimized?'hidden':''}>Schowaj pulpit</button><button type="button" class="button button-secondary" data-desktop-exit>Zapisz i wyjdź</button></div><p class="form-feedback" role="status" data-desktop-status>To ćwiczebny pulpit. Nie zmieniasz plików na komputerze. Pełny ekran jest opcjonalny.</p><button type="button" class="button button-icon desktop-fullscreen-close" data-desktop-close-fullscreen aria-label="Wróć z pełnego ekranu">×</button><div data-simulator ${session.minimized?'hidden':''}><div data-desktop-host></div></div><div class="empty-state desktop-minimized" data-simulator-rest ${session.minimized?'':'hidden'}><p>Pulpit jest schowany.</p><button type="button" class="button button-primary" data-restore-simulator>Przywróć pulpit</button></div></section>`
}
export function mountDesktopActivity(root,{session,onChange,onSaveExit}) {
  const section=root.querySelector('.desktop-activity'),host=root.querySelector('[data-desktop-host]'),status=root.querySelector('[data-desktop-status]')
  let alive=true
  const dispose=mountDesktopSandbox(host,{board:session.board,onChange:()=>onChange(session)})
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
  const onFullscreen=()=>{const active=document.fullscreenElement===section;fullscreen.setAttribute('aria-pressed',String(active));(active?section.querySelector('[data-desktop-close-fullscreen]'):fullscreen).focus({preventScroll:true})}
  const onKey=event=>{if(event.key==='Escape' && document.fullscreenElement===section)document.exitFullscreen().catch(()=>{})}
  const onClick=async event=>{
    const button=event.target.closest('button');if(!button)return
    if(button.hasAttribute('data-desktop-close-fullscreen')) {
      if(document.fullscreenElement===section)await document.exitFullscreen().catch(()=>{})
    } else if(button.hasAttribute('data-desktop-fullscreen')) {
      try {if(document.fullscreenElement===section)await document.exitFullscreen();else await section.requestFullscreen()}
      catch {status.textContent='Pełny ekran nie jest dostępny. Możesz pracować w tym oknie.'}
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
  section.addEventListener('click',onClick);section.addEventListener('keydown',onKey);document.addEventListener('fullscreenchange',onFullscreen)
  return ()=>{alive=false;dispose();section.removeEventListener('click',onClick);section.removeEventListener('keydown',onKey);document.removeEventListener('fullscreenchange',onFullscreen);if(document.fullscreenElement===section)document.exitFullscreen().catch(()=>{})}
}
