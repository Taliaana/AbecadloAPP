import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { Role } from './model.js'
export function hashPin(pin: string) { const salt = randomBytes(16).toString('hex'); return `scrypt:${salt}:${scryptSync(pin, salt, 64).toString('hex')}` }
export function verifyPin(pin: string, hash: string) {
  const [kind, salt, encoded] = hash.split(':')
  if (kind !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/.test(encoded || '')) return false
  return timingSafeEqual(scryptSync(pin, salt, 64), Buffer.from(encoded, 'hex'))
}
function secret() { const value = process.env.SESSION_SECRET; if (!value || value.length < 32) throw new Error('SESSION_SECRET is missing'); return new TextEncoder().encode(value) }
// Credential rotation invalidates teacher cookies only; student sessions stay valid.
function teacherCredentialVersion() {
  const hash = process.env.TEACHER_PIN_HASH
  if (!hash) throw new Error('TEACHER_PIN_HASH is missing')
  return createHash('sha256').update(hash).digest('hex')
}
export async function signSession(session: Role) {
  const claims = session.role === 'teacher' ? { ...session, credentialVersion: teacherCredentialVersion() } : session
  return new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuer('pinktower').setAudience('pinktower-web').setIssuedAt().setExpirationTime(session.role === 'teacher' ? '2h' : '12h').sign(secret())
}
export async function readSession(cookie = ''): Promise<Role | null> {
  const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('pinktower_session='))?.slice(18)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'], issuer: 'pinktower', audience: 'pinktower-web' })
    if (!['teacher','student'].includes(String(payload.role)) || typeof payload.tokenId !== 'string' || (payload.role === 'student' && typeof payload.studentId !== 'string')) return null
    if (payload.role === 'teacher' && payload.credentialVersion !== teacherCredentialVersion()) return null
    return payload as unknown as Role
  } catch { return null }
}
export function sessionCookie(token: string, clear = false) { return `pinktower_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 43200}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}` }
