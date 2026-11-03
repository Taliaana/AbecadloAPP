import { lessonLayout } from '../components/layout.js'
import { icon } from '../components/icons.js'
import { completionScreen, createStepFlow } from '../components/lessonFlow.js'
import { bindDoubleClick, bindDragDrop } from '../components/activityBindings.js'
import { getStudentProgress, flushData, retryPending } from '../storage/studentStorage.js'
import { studentLessonSession } from './session.js'
import { initialDesktopSession, readDesktopSession, desktopTasks, desktopTaskDone, DESKTOP_LESSON_STEPS } from '../data/desktop.js'
import { desktopActivityHtml, mountDesktopActivity } from '../components/desktopActivity.js'
import { createAutosave } from '../utils/autosave.js'
import {mouseTutorial,mouseInstruction} from '../components/mouseTutorial.js'
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
  const placed = new Set(session.puzzle)
  const autosave=createAutosave(value=>{lessonSession.saveDesktop(value).catch(()=>{})})
  const returnRoute=lessonSession.preview?'/teacher/lessons':'/home'
  function snapshot() {Object.assign(session,{currentStep:flow.currentStep,phase:flow.phase,completedSteps:[...flow.completedSteps],puzzle:[...placed]});return structuredClone(session)}
  async function saveNow() {autosave.cancel();if(!lessonSession.preview)await retryPending();await lessonSession.saveDesktop(snapshot());if(!lessonSession.preview)await flushData()}

  function activity() {
    if(flow.currentStep>4) {
      const task=desktopTasks[flow.currentStep-5],done=desktopTaskDone(session.board,flow.currentStep-5)
      return `<section class="lesson-task"><p class="eyebrow">Mój pulpit · ${flow.currentStep-4} z ${desktopTasks.length}</p>${mouseInstruction(task.title,task.hint)}<p>${task.hint}</p>${desktopActivityHtml(session)}<div class="desktop-lesson-next"><p role="status" data-desktop-task-status>${done?'Gotowe. Możesz przejść dalej.':'Wypróbuj polecenie na pulpicie.'}</p><button type="button" class="button button-primary" data-finish-desktop-task ${done?'':'disabled'}>Dalej</button></div></section>`
    }
    if (flow.currentStep === 1) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Kliknięcie</p>${mouseInstruction('Kliknij niebieskie koło.','Naciśnij i puść lewy przycisk myszy.')}<div class="click-field"><button class="click-target" type="button" aria-label="Niebieskie koło"></button></div></section>`
    if (flow.currentStep === 2) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Dwuklik</p>${mouseInstruction('Kliknij dwa razy w teczkę.','Dwa szybkie kliknięcia lewym przyciskiem myszy.')}<button class="folder-target" type="button" aria-label="Teczka. Wykonaj dwuklik"><span></span></button><p class="gentle-hint">Dwa szybkie kliknięcia.</p></section>`
    if (flow.currentStep === 3) return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Przeciąganie</p>${mouseInstruction('Przenieś kartkę do koszyka.','Możesz przeciągnąć lub wybrać kartkę i koszyk.')}<div class="drag-field"><button type="button" draggable="true" class="paper-item ${selected ? 'is-selected' : ''}" data-paper aria-pressed="${Boolean(selected)}"><span></span>Kartka</button><button type="button" class="basket-zone" data-basket aria-label="Koszyk">${icon('works')}<span>Koszyk</span></button></div><p class="gentle-hint">Możesz przeciągnąć lub wybrać kartkę i koszyk.</p></section>`
    return `<section class="lesson-task lesson-task--center"><p class="eyebrow">Małe puzzle</p>${mouseInstruction('Ułóż cztery części obrazka.')}<div class="puzzle-wrap"><div class="puzzle-pieces">${[1,2,3,4].filter((id) => !placed.has(id)).map((id) => `<button type="button" draggable="true" class="puzzle-piece piece-${id}" data-piece="${id}" aria-label="Element ${id}">${id}</button>`).join('')}</div><div class="puzzle-board">${[1,2,3,4].map((id) => `<button type="button" class="puzzle-slot slot-${id} ${placed.has(id) ? 'is-filled' : ''}" data-slot="${id}" aria-label="Miejsce ${id}">${placed.has(id) ? '' : id}</button>`).join('')}</div></div></section>`
  }
  function current() {
    const content = flow.phase === 'complete' ? completionScreen({ preview:lessonSession.preview, final: flow.isFinalStep, lessonTitle: 'Obsługuję mysz', nextLessonId: 3, nextUnlocked: flow.isFinalStep }) : activity()
    return { html: lessonLayout(`${content}${flow.currentStep<=4&&flow.phase==='activity'?mouseTutorial():''}${flow.currentStep<=4?'<button type="button" class="button button-ghost" data-save-lesson-exit>Zapisz i wyjdź</button>':''}`, 'Obsługuję mysz', flow.currentStep, DESKTOP_LESSON_STEPS,lessonSession), scrollKey:`mouse-${flow.currentStep}-${flow.phase}`, mount }
  }
  const rerender = () => render(current())
  async function finishStep() {
    if(finishing)return
    finishing=true
    try {flow.completeStep();await saveNow();if(flow.isFinalStep)await lessonSession.complete(2);rerender()}
    finally {finishing=false}
  }
  function place(id, slot) {
    if (String(id) !== String(slot)) return
    placed.add(Number(id)); selected = false
    if (placed.size === 4) finishStep(); else {autosave.schedule(snapshot());rerender()}
  }
  function mount(root) {
    const stopSpeech=bindSpeechButtons(root)
    const exit=async()=>{await saveNow();navigate(returnRoute)}
    root.querySelector('[data-save-lesson-exit]')?.addEventListener('click',async()=>{try{await exit()}catch{}})
    if (flow.phase === 'complete') { root.querySelector('[data-step-continue]')?.addEventListener('click', () => { flow.continue();autosave.schedule(snapshot());rerender() }); return ()=>{autosave.flush();stopSpeech()} }
    if(flow.currentStep>4) {
      const cleanup=mountDesktopActivity(root,{session,onChange:()=>{
        autosave.schedule(snapshot())
        const done=desktopTaskDone(session.board,flow.currentStep-5)
        root.querySelector('[data-finish-desktop-task]').disabled=!done
        root.querySelector('[data-desktop-task-status]').textContent=done?'Gotowe. Możesz przejść dalej.':'Wypróbuj polecenie na pulpicie.'
      },onSaveExit:exit})
      root.querySelector('[data-finish-desktop-task]').addEventListener('click',()=>{if(desktopTaskDone(session.board,flow.currentStep-5))finishStep()})
      return ()=>{autosave.flush();stopSpeech();cleanup()}
    }
    if (flow.currentStep === 1) root.querySelector('.click-target').addEventListener('click', finishStep)
    if (flow.currentStep === 2) {
      bindDoubleClick(root.querySelector('.folder-target'), finishStep)
    }
    if (flow.currentStep === 3) {
      const paper = root.querySelector('[data-paper]'); const basket = root.querySelector('[data-basket]')
      paper.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/plain', 'paper'))
      paper.addEventListener('click', () => { selected = true; rerender() })
      basket.addEventListener('dragover', (event) => event.preventDefault())
      basket.addEventListener('drop', (event) => { event.preventDefault(); if (event.dataTransfer.getData('text/plain') === 'paper') finishStep() })
      basket.addEventListener('click', () => { if (selected) finishStep() })
    }
    if (flow.currentStep === 4) {
      bindDragDrop(root, { sourceSelector: '[data-piece]', zoneSelector: '[data-slot]', sourceAttribute: 'piece', zoneAttribute: 'slot', onSelect: (id) => { selected = Number(id); rerender() }, getSelected: () => selected, onDrop: place })
    }
    return ()=>{autosave.flush();stopSpeech()}
  }
  return current()
}
