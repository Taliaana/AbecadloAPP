import {desktopItems,desktopFolders,parentOf,isInTrash,canMoveDesktopItem,placeDesktopIcon,moveDesktopFile,restoreDesktopFile,openDesktopWindow,minimizeDesktopWindow} from '../data/desktop.js'
import {desktopIcon,desktopPicture} from './desktopGraphics.js'
import {escapeHtml as esc} from '../utils/html.js'

export function mountDesktopSandbox(host,{board,onChange=()=>{},onAction=()=>{}}) {
  let dragged=null,dragWindow=null,dragPreview=null,grabOffset={x:30,y:30}
  const item=id=>desktopItems.find(item=>item.id===id)
  const name=id=>id==='desktop'?'Pulpit':item(id)?.name || ''
  const windows=()=>board.windows
  function fileButton(file) {
    return `<button type="button" class="desktop-file ${board.selected===file.id?'is-selected':''}" data-file="${file.id}" title="${esc(file.name)}" aria-pressed="${board.selected===file.id}" draggable="true" ${['folder','trash'].includes(file.type)?`data-destination="${file.id}"`:''}>${desktopIcon(file)}<span>${esc(file.name)}</span></button>`
  }
  const filesAt=folder=>desktopItems.filter(i=>parentOf(board,i.id)===folder)
  function fileActions() {
    const file=item(board.selected)
    if(!file)return '<span>Wybierz plik lub folder.</span>'
    return `<strong>${esc(file.name)}</strong><button type="button" class="button button-secondary" data-open-selected ${file.id!=='trash'&&isInTrash(board,file.id)?'disabled title="Najpierw przywróć z kosza"':''}>Otwórz</button>${file.id!=='trash'?`<label>Przenieś do<select data-move-destination aria-label="Przenieś do">${desktopFolders.filter(folder=>canMoveDesktopItem(board,file.id,folder)).map(folder=>`<option value="${folder}">${name(folder)}</option>`).join('')}</select></label><button type="button" class="button button-secondary" data-move-selected>Przenieś</button>${parentOf(board,file.id)==='trash'?'<button type="button" class="button button-primary" data-restore-file>Przywróć</button>':''}`:''}`
  }
  function windowHtml(window,index) {
    const target=item(window.target),folder=desktopFolders.includes(window.target)
    const content=window.target==='scroll'?`<div class="desktop-scroll-content" data-destination="scroll" tabindex="0" role="region" aria-label="Galeria do ćwiczenia przewijania"><p>Przewiń w dół. Zobacz wszystkie obrazki.</p>${filesAt('scroll').map(fileButton).join('')}<div class="desktop-scroll-gallery">${Array.from({length:12},(_,i)=>`<figure>${desktopPicture(i%2?'flower':'landscape')}<figcaption>Obrazek ${i+1}</figcaption></figure>`).join('')}</div><p class="desktop-scroll-end">Dotarłeś do końca galerii.</p><button type="button" class="button button-secondary" data-scroll-top>Wróć na górę</button></div>`:`<div class="desktop-folder-content" data-destination="${window.target}">${filesAt(window.target).map(fileButton).join('')||'<p>Ten folder jest pusty.</p>'}</div>`
    const body=folder?`<nav class="desktop-explorer-nav" aria-label="Nawigacja folderu"><button type="button" class="button button-ghost" data-window-back="${window.id}" ${window.history.length?'':'disabled'}>Wstecz</button><button type="button" class="button button-ghost" data-window-desktop="${window.id}">Pulpit</button><span>${esc(name(window.target))}</span></nav>${content}`:target?.type==='image'?`<div class="desktop-image-preview">${desktopPicture(target.picture)}</div>`:`<div class="desktop-document"><p>${esc(target?.content||'')}</p></div>`
    return `<section class="desktop-window" data-window="${window.id}" aria-label="Okno: ${esc(name(window.target))}" ${window.minimized?'hidden':''} style="z-index:${index+2}"><header class="desktop-titlebar"><button type="button" class="desktop-window-handle" data-window-drag="${window.id}" aria-label="Przesuń okno ${esc(name(window.target))}">${desktopIcon(target||{type:'folder'})}<span>${esc(name(window.target))}</span></button><button type="button" class="button button-icon" data-minimize-window="${window.id}" aria-label="Minimalizuj okno ${esc(name(window.target))}">−</button><button type="button" class="button button-icon" data-close-window="${window.id}" aria-label="Zamknij okno ${esc(name(window.target))}">×</button></header>${body}</section>`
  }
  function positionWindows() {
    const surface=host.querySelector('.desktop-surface')
    if(!surface)return
    const columns=surface.clientWidth<700?3:2,cellWidth=columns===3?(surface.clientWidth-16)/3:114
    host.querySelectorAll('.desktop-icons > [data-file]').forEach((node,index)=>{
      const width=Math.min(100,cellWidth-4),saved=board.iconPositions?.[node.dataset.file]
      node.style.width=`${width}px`
      node.style.left=`${saved?8+saved.x*Math.max(0,surface.clientWidth-width-16):(columns===3?8:18)+(index%columns)*cellWidth}px`
      node.style.top=`${saved?8+saved.y*Math.max(0,surface.clientHeight-112):Math.min(Math.max(8,surface.clientHeight-104),18+Math.floor(index/columns)*106)}px`
    })
    for(const window of windows()) {
      const node=host.querySelector(`[data-window="${window.id}"]`)
      if(!node||node.hidden)continue
      node.style.left=`${12+window.x*Math.max(0,surface.clientWidth-node.offsetWidth-24)}px`
      node.style.top=`${8+window.y*Math.max(0,surface.clientHeight-node.offsetHeight-16)}px`
    }
  }
  function retainFocus() {
    const active=document.activeElement
    const identity=host.contains(active) && [...active.attributes].find(a=>['data-file','data-open-selected','data-move-selected','data-restore-file','data-minimize-window','data-close-window','data-window-back','data-window-desktop','data-task-window','data-show-desktop'].includes(a.name))
    return ()=>{
      if(!identity)return
      const visible=node=>node?.getClientRects().length && !node.closest('[hidden]') && !node.disabled
      const candidates=[host.querySelector(`[${identity.name}="${identity.value}"]`),host.querySelector(`[data-task-window="${identity.value}"]`),host.querySelector(`[data-file="${identity.value}"]`),host.querySelector('[data-restore-file]'),host.querySelector('[data-move-selected]'),host.querySelector('.desktop-task'),host.querySelector('[data-file]')]
      candidates.find(visible)?.focus({preventScroll:true})
    }
  }
  function render() {
    const restoreFocus=retainFocus()
    host.innerHTML=`<div class="desktop-file-actions" aria-label="Operacje na zaznaczonym pliku">${fileActions()}</div><div class="desktop-surface" data-destination="desktop"><svg class="desktop-wallpaper" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0h1200v600H0Z" fill="#f5e6e3"/><path d="M0 360Q300 180 600 360T1200 300v300H0Z" fill="#ead0d0"/><path d="M0 470Q300 560 650 450T1200 430v170H0Z" fill="#d4ddc9"/><path d="M0 570q300-170 600-40t600 0v70H0Z" fill="#bfcdb4"/></svg><div class="desktop-icons">${filesAt('desktop').map(fileButton).join('')}</div>${windows().map(windowHtml).join('')}</div><nav class="desktop-taskbar" aria-label="Pasek zadań pulpitu"><span class="desktop-brand"><img src="/brand/pinktower-icon.png" alt="PinkTower" /></span><button type="button" class="button button-ghost" data-show-desktop>Pulpit</button>${windows().map(w=>`<button type="button" class="desktop-task ${!w.minimized?'is-open':''}" data-task-window="${w.id}" aria-label="${w.minimized?'Przywróć':'Pokaż'} okno ${esc(name(w.target))}">${desktopIcon(item(w.target)||{type:'folder'})}<span>${esc(name(w.target))}</span></button>`).join('')}</nav>`
    positionWindows();restoreFocus()
  }
  function changed(redraw=true,action) {if(redraw)render();onChange(board);if(action)onAction(action)}
  function selected(id,clicked=false) {
    board.selected=id
    host.querySelectorAll('[data-file]').forEach(button=>{const active=button.dataset.file===id;button.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active))})
    host.querySelector('.desktop-file-actions').innerHTML=fileActions()
    onChange(board)
    if(clicked)onAction({type:'select',id})
  }
  function open(id,windowId) {
    if(id!=='trash'&&isInTrash(board,id))return
    openDesktopWindow(board,id,desktopFolders.includes(id)?windowId:null);changed(true,{type:'open',id})
    host.querySelector(`[data-window="${desktopFolders.includes(id)&&windowId?windowId:id}"] .desktop-window-handle`)?.focus({preventScroll:true})
  }
  function focusWindow(id) {
    const win=windows().find(w=>w.id===id)
    if(!win||windows().at(-1)===win)return
    board.windows=windows().filter(w=>w!==win).concat(win)
    windows().forEach((w,i)=>{const node=host.querySelector(`[data-window="${w.id}"]`);if(node)node.style.zIndex=String(i+2)})
    onChange(board)
  }
  function destination(event) {
    const zone=event.target.closest('[data-destination]')
    if(event.target.closest('.desktop-window') && !event.target.closest('.desktop-folder-content, .desktop-scroll-content, [data-file][data-destination]')) return null
    return zone&&host.contains(zone)?zone.dataset.destination:null
  }
  const click=event=>{
    const button=event.target.closest('button');if(!button)return
    if(button.dataset.file){selected(button.dataset.file,true);return}
    const d=button.dataset
    if(button.hasAttribute('data-open-selected'))open(board.selected)
    else if(button.hasAttribute('data-move-selected')) {if(moveDesktopFile(board,board.selected,host.querySelector('[data-move-destination]').value))changed()}
    else if(button.hasAttribute('data-restore-file')) {if(restoreDesktopFile(board,board.selected))changed()}
    else if(d.minimizeWindow){minimizeDesktopWindow(board,d.minimizeWindow);changed()}
    else if(d.closeWindow){const id=windows().find(w=>w.id===d.closeWindow)?.target;board.windows=windows().filter(w=>w.id!==d.closeWindow);changed(true,{type:'close',id})}
    else if(d.taskWindow){const win=windows().find(w=>w.id===d.taskWindow);openDesktopWindow(board,win.target,win.id);changed(true,{type:'open',id:win.target})}
    else if(d.windowDesktop){openDesktopWindow(board,'desktop',d.windowDesktop);changed()}
    else if(d.windowBack){const win=windows().find(w=>w.id===d.windowBack);if(win.history.length){win.target=win.history.pop();changed()}}
    else if(button.hasAttribute('data-show-desktop')){windows().forEach(w=>minimizeDesktopWindow(board,w.id));changed()}
    else if(button.hasAttribute('data-scroll-top')){const area=button.closest('.desktop-scroll-content');area.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});area.focus({preventScroll:true})}
  }
  const dblclick=event=>{const button=event.target.closest('[data-file]');if(button)open(button.dataset.file,button.closest('[data-window]')?.dataset.window)}
  const keydown=event=>{
    const file=event.target.closest('[data-file]'),handle=event.target.closest('[data-window-drag]')
    if(file&&event.key==='Enter'){event.preventDefault();open(file.dataset.file,file.closest('[data-window]')?.dataset.window)}
    else if(file&&event.key==='Delete'){event.preventDefault();selected(file.dataset.file);if(moveDesktopFile(board,file.dataset.file,'trash'))changed()}
    else if(file&&parentOf(board,file.dataset.file)==='desktop'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault();const surface=host.querySelector('.desktop-surface'),rect=file.getBoundingClientRect(),area=surface.getBoundingClientRect()
      placeAt(file.dataset.file,rect.x-area.x+(event.key==='ArrowRight'?32:event.key==='ArrowLeft'?-32:0),rect.y-area.y+(event.key==='ArrowDown'?32:event.key==='ArrowUp'?-32:0))
    }
    else if(handle&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault();const win=windows().find(w=>w.id===handle.dataset.windowDrag)
      win.x=Math.max(0,Math.min(1,win.x+(event.key==='ArrowRight'?.08:event.key==='ArrowLeft'?-.08:0)))
      win.y=Math.max(0,Math.min(1,win.y+(event.key==='ArrowDown'?.08:event.key==='ArrowUp'?-.08:0)))
      positionWindows();changed(false)
    }
  }
  const movePreview=event=>{
    if(!dragPreview)return
    if(!host.contains(event.target))host.querySelectorAll('.is-drop-target').forEach(node=>node.classList.remove('is-drop-target'))
    dragPreview.style.left=`${Math.max(0,Math.min(innerWidth-120,event.clientX+16))}px`
    dragPreview.style.top=`${Math.max(0,Math.min(innerHeight-125,event.clientY+12))}px`
  }
  function clearDrag() {
    dragPreview?.remove();dragPreview=null;dragged=null
    host.querySelectorAll('.is-dragging,.is-drop-target').forEach(node=>node.classList.remove('is-dragging','is-drop-target'))
  }
  function placeAt(id,left,top) {
    const surface=host.querySelector('.desktop-surface'),width=Math.min(100,surface.clientWidth<700?(surface.clientWidth-16)/3-4:110)
    const clamp=n=>Math.max(0,Math.min(1,n))
    if(placeDesktopIcon(board,id,clamp((left-8)/Math.max(1,surface.clientWidth-width-16)),clamp((top-8)/Math.max(1,surface.clientHeight-112))))changed(true,{type:'place',id})
  }
  const dragstart=event=>{
    const file=event.target.closest('[data-file]');if(!file)return
    const rect=file.getBoundingClientRect();grabOffset={x:event.clientX-rect.x,y:event.clientY-rect.y}
    clearDrag();dragged=file.dataset.file;selected(dragged)
    event.dataTransfer.setData('application/x-pinktower-file',dragged);event.dataTransfer.effectAllowed='move'
    dragPreview=document.createElement('div');dragPreview.className='desktop-drag-preview';dragPreview.setAttribute('aria-hidden','true')
    dragPreview.innerHTML=`${desktopIcon(item(dragged))}<span>${esc(name(dragged))}</span>`;(document.fullscreenElement||document.body).append(dragPreview);movePreview(event)
    const blank=document.createElement('canvas');blank.width=blank.height=1;event.dataTransfer.setDragImage(blank,0,0)
    file.classList.add('is-dragging')
  }
  const dragover=event=>{
    if(!event.dataTransfer.types.includes('application/x-pinktower-file'))return
    host.querySelectorAll('.is-drop-target').forEach(node=>node.classList.remove('is-drop-target'))
    const target=destination(event),id=dragged
    if(target&&(canMoveDesktopItem(board,id,target)||target==='desktop')){
      event.preventDefault();event.dataTransfer.dropEffect='move'
      event.target.closest('[data-destination]')?.classList.add('is-drop-target')
    }
  }
  const drop=event=>{
    const folder=destination(event),id=event.dataTransfer.getData('application/x-pinktower-file');clearDrag()
    if(folder&&id){
      event.preventDefault()
      if(folder==='desktop') {
        if(parentOf(board,id)!=='desktop'&&!moveDesktopFile(board,id,'desktop'))return
        const rect=host.querySelector('.desktop-surface').getBoundingClientRect();placeAt(id,event.clientX-rect.x-grabOffset.x,event.clientY-rect.y-grabOffset.y)
      } else if(moveDesktopFile(board,id,folder)){changed(true,{type:'move',id,destination:folder});host.querySelectorAll(`[data-file="${folder}"]`).forEach(node=>node.classList.add('is-drop-received'))}
    }
  }
  const pointerdown=event=>{
    const window=event.target.closest('[data-window]');if(window)focusWindow(window.dataset.window)
    const handle=event.target.closest('[data-window-drag]');if(!handle||event.button!==0)return
    const win=windows().find(w=>w.id===handle.dataset.windowDrag),node=handle.closest('[data-window]'),surface=host.querySelector('.desktop-surface')
    dragWindow={id:win.id,startX:event.clientX,startY:event.clientY,x:win.x,y:win.y,rangeX:Math.max(1,surface.clientWidth-node.offsetWidth-24),rangeY:Math.max(1,surface.clientHeight-node.offsetHeight-16)}
    host.setPointerCapture(event.pointerId)
  }
  const pointermove=event=>{if(!dragWindow)return;const w=windows().find(w=>w.id===dragWindow.id);w.x=Math.max(0,Math.min(1,dragWindow.x+(event.clientX-dragWindow.startX)/dragWindow.rangeX));w.y=Math.max(0,Math.min(1,dragWindow.y+(event.clientY-dragWindow.startY)/dragWindow.rangeY));positionWindows()}
  const pointerup=event=>{if(!dragWindow)return;dragWindow=null;if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);changed(false)}
  const handlers={click,dblclick,keydown,dragstart,dragover,drop,dragend:clearDrag,pointerdown,pointermove,pointerup,pointercancel:pointerup}
  for(const[type,handler]of Object.entries(handlers))host.addEventListener(type,handler)
  document.addEventListener('dragover',movePreview)
  const scroll=event=>{const area=event.target;if(area.matches?.('.desktop-scroll-content'))onAction({type:'scroll',id:'scroll',atEnd:area.scrollTop>0&&area.scrollTop+area.clientHeight>=area.scrollHeight-8})}
  host.addEventListener('scroll',scroll,true)
  const observer=new ResizeObserver(positionWindows);observer.observe(host)
  render()
  return {dispose(){clearDrag();observer.disconnect();document.removeEventListener('dragover',movePreview);host.removeEventListener('scroll',scroll,true);for(const[type,handler]of Object.entries(handlers))host.removeEventListener(type,handler)},restore(id){if(restoreDesktopFile(board,id))changed()}}
}
