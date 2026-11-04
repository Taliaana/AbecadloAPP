import {test,expect} from '@playwright/test'
import {resetApp,chooseStudent} from './helpers.js'
import {initialDesktopSession} from '../../src/data/desktop.js'

test.beforeEach(async({page})=>resetApp(page))
const file=(page,id)=>page.locator(`.desktop-icons [data-file="${id}"]`)
const state=async page=>(await page.request.get('/__test/snapshot')).json()
async function openLesson(page,{step=5,phase='activity'}={}) {
  const data=await state(page),session=initialDesktopSession()
  Object.assign(session,{currentStep:step,phase,completedSteps:Array.from({length:step-1},(_,i)=>i+1)})
  data.students.zosia.progress[1]='completed';data.students.zosia.progress[2]='available'
  data.students.zosia.toolProgress.desktop={lesson:session}
  await page.request.post('/__test/seed',{data});await chooseStudent(page);await page.goto('/#/lesson/2')
  await expect(page.locator(step>4?'.desktop-activity':'.lesson-task')).toBeVisible()
}
async function full(page) {
  await page.locator('[data-desktop-fullscreen]').click()
  await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.classList.contains('desktop-activity'))).toBe(true)
  await page.getByRole('button',{name:'Przerwij samouczek',exact:true}).click()
  await page.evaluate(()=>{window.originalDesktop=document.fullscreenElement;window.fullscreenExits=0;document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)window.fullscreenExits++})})
}
async function sameFullscreen(page) {
  expect(await page.evaluate(()=>document.fullscreenElement===window.originalDesktop&&document.querySelector('.desktop-activity')===window.originalDesktop&&window.fullscreenExits===0)).toBe(true)
}
async function nextTask(page,number) {
  await expect(page.locator('[data-finish-desktop-task]')).toBeEnabled()
  await page.locator('[data-finish-desktop-task]').click()
  await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
  await sameFullscreen(page)
  await page.locator('[data-step-continue]').click()
  await expect(page.locator('[data-desktop-task-count]')).toHaveText(`Zadanie ${number} z 6 · Mój pulpit`)
  await expect(page.locator('[data-desktop-task-heading]')).toBeVisible()
  await sameFullscreen(page)
}
async function closeWindows(page) {
  while(await page.locator('[data-close-window]:visible').count())await page.locator('[data-close-window]:visible').last().click()
}

test('pełny ekran zachowuje polecenia i ten sam pulpit przez wszystkie zadania aż do lekcji klawiatury',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await openLesson(page);await full(page)
  await expect(page.getByRole('heading',{name:'Otwórz folder „Moje prace”.',exact:true})).toBeInViewport()
  await expect(page.getByRole('button',{name:'Posłuchaj: Polecenie',exact:true})).toBeVisible()
  await expect(page.locator('[data-finish-desktop-task]')).toBeDisabled()
  await file(page,'works').dblclick();await nextTask(page,2)
  await closeWindows(page);await file(page,'images').dblclick();await page.locator('[data-window="images"] [data-file="flower"]').dblclick();await nextTask(page,3)
  await page.locator('[data-minimize-window="flower"]').click();await page.locator('[data-task-window="flower"]').click();await nextTask(page,4)
  await closeWindows(page);await file(page,'note').dragTo(file(page,'works'));await nextTask(page,5)
  await file(page,'works').dblclick();await page.locator('[data-window="works"] [data-file="note"]').press('Delete');await nextTask(page,6)
  await closeWindows(page);await file(page,'trash').dblclick();await page.locator('[data-window="trash"] [data-file="note"]').click()
  // Restore used to be hidden by fullscreen CSS, making the final task impossible.
  await expect(page.locator('[data-restore-file]')).toBeVisible();await page.locator('[data-restore-file]').click()
  await page.locator('[data-finish-desktop-task]').click()
  await expect(page.getByText('Lekcja ukończona',{exact:true})).toBeVisible();await sameFullscreen(page)
  await expect.poll(async()=>(await state(page)).students.zosia.progress[3]).toBe('available')
  await page.getByRole('link',{name:/Przejdź dalej/}).click()
  await expect(page.locator('[data-name]')).toBeFocused()
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false)
})

