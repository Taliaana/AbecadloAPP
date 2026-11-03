import { test, expect } from '@playwright/test'
import { chooseStudent, enterTeacher, resetApp, selectNatureFriend } from './helpers.js'
import { natureFriends } from '../../src/data/natureFriends.js'

const preview=page=>page.locator('[data-avatar-preview] .nature-avatar')
const state=async page=>(await(await page.request.get('/__test/snapshot')).json())

test('wybór klasy filtruje profile, powrót działa klawiaturą, stare przypisania nie znikają',async({page})=>{
  await resetApp(page)
  const fixture=await state(page)
  fixture.students.antek.className=fixture.students.antek.profile.className='2A'
  fixture.students.lena.className=fixture.students.lena.profile.className='3B'
  const other=structuredClone(fixture.students.zosia)
  other.id=other.profile.id='other';other.profile.name='Ola';other.className=other.profile.className='Pracownia'
  fixture.students.other=other
  await page.request.post('/__test/seed',{data:fixture})
  await enterTeacher(page);await page.goto('/#/profiles')
  await expect(page.locator('.grade-card')).toHaveCount(3)
  await expect(page.locator('[data-profile]')).toHaveCount(0)
  for(const[grade,id]of[['1','zosia'],['2','antek'],['3','lena'],['other','other']]) {
    await page.locator(`[data-grade="${grade}"]`).focus();await page.keyboard.press('Enter')
    await expect(page.locator('[data-profile]')).toHaveCount(1)
    await expect(page.locator('[data-profile]')).toHaveAttribute('data-profile',id)
    await page.locator('[data-back-grades]').focus();await page.keyboard.press('Enter')
  }
  // Hold the next render's focus callback, then focus the Back control before
  // releasing it. A late callback must never steal the user's keyboard focus.
  expect(await page.evaluate(()=>{
    const original=requestAnimationFrame, pending=[]
    window.requestAnimationFrame=callback=>{pending.push(callback);return 0}
    try {
      document.querySelector('[data-grade="1"]').click()
      const back=document.querySelector('[data-back-grades]');back.focus()
      pending.forEach(callback=>callback(performance.now()))
      return document.activeElement===back
    } finally {window.requestAnimationFrame=original}
  })).toBe(true)
  await page.keyboard.press('Enter')
  await expect(page.locator('.grade-card')).toHaveCount(3)
  expect((await state(page)).students).toEqual(fixture.students)
})

test('pięć gatunków ma działające cechy, miniatury, losowanie, cofanie, reset i anulowanie',async({page})=>{
  await resetApp(page);await chooseStudent(page)
  const before=(await state(page)).students
  await page.getByRole('link',{name:/Edytuj avatar/}).click()
  await expect(page.locator('.friend-species-grid button')).toHaveCount(5)
  for(const species of ['roe-deer','owl','turtle','frog','clownfish']) {
    await selectNatureFriend(page,species)
    await expect(preview(page)).toHaveAttribute('data-species',species)
    for(const category of ['colors','face','parts','accessory','background']) {
      await page.locator(`[data-category="${category}"]`).click()
      const fields=await page.locator('[data-avatar-options] fieldset').all()
      for(const field of fields) {
        const options=field.locator('button'), target=options.last()
        const old=await preview(page).evaluate(el=>el.outerHTML)
        await target.focus();await page.keyboard.press('Enter')
        await expect(target).toHaveAttribute('aria-pressed','true');await expect(target).toBeFocused()
        expect(await preview(page).evaluate(el=>el.outerHTML)).not.toEqual(old)
      }
    }
    if(species==='clownfish') {
      await page.locator('[data-category="accessory"]').click()
      await expect(page.locator('[data-value="backpack"]')).toHaveCount(0)
    }
  }
  const old=await preview(page).evaluate(el=>el.outerHTML)
  await page.getByRole('button',{name:'Losuj wygląd',exact:true}).click()
  await page.getByRole('button',{name:'Cofnij zmianę',exact:true}).click()
  expect(await preview(page).evaluate(el=>el.outerHTML)).toBe(old)
  await page.locator('[data-reset-avatar]').click()
  await expect(page.locator('[data-avatar-preview] .avatar-skin')).toHaveCount(1)
  await selectNatureFriend(page,'owl')
  await page.getByRole('button',{name:'Anuluj',exact:true}).click()
  expect((await state(page)).students).toEqual(before)
  await expect(page.locator('.profile-chip .avatar-skin')).toHaveCount(1)
})

