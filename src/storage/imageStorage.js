// Images stay outside localStorage. Resolve writes only once their transaction commits.
const DB_NAME = 'pinktower-images'
let database
function openDatabase() {
  database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' })
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); database = null }; resolve(request.result) }
    request.onerror = () => { database = null; reject(request.error) }
  })
  return database
}
async function transaction(mode, action) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', mode)
    const request = action(tx.objectStore('images'))
    tx.oncomplete = () => resolve(request.result)
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Nie zapisano zdjęcia'))
  })
}
export async function storeImage(blob, { studentId, workId }) {
  if (!(blob instanceof Blob) || !blob.type.startsWith('image/') || blob.type === 'image/svg+xml') throw new Error('Wklej zdjęcie')
  const id = crypto.randomUUID()
  await transaction('readwrite', store => store.put({ id, studentId, workId, blob }))
  return id
}
export async function readImage(id, { studentId, workId }) {
  const record = await transaction('readonly', store => store.get(id))
  return record?.studentId === studentId && record?.workId === workId ? record.blob : null
}
export async function deleteImage(id) { if (id) await transaction('readwrite', store => store.delete(id)) }

export async function deleteStudentImages(studentId) {
  // Environments without IndexedDB cannot have stored images here.
  if (typeof indexedDB === 'undefined') return
  const db = await openDatabase()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite')
    const request = tx.objectStore('images').openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      if (cursor.value.studentId === studentId) cursor.delete()
      cursor.continue()
    }
    tx.oncomplete = resolve
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Nie usunięto zdjęć ucznia'))
  })
}
