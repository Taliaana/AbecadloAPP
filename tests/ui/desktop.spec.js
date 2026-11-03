import {test,expect} from '@playwright/test'
import {resetApp,chooseStudent,enterTeacher} from './helpers.js'
import {reachEquipmentStage} from './equipmentHelpers.js'
import {initialDesktopSession} from '../../src/data/desktop.js'

test.beforeEach(async({page})=>resetApp(page))
async function snapshot(page){return page.evaluate(async()=> (await (await fetch('/__test/snapshot')).json()))}
async function prepareDesktop(page,{practice=false,step=5}={}) {
  const state=await snapshot(page),session=initialDesktopSession()
  session.currentStep=step;session.completedSteps=Array.from({length:step-1},(_,i)=>i+1)
  state.students.zosia.progress[1]='completed';state.students.zosia.progress[2]='available'
  state.students.zosia.toolProgress.unlockedTools=['mouse-practice']
  state.students.zosia.toolProgress.desktop={[practice?'practice':'lesson']:session}
  await page.request.post('/__test/seed',{data:state})
  await chooseStudent(page)
  await page.goto(practice?'/#/tools/desktop':'/#/lesson/2')
  await expect(page.locator(step<=4&&!practice?'.lesson-task':'.desktop-surface')).toBeVisible()
}
const desktopFile=(page,id)=>page.locator(`.desktop-icons [data-file="${id}"]`)
async function closeWindows(page){while(await page.locator('[data-close-window]:visible').count())await page.locator('[data-close-window]:visible').last().click()}
async function finishTask(page){await page.locator('[data-finish-desktop-task]').click();await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible();await page.locator('[data-step-continue]').click()}

test('nauczyciel testuje te same cztery lekcje bez profilu i zapisu postępów dzieci',async({page})=>{
  await enterTeacher(page)
  const before=(await snapshot(page)).students
  let writes=0;page.on('request',r=>{if(r.url().includes('/api/')&&['POST','PUT','PATCH','DELETE'].includes(r.method()))writes++})
  await page.getByRole('link',{name:'Testuj lekcje',exact:true}).click()
  await expect(page.getByRole('link',{name:/Testuj lekcję \d/})).toHaveCount(4)
  for(const id of [1,2,3,4]) {
    await page.getByRole('link',{name:`Testuj lekcję ${id}`,exact:true}).click()
    await expect(page.locator('.lesson-preview-note')).toContainText('bez zapisu postępów dzieci')
    if(id===2) {
      await page.getByRole('button',{name:'Niebieskie koło'}).click()
      await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
      await page.locator('[data-step-continue]').click()
      await page.getByRole('button',{name:'Teczka. Wykonaj dwuklik'}).dblclick()
      await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
    }
    if(id===3) {
      await expect(page.locator('[data-name]')).toBeFocused()
      await page.keyboard.type('Maria');await page.locator('[data-finish-step]').click();await page.locator('[data-step-continue]').click()
      await expect(page.locator('[data-phrase]')).toBeFocused()
      await page.keyboard.insertText('mały');await page.keyboard.press('Space');await page.keyboard.type('kotx');await page.keyboard.press('Backspace')
      await page.locator('[data-finish-step]').click();await page.locator('[data-step-continue]').click()
      await expect(page.locator('[data-enter]')).toBeFocused()
      await page.keyboard.type('gotowe');await page.keyboard.press('Enter');await page.locator('[data-step-continue]').click()
      for(const key of ['Spacja','Backspace','Enter'])await page.locator(`[data-key="${key}"]`).click()
      await expect(page.getByText('Lekcja ukończona',{exact:true})).toBeVisible()
    }
    if(id===4) {
      for(const key of ['f','j'])await page.locator(`[data-letter="${key}"]`).click()
      await page.locator('[data-step-continue]').click()
      for(const key of ['f','j','j','f'])await page.keyboard.press(key)
      await page.locator('[data-step-continue]').click();await page.locator('[data-answer="correct"]').click()
      await expect(page.getByText('Lekcja ukończona',{exact:true})).toBeVisible()
    }
    await page.getByRole('link',{name:'Zamknij lekcję',exact:true}).click()
  }
  expect(writes).toBe(0);expect((await snapshot(page)).students).toEqual(before)
})

