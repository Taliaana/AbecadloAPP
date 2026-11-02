import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {createService} from '../../server/services.js'
import {MemoryRepository,MemoryFiles} from '../support/memoryRepository.js'
import {storeTestFixture} from '../support/seed.js'
import type {Role} from '../../server/model.js'
test('retrying creation after a lost response does not duplicate pupils, works or assignments',async()=>{
  const repo=new MemoryRepository(), files=new MemoryFiles(), run=createService(repo,files)
  const fixture=storeTestFixture();repo.state.students=fixture.students;repo.state.assignments=fixture.assignments
  const teacher:Role={role:'teacher',tokenId:'teacher'},student:Role={role:'student',studentId:'zosia',tokenId:'student'}
  for(const [path,input,session] of [
    ['students',{name:'Maria',className:'2A',operationId:randomUUID()},teacher],
    ['works',{title:'Projekt',type:'Studio',data:{note:'Pomysł'},operationId:randomUUID()},student],
    ['assignments',{title:'Skały',instruction:'Zbierz zdjęcia.',tool:'research-board',wholeClass:true,operationId:randomUUID()},teacher],
  ] as const){
    const first=(await run('POST',path,input,session)).value
    const second=(await run('POST',path,input,session)).value
    assert.equal(first.id,second.id)
  }
  assert.equal(Object.keys(repo.state.students).length,4)
  assert.equal(repo.state.students.zosia.works.length,5)
  assert.equal(repo.state.assignments.length,2)
})
test('closed work and completed lesson allow identical retries but reject changed data',async()=>{
  const repo=new MemoryRepository(),run=createService(repo,new MemoryFiles()),fixture=storeTestFixture()
  repo.state.students=fixture.students;repo.state.assignments=fixture.assignments
  const student:Role={role:'student',studentId:'zosia',tokenId:'student'}
  await run('POST','progress',{lessonId:1,action:'start'},student)
  await run('POST','progress',{lessonId:1,action:'complete'},student)
  await run('POST','progress',{lessonId:1,action:'complete'},student)
  const work=(await run('POST','works',{title:'Projekt',type:'Studio',data:{note:'Pomysł'}},student)).value
  await run('PATCH',`works/${work.id}`,{status:'waiting-review',data:{note:'Pomysł'}},student)
  await run('PATCH',`works/${work.id}`,{status:'waiting-review',data:{note:'Pomysł'}},student)
  await assert.rejects(run('PATCH',`works/${work.id}`,{status:'waiting-review',data:{note:'Nadpisanie'}},student))
  assert.equal(repo.state.students.zosia.progress[1],'completed')
})
