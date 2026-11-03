import {test,expect} from '@playwright/test'
import {resetApp,chooseStudent} from './helpers.js'
import {initialDesktopSession} from '../../src/data/desktop.js'

test.beforeEach(async({page})=>{await resetApp(page)})
async function openDesktop(page) {
  const state=await(await page.request.get('/__test/snapshot')).json()
  state.students.zosia.progress[1]='completed';state.students.zosia.progress[2]='available'
  state.students.zosia.toolProgress.unlockedTools=['mouse-practice']
  state.students.zosia.toolProgress.desktop={practice:initialDesktopSession()}
  await page.request.post('/__test/seed',{data:state});await chooseStudent(page);await page.goto('/#/tools/desktop')
  await expect(page.locator('.desktop-surface')).toBeVisible()
}
const file=(page,id)=>page.locator(`.desktop-icons [data-file="${id}"]`)
async function dragToPoint(page,source,x,y) {
  const rect=await source.boundingBox()
  await page.mouse.move(rect.x+30,rect.y+30);await page.mouse.down()
  await page.mouse.move(rect.x+40,rect.y+35,{steps:3});await page.mouse.move(x,y,{steps:12});await page.mouse.up()
}

test('plik można przeciągnąć na inne wolne miejsce pulpitu',async({page})=>{
  await openDesktop(page);await file(page,'note').scrollIntoViewIfNeeded()
  const before=await file(page,'note').boundingBox(),area=await page.locator('.desktop-surface').boundingBox()
  await dragToPoint(page,file(page,'note'),area.x+area.width*.7,area.y+area.height*.6)
  await expect.poll(async()=> (await file(page,'note').boundingBox()).x-before.x).toBeGreaterThan(100)
  await expect.poll(async()=>((await(await page.request.get('/__test/snapshot')).json()).students.zosia.toolProgress.desktop.practice.board.iconPositions?.note?.x)||0).toBeGreaterThan(.4)
  const placed=await file(page,'note').boundingBox()
  await page.reload();await expect(file(page,'note')).toBeVisible()
  await expect.poll(async()=>Math.abs((await file(page,'note').boundingBox()).x-placed.x)).toBeLessThan(2)
})

test('folder można przenieść do innego folderu i z powrotem z zachowaniem plików',async({page})=>{
  await openDesktop(page)
  await expect(file(page,'images')).toHaveAttribute('draggable','true')
  await file(page,'images').dragTo(file(page,'works'))
  await expect(file(page,'images')).toHaveCount(0)
  await file(page,'works').dblclick()
  const nested=page.locator('[data-window="works"] [data-file="images"]')
  await expect(nested).toBeVisible();await nested.dblclick()
  await expect(page.locator('[data-window="works"] [data-file="flower"]')).toBeVisible()
  await page.locator('[data-window-back="works"]').click()
  const area=await page.locator('.desktop-surface').boundingBox()
  await dragToPoint(page,nested,area.x+area.width*.8,area.y+area.height*.85)
  await expect(file(page,'images')).toBeVisible()
  await page.locator('[data-close-window="works"]').click();await file(page,'images').dblclick()
  await expect(page.locator('[data-window="images"] [data-file="flower"]')).toBeVisible()
})

