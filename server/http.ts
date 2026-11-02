import { ZodError } from 'zod'
import { timingSafeEqual } from 'node:crypto'
import { ApiError } from './model.js'
import { readSession, sessionCookie, signSession } from './auth.js'
import { createService } from './services.js'
export function createHandler(service: ReturnType<typeof createService>) {
  return async (request: any, response: any) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    try {
      const url = new URL(request.url, `https://${request.headers.host}`)
      if (!['GET','POST','PUT','PATCH','DELETE'].includes(request.method)) throw new ApiError(405, 'Niedostępna metoda.')
      if (request.method !== 'GET') {
        const origin = request.headers.origin
        const expected = process.env.APP_ORIGIN || `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${request.headers.host}`
        if (origin !== expected || request.headers['sec-fetch-site'] === 'cross-site') throw new ApiError(403, 'Otwórz PinkTower w tej samej karcie.')
        if (!String(request.headers['content-type']).startsWith('application/json')) throw new ApiError(415, 'Wymagane dane JSON.')
      }
      let body = request.body
      if (!body && request.method !== 'GET') {
        let bytes = 0, chunks = []
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 3_000_000) throw new ApiError(413, 'Dane są zbyt duże.'); chunks.push(chunk) }
        body = Buffer.concat(chunks).toString('utf8')
      }
      if (typeof body === 'string') body = body ? JSON.parse(body) : {}
      let session = await readSession(request.headers.cookie)
      if (url.pathname === '/api/maintenance') {
        const supplied = Buffer.from(String(request.headers.authorization || ''))
        const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`)
        if (!process.env.CRON_SECRET || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new ApiError(401, 'Brak uprawnień.')
        session = { role: 'teacher', tokenId: 'maintenance' }
      }
      const result: any = await service(request.method, url.pathname.replace(/^\/api\/?/, ''), body || {}, session, request.headers['x-real-ip'] || request.socket?.remoteAddress || 'unknown')
      if (result.error) { response.statusCode = result.error.status; response.end(JSON.stringify({ error: result.error.message })); return }
      if ('session' in result) response.setHeader('Set-Cookie', sessionCookie(result.session ? await signSession(result.session) : '', !result.session))
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.statusCode = 200; response.end(JSON.stringify(result))
    } catch (error) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.statusCode = error instanceof ApiError ? error.status : error instanceof ZodError || error instanceof SyntaxError ? 400 : 503
      response.end(JSON.stringify({ error: error instanceof ApiError ? error.message : error instanceof ZodError ? 'Sprawdź wpisane dane.' : 'Nie udało się połączyć. Spróbuj ponownie.', ...(error instanceof ApiError && error.details ? { details: error.details } : {}) }))
    }
  }
}
