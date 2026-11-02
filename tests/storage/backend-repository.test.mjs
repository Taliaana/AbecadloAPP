import { test } from 'node:test'
import assert from 'node:assert/strict'
const student = {id:'zosia',profile:{id:'zosia',name:'Zosia'},progress:{1:'available',2:'locked'},toolProgress:{unlockedTools:[],typingResults:{}},works:[]}
const snapshot = () => ({currentRole:'student',currentStudentId:'zosia',students:{zosia:structuredClone(student)},assignments:[],teacher:{}})
let caseId = 0
const fresh = () => import(`../../src/storage/studentStorage.js?test=${caseId++}`)

test('repository uses domain API, server responses and no local data writes', async () => {
  const writes = []
  globalThis.localStorage = {getItem(){throw new Error('legacy read forbidden')},setItem(){throw new Error('local write forbidden')}}
  let state = snapshot()
  globalThis.fetch = async (url, init) => {
    writes.push({url,body:init.body && JSON.parse(init.body)})
    if (url.endsWith('/works')) state.students.zosia.works.push({id:'server-work',studentId:'zosia',title:'Projekt',status:'draft',data:{}})
    return {ok:true,json:async()=>({snapshot:structuredClone(state),value:state.students.zosia.works[0]})}
  }
  const repository = await fresh()
  await repository.initializeStorage()
  const work = await repository.createWork({studentId:'forged-owner',title:'Projekt',type:'Studio',data:{}})
  assert.equal(work.id,'server-work')
  assert.equal(writes[1].url,'/api/works')
  assert.equal(writes[1].body.studentId,undefined)
  assert.equal(repository.getStudentById('antek'),null)
  assert.equal(repository.getWork('server-work').studentId,'zosia')
})

test('network failure never falls back to localStorage; retry keeps the unsaved work payload', async () => {
  const repository = await fresh(), state = snapshot()
  let offline = false
  globalThis.fetch = async (url, init) => {
    if (offline) throw new Error('offline')
    if (url.endsWith('/works/work')) state.students.zosia.works = [{id:'work',studentId:'zosia',data:JSON.parse(init.body).data}]
    return {ok:true,json:async()=>({snapshot:structuredClone(state),value:state.students.zosia.works[0]})}
  }
  await repository.initializeStorage()
  offline = true
  await assert.rejects(repository.updateWork('work',{data:{note:'keep this'}}))
  assert.equal(repository.hasUnsavedChanges(),true)
  assert.equal(repository.getWork('work'),null)
  offline = false
  await repository.retryPending(); await repository.revalidate()
  assert.equal(repository.hasUnsavedChanges(),false)
  assert.equal(repository.getWork('work').data.note,'keep this')
})

test('a delayed older fetch cannot replace a newer server projection', async () => {
  const repository = await fresh()
  let finishOldRead, oldReadStarted
  const started = new Promise(resolve => { oldReadStarted = resolve })
  globalThis.fetch = async (url) => {
    if (url.endsWith('/session')) {
      oldReadStarted()
      return new Promise(resolve => { finishOldRead = () => resolve({ok:true,json:async()=>({snapshot:{...snapshot(),revision:1}})}) })
    }
    const state = {...snapshot(),revision:2}
    state.students.zosia.progress[1] = 'completed'
    return {ok:true,json:async()=>({snapshot:state,value:true})}
  }
  const old = repository.revalidate(); await started
  await repository.completeLesson(1)
  finishOldRead(); await old
  assert.equal(repository.getStudentProgress()[1],'completed')
  assert.equal(repository.getStateSnapshot().revision,2)
})
