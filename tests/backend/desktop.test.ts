import {test} from 'node:test'
import assert from 'node:assert/strict'
import {initialDesktop,initialDesktopSession,moveDesktopFile,restoreDesktopFile,openDesktopWindow,minimizeDesktopWindow,isValidDesktopSession,readDesktopSession,desktopTaskDone} from '../../src/data/desktop.js'
import {MemoryRepository,MemoryFiles} from '../support/memoryRepository.js'
import {storeTestFixture} from '../support/seed.js'
import {createService} from '../../server/services.js'
import {ApiError,type Role} from '../../server/model.js'
import {teacherLessonSession} from '../../src/lessons/session.js'
const pupil:Role={role:'student',studentId:'zosia',tokenId:'desktop-test'}
test('virtual file moves have a single location; trash restores the original folder',()=>{
  const b=initialDesktop()
  assert.equal(moveDesktopFile(b,'note','works'),true);assert.equal(b.locations.note,'works')
  assert.equal(moveDesktopFile(b,'note','trash'),true);assert.equal(b.restoreLocations.note,'works')
  assert.equal(restoreDesktopFile(b,'note'),true);assert.equal(b.locations.note,'works')
  assert.equal(b.restoreLocations.note,undefined)
  assert.ok(desktopTaskDone(b,3)&&desktopTaskDone(b,4)&&desktopTaskDone(b,5))
  assert.equal(moveDesktopFile(b,'works','images'),false)
  assert.equal(moveDesktopFile(b,'note','C:/Users'),false)
})
test('folder history, minimization and restoration reuse one window',()=>{
  const b=initialDesktop()
  openDesktopWindow(b,'works');openDesktopWindow(b,'images','works')
  assert.deepEqual(b.windows[0].history,['works']);assert.equal(b.windows[0].target,'images')
  minimizeDesktopWindow(b,'works');openDesktopWindow(b,'images','works')
  assert.equal(b.windows.length,1);assert.equal(b.windows[0].minimized,false)
  openDesktopWindow(b,'flower')
  assert.ok(desktopTaskDone(b,0)&&desktopTaskDone(b,1)&&desktopTaskDone(b,2))
})
test('saved desktop JSON is bounded and cannot introduce arbitrary files, HTML or external paths',()=>{
  const state=initialDesktopSession();assert.equal(isValidDesktopSession(state),true)
  const before=structuredClone(state)
  assert.deepEqual(readDesktopSession({...state,updatedAt:'2026-11-03'}),before)
  for(const invalid of [{...state,currentStep:100},{...state,board:{...state.board,locations:{...state.board.locations,note:'../../etc'}}},{...state,board:{...state.board,windows:[{id:'file://secret'}]}},{...state,board:{...state.board,windows:[null]}},{...state,code:'<script>'}])assert.equal(isValidDesktopSession(invalid),false)
  assert.deepEqual(state,before)
})
test('desktop saves through the repository, restores on another session and leaves pupils/progress untouched',async()=>{
  const repo=new MemoryRepository(),fixture=storeTestFixture();repo.state.students=fixture.students;repo.state.assignments=fixture.assignments
  const files=new MemoryFiles(),run=createService(repo,files),before=structuredClone(repo.state.students)
  const state=initialDesktopSession();state.currentStep=5;openDesktopWindow(state.board,'works');moveDesktopFile(state.board,'note','works')
  await assert.rejects(run('POST','tools',{kind:'desktop',mode:'lesson',state},pupil),e=>e instanceof ApiError&&e.status===409)
  repo.state.students.zosia.progress[2]='available'
  await run('POST','tools',{kind:'desktop',mode:'lesson',state},pupil)
  const next=createService(repo,files)
  const fetched=(await next('GET','session',{}, {...pupil,tokenId:'another-device'})).snapshot!.students.zosia
  assert.deepEqual(readDesktopSession(fetched.toolProgress.desktop.lesson),state)
  assert.equal(fetched.progress[2],'available','Saving an exercise cannot complete or start a lesson')
  assert.deepEqual(fetched.works,before.zosia.works);assert.deepEqual(repo.state.students.antek,before.antek)
  await assert.rejects(run('POST','tools',{kind:'desktop',mode:'practice',state},pupil),e=>e instanceof ApiError&&e.status===409)
  await assert.rejects(run('POST','tools',{kind:'desktop',mode:'lesson',state,studentId:'antek'},pupil))
  await assert.rejects(run('POST','tools',{kind:'desktop',mode:'lesson',state},null),e=>e instanceof ApiError&&e.status===401)
})
test('teacher exercise session keeps test state in memory without fetching or writing pupil data',async()=>{
  const session=teacherLessonSession(),state=initialDesktopSession()
  await session.start(4);await session.complete(4);await session.saveDesktop(state)
  assert.equal(session.preview,true);assert.deepEqual(session.readDesktop(),state)
  state.board.locations.note='trash'
  assert.equal(session.readDesktop().board.locations.note,'desktop')
})

test('scroll folder extends the same state without resetting old desktop saves',()=>{
  const state=initialDesktopSession();openDesktopWindow(state.board,'works')
  const old=structuredClone(state)
  assert.deepEqual(readDesktopSession(old),state)
  openDesktopWindow(state.board,'scroll');assert.equal(isValidDesktopSession(state),true)
  assert.equal(moveDesktopFile(state.board,'note','scroll'),true)
  assert.equal(readDesktopSession(state).board.locations.note,'scroll')
  assert.equal(old.board.locations.note,'desktop')
})
