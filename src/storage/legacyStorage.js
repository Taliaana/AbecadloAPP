// Read-only access to old deployments. Never initialize over the saved copy.
const keys = ['abecadlo-state-v3','abecadlo-state-v2','abecadlo-state-v1']
const markerKey = 'pinktower-migration-completed'
export function readLegacy() {
  const copies = keys.map(key => ({ key, raw: localStorage.getItem(key) })).filter(item => item.raw !== null)
  if (!copies.length) return null
  let source, error
  try { source = JSON.parse(copies[0].raw) } catch { error = 'Nie można odczytać lokalnej kopii. Pobierz backup przed dalszymi działaniami.' }
  return { copies, source, error }
}
export async function legacyImages() {
  if (typeof indexedDB === 'undefined') return []
  if (indexedDB.databases && !(await indexedDB.databases()).some(db => db.name === 'pinktower-images')) return []
  return new Promise((resolve, reject) => {
    let missing = false
    const request = indexedDB.open('pinktower-images')
    request.onupgradeneeded = () => { missing = true; request.transaction.abort() }
    request.onerror = () => missing ? resolve([]) : reject(new Error('Nie udało się odczytać lokalnych zdjęć. Kopia pozostaje na komputerze.'))
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('images', 'readonly'), query = tx.objectStore('images').getAll()
      tx.oncomplete = () => { db.close(); resolve(query.result) }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  })
}
export function migrationMarker() { try { return JSON.parse(localStorage.getItem(markerKey)) } catch { return null } }
export function markMigration(id) { localStorage.setItem(markerKey, JSON.stringify({ id, completedAt: new Date().toISOString() })) }
export function downloadLegacyBackup(legacy) {
  const blob = new Blob([JSON.stringify({ origin: location.origin, exportedAt: new Date().toISOString(), copies: legacy.copies }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob), anchor = document.createElement('a')
  anchor.href = url; anchor.download = 'pinktower-kopia-przed-migracja.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
