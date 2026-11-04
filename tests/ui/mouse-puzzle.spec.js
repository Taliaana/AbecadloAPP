import {test,expect} from '@playwright/test'
import {resetApp,chooseStudent} from './helpers.js'
import {initialDesktopSession} from '../../src/data/desktop.js'

test.beforeEach(async({page})=>resetApp(page))
async function openPuzzle(page,step=4) {
  const data=await(await page.request.get('/__test/snapshot')).json(),session=initialDesktopSession()
  session.currentStep=step;session.completedSteps=Array.from({length:step-1},(_,i)=>i+1)
  data.students.zosia.progress[1]='completed';data.students.zosia.progress[2]='available'
  data.students.zosia.toolProgress.desktop={lesson:session}
  await page.request.post('/__test/seed',{data});await chooseStudent(page);await page.goto('/#/lesson/2')
  await expect(page.locator(step===4?'.puzzle-board':'.drag-field')).toBeVisible()
  await page.evaluate(()=>{window.originalShell=document.querySelector('.lesson-shell');window.originalStage=document.querySelector('.lesson-stage');window.originalBoard=document.querySelector('.puzzle-board')})
}
async function stableView(page) {
  expect(await page.evaluate(()=>window.originalShell===document.querySelector('.lesson-shell')&&window.originalStage===document.querySelector('.lesson-stage')&&window.originalBoard===document.querySelector('.puzzle-board'))).toBe(true)
}

test('wybór i odkładanie 1–4 aktualizują ten sam DOM, bez przesuwania pozostałych klocków',async({page})=>{
  await openPuzzle(page)
  await page.evaluate(()=>document.fonts.ready)
  const last=page.locator('[data-piece="4"]')
  await last.hover() // Wait for the existing page-entry animation before measuring.
  const initial=await last.boundingBox()
  await page.locator('[data-piece="1"]').click();await stableView(page)
  await expect(page.locator('[data-piece="1"]')).toHaveAttribute('aria-pressed','true')
  await page.locator('[data-slot="2"]').click();await expect(page.locator('[data-slot="2"]')).not.toHaveClass(/is-filled/);await stableView(page)
  for(const id of [1,2,3]) {
    await page.locator(`[data-piece="${id}"]`).click();await page.locator(`[data-slot="${id}"]`).click()
    await expect(page.locator(`[data-slot="${id}"]`)).toHaveClass(/is-filled/)
    await expect(page.locator(`[data-piece="${id}"]`)).toBeHidden();await stableView(page)
    const box=await last.boundingBox();expect(Math.abs(box.x-initial.x)).toBeLessThan(1);expect(Math.abs(box.y-initial.y)).toBeLessThan(1)
  }
  await expect.poll(async()=>(await(await page.request.get('/__test/snapshot')).json()).students.zosia.toolProgress.desktop.lesson.puzzle).toEqual([1,2,3])
  await last.press('Enter');await page.locator('[data-slot="4"]').press('Enter')
  await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
  await page.locator('[data-step-continue]').click();await expect(page.locator('.desktop-surface')).toBeVisible()
})

