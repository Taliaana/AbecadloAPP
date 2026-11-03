# Ćwiczebny pulpit i testowanie lekcji

## Gdzie wejść

- **Klasa → Testuj lekcje**: nauczyciel uruchamia dowolną z czterech gotowych lekcji bez wybierania ucznia. Pozostałe materiały są oznaczone jako przygotowywane.
- **Lekcja 2 „Obsługuję mysz”**: dotychczasowe cztery ćwiczenia oraz sześć krótkich zadań na pulpicie. Każdy etap kończy się kartą „Gotowe” i ręcznym przejściem dalej.
- **Pracownia → Ćwicz mysz → Ćwicz na pulpicie**: samodzielne ćwiczenie po odblokowaniu narzędzia myszy.

## Obsługa pulpitu

Kliknięcie zaznacza, dwuklik lub Enter otwiera folder, dokument albo obraz. Pliki przenosi się przez przeciąganie do folderu/kosza lub przez wybór „Przenieś do” i przycisk „Przenieś”. Delete przenosi zaznaczony plik do kosza; „Przywróć” odkłada go do poprzedniego folderu.

Okna można przeciągać za tytuł, przesuwać strzałkami po ustawieniu fokusu na tytule, zamknąć lub zminimalizować. Pasek zadań przywraca istniejące okno. „Pulpit” na pasku chowa otwarte okna. W folderze działają „Wstecz” i powrót do pulpitu.

„Pełny ekran” korzysta z Fullscreen API i pokazuje wyłącznie pulpit, otwarte okna oraz pasek zadań. Powrót jest dostępny krzyżykiem w prawym górnym rogu lub klawiszem Esc. Pełny ekran jest opcjonalny: wszystkie zadania można wykonać w zwykłym oknie. „Schowaj pulpit” dotyczy wyłącznie symulatora w PinkTower i zachowuje jego stan.

Folder „Przewijanie” zawiera galerię z własnym paskiem przewijania. Można używać kółka, gładzika i klawiatury, a na końcu wrócić przyciskiem na górę. Folder korzysta z istniejącego modelu okien i zapisu; stare sesje pozostają zgodne. Obrazki są generowane jako SVG w interfejsie, nie zapisujemy ich w stanie ucznia.

Zwijany samouczek „Jak używać myszy?” jest dostępny w lekcji i ćwiczeniach. Samouczek oraz polecenia lekcji mają przycisk odsłuchu korzystający ze wspólnego mechanizmu głosu PinkTower; nic nie odtwarza się automatycznie. Podczas przeciągania lekki podgląd pliku podąża za kursorem, a folder docelowy jest podświetlany. Ograniczone animacje respektują ustawienia systemu.

## Stan i bezpieczeństwo

`src/data/desktop.js` definiuje zamknięty katalog wirtualnych plików, operacje, zadania i walidację. `desktopSandbox.js` odpowiada za okna i interakcje, a `desktopActivity.js` za wspólne kontrolki lekcji i Pracowni. Ilustracje są lokalnymi SVG. To symulacja: nie ma dostępu do plików ani okien systemu operacyjnego.

Autosave zapisuje mały JSON przez istniejące `studentStorage → POST /api/tools`, z `kind: "desktop"`, `mode: "lesson" | "practice"`. Serwer sprawdza sesję właściciela, dostęp do lekcji/narzędzia oraz dozwolone pliki, foldery, współrzędne i granice stanu. Dane trafiają do istniejącego JSONB `toolProgress.desktop.lesson/practice`; migracja SQL nie jest potrzebna. Nie zmieniamy istniejących ID, postępów, prac ani lokalnych kopii legacy.

Zapis obejmuje etap i ekran ukończenia, puzzle, położenie plików, poprzednie foldery plików z kosza, otwarte/zminimalizowane okna i ich historię oraz schowanie symulatora. „Zapisz i wyjdź” czeka na potwierdzenie API. Awaria pozostawia pracę otwartą i pozwala ponowić zapis. Odświeżenie/wznowienie odtwarza stan z serwera. Ponowne wykonanie ukończonej lekcji nie cofa zaliczenia.

`src/lessons/session.js` wstrzykuje do tych samych lekcji normalny zapis ucznia albo efemeryczną sesję testową nauczyciela. Ta druga nie wysyła startów, zaliczeń ani stanu pulpitu do API. Wyjście z testu usuwa stan próby. Uczeń nie uzyskuje dostępu do tras nauczycielskich, a zmiana profilu nadal wymaga przygotowania urządzenia przez nauczyciela.

Wspólny renderer przewija początek właściwego kontenera tylko po zmianie trasy lub etapu, a nie po każdej interakcji. Pola pisania lekcji 1 i 3 otrzymują fokus bez dodatkowego przewijania.

## Testy

`tests/backend/desktop.test.ts` sprawdza model plików, przywracanie, okna, walidację, zapis przez repozytorium, izolację uczniów i brak zapisu w trybie nauczycielskim. `tests/ui/desktop.spec.js` sprawdza rzeczywiste interakcje, pełny ekran, fokus, odtwarzanie i błędy zapisu oraz cztery szerokości ekranu. Testy UI korzystają z izolowanego API w pamięci, nie z danych dzieci w Supabase.
