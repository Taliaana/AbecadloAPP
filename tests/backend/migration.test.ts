import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryRepository, MemoryFiles } from '../support/memoryRepository.js'
import { storeTestFixture } from '../support/seed.js'
import { inspectLegacy } from '../../server/migration.js'
import { createService } from '../../server/services.js'
import type { Role } from '../../server/model.js'
const teacher: Role = {role:'teacher',tokenId:'migration-teacher'}

test('invalid legacy dates are reported before any database write', async () => {
  const repo = new MemoryRepository(), run = createService(repo,new MemoryFiles())
  const source:any = storeTestFixture()
  source.students.zosia.createdAt = 'not-a-date'
  const report = (await run('POST','migration/import',{source,assets:[]},teacher)).value
  assert.ok(report.errors.some((error:string) => error.includes('createdAt')))
  assert.equal(Object.keys(repo.state.students).length,0)
  assert.equal(repo.state.imports.length,0)
})

test('actual v3 fixture imports IDs, avatar, completed progress, tool data, works, assignments and review states idempotently', async () => {
  const repo = new MemoryRepository(), files = new MemoryFiles(), run = createService(repo,files)
  const source:any = storeTestFixture()
  source.students.zosia.progress[1] = 'completed'
  source.students.zosia.toolProgress.typingResults.fj = {correct:8,attempts:8}
  source.students.zosia.toolProgress.robot = {original:{runs:2,completed:true,routes:['route'],program:['forward']}}
  const input = {source,assets:[]}, copy = structuredClone(input)
  const preview = (await run('POST','migration/preview',input,teacher)).value
  assert.equal(Object.keys(repo.state.students).length,0)
  assert.deepEqual(preview.errors,[])
  await run('POST','migration/import',input,teacher)
  const first = structuredClone(repo.state.students)
  const resumed = (await run('POST','migration/import',input,teacher)).value
  assert.equal(resumed.alreadyImported,true)
  assert.deepEqual(repo.state.students,first)
  assert.equal(repo.state.imports.length,1)
  assert.equal(first.zosia.profile.id,'zosia')
  assert.deepEqual(first.zosia.profile.avatarConfig,source.students.zosia.profile.avatarConfig)
  assert.equal(first.zosia.progress[1],'completed')
  assert.deepEqual(first.zosia.toolProgress,source.students.zosia.toolProgress)
  assert.equal(first.antek.works.at(-1).status,'waiting-review')
  assert.equal(first.lena.works.at(-1).status,'returned')
  assert.equal(repo.state.assignments[0].id,source.assignments[0].id)
  const finalized = (await run('POST','migration/finalize',{importId:preview.id},teacher)).value
  assert.equal(finalized.completed,true)
  assert.deepEqual(input,copy)
})

test('interrupted image import resumes pending assets; finalize never succeeds with missing files', async () => {
  const repo = new MemoryRepository(), files = new MemoryFiles(), run = createService(repo,files)
  const source:any = storeTestFixture(), work = source.students.zosia.works[0]
  work.data = {kind:'research-board',entries:{granit:{imageId:'legacy-photo',source:'https://example.org'}}}
  const manifest = {id:'legacy-photo',studentId:'zosia',workId:work.id,mimeType:'image/png',size:12,hash:'b'.repeat(64)}
  const input = {source,assets:[manifest]}
  const job = (await run('POST','migration/import',input,teacher)).value
  assert.equal((await run('POST','migration/finalize',{importId:job.id},teacher)).value.completed,false)
  const upload = {...manifest, legacyImageId:manifest.id,importId:job.id}; delete (upload as any).id; delete (upload as any).studentId
  const grant = (await run('POST','assets',upload,teacher)).value
  assert.equal(grant.id,'legacy-photo')
  await run('POST','migration/import',input,teacher)
  assert.equal(repo.state.assets.length,1)
  const asset = repo.state.assets[0]
  files.objects.set(asset.storagePath,{size:12,mimeType:'image/png',hash:manifest.hash})
  // Upload succeeded but response/finalize was lost; retry recognizes the existing file.
  const retry = (await run('POST','assets',upload,teacher)).value
  assert.equal(retry.ready,true)
  assert.equal((await run('POST','migration/finalize',{importId:job.id},teacher)).value.completed,true)
  assert.equal(repo.state.students.zosia.works[0].data.entries.granit.imageId,'legacy-photo')
})

test('imports from another computer merge completed progress but report real conflicts without overwriting', async () => {
  const repo = new MemoryRepository(), run = createService(repo,new MemoryFiles())
  const source:any = storeTestFixture()
  await run('POST','migration/import',{source,assets:[]},teacher)
  source.students.zosia.progress[1] = 'completed'
  const merged = (await run('POST','migration/import',{source,assets:[]},teacher)).value
  assert.deepEqual(merged.conflicts,[]); assert.equal(repo.state.students.zosia.progress[1],'completed')
  const count = Object.keys(repo.state.students).length, before = structuredClone(repo.state.students)
  source.students.zosia.profile.name = 'Zofia'
  const conflict = (await run('POST','migration/import',{source,assets:[]},teacher)).value
  assert.ok(conflict.conflicts.length)
  assert.deepEqual(repo.state.students,before)
  assert.equal(Object.keys(repo.state.students).length,count)
  source.students.zosia.profile.name = 'Zosia'
  repo.state.settings.speechSettings = { preset:'calm',voiceURI:'voice-a' }
  source.teacher = { speechSettings:{ preset:'slower',voiceURI:'voice-b' } }
  const settingsConflict = (await run('POST','migration/import',{source,assets:[]},teacher)).value
  assert.ok(settingsConflict.conflicts.length)
  assert.equal(repo.state.settings.speechSettings.voiceURI,'voice-a')
})

test('inconsistent references, missing images and unsupported data stop import and preserve the source', async () => {
  const source:any = storeTestFixture()
  source.students.zosia.works[0].data.entries = {granit:{imageId:'missing'}}
  const original = JSON.stringify(source)
  assert.ok(inspectLegacy({source,assets:[]}).errors.length)
  const repo = new MemoryRepository(), run = createService(repo,new MemoryFiles())
  const result = (await run('POST','migration/import',{source,assets:[]},teacher)).value
  assert.ok(result.errors.length); assert.deepEqual(repo.state.students,{})
  assert.equal(JSON.stringify(source),original)
  assert.throws(()=>inspectLegacy({source:{...source,schemaVersion:99},assets:[]}))
  const invalidTools:any = storeTestFixture()
  invalidTools.students.zosia.toolProgress.unlockedTools = 'not-an-array'
  assert.throws(()=>inspectLegacy({source:invalidTools,assets:[]}))
  const duplicate:any = storeTestFixture()
  duplicate.assignments.push(structuredClone(duplicate.assignments[0]))
  assert.ok(inspectLegacy({source:duplicate,assets:[]}).errors.length)
})

test('legacy browser copies are unchanged after success marker and after errors', async () => {
  const copies = new Map([['abecadlo-state-v3',JSON.stringify(storeTestFixture())]])
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>copies.get(key)||null,setItem:(key:string,value:string)=>copies.set(key,value)}})
  const {readLegacy,markMigration} = await import('../../src/storage/legacyStorage.js')
  const original = copies.get('abecadlo-state-v3')
  assert.ok(readLegacy()?.source.students.zosia)
  markMigration('finished-import')
  assert.equal(copies.get('abecadlo-state-v3'),original)
  copies.set('abecadlo-state-v3','invalid-json')
  assert.ok(readLegacy()?.error)
  assert.equal(copies.get('abecadlo-state-v3'),'invalid-json')
})
