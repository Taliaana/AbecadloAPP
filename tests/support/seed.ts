// Previous production model retained only as a fixture generator, never shipped.
import { profiles, sampleWorks } from '../../src/data/profiles.js'
import { initialAssignments } from '../../src/data/assignments.js'
import { newProgress } from '../../server/services.js'
export function storeTestFixture() {
  const students = Object.fromEntries(profiles.map((profile, index) => [profile.id, {
    id: profile.id, className: profile.className, createdAt: '2026-10-10T10:30:00.000Z', archivedAt: null, profile: structuredClone(profile), progress: newProgress(), toolProgress: { unlockedTools: [], typingResults: {} },
    works: [...sampleWorks.map(work => ({ schemaVersion: 2, ...work, id: `${profile.id}-${work.id}`, studentId: profile.id, status: 'completed', completionType: 'teacher-review', lessonId: null, assignmentId: null, data: { thumbnail: work.thumbnail } })), { schemaVersion: 2, id: `${profile.id}-butterfly-draft`, studentId: profile.id, title: 'Cykl życia motyla', type: 'Szkic pomysłu', assignmentId: 'assignment-butterfly', lessonId: null, completionType: 'teacher-review', status: ['draft','waiting-review','returned'][index], createdAt: '2026-10-10T10:30:00.000Z', updatedAt: '2026-10-10T10:30:00.000Z', data: { thumbnail: 'assignment', note: '', selectedStages: [] } }],
  }]))
  return { schemaVersion: 3, version: 3, students, assignments: initialAssignments.map(item => ({ ...item, completionType: 'teacher-review' })) }
}