for(const [width,height] of [[1440,900],[1024,768],[390,844]])test(`polecenie i Dalej pozostają dostępne bez overflow ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});await openLesson(page);await full(page)
  for(const selector of ['[data-desktop-task-heading]','[data-finish-desktop-task]','[data-desktop-close-fullscreen]','.desktop-surface']) {
    const box=await page.locator(selector).boundingBox()
    expect(box.width).toBeGreaterThan(0);expect(box.height).toBeGreaterThan(0)
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1)
    expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height+1)
  }
  await file(page,'works').press('Enter');await nextTask(page,2)
  await page.locator('[data-desktop-close-fullscreen]').click()
  await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false)
  await expect(page.locator('[data-desktop-task-count]')).toContainText('Zadanie 2 z 6')
  await expect(page.locator('[data-desktop-fullscreen]')).toBeVisible()
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('wznowienie karty Gotowe zachowuje pulpit i umożliwia dalszą pracę bez pełnego ekranu',async({page})=>{
  await openLesson(page,{phase:'complete'})
  await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
  await page.locator('[data-step-continue]').click()
  await expect(page.getByRole('heading',{name:'Otwórz „Kwiat.png” w folderze „Obrazki”.',exact:true})).toBeVisible()
  await file(page,'images').dblclick();await page.locator('[data-window="images"] [data-file="flower"]').dblclick()
  await page.locator('[data-finish-desktop-task]').click();await page.locator('[data-step-continue]').click()
  await expect(page.locator('[data-desktop-task-count]')).toContainText('Zadanie 3 z 6')
  await expect.poll(async()=>(await state(page)).students.zosia.toolProgress.desktop.lesson.currentStep).toBe(7)
  expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false)
})

test('nieudany zapis nie opuszcza pełnego ekranu i nie pozwala ominąć zapisu etapu',async({page})=>{
  await openLesson(page);await full(page);await file(page,'works').dblclick()
  await page.route('**/api/tools',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Spróbuj ponownie.'})}))
  await page.locator('[data-finish-desktop-task]').click()
  await expect(page.locator('[data-desktop-status]')).toContainText('Nie udało się zapisać')
  await expect(page.locator('[data-step-continue]')).toHaveCount(0);await sameFullscreen(page)
  await closeWindows(page)
  await expect(page.locator('[data-step-continue]')).toHaveCount(0)
  await expect(page.locator('[data-desktop-status]')).toBeVisible()
  await page.unroute('**/api/tools');await page.locator('[data-finish-desktop-task]').click()
  await expect(page.locator('[data-step-continue]')).toBeVisible();await sameFullscreen(page)
  await page.locator('[data-step-continue]').click();await sameFullscreen(page)
})

test('przejście od pierwszych ćwiczeń do pulpitu nie przenosi zaliczenia poprzedniego etapu',async({page})=>{
  await openLesson(page,{step:1})
  await page.locator('.click-target').click();await page.locator('[data-step-continue]').click()
  await page.locator('.folder-target').dblclick();await page.locator('[data-step-continue]').click()
  await page.locator('[data-paper]').click();await page.locator('[data-basket]').click();await page.locator('[data-step-continue]').click()
  for(const id of [1,2,3,4]) {await page.locator(`[data-piece="${id}"]`).click();await page.locator(`[data-slot="${id}"]`).click()}
  await page.locator('[data-step-continue]').click();await full(page)
  await file(page,'works').click()
  await expect(page.locator('[data-desktop-task-heading]')).toBeVisible()
  await expect(page.locator('[data-desktop-task-completion]')).toBeHidden()
  await expect(page.locator('[data-finish-desktop-task]')).toBeDisabled()
  await expect(page.locator('[data-window]')).toHaveCount(0)
  await file(page,'works').dblclick();await nextTask(page,2)
})

test('brak dostępu do Fullscreen API pokazuje pomoc i nadal pozwala wykonać zadanie',async({page})=>{
  await openLesson(page)
  await page.evaluate(()=>{document.querySelector('.desktop-activity').requestFullscreen=()=>Promise.reject(new Error('Niedostępne'))})
  await page.locator('[data-desktop-fullscreen]').click()
  await expect(page.locator('[data-desktop-status]')).toBeVisible()
  await expect(page.locator('[data-desktop-status]')).toContainText('Możesz pracować w tym oknie.')
  await file(page,'works').dblclick();await page.locator('[data-finish-desktop-task]').click()
  await expect(page.locator('[data-step-continue]')).toBeVisible()
  await page.locator('[data-step-continue]').click()
  await expect(page.locator('[data-desktop-task-count]')).toContainText('Zadanie 2 z 6')
  expect(await page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false)
})