test('pisanie w lekcji 1 dostaje fokus również przy następnym urządzeniu; nowy etap zaczyna się u góry',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await enterTeacher(page)
  await page.goto('/#/teacher/test-lesson/1');await reachEquipmentStage(page,2)
  await expect(page.locator('[data-copy-input]')).toBeFocused()
  await page.keyboard.type('monitor');await page.getByRole('button',{name:'Sprawdź',exact:true}).click()
  await page.evaluate(()=>{const main=document.querySelector('#main-content');main.style.height='430px';main.style.overflowY='auto';main.scrollTop=main.scrollHeight})
  await page.locator('[data-device-next]').click()
  await expect(page.locator('[data-copy-input]')).toBeFocused()
  expect(await page.locator('#main-content').evaluate(n=>n.scrollTop)).toBe(0)
  await page.keyboard.type('klawiatura');await expect(page.locator('[data-copy-input]')).toHaveValue('klawiatura')
})

test('pulpit reaguje na kliknięcia, otwiera pliki i zachowuje pojedyncze okno po nawigacji i przywróceniu',async({page})=>{
  await prepareDesktop(page)
  await expect(page.locator('[data-finish-desktop-task]')).toBeDisabled()
  await desktopFile(page,'works').click();await expect(desktopFile(page,'works')).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('[data-window]')).toHaveCount(0)
  await desktopFile(page,'works').dblclick();await expect(page.locator('[data-window="works"]')).toContainText('List.txt')
  await expect(page.locator('[data-finish-desktop-task]')).toBeEnabled()
  await page.locator('[data-window-desktop="works"]').click()
  await page.locator('[data-window="works"] [data-file="images"]').dblclick()
  await expect(page.locator('[data-window="works"]')).toContainText('Kwiat.png')
  await page.locator('[data-minimize-window="works"]').click()
  await expect(page.locator('[data-window="works"]')).toBeHidden()
  await expect(page.locator('[data-task-window="works"]')).toBeFocused()
  await page.locator('[data-task-window="works"]').click()
  await expect(page.locator('[data-window]')).toHaveCount(1)
  await expect(page.locator('[data-window="works"]')).toBeVisible()
  await page.locator('[data-window="works"] [data-file="flower"]').dblclick()
  await expect(page.locator('[data-window="flower"] .desktop-image-preview svg')).toBeVisible()
  await page.locator('[data-close-window="flower"]').click()
  await page.locator('[data-window-back="works"]').click()
  await page.locator('[data-window="works"] [data-file="note"]').dblclick()
  await expect(page.locator('.desktop-document')).toContainText('Dzisiaj uczę się')
})

test('drag and drop, przenoszenie klawiaturą i kosz zmieniają zawartość folderów bez reloadu',async({page})=>{
  await prepareDesktop(page,{practice:true})
  await desktopFile(page,'note').dragTo(desktopFile(page,'works'))
  await expect(desktopFile(page,'note')).toHaveCount(0)
  await desktopFile(page,'works').press('Enter')
  const note=page.locator('[data-window="works"] [data-file="note"]')
  await expect(note).toBeVisible();await note.press('Space')
  await page.getByLabel('Przenieś do',{exact:true}).selectOption('trash')
  await page.locator('[data-move-selected]').click();await expect(note).toHaveCount(0)
  await expect(page.locator('[data-move-selected]')).toBeFocused()
  await expect(page.locator('[data-open-selected]')).toBeDisabled()
  await page.locator('[data-close-window="works"]').click();await desktopFile(page,'trash').press('Enter')
  await page.locator('[data-window="trash"] [data-file="note"]').press('Space')
  await page.locator('[data-restore-file]').click()
  await expect(page.locator('[data-window="trash"] [data-file="note"]')).toHaveCount(0)
  await page.locator('[data-close-window="trash"]').click();await desktopFile(page,'works').dblclick()
  await expect(page.locator('[data-window="works"] [data-file="note"]')).toBeVisible()
  await expect.poll(async()=> (await snapshot(page)).students.zosia.toolProgress.desktop.practice.board.locations.note).toBe('works')
})

