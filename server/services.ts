import { createHash, randomUUID } from 'node:crypto'
import { ApiError, ownedStudent, requireTeacher, type Files, type Graph, type Repository, type Role } from './model.js'
import { inputs, id } from './validation.js'
import { verifyPin } from './auth.js'
import { lessons } from '../src/data/lessons.js'
import { tools } from '../src/data/tools.js'
import { getRobotChallenge } from '../src/data/robotChallenges.js'
import { simulateRobot, routeSignature, validateBoard } from '../src/modules/robot/engine.js'
import { getResearchBoard, isResearchComplete } from '../src/data/researchBoards.js'
import { migration, canonical } from './migration.js'
import { createTestData, deleteTestData, testDataSummary } from './testData.js'

const now = () => new Date().toISOString()
const fail = (message: string, status = 400): never => { throw new ApiError(status, message) }
export const newProgress = () => Object.fromEntries(lessons.map(lesson => [lesson.id, lesson.id === 1 ? 'available' : 'locked']))
export function assignmentFor(state: Graph, student: any, assignment: any) { return assignment.status === 'active' && (assignment.wholeClass ? !assignment.className || assignment.className === student.className : assignment.studentIds.includes(student.id)) }
function workFor(state: Graph, session: Role | null, workId: string) {
  const work = Object.values(state.students).flatMap((student: any) => student.works).find((work: any) => work.id === workId)
  if (!work) fail('Nie znaleziono pracy.', 404)
  ownedStudent(state, session, work.studentId)
  return work
}
function lessonFor(student: any, lessonId: number) {
  const lesson = lessons.find(item => item.id === lessonId && item.implemented)
  if (!lesson || !student.progress[lessonId] || student.progress[lessonId] === 'locked') fail('Ta lekcja nie jest jeszcze dostępna.', 409)
  return lesson
}
export function complete(student: any, lessonId: number) {
  lessonFor(student, lessonId)
  student.progress[lessonId] = 'completed'
  const next = lessons.find(item => item.id === lessonId + 1 && item.implemented)
  if (next && student.progress[next.id] === 'locked') student.progress[next.id] = 'available'
  const tool = lessonId === 2 ? 'mouse-practice' : lessonId === 3 ? 'typewriting' : null
  if (tool && !student.toolProgress.unlockedTools.includes(tool)) student.toolProgress.unlockedTools.push(tool)
}
function revoke(state: Graph, session: Role) {
  state.settings.revoked ||= {}
  state.settings.revoked[session.tokenId] = Date.now() + 13 * 3600_000
}
export function visibleSnapshot(state: Graph, session: Role | null) {
  const students = session?.role === 'teacher' ? state.students : session ? { [session.studentId!]: ownedStudent(state, session) } : {}
  const assignments = session?.role === 'teacher' ? state.assignments : session ? state.assignments.filter(item => assignmentFor(state, ownedStudent(state, session), item)) : []
  return { schemaVersion: 3, version: 3, currentRole: session?.role || null, currentStudentId: session?.studentId || null,
    revision: Number(state.settings.revision || 0), teacher: { id: 'teacher', name: 'Nauczyciel', speechSettings: state.settings.speechSettings }, students, assignments }
}

