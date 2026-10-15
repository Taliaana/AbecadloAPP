// A new URL also refreshes images cached before their backgrounds were removed.
const imageVersion = 'transparent-1'
export const workstationImage = `/lessons/equipment/workstation.png?v=${imageVersion}`

export const equipment = [
  { id: 'monitor', name: 'Monitor', description: 'Wyświetla obrazy i informacje z komputera.' },
  { id: 'keyboard', name: 'Klawiatura', description: 'Służy do pisania liter, cyfr i znaków.' },
  { id: 'mouse', name: 'Mysz', description: 'Służy do wskazywania, klikania i przesuwania elementów.' },
  { id: 'computer', name: 'Komputer', description: 'Wykonuje polecenia i pozwala korzystać z programów.' },
  { id: 'speakers', name: 'Głośniki', description: 'Odtwarzają dźwięki z komputera.' },
  { id: 'printer', name: 'Drukarka', description: 'Przenosi teksty i obrazy z komputera na papier.' },
].map(item => ({ ...item, image: `/lessons/equipment/${item.id}.png?v=${imageVersion}`, speechText: `${item.name}. ${item.description}` }))

// Broad, relative regions: the pupil arranges the desk, not individual pixels.
const regions = {
  monitor: [[.29, .73, .04, .53]], keyboard: [[.25, .73, .49, .9]], mouse: [[.67, .91, .49, .96]],
  computer: [[0, .28, .34, 1]], speakers: [[.16, .35, .13, .53], [.65, .8, .13, .53]],
  printer: [[.77, 1, 0, .5]],
}
export function acceptsEquipment(id, x, y) { return regions[id]?.some(([left, right, top, bottom]) => x >= left && x <= right && y >= top && y <= bottom) || false }
export function matchesEquipmentName(value, name) { return value.trim().normalize('NFC').toLocaleLowerCase('pl-PL') === name.normalize('NFC').toLocaleLowerCase('pl-PL') }