test('okna można przesuwać, schować pulpit i przywrócić; pełny ekran ma rzeczywisty stan',async({page})=>{
  await prepareDesktop(page,{practice:true});await desktopFile(page,'works').dblclick()
  const win=page.locator('[data-window="works"]'),handle=page.locator('[data-window-drag="works"]')
  const before=await win.boundingBox();await handle.press('ArrowRight')
  expect((await win.boundingBox()).x).toBeGreaterThan(before.x)
  const rect=await handle.boundingBox();await page.mouse.move(rect.x+70,rect.y+20);await page.mouse.down();await page.mouse.move(rect.x+110,rect.y+50,{steps:5});await page.mouse.up()
  expect((await win.boundingBox()).y).toBeGreaterThan(before.y)
  await page.locator('[data-simulator-minimize]').click();await expect(page.locator('[data-simulator]')).toBeHidden()
  await page.locator('[data-restore-simulator]').click();await expect(win).toBeVisible()
  await page.locator('[data-desktop-fullscreen]').click()
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true)
  await expect(page.locator('.desktop-toolbar')).toBeHidden()
  await expect(page.locator('.desktop-file-actions')).toBeHidden()
  await expect(page.locator('.desktop-tutorial')).toBeVisible()
  const close=page.getByRole('button',{name:'Wróć z pełnego ekranu',exact:true})
  await expect(close).toBeFocused()
  const exitBox=await close.boundingBox(),viewport=page.viewportSize()
  expect(exitBox.x+exitBox.width).toBeGreaterThan(viewport.width-30);expect(exitBox.y).toBeLessThan(30)
  const surface=await page.locator('.desktop-surface').boundingBox();expect(surface.y).toBe(0)
  await close.click()
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false)
  await expect(win).toBeVisible()
  await page.locator('[data-desktop-fullscreen]').click();await page.keyboard.press('Escape')
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false)
})

