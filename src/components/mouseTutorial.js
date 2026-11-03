import {speechButton,bindSpeechButtons} from './speechButton.js'
import {escapeHtml as esc} from '../utils/html.js'
import {parentOf,desktopItems} from '../data/desktop.js'

export const mouseInstruction=(text,help='')=>`<div class="mouse-instruction"><h2>${esc(text)}</h2>${speechButton(`${text} ${help}`.trim(),'Polecenie')}</div>`
export const desktopTutorialHtml=()=>`<aside class="desktop-tutorial" aria-label="Samouczek myszy" hidden><p class="sr-only" role="status" aria-live="polite" data-tutorial-announcement></p><div data-tutorial-content></div></aside><button type="button" class="button button-secondary desktop-tutorial-launcher" data-tutorial-restart>Samouczek</button>`

function mousePicture(wheel=false,double=false,held=false) {
  return `<svg class="tutorial-mouse ${held?'is-held':''}" viewBox="0 0 84 112" role="img" aria-label="${wheel?'Kółko myszy':double?'Lewy przycisk myszy — dwa kliknięcia':held?'Przytrzymaj lewy przycisk myszy':'Lewy przycisk myszy'}"><rect x="12" y="8" width="60" height="96" rx="30" fill="var(--paper)" stroke="var(--text-muted)" stroke-width="2"/><path d="M42 9C24 9 13 23 13 40v16h29Z" fill="${wheel?'var(--surface-muted)':'var(--brand-pink-soft)'}" stroke="${wheel?'var(--border)':'var(--brand-pink-dark)'}" stroke-width="2"/><path d="M42 9v46h29" fill="none" stroke="var(--border)" stroke-width="2"/><rect x="37" y="24" width="10" height="24" rx="5" fill="${wheel?'var(--brand-pink-dark)':'var(--text-muted)'}"/>${double?'<text x="25" y="40" text-anchor="middle" font-size="15" fill="var(--text)">2×</text>':''}</svg>`
}

export function mountMouseTutorial(section,{host,board,restore}) {
  const panel=section.querySelector('.desktop-tutorial'),launcher=section.querySelector('[data-tutorial-restart]')
  let step=0,active=false,stopSpeech=()=>{},lastKey=''
  const clearHighlights=()=>host.querySelectorAll('.is-tutorial-target').forEach(n=>n.classList.remove('is-tutorial-target'))
  function scrollRoute() {
    const path=['scroll'];let id='scroll'
    while(parentOf(board,id)!=='desktop'&&parentOf(board,id)!=='trash'){id=parentOf(board,id);path.unshift(id)}
    if(parentOf(board,id)==='trash')return {restore:id,selector:'[data-file="trash"]',help:'Przywróć folder z galerią, a potem go otwórz.'}
    const opened=board.windows.find(w=>w.target==='scroll')
    if(opened)return {selector:`[data-task-window="${opened.id}"]`,help:'Wybierz „Przewijanie” na pasku u dołu.'}
    const next=[...path].reverse().find(id=>[...host.querySelectorAll(`[data-file="${id}"]`)].some(n=>n.getClientRects().length&&!n.closest('[hidden]')))||path[0]
    return {selector:`[data-file="${next}"]`,help:next==='scroll'?'Kliknij folder dwa razy lewym przyciskiem.':`Najpierw otwórz „${desktopItems.find(i=>i.id===next).name}”. Tam jest droga do galerii.`}
  }
  function content() {
    const route=step===4?scrollRoute():null
    const steps=[
      {title:'Kliknij Kosz raz.',help:'Naciśnij i puść lewy przycisk. Jeśli okno zasłania ikony, wybierz „Pulpit” na pasku u dołu.',selector:'[data-file="trash"]'},
      {title:'Otwórz Kosz.',help:'Kliknij dwa razy lewym przyciskiem, szybko jeden po drugim.',selector:'[data-file="trash"]',double:true},
      {title:'Zamknij okno Kosza.',help:'Kliknij krzyżyk w oknie lewym przyciskiem.',selector:'[data-close-window="trash"]'},
      {title:'Przesuń ikonę Kosza.',help:'Złap ikonę lewym przyciskiem. Trzymaj, przesuń na wolne miejsce i puść. Możesz też użyć strzałek klawiatury.',selector:'[data-file="trash"]',held:true},
      {title:'Otwórz folder „Przewijanie”.',...route,double:true},
      {title:'Przewiń galerię na dół.',help:'Ustaw strzałkę na obrazkach i obracaj kółko. Możesz też przesuwać dwa palce po gładziku lub użyć klawiatury.',selector:'.desktop-scroll-content',wheel:true},
    ]
    return steps[step]
  }
  function refresh() {
    clearHighlights();panel.hidden=!active;launcher.hidden=active
    if(!active)return
    const info=content(),key=JSON.stringify({step,info})
    if(key!==lastKey) {
      stopSpeech();lastKey=key
      panel.querySelector('[data-tutorial-content]').innerHTML=info?`<div class="tutorial-current"><div>${mousePicture(info.wheel,info.double,info.held)}</div><div><p class="eyebrow">Samouczek · ${step+1} z 6</p><h2>${esc(info.title)}</h2><p>${esc(info.help)}</p><div class="tutorial-actions">${speechButton(`${info.title} ${info.help}`,'Samouczek myszy')}${info.restore?`<button type="button" class="button button-secondary" data-tutorial-restore="${info.restore}">Przywróć folder z galerią</button>`:''}<button type="button" class="button button-ghost" data-tutorial-dismiss>Przerwij samouczek</button></div></div></div>`:`<p>Gotowe. Samouczek ukończony.</p><p>Teraz możesz ćwiczyć samodzielnie.</p><button type="button" class="button button-primary" data-tutorial-dismiss>Ćwicz samodzielnie</button>`
      panel.querySelector('[data-tutorial-announcement]').textContent=info?`Krok ${step+1} z 6. ${info.title}`:'Samouczek ukończony.'
      stopSpeech=bindSpeechButtons(panel)
    }
    if(info)host.querySelectorAll(info.selector).forEach(n=>n.classList.add('is-tutorial-target'))
  }
  const onClick=event=>{
    if(event.target.closest('[data-tutorial-restart]')&&document.fullscreenElement===section){step=0;active=true;lastKey='';refresh()}
    if(event.target.closest('[data-tutorial-dismiss]')){active=false;stopSpeech();refresh();launcher.focus({preventScroll:true})}
    const button=event.target.closest('[data-tutorial-restore]');if(button){restore(button.dataset.tutorialRestore);refresh()}
  }
  section.addEventListener('click',onClick)
  return {
    fullscreen(value){active=value&&step<6;if(!active){stopSpeech();lastKey=''}refresh()},
    refresh,
    action(action){
      if(!active||step>=6)return
      const expected=[['select','trash'],['open','trash'],['close','trash'],['place','trash'],['open','scroll'],['scroll','scroll']][step]
      if(action.type===expected[0]&&action.id===expected[1]&&(step!==5||action.atEnd)){step++;lastKey=''}
      refresh()
    },
    dispose(){stopSpeech();clearHighlights();section.removeEventListener('click',onClick)},
  }
}
