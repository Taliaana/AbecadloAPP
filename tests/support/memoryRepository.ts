import { emptyGraph, type Graph, type Repository, type Files } from '../../server/model.js'
export class MemoryRepository implements Repository {
  state: Graph = emptyGraph()
  private pending = Promise.resolve()
  async health() {}
  async transaction<T>(action: (state: Graph) => T | Promise<T>): Promise<T> {
    const operation = this.pending.then(async () => { const next = structuredClone(this.state); const result = await action(next); this.state = next; return result })
    this.pending = operation.then(() => {}, () => {})
    return operation
  }
}
export class MemoryFiles implements Files {
  objects = new Map<string, { size: number; mimeType: string; hash: string; bytes?: Uint8Array }>()
  deleted: string[] = []
  async upload(path: string) { return { signedUrl: `http://127.0.0.1:3001/__files/${path}` } }
  async read(path: string) { if (!this.objects.has(path)) throw new Error('missing'); return `http://127.0.0.1:3001/__files/${path}` }
  async inspect(path: string) { const object = this.objects.get(path); if (!object) throw new Error('missing'); return object }
  async remove(paths: string[]) { paths.forEach(path => { this.deleted.push(path); this.objects.delete(path) }) }
}
