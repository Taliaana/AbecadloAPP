import { z } from 'zod'
export const id = z.string().min(1).max(160).regex(/^[\w-]+$/)
const text = (max: number) => z.string().trim().min(1).max(max)
const command = z.enum(['forward','left','right'])
const program = z.array(z.union([command, z.object({type:z.literal('repeat'),times:z.union([z.literal(2),z.literal(3),z.literal(4)]),body:z.array(command).max(12)}).strict()])).max(30)
export const json = z.record(z.string(), z.unknown()).refine(value => JSON.stringify(value).length <= 1_000_000 && !/data:image\/[^;]+;base64,/i.test(JSON.stringify(value)), 'Praca jest zbyt duża lub zawiera osadzony obraz. Zachowaj kopię i przenieś plik osobno.')
export const completion = z.enum(['automatic', 'self-check', 'teacher-review'])
export const status = z.enum(['draft', 'returned', 'waiting-review', 'completed'])
export const inputs = {
  login: z.object({ pin: z.string().regex(/^\d{4,12}$/) }).strict(),
  student: z.object({ name: text(40), className: text(12), operationId: z.uuid().optional() }).strict(),
  select: z.object({ studentId: id }).strict(),
  delete: z.object({ confirmation: z.literal('delete-student') }).strict(),
  avatar: z.object({ face: z.enum(['round','soft','wide']), hair: z.enum(['short','bob','tufts']), hairColor: z.enum(['dark','brown','gold','copper']), shirtColor: z.enum(['green','blue','yellow','coral']), backgroundColor: z.enum(['mint','sky','sand','rose']) }).strict(),
  lesson: z.object({ lessonId: z.number().int().positive(), action: z.enum(['start','complete','repeat','finish-repeat']), attemptId: id.optional() }).strict(),
  unlock: z.object({ lessonId: z.number().int().positive() }).strict(),
  work: z.object({ title: text(160), type: text(80), lessonId: z.number().int().positive().nullable().optional(), assignmentId: id.nullable().optional(), completionType: completion.optional(), data: json.default({}), operationId: z.uuid().optional() }).strict(),
  save: z.object({ title: text(160).optional(), data: json.optional(), status: status.optional() }).strict(),
  review: z.object({ decision: z.enum(['completed','returned']) }).strict(),
  tool: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('typing'), exerciseId: id, result: z.object({ correct: z.number().int().min(0).max(10000), attempts: z.number().int().min(1).max(10000), wpm: z.number().min(0).max(1000).optional() }).strict() }).strict(),
    z.object({ kind: z.literal('robot-program'), challengeId: id, program }).strict(),
    z.object({ kind: z.literal('robot-attempt'), challengeId: id, program, workId: id.optional() }).strict(),
  ]),
  assignment: z.object({ title: text(160), instruction: text(3000), tool: z.enum(['studio','robot','research-board','typewriting','mouse-practice','sequences','search']), completionType: completion.optional(), studentIds: z.array(id).max(500).default([]), wholeClass: z.boolean(), className: z.string().max(12).optional(), addToCourse: z.boolean().default(false), robotTask: json.optional(), operationId: z.uuid().optional() }).strict(),
  upload: z.object({ workId: id, mimeType: z.enum(['image/png','image/jpeg','image/webp','image/gif']), size: z.number().int().min(1).max(10 * 1024 * 1024), hash: z.string().regex(/^[a-f0-9]{64}$/), sourceUrl: z.string().max(3000).optional(), importId: id.optional(), legacyImageId: id.optional() }).strict(),
  settings: z.object({ preset: z.enum(['calm','slower','regular']), voiceURI: z.string().max(500), voiceName: z.string().max(500), voiceLang: z.string().max(40) }).strict(),
}
