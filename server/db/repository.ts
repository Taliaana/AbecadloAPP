import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { sql, eq } from 'drizzle-orm'
import * as schema from './schema.js'
import { emptyGraph, type Graph, type Repository } from '../model.js'
import { canonical } from '../migration.js'

export function postgresRepository(url: string): Repository {
  const client = postgres(url, { prepare: false, max: 1, connect_timeout: 10, idle_timeout: 20 })
  const db = drizzle(client)
  return {
    async close() { await client.end({ timeout: 5 }) },
    async health() { await db.execute(sql`select 1`) },
    async transaction(action) {
      return db.transaction(async tx => {
        // One pilot installation. Serialize writes/refetches across serverless instances.
        await tx.execute(sql`select pg_advisory_xact_lock(742019)`)
        const state = emptyGraph()
        for (const row of await tx.select().from(schema.students)) state.students[row.id] = { ...(row.payload as object), id: row.id, progress: {}, toolProgress: {}, works: [] }
        const lessonRows = await tx.select().from(schema.lessonProgress)
        for (const row of lessonRows) state.students[row.studentId].progress[row.lessonId] = row.status
        for (const row of await tx.select().from(schema.toolProgress)) state.students[row.studentId].toolProgress = row.data
        for (const row of await tx.select().from(schema.works)) state.students[row.studentId].works.push(row.payload)
        const targets = await tx.select().from(schema.assignmentTargets)
        state.assignments = (await tx.select().from(schema.assignments)).map(row => ({ ...(row.payload as object), studentIds: targets.filter(item => item.assignmentId === row.id).map(item => item.studentId) }))
        state.assets = (await tx.select().from(schema.workAssets)).map(row => row.payload)
        state.attempts = (await tx.select().from(schema.lessonAttempts)).map(row => row.payload)
        state.imports = (await tx.select().from(schema.migrationImports)).map(row => row.payload)
        for (const row of await tx.select().from(schema.settings)) state.settings[row.id] = row.data
        for (const row of await tx.select().from(schema.loginAttempts)) state.loginAttempts[row.id] = row.data as Graph['loginAttempts'][string]
        const before = structuredClone(state)
        const result = await action(state)
        if (canonical(before) === canonical(state)) return result
        // No wholesale delete/reinsert: preserve timestamps and FK relationships.
        for (const studentId of Object.keys(before.students)) if (!state.students[studentId]) await tx.delete(schema.students).where(eq(schema.students.id, studentId))
        for (const assignment of before.assignments) if (!state.assignments.some(item => item.id === assignment.id)) await tx.delete(schema.assignments).where(eq(schema.assignments.id, assignment.id))
        for (const assignment of state.assignments) {
          if (canonical(before.assignments.find(item => item.id === assignment.id)) === canonical(assignment)) continue
          const { studentIds, ...payload } = assignment
          await tx.insert(schema.assignments).values({ id: assignment.id, payload }).onConflictDoUpdate({ target: schema.assignments.id, set: { payload } })
        }
        for (const student of Object.values(state.students)) {
          if (canonical(before.students[student.id]) === canonical(student)) continue
          const { progress, toolProgress, works, ...payload } = student
          const { progress: oldProgress, toolProgress: oldTools, works: oldWorks, ...oldPayload } = before.students[student.id] || {}
          const values = { id: student.id, firstName: student.profile.name, className: student.className, avatar: student.profile.avatarConfig || {}, createdAt: new Date(student.createdAt).toISOString(), updatedAt: new Date().toISOString(), archivedAt: student.archivedAt, payload }
          if (canonical(oldPayload) !== canonical(payload)) await tx.insert(schema.students).values(values).onConflictDoUpdate({ target: schema.students.id, set: values })
          const progressChanges: (typeof schema.lessonProgress.$inferInsert)[] = []
          for (const [lessonId, status] of Object.entries(progress)) {
            const old = lessonRows.find(row => row.studentId === student.id && row.lessonId === Number(lessonId))
            if (old?.status === status) continue
            const values = { studentId: student.id, lessonId: Number(lessonId), status: String(status), startedAt: old?.startedAt || (['in-progress','completed'].includes(String(status)) ? new Date().toISOString() : null), completedAt: old?.completedAt || (status === 'completed' ? new Date().toISOString() : null) }
            progressChanges.push(values)
          }
          if (progressChanges.length) await tx.insert(schema.lessonProgress).values(progressChanges).onConflictDoUpdate({ target: [schema.lessonProgress.studentId, schema.lessonProgress.lessonId], set: { status: sql`excluded.status`, startedAt: sql`excluded.started_at`, completedAt: sql`excluded.completed_at` } })
          if (canonical(oldTools) !== canonical(toolProgress)) await tx.insert(schema.toolProgress).values({ studentId: student.id, data: toolProgress }).onConflictDoUpdate({ target: schema.toolProgress.studentId, set: { data: toolProgress } })
          const changedWorks = works.filter((work: any) => canonical(oldWorks?.find((item: any) => item.id === work.id)) !== canonical(work))
          for (let offset = 0; offset < changedWorks.length; offset += 100) await tx.insert(schema.works).values(changedWorks.slice(offset, offset + 100).map((work: any) => ({ id: work.id, studentId: student.id, assignmentId: work.assignmentId, status: work.status, payload: work }))).onConflictDoUpdate({ target: schema.works.id, set: { status: sql`excluded.status`, payload: sql`excluded.payload` } })
        }
        for (const assignment of state.assignments) {
          if (canonical(before.assignments.find(item => item.id === assignment.id)?.studentIds) === canonical(assignment.studentIds)) continue
          await tx.delete(schema.assignmentTargets).where(eq(schema.assignmentTargets.assignmentId, assignment.id))
          if (assignment.studentIds.length) await tx.insert(schema.assignmentTargets).values(assignment.studentIds.map((studentId: string) => ({ assignmentId: assignment.id, studentId })))
        }
        for (const asset of before.assets) if (!state.assets.some(item => item.id === asset.id) && state.students[asset.studentId]) await tx.delete(schema.workAssets).where(eq(schema.workAssets.id, asset.id))
        for (const asset of state.assets) { if (canonical(before.assets.find(item => item.id === asset.id)) === canonical(asset)) continue; await tx.insert(schema.workAssets).values({ id: asset.id, studentId: asset.studentId, workId: asset.workId, storagePath: asset.storagePath, mimeType: asset.mimeType, size: asset.size, sourceUrl: asset.sourceUrl || null, createdAt: asset.createdAt, payload: asset }).onConflictDoUpdate({ target: schema.workAssets.id, set: { payload: asset, sourceUrl: asset.sourceUrl || null } }) }
        for (const attempt of state.attempts) { if (canonical(before.attempts.find(item => item.id === attempt.id)) === canonical(attempt)) continue; await tx.insert(schema.lessonAttempts).values({ id: attempt.id, studentId: attempt.studentId, lessonId: attempt.lessonId, payload: attempt }).onConflictDoUpdate({ target: schema.lessonAttempts.id, set: { payload: attempt } }) }
        for (const job of state.imports) { if (canonical(before.imports.find(item => item.id === job.id)) === canonical(job)) continue; await tx.insert(schema.migrationImports).values({ id: job.id, payload: job }).onConflictDoUpdate({ target: schema.migrationImports.id, set: { payload: job } }) }
        for (const [key, data] of Object.entries(state.settings)) { if (canonical(before.settings[key]) === canonical(data)) continue; await tx.insert(schema.settings).values({ id: key, data }).onConflictDoUpdate({ target: schema.settings.id, set: { data } }) }
        for (const key of Object.keys(before.loginAttempts)) if (!state.loginAttempts[key]) await tx.delete(schema.loginAttempts).where(eq(schema.loginAttempts.id, key))
        for (const [key, data] of Object.entries(state.loginAttempts)) await tx.insert(schema.loginAttempts).values({ id: key, data }).onConflictDoUpdate({ target: schema.loginAttempts.id, set: { data } })
        return result
      })
    },
  }
}
