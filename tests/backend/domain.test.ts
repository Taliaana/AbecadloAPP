import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { MemoryRepository, MemoryFiles } from '../support/memoryRepository.js'
import { storeTestFixture } from '../support/seed.js'
import { createService } from '../../server/services.js'
import { hashPin, signSession, readSession, sessionCookie } from '../../server/auth.js'
import { createHandler } from '../../server/http.js'
import { ApiError, type Role } from '../../server/model.js'

const teacher: Role = { role: 'teacher', tokenId: 'teacher-test' }
const zosia: Role = { role: 'student', studentId: 'zosia', tokenId: 'zosia-device-a' }
let repo: MemoryRepository, files: MemoryFiles, run: ReturnType<typeof createService>
beforeEach(() => {
  process.env.SESSION_SECRET = 'unit-test-secret-with-at-least-32-characters'
  process.env.TEACHER_PIN_HASH = hashPin('1234')
  repo = new MemoryRepository(); files = new MemoryFiles()
  const fixture = storeTestFixture(); repo.state.students = fixture.students; repo.state.assignments = fixture.assignments
  run = createService(repo, files)
})
const denied = (status: number) => (error: any) => error instanceof ApiError && error.status === status

test('valid PIN signs HttpOnly session, invalid PIN fails and revoked tokens cannot be reused', async () => {
  const bad = await run('POST','auth/login',{pin:'0000'},null)
  assert.equal(bad.error?.status,401)
  const good = await run('POST','auth/login',{pin:'1234'},null)
  assert.equal(good.session?.role,'teacher')
  const token = await signSession(good.session!)
  assert.equal((await readSession(sessionCookie(token)))?.role,'teacher')
  assert.match(sessionCookie(token), /HttpOnly; SameSite=Strict/)
  assert.equal(await readSession(`pinktower_session=${token}x`),null)
  await run('POST','auth/logout',{},good.session!)
  await assert.rejects(run('GET','session',{},good.session!),denied(401))
  // A lost logout response must not lock an otherwise valid device out of login.
  assert.equal((await run('POST','auth/login',{pin:'0000'},good.session!)).error?.status,401)
  assert.equal((await run('POST','auth/login',{pin:'1234'},good.session!)).session?.role,'teacher')
  assert.equal((await run('POST','auth/logout',{},good.session!)).session,null)
})

test('teacher-only mutations, profile list and student switching are checked on the server', async () => {
  for (const [method,path,body] of [ ['POST','students',{name:'Maria',className:'2A'}], ['POST','session/student',{studentId:'antek'}], ['DELETE','students/antek',{confirmation:'delete-student'}], ['POST','students/zosia/unlock',{lessonId:3}], ['GET','students',{}] ] as const) await assert.rejects(run(method,path,body,zosia),denied(403))
  const selected = await run('POST','session/student',{studentId:'zosia'},teacher)
  assert.equal(selected.session?.studentId,'zosia')
  assert.deepEqual(Object.keys(selected.snapshot!.students),['zosia'])
  await assert.rejects(run('GET','session',{},teacher),denied(401))
})

test('student reads only own data; forged IDs and work ownership cannot access another pupil', async () => {
  assert.deepEqual(Object.keys((await run('GET','session',{},zosia)).snapshot!.students),['zosia'])
  await assert.rejects(run('GET','students/antek',{},zosia),denied(403))
  await assert.rejects(run('GET','works/antek-butterfly-draft',{},zosia),denied(403))
  await assert.rejects(run('PATCH','works/antek-butterfly-draft',{data:{note:'changed'}},zosia),denied(403))
  await assert.rejects(run('POST','progress',{lessonId:1,action:'start',studentId:'antek'},zosia))
  assert.equal(repo.state.students.antek.progress[1],'available')
})

test('lesson completion opens next lesson, repeat creates attempt and cannot reset completed', async () => {
  await assert.rejects(run('POST','progress',{lessonId:2,action:'start'},zosia),denied(409))
  await assert.rejects(run('POST','progress',{lessonId:1,action:'complete'},zosia),denied(409))
  await run('POST','progress',{lessonId:1,action:'start'},zosia)
  await run('POST','progress',{lessonId:1,action:'complete'},zosia)
  const repeat = await run('POST','progress',{lessonId:1,action:'repeat'},zosia)
  assert.equal(repo.state.attempts.length,2)
  assert.equal(repo.state.students.zosia.progress[1],'completed')
  await run('POST','progress',{lessonId:1,action:'finish-repeat',attemptId:repeat.value.id},zosia)
  const deviceB: Role = { ...zosia, tokenId:'zosia-device-b' }
  const fetched = await run('GET','progress',{},deviceB)
  assert.equal(fetched.value[1],'completed'); assert.equal(fetched.value[2],'available')
  assert.equal(repo.state.attempts.filter(item => item.finishedAt).length,2)
})

