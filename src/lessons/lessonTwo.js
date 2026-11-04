import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completionScreen, createStepFlow } from '../components/lessonFlow.js'
import { bindDoubleClick, bindDragDrop } from '../components/activityBindings.js'
import { getStudentProgress, flushData, retryPending } from '../storage/studentStorage.js'
import { studentLessonSession } from './session.js'
import { initialDesktopSession, readDesktopSession, desktopTasks, desktopTaskDone, DESKTOP_LESSON_STEPS } from '../data/desktop.js'
import { desktopActivityHtml, mountDesktopActivity } from '../components/desktopActivity.js'
import { createAutosave } from '../utils/autosave.js'
import {mouseInstruction} from '../components/mouseTutorial.js'
import {bindSpeechButtons} from '../components/speechButton.js'

export async function lessonTwoView({ render, navigate, lessonSession=studentLessonSession }) {
  const repeat=!lessonSession.preview && getStudentProgress()[2]==='completed'
  await lessonSession.start(2)
  const saved=readDesktopSession(lessonSession.readDesktop())
  // A finished run starts afresh; an unfinished repeat resumes its own checkpoint.
  const session=repeat && saved.currentStep===DESKTOP_LESSON_STEPS && saved.phase==='complete'?initialDesktopSession():saved
  const flow = createStepFlow(DESKTOP_LESSON_STEPS,session)
  let selected = false
  let finishing=false
  let updateDesktop=null
  // A pending/failed save must not reveal the completion card on a board update.
  let desktopStepSaved=flow.phase==='complete'
  const placed = new Set(session.puzzle)
  const autosave=createAutosave(value=>{lessonSession.saveDesktop(value).catch(()=>{})})
  const returnRoute=lessonSession.preview?'/teacher/lessons':'/home'
  function snapshot() {Object.assign(session,{currentStep:flow.currentStep,phase:flow.phase,completedSteps:[...flow.completedSteps],puzzle:[...placed]});return structuredClone(session)}
  async function saveNow() {autosave.cancel();if(!lessonSession.preview)await retryPending();await lessonSession.saveDesktop(snapshot());if(!lessonSession.preview)await flushData()}
  const desktopTask=()=>({...desktopTasks[flow.currentStep-5],number:flow.currentStep-4,total:desktopTasks.length,done:desktopTaskDone(session.board,flow.currentStep-5)})
  const completed=()=>completionScreen({preview:lessonSession.preview,final:flow.isFinalStep,lessonTitle:'Obsługuję mysz',nextLessonId:3,nextUnlocked:flow.isFinalStep})

  function activity() {
    if(flow.currentStep>4) {
      return `<section class="lesson-task desktop-lesson">${desktopActivityHtml(session,{task:desktopTask()})}</section>`
    }
    if (flow.currentStep === 1) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Kliknięcie</p>${mouseInstruction('Kliknij niebieskie koło.','Naciśnij i puść lewy przycisk myszy.')}<div class="click-field"><button class="click-target" type="button" aria-label="Niebieskie koło"></button></div></section>`
    if (flow.currentStep === 2) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Dwuklik</p>${mouseInstruction('Kliknij dwa razy w teczkę.','Dwa szybkie kliknięcia lewym przyciskiem myszy.')}<button class="folder-target" type="button" aria-label="Teczka. Wykonaj dwuklik"><span></span></button><p class="gentle-hint">Dwa szybkie kliknięcia.</p></section>`
    if (flow.currentStep === 3) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Przeciąganie</p>${mouseInstruction('Przenieś kartkę do koszyka.','Możesz przeciągnąć lub wybrać kartkę i koszyk.')}<div class="drag-field"><button type="button" draggable="true" class="paper-item ${selected ? 'is-selected' : ''}" data-paper aria-pressed="${Boolean(selected)}"><span></span>Kartka</button><button type="button" class="basket-zone" data-basket aria-label="Koszyk">${icon('works')}<span>Koszyk</span></button></div><p class="gentle-hint">Możesz przeciągnąć lub wybrać kartkę i koszyk.</p></section>`
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Małe puzzle</p>${mouseInstruction('Ułóż cztery części obrazka.')}<div class="puzzle-wrap"><div class="puzzle-pieces">${[1,2,3,4].map((id) => `<button type="button" draggable="true" class="puzzle-piece piece-${id} ${placed.has(id)?'is-placed':''}" data-piece="${id}" aria-label="Element ${id}" aria-pressed="false" ${placed.has(id)?'disabled aria-hidden="true"':''}>${id}</button>`).join('')}</div><div class="puzzle-board">${[1,2,3,4].map((id) => `<button type="button" class="puzzle-slot slot-${id} ${placed.has(id) ? 'is-filled' : ''}" data-slot="${id}" aria-label="Miejsce ${id}">${placed.has(id) ? '' : id}</button>`).join('')}</div></div><p class="gentle-hint" role="status" aria-live="polite" data-puzzle-status>Przeciągnij element lub wybierz go i kliknij miejsce.</p><button type="button" class="button button-primary" data-puzzle-retry hidden>Spróbuj zapisać ponownie</button></section>`
  }
  function current() {
    const content = flow.currentStep>4 ? activity() : flow.phase === 'complete' ? completed() : activity()
    return { html: lessonLayout(`${content}${flow.currentStep<=4?'<button type="button" class="button button-ghost" data-save-lesson-exit>Zapisz i wyjdź</button>':''}`, 'Obsługuję mysz', flow.currentStep, DESKTOP_LESSON_STEPS,lessonSession), scrollKey:`mouse-${flow.currentStep}-${flow.phase}`, mount }
  }
  const rerender = () => render(current())
  async function finishStep() {
    if(finishing)return
    finishing=true
    try {flow.completeStep();updateDesktop?.({busy:true});await saveNow();if(flow.isFinalStep)await lessonSession.complete(2);desktopStepSaved=true;if(updateDesktop)updateDesktop({focus:true,showCompletion:true});else rerender()}
    finally {finishing=false}
  }
  function mount(root) {
    const stopSpeech=flow.currentStep>4?()=>{}:bindSpeechButtons(root)
    const exit=async()=>{await saveNow();navigate(returnRoute)}
    root.querySelector('[data-save-lesson-exit]')?.addEventListener('click',async()=>{try{await exit()}catch{}})
    if(flow.currentStep>4) {
      root.querySelector('.lesson-shell').classList.add('lesson-shell--desktop')
      const cleanup=mountDesktopActivity(root,{session,onChange:()=>{
        autosave.schedule(snapshot())
        updateDesktop?.({showCompletion:desktopStepSaved&&!finishing})
      },onSaveExit:exit,task:desktopTask(),completionHtml:flow.phase==='complete'?completed():''})
      updateDesktop=({focus=false,busy=finishing,showCompletion=false}={})=>{
        cleanup.updateTask(desktopTask(),{focus,busy,completionHtml:showCompletion?completed():''})
        const count=root.querySelector('.lesson-header .step-count')
        count.textContent=`${flow.currentStep} z ${DESKTOP_LESSON_STEPS}`
        count.setAttribute('aria-label',`Krok ${flow.currentStep} z ${DESKTOP_LESSON_STEPS}`)
        root.querySelector('.lesson-progress span').style.width=`${flow.currentStep/DESKTOP_LESSON_STEPS*100}%`
      }
      const click=async event=>{
        if(event.target.closest('[data-finish-desktop-task]')&&!finishing&&desktopTask().done) {
          try {await finishStep()}
          catch {updateDesktop();const status=root.querySelector('[data-desktop-status]');status.hidden=false;status.dataset.error='true';status.textContent='Nie udało się zapisać. Spróbuj ponownie przyciskiem Dalej.'}
        } else if(event.target.closest('[data-step-continue]')&&!finishing) {
          if(!flow.continue().advanced)return
          desktopStepSaved=false
          autosave.schedule(snapshot());updateDesktop({focus:true})
        }
      }
      root.querySelector('.desktop-activity').addEventListener('click',click)
      return ()=>{updateDesktop=null;autosave.flush();stopSpeech();root.querySelector('.desktop-activity')?.removeEventListener('click',click);cleanup()}
    }
    if (flow.phase === 'complete') { root.querySelector('[data-step-continue]')?.addEventListener('click', () => { flow.continue();desktopStepSaved=false;autosave.schedule(snapshot());rerender() }); return ()=>{autosave.flush();stopSpeech()} }
    if (flow.currentStep === 1) root.querySelector('.click-target').addEventListener('click', finishStep)
    if (flow.currentStep === 2) {
      bindDoubleClick(root.querySelector('.folder-target'), finishStep)
    }
    if (flow.currentStep === 3) {
      const paper = root.querySelector('[data-paper]'); const basket = root.querySelector('[data-basket]')
      paper.dataset.paper='paper';basket.dataset.basket='paper'
      const cleanup=bindDragDrop(root,{sourceSelector:'[data-paper]',zoneSelector:'[data-basket]',sourceAttribute:'paper',zoneAttribute:'basket',onSelect:()=>{selected=true;paper.classList.add('is-selected');paper.setAttribute('aria-pressed','true')},getSelected:()=>selected?'paper':null,onDrop:(id,slot)=>{if(id==='paper'&&slot==='paper')finishStep()}})
      return ()=>{cleanup();autosave.flush();stopSpeech()}
    }
    if (flow.currentStep === 4) {
      let alive=true,completionTimer
      const animations=new Set(),status=root.querySelector('[data-puzzle-status]'),retry=root.querySelector('[data-puzzle-retry]')
      function select(id) {
        selected=Number(id)
        root.querySelectorAll('[data-piece]').forEach(node=>{const active=Number(node.dataset.piece)===selected;node.classList.toggle('is-selected',active);node.setAttribute('aria-pressed',String(active))})
      }
      async function completePuzzle() {
        retry.hidden=true
        try {await finishStep()}
        catch {if(alive){status.textContent='Nie udało się zapisać. Twoje elementy są na miejscu.';retry.hidden=false;retry.focus({preventScroll:true})}}
      }
      function place(id,slot) {
        id=Number(id)
        if(finishing||id!==Number(slot)||![1,2,3,4].includes(id)||placed.has(id))return
        placed.add(id);select(null)
        const source=root.querySelector(`[data-piece="${id}"]`),zone=root.querySelector(`[data-slot="${id}"]`)
        const moveFocus=document.activeElement===source
        source.classList.add('is-placed');source.disabled=true;source.setAttribute('aria-hidden','true')
        zone.classList.add('is-filled');zone.textContent='';zone.setAttribute('aria-label',`Miejsce ${id}, element ułożony`)
        if(moveFocus)zone.focus({preventScroll:true})
        const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
        if(!reduced) {
          const animation=zone.animate([{opacity:.5,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],{duration:200,easing:'ease-out'})
          animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation))
        }
        status.textContent=placed.size===4?'Wszystkie części są na miejscu.':'Element na miejscu. Ułóż kolejną część.'
        autosave.schedule(snapshot())
        // Show the fourth placement before the normal completion screen.
        if(placed.size===4)completionTimer=setTimeout(()=>{if(alive)completePuzzle()},reduced?0:220)
      }
      const cleanup=bindDragDrop(root,{sourceSelector:'[data-piece]',zoneSelector:'[data-slot]',sourceAttribute:'piece',zoneAttribute:'slot',onSelect:select,getSelected:()=>selected,onDrop:place})
      retry.addEventListener('click',completePuzzle)
      if(placed.size===4)completionTimer=setTimeout(()=>{if(alive)completePuzzle()},0)
      return ()=>{alive=false;clearTimeout(completionTimer);for(const animation of animations)animation.cancel();retry.removeEventListener('click',completePuzzle);cleanup();autosave.flush();stopSpeech()}
    }
    return ()=>{autosave.flush();stopSpeech()}
  }
  return current()
}
