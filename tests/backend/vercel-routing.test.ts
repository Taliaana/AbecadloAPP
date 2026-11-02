import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createServer } from 'node:http'
import { createHandler } from '../../server/http.js'
import { hashPin, signSession } from '../../server/auth.js'

test('one Vercel API entry receives nested domain endpoints through a wildcard rewrite', () => {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'))
  assert.deepEqual(config.rewrites, [{ source: '/api/:path*', destination: '/api' }])
  assert.ok(fs.existsSync('api/index.ts'))
  assert.equal(fs.existsSync('api/[...route].ts'), false)
  assert.match(fs.readFileSync('server/http.ts', 'utf8'), /url\.pathname\.replace/)
})

test('API dispatch keeps nested path, POST body and session with query parameters', async () => {
  process.env.SESSION_SECRET = 'routing-test-secret-longer-than-32-characters'
  process.env.TEACHER_PIN_HASH = hashPin('456789')
  const calls: any[] = []
  const handler = createHandler((async (...args: any[]) => { calls.push(args); return { ok: true } }) as any)
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  const origin = `http://127.0.0.1:${address.port}`
  const cookie = `pinktower_session=${await signSession({ role: 'teacher', tokenId: 'routing-cookie' })}`
  try {
    for (const path of ['health', 'session', 'auth/login', 'teacher/test-data']) {
      const method = path.includes('/') ? 'POST' : 'GET'
      const response = await fetch(`${origin}/api/${path}?check=one%20two&check=three`, {
        method, headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify({ marker: path }) } : {}),
      })
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { ok: true })
      const [receivedMethod, receivedPath, body, session] = calls.at(-1)
      assert.equal(receivedMethod, method)
      assert.equal(receivedPath, path)
      assert.deepEqual(body, method === 'POST' ? { marker: path } : {})
      assert.equal(session.tokenId, 'routing-cookie')
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})
