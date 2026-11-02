import { createHash } from 'node:crypto'
import { z } from 'zod'
import { ApiError, type Files, type Graph } from './model.js'
import { completion, id, json, status } from './validation.js'
import { lessons } from '../src/data/lessons.js'
import { tools } from '../src/data/tools.js'

export function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
  return JSON.stringify(value)
}
const hash = (value: any) => createHash('sha256').update(canonical(value)).digest('hex')
const legacyWork = z.object({ id, title: z.string(), type: z.string().optional(), studentId: id.optional(), status: status.optional(), completionType: completion.optional(), data: json.optional(), createdAt: z.string().optional(), updatedAt: z.string().optional(), lessonId: z.number().nullable().optional(), assignmentId: id.nullable().optional() }).passthrough()
const legacyTools = json.refine(value =>
  (value.unlockedTools === undefined || Array.isArray(value.unlockedTools) && value.unlockedTools.every(item => typeof item === 'string')) &&
  ['typingResults','robot'].every(key => value[key] === undefined || value[key] !== null && typeof value[key] === 'object' && !Array.isArray(value[key])), 'Nieprawidłowy zapis postępu narzędzi.')
const legacyStudent = z.object({ id: id.optional(), profile: z.object({ id: id.optional(), name: z.string().min(1) }).passthrough(), progress: z.record(z.string(), z.enum(['locked','available','in-progress','completed','review'])), toolProgress: legacyTools.optional(), unlockedTools: z.array(z.string()).optional(), typingResults: json.optional(), works: z.array(legacyWork).default([]) }).passthrough()
const legacyAssignment = z.object({ id, title: z.string(), instruction: z.string(), tool: z.string(), studentIds: z.array(id).optional(), wholeClass: z.boolean().optional(), addToCourse: z.boolean().optional(), completionType: completion.optional(), status: z.string() }).passthrough()
const source = z.object({ schemaVersion: z.number().int().min(1).max(3).optional(), version: z.number().int().min(1).max(3).optional(), students: z.record(id, legacyStudent), assignments: z.array(legacyAssignment).optional(), teacher: json.optional() }).passthrough()
const manifest = z.object({ id, studentId: id, workId: id, mimeType: z.enum(['image/png','image/jpeg','image/webp','image/gif']), size: z.number().int().min(1).max(10 * 1024 * 1024), hash: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
const previewInput = z.object({ source: source, assets: z.array(manifest).max(5000) }).strict()
export function inspectLegacy(input: unknown) {
  const validation = previewInput.safeParse(input)
  if (!validation.success) throw new ApiError(422, `Dane lokalne wymagają sprawdzenia: ${validation.error.issues.slice(0, 6).map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
  const parsed = validation.data
  if (JSON.stringify(parsed).length > 3_000_000) throw new ApiError(413, 'Kopia danych jest zbyt duża. Zachowaj backup i skontaktuj się z opiekunem aplikacji.')
  const state = structuredClone(parsed.source)
  const errors: string[] = [], warnings: string[] = []
  function checkDate(value: unknown, label: string) {
    if (value != null && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) errors.push(`Nieprawidłowa data: ${label}.`)
  }
  const assignments = (state.assignments || []).map((assignment: any) => {
    if (!assignment.id || !Array.isArray(assignment.studentIds || [])) errors.push('Zadanie ma nieprawidłowy identyfikator lub odbiorców.')
    const tool = tools.find(item => item.id === assignment.tool)
    return { ...assignment, studentIds: assignment.studentIds || [], completionType: assignment.completionType || tool?.completionType || 'teacher-review', wholeClass: Boolean(assignment.wholeClass), addToCourse: Boolean(assignment.addToCourse) }
  })
  const students: Record<string, any> = {}
  const assetIds = new Set<string>(), workIds = new Set<string>()
  if (new Set(assignments.map(assignment => assignment.id)).size !== assignments.length) errors.push('Powtórzone ID zadania w lokalnej kopii.')
  for (const [studentId, student] of Object.entries(state.students)) {
    checkDate(student.createdAt, `${studentId}/createdAt`)
    checkDate(student.archivedAt, `${studentId}/archivedAt`)
    if (Object.keys(student.progress).some(key => !lessons.some(lesson => lesson.id === Number(key)))) errors.push(`Profil ${studentId} zawiera postęp nieznanej lekcji.`)
    if ((student.id && student.id !== studentId) || (student.profile.id && student.profile.id !== studentId)) errors.push(`Niezgodne ID profilu: ${studentId}.`)
    const className = String(student.className || student.profile.className || '')
    if (!student.createdAt) warnings.push(`Profil ${student.profile.name}: brak daty utworzenia w starej wersji.`)
    const works = student.works.map((work: any) => {
      checkDate(work.createdAt, `${work.id}/createdAt`)
      checkDate(work.updatedAt, `${work.id}/updatedAt`)
      if (workIds.has(work.id)) errors.push(`Powtórzone ID pracy: ${work.id}.`)
      workIds.add(work.id)
      if (work.studentId && work.studentId !== studentId) errors.push(`Niezgodny właściciel pracy ${work.id}.`)
      if (work.assignmentId && !assignments.some(item => item.id === work.assignmentId)) errors.push(`Praca ${work.title} odnosi się do brakującego zadania.`)
      for (const entry of Object.values(work.data?.entries || {}) as any[]) if (entry.imageId) {
        const file = parsed.assets.find(asset => asset.id === entry.imageId && asset.studentId === studentId && asset.workId === work.id)
        if (!file) errors.push(`Brak lokalnego zdjęcia ${entry.imageId} w pracy ${work.title}.`)
      }
      return { ...work, schemaVersion: 2, studentId, type: work.type || 'Praca', lessonId: work.lessonId ?? null, assignmentId: work.assignmentId ?? null,
        completionType: work.completionType || (work.lessonId ? lessons.find(item => item.id === work.lessonId)?.completionType : 'teacher-review') || 'teacher-review', status: work.status || 'completed', data: { ...work.data, thumbnail: work.data?.thumbnail || work.thumbnail || 'shapes' }, createdAt: work.createdAt || '1970-01-01T00:00:00.000Z', updatedAt: work.updatedAt || work.createdAt || '1970-01-01T00:00:00.000Z' }
    })
    students[studentId] = { ...student, id: studentId, className, archivedAt: student.archivedAt || null, createdAt: student.createdAt || '1970-01-01T00:00:00.000Z', profile: { ...student.profile, id: studentId, className },
      toolProgress: { ...student.toolProgress, unlockedTools: student.toolProgress?.unlockedTools || student.unlockedTools || [], typingResults: student.toolProgress?.typingResults || student.typingResults || {} }, works }
  }
  for (const asset of parsed.assets) {
    if (assetIds.has(asset.id)) errors.push(`Powtórzone ID zdjęcia ${asset.id}.`)
    assetIds.add(asset.id)
    if (!students[asset.studentId]?.works.some((work: any) => work.id === asset.workId)) errors.push(`Zdjęcie ${asset.id} nie ma przypisanej pracy.`)
  }
  for (const assignment of assignments) for (const studentId of assignment.studentIds) if (!students[studentId]) errors.push(`Zadanie ${assignment.title} odnosi się do brakującego ucznia ${studentId}.`)
  return { id: hash(parsed), students, assignments, assets: parsed.assets, speechSettings: state.teacher?.speechSettings, errors, warnings,
    summary: { students: Object.keys(students).length, lessons: Object.values(students).reduce((sum, student) => sum + Object.values(student.progress).filter(value => value !== 'locked').length, 0), works: workIds.size, assignments: assignments.length, assets: parsed.assets.length } }
}

const rank: Record<string, number> = { locked: 0, available: 1, 'in-progress': 2, review: 2, completed: 3 }
function mergeStudent(current: any, incoming: any, conflicts: string[]) {
  if (!current) return structuredClone(incoming)
  const merged = structuredClone(current)
  if (canonical(current.profile) !== canonical(incoming.profile) || current.className !== incoming.className || current.archivedAt !== incoming.archivedAt) conflicts.push(`Profil ${incoming.profile.name} (${incoming.id}) różni się od zapisu centralnego.`)
  for (const [lessonId, value] of Object.entries(incoming.progress)) if ((rank[String(value)] || 0) > (rank[merged.progress[lessonId]] || 0)) merged.progress[lessonId] = value
  merged.toolProgress.unlockedTools = [...new Set([...merged.toolProgress.unlockedTools, ...incoming.toolProgress.unlockedTools])]
  for (const [key, data] of Object.entries(incoming.toolProgress)) {
    if (key === 'unlockedTools') continue
    if (!merged.toolProgress[key]) { merged.toolProgress[key] = structuredClone(data); continue }
    for (const [entryId, value] of Object.entries(data as object)) {
      const old = merged.toolProgress[key][entryId]
      if (old !== undefined && canonical(old) !== canonical(value)) conflicts.push(`Postęp narzędzia ${key}: ${incoming.id}/${entryId}.`)
      else merged.toolProgress[key][entryId] = value
    }
  }
  for (const work of incoming.works) {
    const old = merged.works.find((item: any) => item.id === work.id)
    if (old && canonical(old) !== canonical(work)) conflicts.push(`Praca „${work.title}” (${work.id}) ma dwie różne wersje.`)
    else if (!old) merged.works.push(work)
  }
  return merged
}
export async function migration(state: Graph, path: string, input: unknown, files: Files) {
  if (!['migration/preview','migration/import','migration/finalize'].includes(path)) throw new ApiError(404, 'Nie znaleziono operacji.')
  if (path === 'migration/preview' || path === 'migration/import') {
    const inspected = inspectLegacy(input)
    const conflicts: string[] = []
    if (inspected.speechSettings && state.settings.speechSettings && canonical(inspected.speechSettings) !== canonical(state.settings.speechSettings)) conflicts.push('Ustawienia głosu różnią się od zapisu centralnego.')
    const students = Object.fromEntries(Object.entries(inspected.students).map(([studentId, student]) => [studentId, mergeStudent(state.students[studentId], student, conflicts)]))
    for (const assignment of inspected.assignments) {
      const old = state.assignments.find(item => item.id === assignment.id)
      if (old && canonical(old) !== canonical(assignment)) conflicts.push(`Zadanie „${assignment.title}” ma dwie różne wersje.`)
    }
    for (const asset of inspected.assets) {
      const old = state.assets.find(item => item.id === asset.id)
      if (old && (old.hash !== asset.hash || old.workId !== asset.workId || old.studentId !== asset.studentId)) conflicts.push(`Zdjęcie ${asset.id} ma dwie różne wersje.`)
    }
    const previous = state.imports.find(item => item.id === inspected.id)
    // An already committed import is resumed, never reapplied over later edits.
    if (previous?.committed) return { ...previous, alreadyImported: true }
    const report = { id: inspected.id, summary: inspected.summary, errors: inspected.errors, warnings: inspected.warnings, conflicts, assets: inspected.assets, committed: false, completed: false }
    if (path === 'migration/preview' || report.errors.length || conflicts.length) return report
    Object.assign(state.students, students)
    for (const assignment of inspected.assignments) if (!state.assignments.some(item => item.id === assignment.id)) state.assignments.push(assignment)
    if (inspected.speechSettings && !state.settings.speechSettings) state.settings.speechSettings = inspected.speechSettings
    const job = { ...report, committed: true, createdAt: new Date().toISOString() }
    state.imports.push(job)
    return job
  }
  const parsed = z.object({ importId: id }).strict().parse(input)
  const job = state.imports.find(item => item.id === parsed.importId)
  if (!job) throw new ApiError(404, 'Nie znaleziono importu.')
  const missing = job.assets.filter((manifest: any) => !state.assets.some(asset => asset.id === manifest.id && asset.status === 'ready' && asset.hash === manifest.hash))
  if (missing.length) return { ...job, missing: missing.map((asset: any) => asset.id), completed: false }
  job.completed = true; job.completedAt ||= new Date().toISOString()
  return job
}