for(const motion of ['no-preference','reduce'])test(`przeciąganie zachowuje efekty i podświetlenia, ale nie przechyla klocka (${motion})`,async({page})=>{
  await page.emulateMedia({reducedMotion:motion});await openPuzzle(page)
  await page.evaluate(()=>{window.placementAnimations=[];const original=Element.prototype.animate;Element.prototype.animate=function(frames,options){if(this.matches('.puzzle-slot'))window.placementAnimations.push({frames,options});return original.call(this,frames,options)}})
  const source=page.locator('[data-piece="1"]'),target=page.locator('[data-slot="1"]')
  const from=await source.boundingBox(),to=await target.boundingBox()
  await page.mouse.move(from.x+35,from.y+35);await page.mouse.down();await page.mouse.move(from.x+60,from.y+40,{steps:5})
  await expect(page.locator('.activity-drag-preview')).toBeVisible();await expect(source).toHaveClass(/is-dragging/)
  await expect(source).toBeVisible()
  expect(Number(await source.evaluate(node=>getComputedStyle(node).opacity))).toBeLessThan(1)
  expect(await page.locator('.activity-drag-preview').evaluate(node=>{const s=getComputedStyle(node),m=new DOMMatrix(s.transform);return {tilted:m.b!==0||m.c!==0,shadow:s.boxShadow!=='none',outline:s.outlineStyle,animation:s.animationName}})).toEqual({tilted:false,shadow:true,outline:'none',animation:motion==='reduce'?'none':'activity-pick-up'})
  await stableView(page)
  await page.mouse.move(to.x+50,to.y+50,{steps:8});await expect(target).toHaveClass(/is-drop-target/)
  await expect.poll(async()=>Math.abs((await page.locator('.activity-drag-preview').boundingBox()).x-(to.x+64))).toBeLessThan(12)
  if(motion==='reduce')expect(await page.locator('.activity-drag-preview').evaluate(node=>getComputedStyle(node).transform)).toBe('none')
  await page.mouse.up();await expect(target).toHaveClass(/is-filled/);await expect(page.locator('.activity-drag-preview')).toHaveCount(0);await stableView(page)
  expect(await page.evaluate(()=>window.placementAnimations.length)).toBe(motion==='reduce'?0:1)
  await page.locator('[data-piece="2"]').dragTo(page.locator('[data-slot="2"]'))
  await expect(page.locator('[data-slot="2"]')).toHaveClass(/is-filled/);await stableView(page)
})

test('klawiatura zachowuje fokus, a wznowiona układanka zachowuje puste miejsca materiałów',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openPuzzle(page)
  await page.locator('[data-piece="3"]').press('Space');await page.locator('[data-slot="3"]').press('Enter')
  await expect(page.locator('[data-slot="3"]')).toBeFocused();await stableView(page)
  await expect.poll(async()=>(await(await page.request.get('/__test/snapshot')).json()).students.zosia.toolProgress.desktop.lesson.puzzle).toEqual([3])
  await page.reload();await expect(page.locator('[data-slot="3"]')).toHaveClass(/is-filled/)
  await expect(page.locator('[data-piece="3"]')).toBeHidden()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.locator('[data-piece="1"]').press('Enter');await page.locator('[data-slot="1"]').press('Enter')
  await expect(page.locator('[data-slot="1"]')).toHaveClass(/is-filled/)
})

test('wybranie kartki też nie renderuje lekcji od nowa; przeciąganie prowadzi do ukończenia',async({page})=>{
  await openPuzzle(page,3)
  await page.locator('[data-paper]').click();await stableView(page)
  await expect(page.locator('[data-paper]')).toHaveAttribute('aria-pressed','true')
  await page.locator('[data-paper]').dragTo(page.locator('[data-basket]'))
  await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
  await expect(page.locator('.activity-drag-preview')).toHaveCount(0)
})

test('po błędzie zapisu cztery części zostają na miejscu i można ponowić zakończenie',async({page})=>{
  await openPuzzle(page)
  await page.route('**/api/tools',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Spróbuj ponownie.'})}))
  for(const id of [1,2,3,4]) {await page.locator(`[data-piece="${id}"]`).click();await page.locator(`[data-slot="${id}"]`).click()}
  await expect(page.locator('[data-puzzle-retry]')).toBeVisible()
  await expect(page.locator('.puzzle-slot.is-filled')).toHaveCount(4);await stableView(page)
  await expect(page.locator('[data-step-continue]')).toHaveCount(0)
  await page.unroute('**/api/tools');await page.locator('[data-puzzle-retry]').click()
  await expect(page.getByText('Ukończyłeś ten etap.',{exact:true})).toBeVisible()
  const saved=(await(await page.request.get('/__test/snapshot')).json()).students.zosia.toolProgress.desktop.lesson
  expect(saved.puzzle).toEqual([1,2,3,4]);expect(saved.phase).toBe('complete')
})
