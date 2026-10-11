const modules = [
  ['Poznaję komputer', ['Budowa komputera', 'Obsługuję mysz', 'Poznaję klawiaturę', 'Typewriting – układam dłonie', 'Bezpieczne stanowisko']],
  ['Tworzę cyfrowo', ['Pierwszy rysunek', 'Kształty i kolory', 'Zmieniam swoją pracę', 'Piszę na komputerze', 'Tekst i obraz', 'Zapisuję i otwieram swoją pracę']],
  ['Myślę jak programista', ['Co było najpierw?', 'Tworzę instrukcję', 'Steruję robotem', 'Przewiduję działanie programu', 'Znajduję błąd', 'Szukam innego rozwiązania']],
  ['Internet i informacja', ['Poznaję przeglądarkę', 'Znajduję informację', 'Wybieram przydatne źródło', 'Czy to na pewno prawda?']],
  ['Bezpieczeństwo', ['Moje dane', 'Co robię, gdy coś mnie niepokoi?', 'Jak rozmawiamy w internecie?', 'Kto to stworzył?']],
  ['AI', ['Co potrafi AI?', 'AI może się pomylić']],
  ['Projekt', ['Planuję', 'Tworzę i poprawiam', 'Prezentuję swoją pracę']],
]

const descriptions = [
  'Poznaj części zestawu komputerowego.', 'Poćwicz kliknięcie, dwuklik i przeciąganie.', 'Znajdź ważne klawisze i napisz krótki tekst.',
  'Ułóż dłonie i poznaj klawisze F oraz J.', 'Przygotuj wygodne i bezpieczne miejsce pracy.',
]

// Typ zakończenia jest świadomą decyzją dydaktyczną dla każdej lekcji.
// Nie wynika z numeru lekcji ani z jej miejsca w module.
const completionTypeByLesson = {
  1: 'automatic', 2: 'automatic', 3: 'automatic', 4: 'automatic', 5: 'self-check',
  6: 'teacher-review', 7: 'self-check', 8: 'teacher-review', 9: 'automatic', 10: 'teacher-review', 11: 'automatic',
  12: 'automatic', 13: 'automatic', 14: 'self-check', 15: 'automatic', 16: 'automatic', 17: 'self-check',
  18: 'automatic', 19: 'self-check', 20: 'self-check', 21: 'self-check',
  22: 'self-check', 23: 'self-check', 24: 'self-check', 25: 'self-check',
  26: 'self-check', 27: 'self-check',
  28: 'teacher-review', 29: 'teacher-review', 30: 'teacher-review',
}

let lessonId = 0
export const lessons = modules.flatMap(([module, titles], moduleIndex) => titles.map((title) => {
  lessonId += 1
  return {
    id: lessonId,
    title,
    shortTitle: title.split(' – ')[0],
    module,
    moduleId: moduleIndex + 1,
    description: descriptions[lessonId - 1] || 'Krótka lekcja krok po kroku.',
    status: lessonId === 1 ? 'available' : 'locked',
    unlocked: lessonId === 1,
    estimatedMinutes: lessonId <= 3 ? 7 : 8,
    activityType: lessonId <= 3 ? 'interactive' : 'lesson',
    completionType: completionTypeByLesson[lessonId],
    implemented: lessonId <= 4,
  }
}))

export const getLesson = (id) => lessons.find((lesson) => lesson.id === Number(id))
export const implementedLessons = lessons.filter((lesson) => lesson.implemented)
export const moduleNames = modules.map(([name]) => name)