test('zapis awatara przetrwa nową sesję i jest identyczny u ucznia, nauczyciela i w wyborze profilu',async({page})=>{
  await resetApp(page);await chooseStudent(page)
  const before=structuredClone((await state(page)).students)
  await page.getByRole('link',{name:/Edytuj avatar/}).click()
  await selectNatureFriend(page,'frog')
  await page.locator('[data-trait="body"][data-value="mint"]').click()
  await page.locator('[data-category="parts"]').click()
  const legs=page.locator('[data-trait="part"][data-value="stretch"] .nature-avatar')
  const thumbnail=await legs.innerHTML()
  await page.locator('[data-trait="pattern"][data-value="stripe"]').click()
  expect(await legs.innerHTML()).not.toBe(thumbnail)
  await page.locator('[data-trait="part"][data-value="stretch"]').click()
  await page.locator('[data-category="accessory"]').click()
  await page.locator('[data-trait="accessory"][data-value="glasses"]').click()
  await page.locator('[data-category="background"]').click()
  await page.locator('[data-trait="background"][data-value="sky"]').click()
  const drawing=await preview(page).innerHTML()
  await page.locator('[data-save-avatar]').click()
  await expect(page.locator('.home-welcome')).toBeVisible()
  expect(await page.locator('.profile-chip .nature-avatar').innerHTML()).toBe(drawing)
  await page.reload()
  expect(await page.locator('.profile-chip .nature-avatar').innerHTML()).toBe(drawing)
  const after=(await state(page)).students
  expect(after.zosia.profile.avatarConfig.background).toBe('sky')
  expect(after.zosia.progress).toEqual(before.zosia.progress);expect(after.zosia.toolProgress).toEqual(before.zosia.toolProgress)
  expect(after.zosia.works).toEqual(before.zosia.works);expect(after.antek).toEqual(before.antek)
  await page.goto('/#/profiles')
  await expect(page.locator('.home-welcome')).toBeVisible()
  expect((await page.request.get('/api/students')).status()).toBe(403)
  await enterTeacher(page)
  expect(await page.locator('.teacher-student-row').filter({hasText:'Zosia'}).locator('.nature-avatar').innerHTML()).toBe(drawing)
  await page.goto('/#/profiles');await page.locator('[data-grade="1"]').click()
  expect(await page.locator('[data-profile="zosia"] .nature-avatar').innerHTML()).toBe(drawing)
  await page.locator('[data-profile="zosia"]').click()
  // PostgreSQL JSONB does not preserve the insertion order of object keys.
  const reordered=await state(page)
  reordered.students.zosia.profile.avatarConfig=Object.fromEntries(Object.entries(reordered.students.zosia.profile.avatarConfig).reverse())
  await page.request.post('/__test/seed',{data:reordered})
  await page.reload()
  await page.getByRole('link',{name:/Edytuj avatar/}).click()
  await expect(page.locator('[data-trait="body"][data-value="mint"]')).toHaveAttribute('aria-pressed','true')
  expect(await preview(page).innerHTML()).toBe(drawing)
  await page.locator('[data-trait="body"][data-value="mint"]').click()
  await expect(page.locator('[data-undo-avatar]')).toBeDisabled()
  await page.locator('[data-trait="body"][data-value="sage"]').click()
  await page.locator('[data-reset-avatar]').click()
  expect(await preview(page).innerHTML()).toBe(drawing)
  await page.locator('[data-undo-avatar]').click()
  await expect(page.locator('[data-trait="body"][data-value="sage"]')).toHaveAttribute('aria-pressed','true')
  await page.locator('[data-cancel-avatar]').click()
  expect(await page.locator('.profile-chip .nature-avatar').innerHTML()).toBe(drawing)
})