test('samouczek ujawnia jeden krok po rzeczywistej czynności, dopiero na pełnym ekranie',async({page})=>{
  await openDesktop(page)
  await file(page,'scroll').dragTo(file(page,'works'))
  const guide=page.getByRole('complementary',{name:'Samouczek myszy'})
  await expect(guide).toBeHidden();await expect(page.locator('[data-tutorial-restart]')).toBeHidden()
  await page.locator('[data-desktop-fullscreen]').click()
  await expect(guide.getByRole('heading')).toHaveText('Kliknij Kosz raz.')
  await expect(guide.getByRole('img')).toHaveAccessibleName('Lewy przycisk myszy')
  await file(page,'works').click();await expect(guide.getByRole('heading')).toHaveText('Kliknij Kosz raz.')
  await file(page,'trash').click();await expect(guide.getByRole('heading')).toHaveText('Otwórz Kosz.')
  await expect(guide.getByRole('heading')).toHaveCount(1)
  await file(page,'images').click();await expect(guide.getByRole('heading')).toHaveText('Otwórz Kosz.')
  await file(page,'trash').dblclick();await expect(guide.getByRole('heading')).toHaveText('Zamknij okno Kosza.')
  await page.locator('[data-close-window="trash"]').click();await expect(guide.getByRole('heading')).toHaveText('Przesuń ikonę Kosza.')
  await expect(guide.getByRole('img')).toHaveAccessibleName('Przytrzymaj lewy przycisk myszy')
  const area=await page.locator('.desktop-surface').boundingBox()
  await dragToPoint(page,file(page,'trash'),area.x+area.width*.55,area.y+area.height*.5)
  await expect(guide.getByRole('heading')).toHaveText('Otwórz folder „Przewijanie”.')
  await expect(guide).toContainText('Najpierw otwórz „Moje prace”')
  await file(page,'works').dblclick();await expect(guide.getByRole('heading')).toHaveText('Otwórz folder „Przewijanie”.')
  await page.locator('[data-window="works"] [data-file="scroll"]').dblclick();await expect(guide.getByRole('heading')).toHaveText('Przewiń galerię na dół.')
  await expect(guide.getByRole('img')).toHaveAccessibleName('Kółko myszy')
  await page.getByRole('region',{name:'Galeria do ćwiczenia przewijania'}).press('Control+End')
  await expect(guide).toContainText('Samouczek ukończony.')
  await page.getByRole('button',{name:'Ćwicz samodzielnie',exact:true}).click();await expect(guide).toBeHidden()
  await page.locator('[data-tutorial-restart]').click();await expect(guide.getByRole('heading')).toHaveText('Kliknij Kosz raz.')
  await page.locator('[data-desktop-close-fullscreen]').click();await expect(guide).toBeHidden()
  await page.locator('[data-desktop-fullscreen]').click();await expect(guide.getByRole('heading')).toHaveText('Kliknij Kosz raz.')
})

test('samouczek na małym ekranie działa klawiaturą, a wskazówki mieszczą się w widoku',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await openDesktop(page)
  await page.locator('[data-desktop-fullscreen]').click()
  const guide=page.getByRole('complementary',{name:'Samouczek myszy'})
  await expect(guide).toBeVisible()
  const box=await guide.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390)
  await file(page,'trash').press('Space');await expect(guide.getByRole('heading')).toHaveText('Otwórz Kosz.')
  await file(page,'trash').press('Enter');await page.locator('[data-close-window="trash"]').press('Enter')
  await expect(guide.getByRole('heading')).toHaveText('Przesuń ikonę Kosza.')
  await file(page,'trash').press('ArrowRight');await file(page,'scroll').press('Enter')
  await expect(guide.getByRole('heading')).toHaveText('Przewiń galerię na dół.')
  await page.getByRole('region',{name:'Galeria do ćwiczenia przewijania'}).press('Control+End')
  await expect(guide).toContainText('Samouczek ukończony.')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('pełnoekranowe przenoszenie plików nadal działa, a samouczek można przerwać',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await openDesktop(page)
  await page.locator('[data-desktop-fullscreen]').click();await page.getByRole('button',{name:'Przerwij samouczek',exact:true}).click()
  await file(page,'note').dragTo(file(page,'works'))
  await expect(file(page,'note')).toHaveCount(0);await file(page,'works').dblclick()
  await expect(page.locator('[data-window="works"] [data-file="note"]')).toBeVisible()
  await page.locator('[data-desktop-close-fullscreen]').click()
  await expect(page.locator('[data-desktop-fullscreen]')).toBeEnabled()
})
