import { request } from './studentStorage.js'
export async function imageHash(blob) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(byte => byte.toString(16).padStart(2, '0')).join('') }
export async function storeImage(blob, { workId, importId, legacyImageId }) {
  const metadata = { workId, mimeType: blob.type, size: blob.size, hash: await imageHash(blob), ...(importId ? { importId, legacyImageId } : {}) }
  const grant = await request('assets', metadata)
  if (!grant.ready) {
    const uploaded = await fetch(grant.signedUrl, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob })
    if (!uploaded.ok) throw new Error('Nie udało się zapisać zdjęcia. Spróbuj ponownie.')
    await request(`assets/${grant.id}/finalize`)
  }
  return grant.id
}
export async function readImage(id) { const grant = await request(`assets/${id}`, null, 'GET'); const response = await fetch(grant.url); if (!response.ok) throw new Error('Nie udało się odczytać zdjęcia.'); return response.blob() }
export const deleteImage = id => id ? request(`assets/${id}`, null, 'DELETE') : Promise.resolve()
