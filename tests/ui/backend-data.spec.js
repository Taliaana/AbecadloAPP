import {test,expect} from '@playwright/test'
import {resetApp,chooseStudent,enterTeacher,seedTypewriting} from './helpers.js'

test('internal navigation mounts the keyboard exercise before background session refresh completes', async ({page}) => {
  await resetApp(page); await chooseStudent(page); await seedTypewriting(page)
  await page.goto('/#/workshop')
  await expect(page.getByRole('link',{name:/Typewriting/})).toBeVisible()
  let release
  const held = new Promise(resolve => { release = resolve })
  await page.route('**/api/session', async route => { await held; await route.continue() })
  try {
    await page.getByRole('link',{name:/Typewriting/}).click()
    for (const key of ['f','j','f','f','j','j','f','j']) await page.keyboard.press(key)
    await expect(page.locator('.completion-card h2')).toHaveText(/8\/8/)
    const state = await (await page.request.get('/__test/snapshot')).json()
    expect(state.students.zosia.toolProgress.typingResults.fj.correct).toBe(8)
  } finally { release() }
})

test('two devices share progress and review; a student cannot select another pupil or forge a role', async ({page,browser}) => {
  await resetApp(page); await chooseStudent(page)
  await page.evaluate(async()=>{
    const storage=await import('/src/storage/studentStorage.js')
    await storage.startLesson(1); await storage.completeLesson(1)
    localStorage.setItem('abecadlo-state-v3',JSON.stringify({schemaVersion:3,currentRole:'teacher',currentStudentId:'antek',students:{}}))
  })
  const otherContext=await browser.newContext(), teacher=await otherContext.newPage()
  try {
    await teacher.goto('http://127.0.0.1:4173/#/welcome'); await enterTeacher(teacher)
    await teacher.locator('.teacher-student-row').filter({hasText:'Zosia'}).click()
    await expect(teacher.locator('.student-detail-header')).toContainText('Lekcja 2')
    await page.getByRole('link',{name:/Cykl życia motyla.*Kontynuuj/}).click()
    await page.getByLabel('Krótka notatka').fill('Praca z laptopa ucznia')
    await page.getByRole('button',{name:/Pokaż nauczycielowi/}).click()
    await expect(page.getByText('Praca czeka na nauczyciela.')).toBeVisible()
    await teacher.getByRole('link',{name:'Do obejrzenia',exact:true}).click()
    await teacher.locator('.review-card').filter({hasText:'Zosia'}).click()
    await expect(teacher.getByRole('heading',{name:'Praca z laptopa ucznia'})).toBeVisible()
    await teacher.getByRole('button',{name:'Kontynuuj pracę',exact:true}).click()
    await page.getByRole('link',{name:'Wróć do domu',exact:true}).click()
    await expect(page.getByRole('link',{name:/Cykl życia motyla.*Wróć do pracy/})).toBeVisible()
    const denied=await page.evaluate(async()=>{
      const list=await fetch('/api/students')
      const switchStudent=await fetch('/api/session/student',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({studentId:'antek'})})
      const session=await (await fetch('/api/session')).json()
      return {list:list.status,switchStudent:switchStudent.status,students:Object.keys(session.snapshot.students),role:session.snapshot.currentRole}
    })
    expect(denied).toEqual({list:403,switchStudent:403,students:['zosia'],role:'student'})
    await page.reload()
    await expect(page.getByRole('heading',{name:'Cześć, Zosiu'})).toBeVisible()
  } finally {await otherContext.close()}
})

