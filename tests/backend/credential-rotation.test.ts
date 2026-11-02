import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SignJWT } from 'jose'
import { hashPin, readSession, signSession } from '../../server/auth.js'

test('PIN rotation invalidates teachers, including legacy cookies, without invalidating students', async () => {
  process.env.SESSION_SECRET = 'isolated-rotation-test-secret-over-32-characters'
  process.env.TEACHER_PIN_HASH = hashPin('456789')
  const teacher = await signSession({ role: 'teacher', tokenId: 'teacher-before' })
  const student = await signSession({ role: 'student', studentId: 'fixture', tokenId: 'student-before' })
  const legacy = await new SignJWT({ role: 'teacher', tokenId: 'legacy' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer('pinktower').setAudience('pinktower-web')
    .setIssuedAt().setExpirationTime('2h').sign(new TextEncoder().encode(process.env.SESSION_SECRET))
  const read = (token: string) => readSession(`pinktower_session=${token}`)
  assert.equal((await read(teacher))?.role, 'teacher')
  assert.equal(await read(legacy), null)
  process.env.TEACHER_PIN_HASH = hashPin('987654')
  assert.equal(await read(teacher), null)
  assert.equal((await read(student))?.studentId, 'fixture')
  const replacement = await signSession({ role: 'teacher', tokenId: 'teacher-after' })
  assert.equal((await read(replacement))?.role, 'teacher')
})
