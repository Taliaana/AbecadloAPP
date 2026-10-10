globalThis.localStorage = {
  data: {},
  getItem(key) { return this.data[key] ?? null },
  setItem(key, value) { this.data[key] = value },
}

const storage = await import('../src/storage/studentStorage.js')
const { lessons } = await import('../src/data/lessons.js')

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

storage.initializeStorage()
expect(lessons.length === 30, 'Ścieżka powinna zawierać 30 lekcji.')
expect(storage.getProfiles().length === 3, 'Powinny istnieć trzy profile.')

storage.setCurrentStudent('zosia')
expect(storage.getStudentProgress()[1] === 'available', 'Pierwsza lekcja powinna być dostępna.')
storage.completeLesson(1)
expect(storage.getStudentProgress()[2] === 'available', 'Lekcja 1 powinna odblokować lekcję 2.')
storage.completeLesson(2)
expect(storage.getStudentProgress()[3] === 'available', 'Lekcja 2 powinna odblokować lekcję 3.')
expect(storage.getUnlockedTools().includes('mouse-practice'), 'Lekcja 2 powinna odblokować ćwiczenie myszy.')
storage.completeLesson(3)
expect(storage.getUnlockedTools().includes('typewriting'), 'Lekcja 3 powinna odblokować Typewriting.')
expect(storage.getStudentProgress()[4] === 'available', 'Lekcja 3 powinna odblokować lekcję 4.')
storage.completeLesson(4)
expect(storage.getStudentProgress()[5] === 'locked', 'MVP nie powinno prowadzić do niewdrożonej lekcji 5.')
expect(storage.getStudentWorks().length === 3, 'Portfolio powinno zawierać trzy prace testowe.')

storage.setCurrentStudent('antek')
expect(storage.getStudentProgress()[2] === 'locked', 'Postęp profili musi być niezależny.')
expect(storage.getUnlockedTools().length === 0, 'Narzędzia profili muszą być niezależne.')

console.log('Storage smoke test: OK')
