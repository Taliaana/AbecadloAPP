import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryRepository, MemoryFiles } from '../support/memoryRepository.js'
import { storeTestFixture } from '../support/seed.js'
import { createService } from '../../server/services.js'
import { inputs } from '../../server/validation.js'
import { ApiError, type Role } from '../../server/model.js'
import { natureFriends, natureOptions, defaultNatureAvatar, normalizeNatureAvatar, isValidNatureAvatar, profileGrade } from '../../src/data/natureFriends.js'
import { avatar } from '../../src/components/icons.js'

const pupil: Role = { role:'student', studentId:'zosia', tokenId:'nature-test' }
function setup() {
  const repo=new MemoryRepository(), files=new MemoryFiles(), fixture=storeTestFixture()
  repo.state.students=fixture.students;repo.state.assignments=fixture.assignments
  return {repo, files, run:createService(repo,files)}
}
test('five species: defaults, every allowed variant and safe deterministic SVG rendering',()=>{
  assert.equal(natureFriends.length,5)
  const bodies=new Set<string>()
  for(const friend of natureFriends) {
    const config=defaultNatureAvatar(friend.id)
    assert.equal(isValidNatureAvatar(config),true)
    const original=avatar({avatarConfig:config},'large')
    bodies.add(original.match(/data-layer="body">(.*?)<\/g>/s)![1])
    for(const [trait,options] of Object.entries(natureOptions(friend.id))) for(const[value] of options) {
      const changed={...config,[trait]:value}
      assert.deepEqual(inputs.avatar.parse(changed),changed)
      assert.equal(avatar({avatarConfig:changed},'large'),avatar({avatarConfig:changed},'large'))
      if(value!==config[trait as keyof typeof config]) assert.notEqual(avatar({avatarConfig:changed},'large'),original,`${friend.id}/${trait}/${value} must change the illustration`)
    }
  }
  assert.equal(bodies.size,5,'Each species has its own silhouette')
  const unsafe=avatar({avatarConfig:{kind:'nature',species:'<script>',body:'" onload="alert(1)',accessory:'backpack'}})
  assert.ok(!unsafe.includes('<script>') && !unsafe.includes('onload='))
  assert.equal(isValidNatureAvatar({...defaultNatureAvatar('clownfish'),accessory:'backpack'}),false)
  assert.equal(isValidNatureAvatar({...defaultNatureAvatar(),studentId:'antek'}),false)
  assert.deepEqual(normalizeNatureAvatar(null),defaultNatureAvatar())
})
test('class grouping respects existing names without rewriting or hiding legacy assignments',()=>{
  for(const name of ['1A','1B',' 1a ','Klasa 1']) assert.equal(profileGrade(name),'1')
  assert.equal(profileGrade('2A'),'2');assert.equal(profileGrade('3'),'3')
  for(const name of ['10A','4B','grupa','']) assert.equal(profileGrade(name),null)
})
test('legacy avatar contract and rendering remain compatible',()=>{
  const {repo}=setup(), old=repo.state.students.zosia.profile.avatarConfig
  assert.deepEqual(inputs.avatar.parse(old),old)
  assert.match(avatar(repo.state.students.zosia.profile),/avatar-skin/)
  assert.doesNotMatch(avatar(repo.state.students.zosia.profile),/nature-avatar/)
})
test('avatar saves through existing repository, persists on next session and preserves all other pupil data',async()=>{
  const {repo,files,run}=setup(), before=structuredClone(repo.state.students)
  for(const friend of natureFriends) {
    const config={...defaultNatureAvatar(friend.id),eyes:'bright',mouth:'happy'}
    await run('PUT','avatar',config,pupil)
    const nextService=createService(repo,files)
    const fetched=(await nextService('GET','session',{}, {...pupil,tokenId:'another-device'})).snapshot!.students.zosia
    assert.deepEqual(fetched.profile.avatarConfig,config)
    assert.deepEqual(fetched.progress,before.zosia.progress)
    assert.deepEqual(fetched.toolProgress,before.zosia.toolProgress)
    assert.deepEqual(fetched.works,before.zosia.works)
    assert.equal(fetched.id,before.zosia.id);assert.equal(fetched.className,before.zosia.className)
  }
  assert.deepEqual(repo.state.students.antek,before.antek)
  assert.deepEqual(repo.state.students.lena,before.lena)
})
test('server rejects forged owners, invalid parts, extra attributes and unauthenticated writes',async()=>{
  const {repo,run}=setup(), before=structuredClone(repo.state.students), config=defaultNatureAvatar()
  await assert.rejects(run('PUT','avatar',config,null),error=>error instanceof ApiError && error.status===401)
  for(const bad of [{...config,studentId:'antek'}, {...config,body:'#fff'}, {...config,part:'wings'}, {...config,species:'fox'}, {...config,version:2}]) await assert.rejects(run('PUT','avatar',bad,pupil))
  await assert.rejects(run('POST','session/student',{studentId:'antek'},pupil),error=>error instanceof ApiError && error.status===403)
  await assert.rejects(run('GET','students',{},pupil),error=>error instanceof ApiError && error.status===403)
  assert.deepEqual(repo.state.students,before)
})
