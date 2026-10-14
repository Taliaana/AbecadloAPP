export const rockBoard = {
  id: 'rocks', title: 'Skały – zdjęcia z internetu', classLabel: 'Klasa 2',
  completionType: 'teacher-review', requireSource: true,
  trial: { title: 'Spróbujmy razem – granit', item: 'granit', instructions: [
    'Wyszukaj w Google Chrome: granit skała.', 'Przejdź do zakładki Grafika.',
    'Wybierz zdjęcie granitu.', 'Skopiuj zdjęcie – Ctrl + C.',
    'Wróć do PinkTower, kliknij pole poniżej i wklej zdjęcie – Ctrl + V.',
  ] },
  criticalThinkingPrompt: 'Czy to naprawdę ta skała? Przyjrzyj się zdjęciu i stronie, z której pochodzi.',
  instructions: [
    { title: 'Otwórz Google Chrome.', chrome: true, text: 'Znajdź na komputerze ikonę Google Chrome i otwórz przeglądarkę.' },
    { title: 'Kliknij pasek wyszukiwania u góry okna.' },
    { title: 'Wpisz nazwę skały.', text: 'Na przykład: „granit skała”. Naciśnij Enter.' },
    { title: 'Nad wynikami wybierz zakładkę „Grafika”.', text: 'Tutaj zobaczysz zdjęcia pasujące do wyszukiwania.' },
    { title: 'Wybierz zdjęcie.', text: 'Kliknij zdjęcie, aby zobaczyć je większe.' },
    { title: 'Skopiuj zdjęcie — wybierz sposób.', text: 'Klawiatura: wybierz zdjęcie w Chrome i naciśnij Ctrl + C. Mysz: kliknij zdjęcie prawym przyciskiem myszy i wybierz «Kopiuj obraz».' },
    { title: 'Wróć do PinkTower.', text: 'Kliknij odpowiednie pole przy nazwie skały.' },
    { title: 'Wklej zdjęcie — wybierz sposób.', text: 'Klawiatura: po wybraniu pola naciśnij Ctrl + V. Mysz: kliknij pole zdjęcia prawym przyciskiem i wybierz «Wklej obraz» w menu PinkTower. Przy aktywnym pustym polu możesz też kliknąć przycisk „Wklej obraz”. Jeśli przeglądarka nie pozwala odczytać schowka, użyj Ctrl + V.' },
    { title: 'Dopasuj wielkość zdjęcia.', text: 'Przeciągnij za róg. Przytrzymaj Shift, aby zachować proporcje.' },
    { title: 'Skopiuj link do strony źródłowej.', text: 'Wróć do Chrome. Otwórz stronę, z której pochodzi zdjęcie — nie stronę wyników Grafiki. Kliknij pasek adresu u góry i naciśnij Ctrl + C. Wróć do PinkTower, kliknij pole „Źródło” i naciśnij Ctrl + V.' },
  ],
  groups: [
    { title: 'Skały magmowe', items: [{ id: 'granit', title: 'Granit' }, { id: 'bazalt', title: 'Bazalt' }] },
    { title: 'Skały osadowe', items: [{ id: 'wapien', title: 'Wapień' }, { id: 'piaskowiec', title: 'Piaskowiec' }] },
    { title: 'Skały metamorficzne', items: [{ id: 'marmur', title: 'Marmur' }, { id: 'gnejs', title: 'Gnejs' }] },
  ],
  reflectionQuestions: [
    'Która skała ma najbardziej widoczne ziarna?',
    'Które dwie skały są do siebie najbardziej podobne?',
    'Którą skałę najłatwiej byłoby Ci później rozpoznać?',
  ],
}

export const researchBoards = [rockBoard]
export function getResearchBoard(id = 'rocks') { return researchBoards.find(board => board.id === id) }
export function boardItems(board) { return board.groups.flatMap(group => group.items) }
export function isResearchComplete(board, entries = {}) {
  return boardItems(board).every(item => entries[item.id]?.imageId && (!board.requireSource || entries[item.id]?.source?.trim()))
}
