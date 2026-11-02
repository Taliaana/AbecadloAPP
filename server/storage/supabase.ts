import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import type { Files } from '../model.js'
export function supabaseFiles(): Files {
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const bucket = client.storage.from(process.env.SUPABASE_STORAGE_BUCKET || 'pinktower-assets')
  return {
    async upload(path) { const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: false }); if (error) throw error; return { signedUrl: data.signedUrl } },
    async read(path) { const { data, error } = await bucket.createSignedUrl(path, 300); if (error) throw error; return data.signedUrl },
    async inspect(path) {
      const { data, error } = await bucket.download(path); if (error) throw error
      const bytes = Buffer.from(await data.arrayBuffer())
      const magic = bytes.subarray(0, 12)
      const mimeType = magic.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : magic[0] === 255 && magic[1] === 216 && magic[2] === 255 ? 'image/jpeg' : magic.toString('ascii',0,3) === 'GIF' ? 'image/gif' : magic.toString('ascii',0,4) === 'RIFF' && magic.toString('ascii',8,12) === 'WEBP' ? 'image/webp' : ''
      return { size: bytes.length, mimeType, hash: createHash('sha256').update(bytes).digest('hex') }
    },
    async remove(paths) { for (let offset = 0; offset < paths.length; offset += 100) { const { error } = await bucket.remove(paths.slice(offset, offset + 100)); if (error) throw error } },
  }
}