test('autosave i Zapisz i wyjdź odtwarzają etap, foldery i położenie okna z serwera',async({page})=>{
  await prepareDesktop(page)
  await expect(page.locator('[data-desktop-fullscreen]')).toHaveAttribute('aria-pressed','false')
  await desktopFile(page,'works').dblclick();await finishTask(page)
  await closeWindows(page);await desktopFile(page,'note').click()
  await page.getByLabel('Przenieś do',{exact:true}).selectOption('works');await page.locator('[data-move-selected]').click()
  await desktopFile(page,'images').dblclick();await page.locator('[data-window-drag="images"]').press('ArrowRight')
  await page.locator('[data-desktop-exit]').click()
  await expect(page).toHaveURL(/#\/home$/)
  const saved=(await snapshot(page)).students.zosia.toolProgress.desktop.lesson
  expect(saved.currentStep).toBe(6);expect(saved.board.locations.note).toBe('works')
  await page.getByRole('link',{name:/Kontynuuj/}).first().click()
  await expect(page.getByRole('heading',{name:'Otwórz „Kwiat.png” w folderze „Obrazki”.'})).toBeVisible()
  await expect(page.locator('[data-window="images"]')).toBeVisible();await expect(desktopFile(page,'note')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('[data-window="images"]')).toBeVisible()
  expect((await snapshot(page)).students.zosia.toolProgress.desktop.lesson.board.windows).toEqual(saved.board.windows)
})

test('wznowienie powtórki zachowuje etap; częściowo ułożone puzzle zapisują się automatycznie',async({page})=>{
  await prepareDesktop(page,{step:4})
  await page.locator('[data-piece="1"]').click();await page.locator('[data-slot="1"]').click()
  await expect.poll(async()=> (await snapshot(page)).students.zosia.toolProgress.desktop.lesson.puzzle).toEqual([1])
  await page.reload();await expect(page.locator('[data-slot="1"]')).toHaveClass(/is-filled/)
  const state=await snapshot(page);state.students.zosia.progress[2]='completed'
  state.students.zosia.toolProgress.desktop.lesson.currentStep=6
  await page.request.post('/__test/seed',{data:state});await page.reload()
  await expect(page.getByRole('heading',{name:'Otwórz „Kwiat.png” w folderze „Obrazki”.'})).toBeVisible()
  expect((await snapshot(page)).students.zosia.progress[2]).toBe('completed')
})

test('błąd zapisu nie zamyka pulpitu ani nie traci zmiany; ponowienie zapisuje i wraca',async({page})=>{
  await prepareDesktop(page,{practice:true})
  await page.route('**/api/tools',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Spróbuj ponownie.'})}))
  await desktopFile(page,'works').dblclick();await page.locator('[data-desktop-exit]').click()
  await expect(page.locator('[data-desktop-status]')).toContainText('Nie udało się zapisać')
  await expect(page.locator('[data-window="works"]')).toBeVisible()
  await page.unroute('**/api/tools');await page.locator('[data-desktop-exit]').click()
  await expect(page).toHaveURL(/#\/workshop$/)
  expect((await snapshot(page)).students.zosia.toolProgress.desktop.practice.board.windows[0].target).toBe('works')
})

test('prowadzone zadania kończą lekcję dopiero po przywróceniu pliku z kosza',async({page})=>{
  await prepareDesktop(page)
  await desktopFile(page,'works').dblclick();await finishTask(page)
  await closeWindows(page);await desktopFile(page,'images').dblclick();await page.locator('[data-window="images"] [data-file="flower"]').dblclick();await finishTask(page)
  await page.locator('[data-minimize-window="flower"]').click();await page.locator('[data-task-window="flower"]').click();await finishTask(page)
  await closeWindows(page);await desktopFile(page,'note').dragTo(desktopFile(page,'works'));await finishTask(page)
  await desktopFile(page,'works').dblclick();await page.locator('[data-window="works"] [data-file="note"]').press('Delete');await finishTask(page)
  await closeWindows(page);await desktopFile(page,'trash').dblclick();await page.locator('[data-window="trash"] [data-file="note"]').click();await page.locator('[data-restore-file]').click()
  await page.locator('[data-finish-desktop-task]').click()
  await expect(page.getByText('Lekcja ukończona',{exact:true})).toBeVisible()
  const pupil=(await snapshot(page)).students.zosia
  expect(pupil.progress[2]).toBe('completed');expect(pupil.progress[3]).toBe('available')
  expect(pupil.toolProgress.desktop.lesson.board.locations.note).toBe('works')
  await page.getByRole('link',{name:/Przejdź dalej/}).click();await expect(page.locator('[data-name]')).toBeFocused()
  await page.goto('/#/teacher/test-lesson/4');await expect(page).toHaveURL(/#\/home$/)
})

test('pulpit i otwarte okno mieszczą się na czterech szerokościach; Zmień profil jest u góry',async({page})=>{
  await prepareDesktop(page,{practice:true});await desktopFile(page,'works').dblclick()
  for(const [width,height]of[[1440,900],[1366,768],[1024,768],[390,844]]) {
    await page.setViewportSize({width,height})
    await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    const box=await page.locator('[data-window="works"]').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width)
    for(const button of await page.locator('.desktop-toolbar button').all())expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44)
  }
  await page.goto('/#/avatar');await page.setViewportSize({width:1366,height:768})
  const switchBox=await page.locator('[data-switch-profile]').boundingBox();expect(switchBox.y).toBeLessThan(350)
  await page.locator('[data-switch-profile]').click();await expect(page.getByLabel('PIN nauczyciela')).toBeVisible()
})

test('folder Przewijanie działa kółkiem i klawiaturą także bez pełnego ekranu',async({page})=>{
  await prepareDesktop(page,{practice:true});await desktopFile(page,'scroll').dblclick()
  const area=page.getByRole('region',{name:'Galeria do ćwiczenia przewijania'})
  expect(await area.evaluate(n=>n.scrollHeight>n.clientHeight)).toBe(true)
  const top=await page.evaluate(()=>window.scrollY)
  await area.hover();await page.mouse.wheel(0,400)
  await expect.poll(()=>area.evaluate(n=>n.scrollTop)).toBeGreaterThan(100)
  expect(await page.evaluate(()=>window.scrollY)).toBe(top)
  await area.press('Control+End');await expect(page.locator('.desktop-scroll-end')).toBeInViewport()
  await page.getByRole('button',{name:'Wróć na górę',exact:true}).click()
  await expect.poll(()=>area.evaluate(n=>n.scrollTop)).toBe(0)
  await expect(area).toBeFocused()
  expect(await page.evaluate(()=>document.fullscreenElement)).toBeNull()
  await expect.poll(async()=> (await snapshot(page)).students.zosia.toolProgress.desktop.practice.board.windows[0].target).toBe('scroll')
  await page.reload();await expect(page.getByRole('region',{name:'Galeria do ćwiczenia przewijania'})).toBeVisible()
})

for(const reducedMotion of ['no-preference','reduce'])test(`przeciągany plik unosi się przy kursorze i znika po upuszczeniu (${reducedMotion})`,async({page})=>{
  await page.emulateMedia({reducedMotion});await prepareDesktop(page,{practice:true})
  const source=desktopFile(page,'note'),target=desktopFile(page,'works')
  await source.scrollIntoViewIfNeeded()
  const start=await source.boundingBox(),end=await target.boundingBox()
  await page.mouse.move(start.x+30,start.y+30);await page.mouse.down();await page.mouse.move(start.x+55,start.y+25,{steps:5})
  await expect(page.locator('.desktop-drag-preview')).toBeVisible()
  await expect(source).toHaveClass(/is-dragging/)
  await page.mouse.move(end.x+40,end.y+40,{steps:8})
  await expect(target).toHaveClass(/is-drop-target/)
  await expect.poll(async()=>Math.abs((await page.locator('.desktop-drag-preview').boundingBox()).x-(end.x+56))).toBeLessThan(20)
  if(reducedMotion==='reduce')expect(await page.locator('.desktop-drag-preview').evaluate(n=>getComputedStyle(n).animationName)).toBe('none')
  await page.mouse.up();await expect(page.locator('.desktop-drag-preview')).toHaveCount(0)
  await expect(source).toHaveCount(0);await target.dblclick()
  await expect(page.locator('[data-window="works"] [data-file="note"]')).toBeVisible()
})

test('samouczek i polecenia lekcji myszy korzystają ze wspólnego odsłuchu bez autoplay',async({page})=>{
  await page.addInitScript(()=>{
    window.spoken=[];window.cancelled=0
    window.SpeechSynthesisUtterance=function(text){this.text=text}
    const voice=new EventTarget();voice.getVoices=()=>[{lang:'pl-PL',name:'Polski Natural',voiceURI:'pl'}]
    voice.cancel=()=>window.cancelled++;voice.speak=message=>window.spoken.push(message)
    Object.defineProperty(window,'speechSynthesis',{value:voice})
  })
  await page.reload()
  await prepareDesktop(page,{step:1})
  expect(await page.evaluate(()=>window.spoken.length)).toBe(0)
  await page.getByRole('button',{name:'Posłuchaj: Polecenie',exact:true}).click()
  expect(await page.evaluate(()=>window.spoken.at(-1).text)).toContain('Kliknij niebieskie koło.')
  await page.getByRole('button',{name:'Niebieskie koło',exact:true}).click()
  expect(await page.evaluate(()=>window.cancelled)).toBeGreaterThan(0)
  await page.locator('[data-step-continue]').click()
  await page.getByRole('button',{name:'Posłuchaj: Polecenie',exact:true}).click()
  expect(await page.evaluate(()=>window.spoken.at(-1).text)).toContain('Kliknij dwa razy w teczkę.')
  await page.goto('/#/tools/desktop');await expect(page.locator('.desktop-tutorial')).toBeHidden()
  await page.locator('[data-desktop-fullscreen]').click()
  await page.getByRole('button',{name:'Posłuchaj: Samouczek myszy',exact:true}).click()
  expect(await page.evaluate(()=>window.spoken.at(-1).text)).toContain('Kliknij Kosz raz.')
  await page.locator('[data-desktop-close-fullscreen]').click()
  await page.locator('[data-desktop-fullscreen]').click()
  await page.getByRole('button',{name:'Posłuchaj: Samouczek myszy',exact:true}).click()
  expect(await page.evaluate(()=>window.spoken.at(-1).text)).toContain('Kliknij Kosz raz.')
  await page.locator('[data-desktop-close-fullscreen]').click()
  await page.goto('/#/tools/mouse')
  await page.getByRole('button',{name:'Posłuchaj: Polecenie',exact:true}).click()
  expect(await page.evaluate(()=>window.spoken.at(-1).text)).toContain('Koło zmienia miejsce')
})
