// Explicitly test-only. Never imported by api/, server production entrypoint or frontend.
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { MemoryRepository, MemoryFiles } from './memoryRepository.js'
import { createService } from '../../server/services.js'
import { createHandler } from '../../server/http.js'
import { hashPin } from '../../server/auth.js'
import { emptyGraph } from '../../server/model.js'
import { storeTestFixture } from './seed.js'
if (process.env.NODE_ENV !== 'test') throw new Error('Test server requires NODE_ENV=test')
process.env.SESSION_SECRET = 'test-only-session-secret-with-at-least-32-bytes'
process.env.TEACHER_PIN_HASH = hashPin('1234')
const repository = new MemoryRepository(), files = new MemoryFiles()
const handler = createHandler(createService(repository, files))
const seed = storeTestFixture()
function reset() { repository.state = { ...emptyGraph(), students: structuredClone(seed.students), assignments: structuredClone(seed.assignments) }; files.objects.clear() }
reset()
createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS')
  if (request.method === 'OPTIONS') { response.end(); return }
  const url = new URL(request.url!, 'http://127.0.0.1:3001')
  if (url.pathname.startsWith('/__test/')) {
    if (url.pathname === '/__test/reset') reset()
    if (url.pathname === '/__test/seed') {
      const chunks = []; for await (const chunk of request) chunks.push(chunk)
      const value = JSON.parse(Buffer.concat(chunks).toString())
      repository.state.students = value.students; repository.state.assignments = value.assignments
      if (value.teacher?.speechSettings) repository.state.settings.speechSettings = value.teacher.speechSettings
    }
    response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({ ...repository.state, teacher: { speechSettings: repository.state.settings.speechSettings } })); return
  }
  if (url.pathname.startsWith('/__files/')) {
    const path = url.pathname.slice('/__files/'.length)
    if (request.method === 'PUT') {
      const chunks = []; for await (const chunk of request) chunks.push(chunk)
      const bytes = Buffer.concat(chunks)
      files.objects.set(path, { bytes, size: bytes.length, mimeType: String(request.headers['content-type']), hash: createHash('sha256').update(bytes).digest('hex') }); response.end(); return
    }
    const object = files.objects.get(path)
    if (!object) { response.statusCode = 404; response.end(); return }
    response.setHeader('Content-Type',object.mimeType); response.end(object.bytes); return
  }
  await handler(request, response)
}).listen(3001, '127.0.0.1')
