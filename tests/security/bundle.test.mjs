import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readdir,readFile} from 'node:fs/promises'
test('built browser JavaScript contains no server secrets or pilot PIN',async()=>{
  const files=(await readdir('dist/assets')).filter(file=>file.endsWith('.js'))
  assert.ok(files.length,'Run npm run build before checking the bundle')
  for(const file of files){
    const js=await readFile(`dist/assets/${file}`,'utf8')
    for(const name of ['TEACHER_PIN_HASH','SESSION_SECRET','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL']) assert.equal(js.includes(name),false,`${name} leaked into browser JS`)
    assert.equal(/["'`]1234["'`]/.test(js),false,'Pilot PIN leaked into browser JS')
  }
})
