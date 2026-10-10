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
  }
}))

export const getLesson = (id) => lessons.find((lesson) => lesson.id === Number(id))
export const moduleNames = modules.map(([name]) => name)