test('draft, submit, teacher return and complete use the shared central lifecycle', async () => {
  const {value:work} = await run('POST','works',{title:'Projekt',type:'Studio',data:{note:'pierwszy'}},zosia)
  await run('PATCH',`works/${work.id}`,{data:{note:'nowszy'}},zosia)
  await assert.rejects(run('PATCH',`works/${work.id}`,{status:'completed'},zosia),denied(403))
  await run('PATCH',`works/${work.id}`,{status:'waiting-review'},zosia)
  assert.equal((await run('GET',`works/${work.id}`,{},teacher)).value.status,'waiting-review')
  await run('POST',`works/${work.id}/review`,{decision:'returned'},teacher)
  await run('PATCH',`works/${work.id}`,{data:{note:'poprawiony'},status:'waiting-review'},zosia)
  await run('POST',`works/${work.id}/review`,{decision:'completed'},teacher)
  assert.equal((await run('GET',`works/${work.id}`,{},zosia)).value.status,'completed')
  await assert.rejects(run('PATCH',`works/${work.id}`,{data:{note:'overwrite'}},zosia),denied(409))
})

test('assets require ownership, confirmed uploads and file deletion accompanies profile deletion', async () => {
  const work = (await run('POST','works',{title:'Skały',type:'Tablica badawcza',data:{}},zosia)).value
  const metadata = {workId:work.id,mimeType:'image/png',size:24,hash:'a'.repeat(64)}
  await assert.rejects(run('POST','assets',metadata,{role:'student',studentId:'antek',tokenId:'antek'}),denied(403))
  const grant = (await run('POST','assets',metadata,zosia)).value
  const asset = repo.state.assets.find(item => item.id === grant.id)
  await assert.rejects(run('GET',`assets/${asset.id}`,{},zosia),denied(409))
  files.objects.set(asset.storagePath,{size:24,mimeType:'image/png',hash:metadata.hash})
  await run('POST',`assets/${asset.id}/finalize`,{},zosia)
  assert.match((await run('GET',`assets/${asset.id}`,{},zosia)).value.url,/__files/)
  await assert.rejects(run('DELETE','students/zosia',{},teacher))
  await run('DELETE','students/zosia',{confirmation:'delete-student'},teacher)
  assert.equal(repo.state.students.zosia,undefined)
  assert.equal(repo.state.assets.length,0)
  assert.equal(repo.state.attempts.some(item => item.studentId === 'zosia'),false)
  assert.equal(files.objects.has(asset.storagePath),false)
  assert.ok(files.deleted.includes(asset.storagePath))
  assert.ok(repo.state.students.antek)
})

test('failed remote deletion keeps pupil and file metadata available for retry', async () => {
  files.remove = async () => { throw new Error('offline') }
  await assert.rejects(run('DELETE','students/zosia',{confirmation:'delete-student'},teacher))
  assert.ok(repo.state.students.zosia)
})

test('HTTP handler checks Origin, returns safe errors and sets cookie only for a valid PIN', async () => {
  const server = createServer(createHandler(run))
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  const address = server.address() as any, base = `http://127.0.0.1:${address.port}`
  try {
    const badOrigin = await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:JSON.stringify({pin:'1234'})})
    assert.equal(badOrigin.status,403); assert.equal(badOrigin.headers.get('set-cookie'),null)
    const login = await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({pin:'1234'})})
    assert.equal(login.status,200); assert.match(login.headers.get('set-cookie')!,/HttpOnly/)
    const health = await fetch(`${base}/api/health`); assert.equal(health.status,200)
    const broken = createService({transaction:async()=>{throw new Error('password=secret-host')},health:async()=>{}},files)
    let output = ''
    const response:any = {setHeader(){},end(value:string){output=value}}
    await createHandler(broken)({url:'/api/session',method:'GET',headers:{host:'localhost'}},response)
    assert.equal(response.statusCode,503); assert.equal(output.includes('secret-host'),false)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(()=>resolve())) }
})
