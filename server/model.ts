export type Role = { role: 'teacher' | 'student'; studentId?: string; tokenId: string }
export type Graph = { students: Record<string, any>; assignments: any[]; assets: any[]; attempts: any[]; imports: any[]; settings: Record<string, any>; loginAttempts: Record<string, { count: number; until: number }> }
export const emptyGraph = (): Graph => ({ students: {}, assignments: [], assets: [], attempts: [], imports: [], settings: {}, loginAttempts: {} })
export interface Repository {
  transaction<T>(action: (state: Graph) => T | Promise<T>): Promise<T>
  health(): Promise<void>
  close?(): Promise<void>
}
export interface Files {
  upload(path: string): Promise<{ signedUrl: string }>
  read(path: string): Promise<string>
  inspect(path: string): Promise<{ size: number; mimeType: string; hash: string }>
  remove(paths: string[]): Promise<void>
}
export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message) }
}
export function requireTeacher(session: Role | null): asserts session is Role {
  if (!session) throw new ApiError(401, 'Zaloguj się ponownie.')
  if (session.role !== 'teacher') throw new ApiError(403, 'Ta czynność wymaga nauczyciela.')
}
export function ownedStudent(state: Graph, session: Role | null, id?: string) {
  if (!session) throw new ApiError(401, 'Zaloguj się ponownie.')
  const studentId = id || session.studentId
  if (session.role !== 'teacher' && studentId !== session.studentId) throw new ApiError(403, 'Ta praca należy do innego ucznia.')
  const student = state.students[studentId || '']
  if (!student || (student.archivedAt && session.role !== 'teacher') || student.deletingAt) throw new ApiError(404, 'Nie znaleziono profilu.')
  return student
}