test('migration wizard never imports automatically, resumes image upload and preserves local copies', async ({page}) => {
  await resetApp(page)
  const fixture=await (await page.request.get('/__test/snapshot')).json()
  fixture.schemaVersion=3; fixture.version=3
  await page.request.post('/__test/seed',{data:{students:{},assignments:[]}})
  const original=await page.evaluate(async source=>{
    const canvas=document.createElement('canvas');canvas.width=8;canvas.height=8
    canvas.getContext('2d').fillRect(0,0,8,8)
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
    const work=source.students.zosia.works[0]
    work.data.entries={granit:{imageId:'migration-photo',source:'https://example.org/granit'}}
    const raw=JSON.stringify(source);localStorage.setItem('abecadlo-state-v3',raw)
    const request=indexedDB.open('pinktower-images',1)
    request.onupgradeneeded=()=>request.result.createObjectStore('images',{keyPath:'id'})
    const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})
    await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put({id:'migration-photo',studentId:'zosia',workId:work.id,blob});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})
    db.close();return raw
  },fixture)
  await enterTeacher(page)
  await expect(page.getByRole('link',{name:'Znaleziono dane zapisane na tym komputerze.'})).toBeVisible()
  expect(Object.keys((await (await page.request.get('/__test/snapshot')).json()).students)).toHaveLength(0)
  await page.getByRole('link',{name:'Znaleziono dane zapisane na tym komputerze.'}).click()
  await expect(page.getByRole('button',{name:'Przenieś dane do PinkTower'})).toBeDisabled()
  await page.getByRole('button',{name:'Sprawdź dane',exact:true}).click()
  await expect(page.locator('[data-migration-summary]')).toContainText('Uczniowie: 3')
  expect(Object.keys((await (await page.request.get('/__test/snapshot')).json()).students)).toHaveLength(0)
  await page.route('http://127.0.0.1:3001/__files/**',route=>route.abort())
  await page.getByRole('button',{name:'Przenieś dane do PinkTower'}).click()
  await expect(page.locator('[data-migration-status]')).toContainText('Kopia lokalna pozostaje bez zmian')
  expect(await page.evaluate(()=>localStorage.getItem('abecadlo-state-v3'))).toBe(original)
  expect(await page.evaluate(()=>localStorage.getItem('pinktower-migration-completed'))).toBeNull()
  await page.unroute('http://127.0.0.1:3001/__files/**')
  await page.reload()
  await page.getByRole('button',{name:'Sprawdź dane',exact:true}).click()
  await expect(page.getByRole('button',{name:'Przenieś dane do PinkTower'})).toBeEnabled()
  await page.getByRole('button',{name:'Przenieś dane do PinkTower'}).click()
  await expect(page.locator('[data-migration-status]')).toContainText('Dane zostały przeniesione')
  expect(await page.evaluate(()=>localStorage.getItem('abecadlo-state-v3'))).toBe(original)
  expect(await page.evaluate(()=>localStorage.getItem('pinktower-migration-completed'))).toBeTruthy()
  const central=await (await page.request.get('/__test/snapshot')).json()
  expect(Object.keys(central.students)).toHaveLength(3)
  expect(central.imports).toHaveLength(1)
  expect(central.assets).toHaveLength(1)
  expect(central.assets[0].status).toBe('ready')
})

test('failed autosave retains edits for explicit retry; backend outage does not erase legacy data', async ({page}) => {
  await resetApp(page); await chooseStudent(page)
  await page.getByRole('link',{name:/Cykl życia motyla.*Kontynuuj/}).click()
  await page.route('**/api/works/**',route=>route.request().method()==='PATCH'?route.abort():route.continue())
  await page.getByLabel('Krótka notatka').fill('Notatka do zachowania')
  await expect(page.locator('.data-status')).toContainText('Nie udało się połączyć')
  await page.unroute('**/api/works/**')
  await page.locator('.data-status').getByRole('button',{name:'Spróbuj ponownie'}).click()
  await expect.poll(async()=> (await (await page.request.get('/__test/snapshot')).json()).students.zosia.works.find(item=>item.id==='zosia-butterfly-draft').data.note).toBe('Notatka do zachowania')
  await page.evaluate(()=>localStorage.setItem('abecadlo-state-v3','legacy-copy-to-keep'))
  await page.route('**/api/session',route=>route.abort())
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('Nie udało się połączyć')
  expect(await page.evaluate(()=>localStorage.getItem('abecadlo-state-v3'))).toBe('legacy-copy-to-keep')
  await page.unroute('**/api/session')
  await page.getByRole('button',{name:'Spróbuj ponownie'}).click()
  await expect(page.getByLabel('Krótka notatka')).toHaveValue('Notatka do zachowania')
})