test('przerwany zapis zachowuje podgląd i można go ponowić bez utraty zmian',async({page})=>{
  await resetApp(page);await chooseStudent(page)
  const saved=(await state(page)).students.zosia.profile.avatarConfig
  await page.getByRole('link',{name:/Edytuj avatar/}).click()
  await selectNatureFriend(page,'owl')
  const drawing=await preview(page).innerHTML()
  await page.route('**/api/avatar',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Nie udało się połączyć.'})}))
  await page.locator('[data-save-avatar]').click()
  await expect(page.locator('[data-avatar-status]')).toContainText('Twój podgląd pozostał')
  expect(await preview(page).innerHTML()).toBe(drawing)
  expect((await state(page)).students.zosia.profile.avatarConfig).toEqual(saved)
  await page.unroute('**/api/avatar')
  await page.locator('[data-save-avatar]').click()
  await expect(page.locator('.home-welcome')).toBeVisible()
  expect(await page.locator('.profile-chip .nature-avatar').innerHTML()).toBe(drawing)
  expect((await state(page)).students.zosia.profile.avatarConfig.species).toBe('owl')
})

test('kreator i oba etapy wyboru profilu mieszczą się na czterech szerokościach',async({page})=>{
  await resetApp(page);await enterTeacher(page)
  for(const[width,height]of[[1440,900],[1366,768],[1024,768],[390,844]]) {
    await page.setViewportSize({width,height});await page.goto('/#/profiles')
    await expect(page.locator('.grade-card')).toHaveCount(3)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.locator('[data-grade="1"]').click()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await page.locator('[data-back-grades]').click()
  }
  await page.locator('[data-grade="1"]').click()
  await page.locator('[data-profile="zosia"]').click();await page.getByRole('link',{name:/Edytuj avatar/}).click()
  for(const[width,height]of[[1440,900],[1366,768],[1024,768],[390,844]]) {
    await page.setViewportSize({width,height})
    for(const category of ['colors','parts','accessory']) {
      await page.locator(`[data-category="${category}"]`).click()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
      for(const button of await page.locator('.friend-editor button:visible').all()) {
        const r=await button.boundingBox();expect(r.x).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(width+1);expect(r.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
})

test('25 przyjaciół w pięciu grupach: warianty, cofanie między grupami i zapis nowego gatunku',async({page})=>{
  test.setTimeout(60000)
  await resetApp(page);await chooseStudent(page)
  await page.getByRole('link',{name:/Edytuj avatar/}).click()
  const seen=new Set()
  for(const group of ['Ssaki','Ptaki','Gady','Płazy','Ryby']) {
    await page.locator(`[data-animal-group="${group}"]`).click()
    await expect(page.locator('.friend-species-grid button')).toHaveCount(5)
    for(const friend of natureFriends.filter(item=>item.group===group)) {
      await page.locator(`button[data-species="${friend.id}"]`).click()
      seen.add(friend.id)
      await expect(preview(page)).toHaveAttribute('data-species',friend.id)
      await page.locator('[data-category="parts"]').click()
      const old=await preview(page).innerHTML()
      await page.locator(`[data-trait="part"][data-value="${friend.parts[1][0]}"]`).click()
      expect(await preview(page).innerHTML()).not.toBe(old)
      await page.locator('[data-category="accessory"]').click()
      await expect(page.locator('[data-trait="accessory"]')).toHaveCount(friend.accessories.length)
      await page.locator('[data-trait="accessory"][data-value="glasses"]').click()
    }
  }
  expect(seen.size).toBe(25)
  // Changing only the group is browsing, not an edit to the avatar.
  const drawing=await preview(page).innerHTML()
  await page.locator('[data-animal-group="Ssaki"]').focus();await page.keyboard.press('Enter')
  expect(await preview(page).innerHTML()).toBe(drawing)
  await page.locator('button[data-species="fox"]').click()
  await page.locator('[data-undo-avatar]').click()
  await expect(page.locator('[data-animal-group="Ryby"]')).toHaveAttribute('aria-pressed','true')
  await expect(preview(page)).toHaveAttribute('data-species','angelfish')
  expect(await preview(page).innerHTML()).toBe(drawing)
  await page.locator('[data-save-avatar]').click()
  await expect(page.locator('.home-welcome')).toBeVisible()
  await page.reload()
  expect(await page.locator('.profile-chip .nature-avatar').innerHTML()).toBe(drawing)
  await page.getByRole('link',{name:/Edytuj avatar/}).click()
  await expect(page.locator('[data-animal-group="Ryby"]')).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('button[data-species="angelfish"]')).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('[data-trait="body"]')).toHaveCount(3)
})