export function createService(repository: Repository, files: Files) {
  return async function execute(method: string, path: string, body: unknown, session: Role | null, clientIp = 'unknown'): Promise<{ value?: any; snapshot?: ReturnType<typeof visibleSnapshot>; session?: Role | null; error?: { status: number; message: string } }> {
    if (path === 'health' && method === 'GET') { await repository.health(); return { value: { ok: true } } }
    return repository.transaction(async state => {
      if (session && state.settings.revoked?.[session.tokenId] > Date.now() && !['auth/login','auth/logout'].includes(path)) throw new ApiError(401, 'Zaloguj się ponownie.')
      let nextSession = session
      let sessionChanged = false
      const [resource, rawId, action] = path.split('/')
      const recordId = rawId ? id.parse(rawId) : ''
      let result: any = true
      if ((path === 'auth/logout' || path.endsWith('/archive') || path.endsWith('/finalize') && resource === 'assets') && method === 'POST') {
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) fail('Ta operacja nie przyjmuje dodatkowych danych.')
      }
      if (path === 'maintenance' && method === 'GET') {
        requireTeacher(session)
        const pending = state.settings.assetCleanup || []
        for (const job of pending) await files.remove(job.paths)
        state.settings.assetCleanup = pending.filter((job: any) => job.until > Date.now())
        for (const [key, until] of Object.entries(state.settings.revoked || {})) if (Number(until) < Date.now()) delete state.settings.revoked[key]
        for (const [key, attempt] of Object.entries(state.loginAttempts)) if (attempt.until < Date.now()) delete state.loginAttempts[key]
        return { value: { ok: true } }
      } else if (path === 'teacher/test-data') {
        requireTeacher(session)
        if (method === 'GET') result = testDataSummary(state)
        else if (method === 'POST') result = createTestData(state, body, newProgress())
        else if (method === 'DELETE') result = await deleteTestData(state, body, files)
        else fail('Nie znaleziono operacji.', 404)
      } else if (path === 'auth/login' && method === 'POST') {
        const input = inputs.login.parse(body)
        const key = createHash('sha256').update(clientIp).digest('hex')
        const attempt = state.loginAttempts[key]
        if (attempt?.until > Date.now() && attempt.count >= 8) return { error: { status: 429, message: 'Poczekaj chwilę przed kolejną próbą.' } }
        if (!verifyPin(input.pin, process.env.TEACHER_PIN_HASH || '')) {
          state.loginAttempts[key] = { count: attempt?.until > Date.now() ? attempt.count + 1 : 1, until: Date.now() + 15 * 60_000 }
          return { error: { status: 401, message: 'Sprawdź PIN i spróbuj ponownie.' } }
        }
        delete state.loginAttempts[key]
        if (session) revoke(state, session)
        nextSession = { role: 'teacher', tokenId: randomUUID() }; sessionChanged = true
      } else if (path === 'auth/logout' && method === 'POST') {
        if (session) revoke(state, session)
        nextSession = null; sessionChanged = true
      } else if (path === 'session/student' && method === 'POST') {
        requireTeacher(session)
        const input = inputs.select.parse(body); ownedStudent(state, session, input.studentId)
        if (state.students[input.studentId].archivedAt) fail('Profil jest w archiwum.', 409)
        revoke(state, session)
        nextSession = { role: 'student', studentId: input.studentId, tokenId: randomUUID() }; sessionChanged = true
      } else if (path === 'session' && method === 'GET') {
        if (session?.role === 'student') ownedStudent(state, session)
      } else if (path.startsWith('migration/') && method === 'POST') {
        requireTeacher(session)
        result = await migration(state, path, body, files)
      } else if (resource === 'students' && method === 'GET') {
        if (recordId) result = ownedStudent(state, session, recordId)
        else { requireTeacher(session); result = Object.values(state.students) }
      } else if (resource === 'students') {
        requireTeacher(session)
        if (method === 'POST' && !recordId) {
          const input = inputs.student.parse(body); const studentId = randomUUID()
          result = { id: studentId, className: input.className, createdAt: now(), archivedAt: null,
            profile: { id: studentId, name: input.name, greetingName: input.name, className: input.className, avatar: 'leaf', color: 'green', avatarConfig: { face: 'round', hair: 'short', hairColor: 'brown', shirtColor: 'green', backgroundColor: 'mint' } }, progress: newProgress(), toolProgress: { unlockedTools: [], typingResults: {} }, works: [] }
          const existing = input.operationId && Object.values(state.students).find(item => item.creationId === input.operationId)
          if (existing) result = existing
          else { result.creationId = input.operationId || null; state.students[studentId] = result }
        } else {
          const student = state.students[recordId] || fail('Nie znaleziono profilu.', 404)
          if (method === 'PATCH') { const input = inputs.student.parse(body); student.className = input.className; Object.assign(student.profile, input, { greetingName: input.name }); result = student }
          else if (method === 'POST' && action === 'archive') { student.archivedAt = now() }
          else if (method === 'POST' && action === 'unlock') {
            const { lessonId } = inputs.unlock.parse(body)
            if (!lessons.some(item => item.id === lessonId && item.implemented)) fail('Lekcja jest niedostępna.')
            if (student.progress[lessonId] === 'locked') student.progress[lessonId] = 'available'
          } else if (method === 'DELETE') {
            inputs.delete.parse(body)
            // The repository marks deletion before remote I/O; failure leaves records for retry.
            await files.remove(state.assets.filter(asset => asset.studentId === recordId).map(asset => asset.storagePath))
            state.settings.assetCleanup ||= []
            state.settings.assetCleanup.push({ paths: state.assets.filter(asset => asset.studentId === recordId).map(asset => asset.storagePath), until: Date.now() + 3 * 3600_000 })
            delete state.students[recordId]
            state.assets = state.assets.filter(asset => asset.studentId !== recordId)
            state.attempts = state.attempts.filter(attempt => attempt.studentId !== recordId)
            state.assignments.forEach(item => { item.studentIds = item.studentIds.filter((target: string) => target !== recordId) })
            // Imports store hashes/manifests, not a second copy of pupils' work.
            state.imports.forEach(item => { item.assets = (item.assets || []).filter((asset: any) => asset.studentId !== recordId) })
          } else fail('Nie znaleziono operacji.', 404)
        }
      } else if (path === 'avatar' && method === 'PUT') {
        const student = ownedStudent(state, session)
        student.profile.avatarConfig = inputs.avatar.parse(body)
      } else if (path === 'progress' && method === 'GET') {
        result = ownedStudent(state, session).progress
      } else if (path === 'progress' && method === 'POST') {
        const student = ownedStudent(state, session)
        const input = inputs.lesson.parse(body); const lesson = lessonFor(student, input.lessonId)
        const repeat = student.progress[input.lessonId] === 'completed'
        if (['start','repeat'].includes(input.action)) {
          if (!repeat && input.action === 'repeat') fail('Najpierw ukończ lekcję.', 409)
          if (!repeat) student.progress[input.lessonId] = 'in-progress'
          const active = state.attempts.find(item => item.studentId === student.id && item.lessonId === input.lessonId && !item.finishedAt && item.tokenId === session!.tokenId)
          result = active || { id: randomUUID(), studentId: student.id, lessonId: input.lessonId, repeat, startedAt: now(), finishedAt: null, tokenId: session!.tokenId }
          if (!active) state.attempts.push(result)
        } else {
          if (lesson.completionType === 'teacher-review') fail('Pokaż pracę nauczycielowi.', 409)
          const attempt = state.attempts.find(item => item.studentId === student.id && item.lessonId === input.lessonId && item.tokenId === session!.tokenId && (!input.attemptId || item.id === input.attemptId) && !item.finishedAt)
          if (!attempt && student.progress[input.lessonId] !== 'completed') fail('Najpierw rozpocznij lekcję.', 409)
          if (attempt) attempt.finishedAt = now()
          complete(student, input.lessonId)
        }
      } else if (path === 'tools' && method === 'GET') {
        result = ownedStudent(state, session).toolProgress
      } else if (path === 'tools' && method === 'POST') {
        const student = ownedStudent(state, session); const input = inputs.tool.parse(body)
        if (input.kind === 'typing') {
          if (!student.toolProgress.unlockedTools.includes('typewriting')) fail('Narzędzie jest jeszcze niedostępne.', 409)
          if (input.result.correct > input.result.attempts) fail('Sprawdź wynik.')
          student.toolProgress.typingResults[input.exerciseId] = { ...input.result, updatedAt: now() }
        } else {
          const assignedWork = input.kind === 'robot-attempt' && input.workId ? workFor(state, session, input.workId) : null
          if (assignedWork && assignedWork.data.kind !== 'robot-assignment') fail('To nie jest zadanie Robota.')
          const challenge = assignedWork?.data.board || getRobotChallenge(input.challengeId) || fail('Nie znaleziono trasy.', 404)
          const simulation = simulateRobot(challenge, input.program)
          if (input.kind === 'robot-attempt' && ['program','board'].includes(simulation.reason)) fail('Sprawdź polecenia.')
          student.toolProgress.robot ||= {}
          const progressId = assignedWork ? `assignment-${assignedWork.id}` : input.challengeId
          const old = student.toolProgress.robot[progressId] || { runs: 0, completed: false, routes: [] }
          result = { ...old, program: input.program, updatedAt: now() }
          if (input.kind === 'robot-attempt') {
            const routes = [...new Set([...old.routes, ...(simulation.success ? [routeSignature(simulation)] : [])])].slice(0, 2)
            Object.assign(result, { runs: old.runs + 1, completed: old.completed || simulation.success, routes, alternative: routes.length > 1, completedAt: old.completedAt || (simulation.success ? now() : null) })
          }
          student.toolProgress.robot[progressId] = result
        }
      } else if (resource === 'works') {
        if (method === 'GET') {
          if (recordId) result = workFor(state, session, recordId)
          else if (session?.role === 'teacher') result = Object.values(state.students).flatMap(student => student.works)
          else result = ownedStudent(state, session).works
        } else if (method === 'POST' && !recordId) {
          const student = ownedStudent(state, session)
          const input = inputs.work.parse(body)
          const assignment = input.assignmentId ? state.assignments.find(item => item.id === input.assignmentId && assignmentFor(state, student, item)) || fail('Nie znaleziono zadania.', 403) : null
          if (input.lessonId) lessonFor(student, input.lessonId)
          const existing = student.works.find((work: any) => assignment ? work.assignmentId === assignment.id : input.operationId && work.operationId === input.operationId)
          const completionType = assignment?.completionType || (input.lessonId ? lessons.find(item => item.id === input.lessonId)!.completionType : 'teacher-review')
          const data = { ...input.data }
          if (assignment?.tool === 'robot') { data.kind = 'robot-assignment'; data.board = assignment.robotTask?.board || getRobotChallenge(assignment.robotTask?.challengeId || 'two-steps'); data.program = (data.board as any)?.initialProgram || [] }
          result = existing || { ...input, data, id: randomUUID(), schemaVersion: 2, studentId: student.id, lessonId: input.lessonId || null, assignmentId: input.assignmentId || null, completionType, status: 'draft', createdAt: now(), updatedAt: now() }
          if (!existing) student.works.push(result)
        } else {
          const work = workFor(state, session, recordId)
          if (method === 'POST' && action === 'review') {
            requireTeacher(session)
            const { decision } = inputs.review.parse(body)
            if (work.completionType !== 'teacher-review' || !['waiting-review',decision].includes(work.status)) fail('Praca nie czeka na obejrzenie.', 409)
            work.status = decision
            if (decision === 'completed' && work.lessonId) complete(state.students[work.studentId], work.lessonId)
          } else if (method === 'PATCH') {
            const input = inputs.save.parse(body)
            if (session?.role !== 'student') fail('Edycja wymaga sesji ucznia.', 403)
            if (['waiting-review','completed'].includes(work.status)) {
              if ((!input.status || input.status === work.status) && (!input.data || Object.entries(input.data).every(([key,value]) => canonical(value) === canonical(work.data[key]))) && (!input.title || input.title === work.title)) return { value: work, snapshot: visibleSnapshot(state, session) }
              fail('Praca jest już przekazana.', 409)
            }
            const data = { ...work.data, ...input.data }
            if (work.data.kind === 'robot-assignment') { data.board = work.data.board; data.kind = work.data.kind }
            for (const entry of Object.values(data.entries || {}) as any[]) { const asset = state.assets.find(item => item.id === entry.imageId && item.workId === work.id); if (asset) asset.sourceUrl = String(entry.source || '').slice(0, 3000) }
            for (const entry of Object.values(data.entries || {}) as any[]) if (entry.imageId && !state.assets.some(asset => asset.id === entry.imageId && asset.workId === work.id && asset.studentId === work.studentId && asset.status === 'ready')) fail('Nie zapisano jeszcze zdjęcia.', 409)
            if (input.status === 'waiting-review') {
              if (work.completionType !== 'teacher-review') fail('To ćwiczenie kończysz samodzielnie.')
              if (data.kind === 'research-board' && !isResearchComplete(getResearchBoard(data.boardId), data.entries)) fail('Uzupełnij zdjęcia i źródła.', 409)
            }
            if (input.status === 'completed') {
              if (work.completionType === 'teacher-review') fail('Pracę kończy nauczyciel.', 403)
              if (data.kind === 'robot-assignment' && !simulateRobot(work.data.board, data.program || []).success) fail('Sprawdź swój program.', 409)
            }
            Object.assign(work, input.title ? { title: input.title } : {}, { data, status: input.status || work.status })
          } else fail('Nie znaleziono operacji.', 404)
          work.updatedAt = now(); result = work
        }
      } else if (resource === 'assignments' && method === 'GET') {
        const available = session?.role === 'teacher' ? state.assignments : state.assignments.filter(item => assignmentFor(state, ownedStudent(state, session), item))
        result = recordId ? available.find(item => item.id === recordId) || fail('Nie znaleziono zadania.', 404) : available
      } else if (path === 'assignments' && method === 'POST') {
        requireTeacher(session); const input = inputs.assignment.parse(body)
        if (input.tool === 'robot' && input.robotTask?.board && !validateBoard(input.robotTask.board)) fail('Sprawdź planszę Robota.')
        if (!input.wholeClass && !input.studentIds.length) fail('Wybierz ucznia.')
        input.studentIds.forEach(studentId => ownedStudent(state, session, studentId))
        const tool = tools.find(item => item.id === input.tool)
        result = { ...input, id: randomUUID(), completionType: tool?.completionType || input.completionType || 'teacher-review', status: 'active', createdAt: now() }
        const existing = input.operationId && state.assignments.find(item => item.operationId === input.operationId)
        if (existing) result = existing
        else state.assignments.push(result)
      } else if (path === 'settings/speech' && method === 'PUT') {
        requireTeacher(session); state.settings.speechSettings = inputs.settings.parse(body); result = state.settings.speechSettings
      } else if (resource === 'assets') {
        if (method === 'POST' && !recordId) {
          const input = inputs.upload.parse(body); const work = workFor(state, session, input.workId)
          if (['waiting-review','completed'].includes(work.status) && !input.importId) fail('Praca jest już przekazana.', 409)
          if (input.importId) {
            requireTeacher(session)
            const job = state.imports.find(item => item.id === input.importId && item.committed)
            const manifest = job?.assets.find((item: any) => item.id === input.legacyImageId && item.workId === work.id && item.hash === input.hash)
            if (!manifest) fail('Nie znaleziono pliku w imporcie.', 409)
          }
          let asset = input.legacyImageId ? state.assets.find(item => item.id === input.legacyImageId) : null
          if (asset && (asset.workId !== work.id || asset.hash !== input.hash)) fail('Konflikt pliku.', 409)
          if (!asset) { const assetId = input.legacyImageId || randomUUID(); const testRun = (state.settings.testDataRuns || []).find((run: any) => !run.deletedAt && run.studentId === work.studentId); asset = { ...input, ...(testRun ? { isTestData: true, testRunId: testRun.id } : {}), id: assetId, studentId: work.studentId, storagePath: `${work.studentId}/${work.id}/${assetId}`, createdAt: now(), status: 'pending' }; state.assets.push(asset) }
          if (asset.status !== 'ready') {
            try { const actual = await files.inspect(asset.storagePath); if (actual.hash === asset.hash && actual.size === asset.size && actual.mimeType === asset.mimeType) asset.status = 'ready' } catch { /* Missing upload: issue a fresh signed grant for retry. */ }
          }
          result = asset.status === 'ready' ? { id: asset.id, ready: true } : { id: asset.id, ...await files.upload(asset.storagePath) }
        } else {
          const asset = state.assets.find(item => item.id === recordId) || fail('Nie znaleziono zdjęcia.', 404)
          const work = workFor(state, session, asset.workId)
          if (method === 'GET') {
            if (asset.status !== 'ready') fail('Zdjęcie nie jest jeszcze zapisane.', 409)
            result = { url: await files.read(asset.storagePath) }
          } else if (method === 'POST' && action === 'finalize') {
            const actual = await files.inspect(asset.storagePath)
            if (actual.size !== asset.size || actual.hash !== asset.hash || actual.mimeType !== asset.mimeType) fail('Plik nie zgadza się z przesyłanym zdjęciem.', 409)
            asset.status = 'ready'; result = { id: asset.id }
          } else if (method === 'DELETE') {
            if (!['draft','returned'].includes(work.status)) fail('Praca jest już przekazana.', 409)
            await files.remove([asset.storagePath]); state.assets = state.assets.filter(item => item.id !== asset.id)
            state.settings.assetCleanup ||= []
            state.settings.assetCleanup.push({ paths: [asset.storagePath], until: Date.now() + 3 * 3600_000 })
            for (const entry of Object.values(work.data.entries || {}) as any[]) if (entry.imageId === asset.id) entry.imageId = null
          } else fail('Nie znaleziono operacji.', 404)
        }
      } else fail('Nie znaleziono operacji.', 404)
      if (method !== 'GET' && path !== 'migration/preview') state.settings.revision = Number(state.settings.revision || 0) + 1
      return { value: result, snapshot: visibleSnapshot(state, nextSession), ...(sessionChanged ? { session: nextSession } : {}) }
    })
  }
}
